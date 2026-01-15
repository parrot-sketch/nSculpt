import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PatientRepository } from '../repositories/patient.repository';
import { PDFConsentService } from '../../consent/services/pdf-consent.service';
import { CreatePatientDto } from '../dto/create-patient.dto';
import { UpdatePatientDto } from '../dto/update-patient.dto';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { PatientEventType, PatientCreatedPayload, PatientUpdatedPayload } from '../events/patient.events';
import { Domain } from '@prisma/client';

@Injectable()
export class PatientCoreService {
    private readonly logger = new Logger(PatientCoreService.name);

    constructor(
        private readonly patientRepository: PatientRepository,
        private readonly pdfConsentService: PDFConsentService,
        private readonly domainEventService: DomainEventService,
        private readonly correlationService: CorrelationService,
    ) { }

    async findAll(skip?: number, take?: number, userId?: string) {
        return this.patientRepository.findAll(skip, take);
    }

    async search(query: string, skip?: number, take?: number) {
        return this.patientRepository.search(query, skip, take);
    }

    async findOne(id: string, userId?: string) {
        return this.patientRepository.findById(id);
    }

    async create(createPatientDto: CreatePatientDto, creatorId: string) {
        const patient = await this.patientRepository.create({
            ...createPatientDto,
            createdBy: creatorId,
        });

        // Emit domain event
        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: PatientEventType.CREATED,
            domain: Domain.MEDICAL_RECORDS,
            aggregateId: patient.id,
            aggregateType: 'Patient',
            payload: {
                patientId: patient.id,
                patientNumber: patient.patientNumber,
                firstName: patient.firstName,
                lastName: patient.lastName,
                email: patient.email,
                dateOfBirth: patient.dateOfBirth.toISOString().split('T')[0],
            } as PatientCreatedPayload,
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: creatorId,
        });

        return patient;
    }

    async update(id: string, updatePatientDto: UpdatePatientDto, userId: string) {
        const patient = await this.patientRepository.update(id, {
            ...updatePatientDto,
            updatedBy: userId,
        });

        // Emit domain event
        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: PatientEventType.UPDATED,
            domain: Domain.MEDICAL_RECORDS,
            aggregateId: id,
            aggregateType: 'Patient',
            payload: {
                patientId: id,
                changes: updatePatientDto,
            } as PatientUpdatedPayload,
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: userId,
        });

        return patient;
    }

    async remove(id: string, userId: string) {
        return this.patientRepository.delete(id, userId);
    }

    async getConsentsByPatient(patientId: string, userId: string, includeArchived: boolean = false) {
        return this.pdfConsentService.getConsentsByPatient(patientId, userId, includeArchived);
    }

    async getActiveConsents(patientId: string, userId: string) {
        return this.pdfConsentService.getActiveConsentsByPatient(patientId, userId);
    }

    async getRevokedConsents(patientId: string, userId: string) {
        return this.pdfConsentService.getRevokedConsentsByPatient(patientId, userId);
    }
}
