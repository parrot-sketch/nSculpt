import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrescriptionRepository } from '../repositories/prescription.repository';
import { ConsultationRepository } from '../../consultation/repositories/consultation.repository';
import { InventoryService } from '../../inventory/services/inventory.service';
import { InventoryRepository } from '../../inventory/repositories/inventory.repository';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { IdentityContextService } from '../../auth/services/identityContext.service';
import { RlsValidationService } from '../../audit/services/rlsValidation.service';
import { CreatePrescriptionDto } from '../dto/create-prescription.dto';
import { DispensePrescriptionDto } from '../dto/dispense-prescription.dto';
import { RecordAdministrationDto } from '../dto/record-administration.dto';
import { PrescriptionEventType } from '../events/prescription.events';
import { InventoryEventType } from '../../inventory/events/inventory.events';
import { Domain, PrescriptionStatus } from '@prisma/client';

/**
 * Prescription Service
 * 
 * Manages medication prescriptions with inventory integration.
 * 
 * Workflow:
 * 1. Doctor prescribes (PRESCRIBED)
 * 2. Pharmacy dispenses (DISPENSED) → Inventory consumed
 * 3. Nurse administers (administration log)
 */
@Injectable()
export class PrescriptionService {
  constructor(
    private readonly prescriptionRepository: PrescriptionRepository,
    private readonly consultationRepository: ConsultationRepository,
    private readonly inventoryService: InventoryService,
    private readonly inventoryRepository: InventoryRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly identityContext: IdentityContextService,
    private readonly rlsValidation: RlsValidationService,
  ) {}

  /**
   * Create prescription
   * Only DOCTOR/SURGEON can prescribe
   */
  async createPrescription(
    createPrescriptionDto: CreatePrescriptionDto,
    userId: string,
  ) {
    // Validate consultation exists
    const consultation = await this.consultationRepository.findById(
      createPrescriptionDto.consultationId,
    );
    if (!consultation) {
      throw new NotFoundException(
        `Consultation with ID ${createPrescriptionDto.consultationId} not found`,
      );
    }

    // Validate patient access
    const hasAccess = await this.rlsValidation.canAccessPatient(
      consultation.patientId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied to patient ${consultation.patientId}`,
      );
    }

    // Role check: Only DOCTOR, SURGEON can prescribe
    const userRoles = this.identityContext.getRoles();
    if (
      !userRoles.includes('ADMIN') &&
      !userRoles.includes('DOCTOR') &&
      !userRoles.includes('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can create prescriptions',
      );
    }

    // Create prescription
    const prescription = await this.prescriptionRepository.create({
      ...createPrescriptionDto,
      patientId: consultation.patientId,
      prescribedById: userId,
    });

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: PrescriptionEventType.PRESCRIPTION_CREATED,
      domain: Domain.PRESCRIPTION,
      aggregateId: prescription.id,
      aggregateType: 'Prescription',
      payload: {
        prescriptionId: prescription.id,
        patientId: consultation.patientId,
        consultationId: consultation.id,
        medicationName: createPrescriptionDto.medicationName,
        quantity: createPrescriptionDto.quantity,
        timestamp: new Date().toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return prescription;
  }

  /**
   * Dispense prescription
   * Deducts inventory if medication is tracked
   */
  async dispensePrescription(
    prescriptionId: string,
    dispensePrescriptionDto: DispensePrescriptionDto,
    userId: string,
  ) {
    const prescription = await this.prescriptionRepository.findById(
      prescriptionId,
    );
    if (!prescription) {
      throw new NotFoundException(
        `Prescription with ID ${prescriptionId} not found`,
      );
    }

    // Validate patient access
    const hasAccess = await this.rlsValidation.canAccessPatient(
      prescription.patientId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied to patient ${prescription.patientId}`,
      );
    }

    // Role check: Only PHARMACIST, ADMIN can dispense
    const userRoles = this.identityContext.getRoles();
    if (
      !userRoles.includes('ADMIN') &&
      !userRoles.includes('PHARMACIST')
    ) {
      throw new ForbiddenException(
        'Only PHARMACIST and ADMIN can dispense prescriptions',
      );
    }

    // Validate quantity
    const remainingQuantity =
      Number(prescription.quantity) -
      Number(prescription.quantityDispensed || 0);
    if (dispensePrescriptionDto.quantityToDispense > remainingQuantity) {
      throw new BadRequestException(
        `Cannot dispense ${dispensePrescriptionDto.quantityToDispense}. Remaining: ${remainingQuantity}`,
      );
    }

    // Get correlation context
    const context = this.correlationService.getContext();

    // Phase 2: Consume inventory if medication is tracked
    let inventoryTransactionId: string | undefined;
    let inventoryUsageId: string | undefined;

    if (prescription.inventoryItemId) {
      try {
        // Consume from inventory (FIFO)
        const transactions = await this.inventoryService.consumeStock(
          {
            itemId: prescription.inventoryItemId,
            quantity: dispensePrescriptionDto.quantityToDispense,
            consultationId: prescription.consultationId,
            patientId: prescription.patientId,
            reason: `Prescription dispensation: ${prescription.medicationName}`,
          },
          userId,
        );

        // Get the first transaction (or combine if multiple batches)
        if (transactions && transactions.length > 0) {
          inventoryTransactionId = transactions[0].id;
        }

        // Create inventory usage record
        if (inventoryTransactionId) {
          // Create usage record linking to consultation
          const usageEvent = await this.domainEventService.createEvent({
            eventType: 'Inventory.Consumed',
            domain: Domain.INVENTORY,
            aggregateId: prescription.inventoryItemId,
            aggregateType: 'InventoryItem',
            payload: {
              itemId: prescription.inventoryItemId,
              quantity: dispensePrescriptionDto.quantityToDispense,
              prescriptionId: prescription.id,
              consultationId: prescription.consultationId,
              patientId: prescription.patientId,
            },
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: userId,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
          });

          const usage = await this.inventoryRepository.createUsage({
            itemId: prescription.inventoryItemId,
            transactionId: inventoryTransactionId,
            consultationId: prescription.consultationId,
            patientId: prescription.patientId,
            quantityUsed: dispensePrescriptionDto.quantityToDispense,
            clinicalEventId: usageEvent.id,
            usedBy: userId,
            notes: `Prescription: ${prescription.medicationName}`,
          });

          inventoryUsageId = usage.id;
        }
      } catch (error) {
        // If inventory consumption fails, still allow dispensing but log error
        console.error(
          'Failed to consume inventory for prescription:',
          error,
        );
        // In production, you might want to throw here or handle differently
      }
    }

    // Create dispensation record
    const dispensation = await this.prescriptionRepository.createDispensation({
      prescriptionId,
      quantityDispensed: dispensePrescriptionDto.quantityToDispense,
      inventoryTransactionId,
      inventoryUsageId,
      dispensedBy: userId,
      notes: dispensePrescriptionDto.notes,
    });

    // Update prescription status
    const totalDispensed =
      Number(prescription.quantityDispensed || 0) +
      dispensePrescriptionDto.quantityToDispense;
    const isFullyDispensed = totalDispensed >= Number(prescription.quantity);

    await this.prescriptionRepository.updateStatus(
      prescriptionId,
      isFullyDispensed
        ? PrescriptionStatus.DISPENSED
        : PrescriptionStatus.PARTIALLY_DISPENSED,
      {
        dispensedById: userId,
        quantityDispensed: dispensePrescriptionDto.quantityToDispense,
        dispensedAt: new Date(),
      },
    );

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: PrescriptionEventType.PRESCRIPTION_DISPENSED,
      domain: Domain.PRESCRIPTION,
      aggregateId: prescriptionId,
      aggregateType: 'Prescription',
      payload: {
        prescriptionId,
        patientId: prescription.patientId,
        consultationId: prescription.consultationId,
        quantityDispensed: dispensePrescriptionDto.quantityToDispense,
        inventoryTransactionId,
        timestamp: new Date().toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return dispensation;
  }

  /**
   * Record medication administration
   * Nursing logs when medication was given
   */
  async recordAdministration(
    prescriptionId: string,
    recordAdministrationDto: RecordAdministrationDto,
    userId: string,
  ) {
    const prescription = await this.prescriptionRepository.findById(
      prescriptionId,
    );
    if (!prescription) {
      throw new NotFoundException(
        `Prescription with ID ${prescriptionId} not found`,
      );
    }

    // Validate patient access
    const hasAccess = await this.rlsValidation.canAccessPatient(
      prescription.patientId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied to patient ${prescription.patientId}`,
      );
    }

    // Role check: Only NURSE, ADMIN can record administration
    const userRoles = this.identityContext.getRoles();
    if (
      !userRoles.includes('ADMIN') &&
      !userRoles.includes('NURSE')
    ) {
      throw new ForbiddenException(
        'Only NURSE and ADMIN can record medication administration',
      );
    }

    // Create administration record
    const administration = await this.prescriptionRepository.createAdministration(
      {
        prescriptionId,
        consultationId: prescription.consultationId,
        patientId: prescription.patientId,
        administeredBy: userId,
        dosageGiven: recordAdministrationDto.dosageGiven,
        route: recordAdministrationDto.route,
        response: recordAdministrationDto.response,
        notes: recordAdministrationDto.notes,
      },
    );

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: PrescriptionEventType.MEDICATION_ADMINISTERED,
      domain: Domain.PRESCRIPTION,
      aggregateId: prescriptionId,
      aggregateType: 'Prescription',
      payload: {
        prescriptionId,
        patientId: prescription.patientId,
        consultationId: prescription.consultationId,
        dosageGiven: recordAdministrationDto.dosageGiven,
        timestamp: new Date().toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return administration;
  }

  async findOne(prescriptionId: string, userId?: string) {
    const prescription = await this.prescriptionRepository.findById(
      prescriptionId,
    );
    if (!prescription) {
      throw new NotFoundException(
        `Prescription with ID ${prescriptionId} not found`,
      );
    }

    // Validate patient access if userId provided
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessPatient(
        prescription.patientId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          `Access denied to prescription ${prescriptionId}`,
        );
      }
    }

    return prescription;
  }

  async findByConsultation(consultationId: string, userId?: string) {
    // Validate consultation exists
    const consultation = await this.consultationRepository.findById(
      consultationId,
    );
    if (!consultation) {
      throw new NotFoundException(
        `Consultation with ID ${consultationId} not found`,
      );
    }

    // Validate patient access if userId provided
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessPatient(
        consultation.patientId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          `Access denied to consultation ${consultationId}`,
        );
      }
    }

    return await this.prescriptionRepository.findByConsultation(consultationId);
  }
}

