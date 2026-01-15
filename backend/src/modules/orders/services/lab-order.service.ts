import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { LabOrderRepository } from '../repositories/lab-order.repository';
import { ConsultationRepository } from '../../consultation/repositories/consultation.repository';
import { EMRNoteService } from '../../emr/services/emr-note.service';
import { InventoryService } from '../../inventory/services/inventory.service';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { IdentityContextService } from '../../auth/services/identityContext.service';
import { RlsValidationService } from '../../audit/services/rlsValidation.service';
import { CreateLabOrderDto } from '../dto/create-lab-order.dto';
import { ApproveLabOrderDto } from '../dto/approve-lab-order.dto';
import { RecordResultDto } from '../dto/record-result.dto';
import { CancelLabOrderDto } from '../dto/cancel-lab-order.dto';
import { ListOrdersDto } from '../dto/list-orders.dto';
import { OrderEventType } from '../events/orders.events';
import { Domain, OrderStatus, ResultStatus, NoteType } from '@prisma/client';

/**
 * Lab Order Service
 * 
 * Implements order workflow with role-based access control and EMR integration.
 * 
 * Workflow:
 * 1. Doctor creates order (CREATED)
 * 2. Doctor/Admin approves (APPROVED)
 * 3. Lab processes (IN_PROGRESS)
 * 4. Result recorded (COMPLETED) → Auto-creates EMR addendum
 * 
 * Business Rules:
 * - Doctor/Surgeon: Can create and approve orders
 * - Lab Tech: Can record results
 * - Nurse: Can view assigned orders
 * - Front Desk: Cannot access orders
 * - Admin: Full access including override
 */
@Injectable()
export class LabOrderService {
  // Valid state transitions
  private readonly validTransitions: Map<OrderStatus, OrderStatus[]> =
    new Map([
      [OrderStatus.CREATED, [OrderStatus.APPROVED, OrderStatus.CANCELLED]],
      [OrderStatus.APPROVED, [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED]],
      [OrderStatus.IN_PROGRESS, [OrderStatus.COMPLETED, OrderStatus.CANCELLED]],
      [OrderStatus.COMPLETED, []], // Terminal state
      [OrderStatus.CANCELLED, []], // Terminal state
    ]);

  constructor(
    private readonly labOrderRepository: LabOrderRepository,
    private readonly consultationRepository: ConsultationRepository,
    private readonly emrNoteService: EMRNoteService,
    private readonly inventoryService: InventoryService,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly identityContext: IdentityContextService,
    private readonly rlsValidation: RlsValidationService,
  ) {}

  /**
   * Create a new lab order
   * Only DOCTOR/SURGEON/ADMIN can create orders
   */
  async createOrder(createLabOrderDto: CreateLabOrderDto, userId: string) {
    // Validate consultation exists
    const consultation = await this.consultationRepository.findById(
      createLabOrderDto.consultationId,
    );
    if (!consultation) {
      throw new NotFoundException(
        `Consultation with ID ${createLabOrderDto.consultationId} not found`,
      );
    }

    // Validate patient access (RLS)
    const hasAccess = await this.rlsValidation.canAccessPatient(
      consultation.patientId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied to patient ${consultation.patientId}`,
      );
    }

    // Role check: Only DOCTOR, SURGEON, ADMIN can create orders
    const userRoles = this.identityContext.getRoles();
    if (
      !userRoles.includes('ADMIN') &&
      !userRoles.includes('DOCTOR') &&
      !userRoles.includes('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can create lab orders',
      );
    }

    // Create order
    const order = await this.labOrderRepository.create({
      ...createLabOrderDto,
      patientId: consultation.patientId,
      orderedById: userId,
      createdBy: userId,
    });

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: OrderEventType.ORDER_CREATED,
      domain: Domain.ORDERS,
      aggregateId: order.id,
      aggregateType: 'LabOrder',
      payload: {
        orderId: order.id,
        patientId: consultation.patientId,
        consultationId: consultation.id,
        orderedById: userId,
        testName: createLabOrderDto.testName,
        priority: createLabOrderDto.priority,
        status: OrderStatus.CREATED,
        timestamp: new Date().toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return order;
  }

  /**
   * Approve lab order
   * Transitions from CREATED to APPROVED
   * Only DOCTOR/SURGEON/ADMIN can approve
   */
  async approveOrder(
    orderId: string,
    approveLabOrderDto: ApproveLabOrderDto,
    userId: string,
  ) {
    const order = await this.labOrderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Lab order with ID ${orderId} not found`);
    }

    // Validate patient access
    const hasAccess = await this.rlsValidation.canAccessPatient(
      order.patientId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied to patient ${order.patientId}`,
      );
    }

    // Role check: Only DOCTOR, SURGEON, ADMIN can approve
    const userRoles = this.identityContext.getRoles();
    if (
      !userRoles.includes('ADMIN') &&
      !userRoles.includes('DOCTOR') &&
      !userRoles.includes('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can approve lab orders',
      );
    }

    // State machine validation
    this.validateStateTransition(order.status, OrderStatus.APPROVED, userId);

    // Update status
    const updated = await this.labOrderRepository.updateStatus(
      orderId,
      OrderStatus.APPROVED,
      {
        approvedById: userId,
        updatedBy: userId,
        version: order.version,
      },
    );

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: OrderEventType.ORDER_APPROVED,
      domain: Domain.ORDERS,
      aggregateId: orderId,
      aggregateType: 'LabOrder',
      payload: {
        orderId,
        patientId: order.patientId,
        consultationId: order.consultationId,
        approvedById: userId,
        status: OrderStatus.APPROVED,
        timestamp: new Date().toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return updated;
  }

  /**
   * Record lab result
   * Transitions order to COMPLETED
   * Auto-creates EMR addendum with result summary
   */
  async recordResult(
    orderId: string,
    recordResultDto: RecordResultDto,
    userId: string,
  ) {
    const order = await this.labOrderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Lab order with ID ${orderId} not found`);
    }

    // Validate patient access
    const hasAccess = await this.rlsValidation.canAccessPatient(
      order.patientId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied to patient ${order.patientId}`,
      );
    }

    // Role check: Lab Tech or ADMIN can record results
    const userRoles = this.identityContext.getRoles();
    if (
      !userRoles.includes('ADMIN') &&
      !userRoles.includes('LAB_TECH')
    ) {
      throw new ForbiddenException(
        'Only LAB_TECH and ADMIN can record lab results',
      );
    }

    // State validation: Order must be APPROVED or IN_PROGRESS
    if (
      order.status !== OrderStatus.APPROVED &&
      order.status !== OrderStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        `Cannot record result for order in ${order.status} status`,
      );
    }

    // Create result (this also updates order status to COMPLETED)
    const result = await this.labOrderRepository.createResult(orderId, {
      ...recordResultDto,
      recordedById: userId,
      resultStatus: recordResultDto.resultStatus || ResultStatus.AVAILABLE,
    });

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    const resultEvent = await this.domainEventService.createEvent({
      eventType: OrderEventType.RESULT_RECORDED,
      domain: Domain.ORDERS,
      aggregateId: result.id,
      aggregateType: 'LabResult',
      payload: {
        orderId,
        resultId: result.id,
        patientId: order.patientId,
        consultationId: order.consultationId,
        recordedById: userId,
        resultStatus: result.resultStatus,
        timestamp: new Date().toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Auto-create EMR addendum with lab result summary
    try {
      await this.createEMRResultAddendum(order, result, userId, context);
    } catch (error) {
      // Log error but don't fail result recording
      console.error('Failed to create EMR addendum for lab result:', error);
    }

    // Phase 2: Auto-consume lab supplies
    try {
      await this.consumeLabSupplies(order, userId, context);
    } catch (error) {
      // Log error but don't fail result recording
      console.error('Failed to auto-consume lab supplies:', error);
    }

    return result;
  }

  /**
   * Cancel lab order
   * Only DOCTOR/SURGEON/ADMIN can cancel
   */
  async cancelOrder(
    orderId: string,
    cancelLabOrderDto: CancelLabOrderDto,
    userId: string,
  ) {
    const order = await this.labOrderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Lab order with ID ${orderId} not found`);
    }

    // Validate patient access
    const hasAccess = await this.rlsValidation.canAccessPatient(
      order.patientId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied to patient ${order.patientId}`,
      );
    }

    // Role check: Only DOCTOR, SURGEON, ADMIN can cancel
    const userRoles = this.identityContext.getRoles();
    if (
      !userRoles.includes('ADMIN') &&
      !userRoles.includes('DOCTOR') &&
      !userRoles.includes('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can cancel lab orders',
      );
    }

    // State machine validation
    this.validateStateTransition(order.status, OrderStatus.CANCELLED, userId);

    // Update status
    const updated = await this.labOrderRepository.updateStatus(
      orderId,
      OrderStatus.CANCELLED,
      {
        updatedBy: userId,
        version: order.version,
      },
    );

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: OrderEventType.ORDER_CANCELLED,
      domain: Domain.ORDERS,
      aggregateId: orderId,
      aggregateType: 'LabOrder',
      payload: {
        orderId,
        patientId: order.patientId,
        consultationId: order.consultationId,
        cancelledBy: userId,
        timestamp: new Date().toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return updated;
  }

  /**
   * List orders by consultation
   */
  async listOrdersByConsultation(
    consultationId: string,
    listOrdersDto: ListOrdersDto,
    userId?: string,
  ) {
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

      // Role check: Front Desk cannot access orders
      const userRoles = this.identityContext.getRoles();
      if (
        userRoles.includes('FRONT_DESK') &&
        !userRoles.includes('ADMIN')
      ) {
        throw new ForbiddenException(
          'FRONT_DESK role cannot access lab orders',
        );
      }
    }

    // Get orders
    const orders = await this.labOrderRepository.findByConsultation(
      consultationId,
      {
        status: listOrdersDto.status,
        includeArchived: false,
      },
    );

    return orders;
  }

  /**
   * Get single order by ID
   */
  async findOne(orderId: string, userId?: string) {
    const order = await this.labOrderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Lab order with ID ${orderId} not found`);
    }

    // Validate patient access if userId provided
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessPatient(
        order.patientId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(`Access denied to order ${orderId}`);
      }

      // Role check: Front Desk cannot access orders
      const userRoles = this.identityContext.getRoles();
      if (
        userRoles.includes('FRONT_DESK') &&
        !userRoles.includes('ADMIN')
      ) {
        throw new ForbiddenException(
          'FRONT_DESK role cannot access lab orders',
        );
      }
    }

    return order;
  }

  /**
   * Archive order (soft delete)
   * Only ADMIN can archive
   */
  async archiveOrder(orderId: string, userId: string) {
    // Role check: Only ADMIN can archive
    if (!this.identityContext.hasRole('ADMIN')) {
      throw new ForbiddenException('Only ADMIN can archive lab orders');
    }

    // Validate order exists
    const order = await this.findOne(orderId, userId);

    // Archive order
    const archived = await this.labOrderRepository.archive(orderId, userId);

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: OrderEventType.ORDER_ARCHIVED,
      domain: Domain.ORDERS,
      aggregateId: orderId,
      aggregateType: 'LabOrder',
      payload: {
        orderId,
        patientId: order.patientId,
        consultationId: order.consultationId,
        archivedBy: userId,
        timestamp: new Date().toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return archived;
  }

  /**
   * Create EMR addendum with lab result summary
   * Called automatically when result is recorded
   */
  private async createEMRResultAddendum(
    order: any,
    result: any,
    userId: string,
    context: any,
  ): Promise<void> {
    // Find the most recent EMR note for this consultation to attach addendum
    // In practice, you might want to find a specific note or create a summary note
    // For now, we'll create an addendum on the most recent doctor SOAP note

    try {
      // Get consultation notes
      const notes = await this.emrNoteService.listNotesByConsultation(
        order.consultationId,
        { noteType: NoteType.DOCTOR_SOAP },
        userId,
      );

      // If there's a SOAP note, add addendum to it
      if (notes.notes && notes.notes.length > 0) {
        const latestNote = notes.notes[notes.notes.length - 1];

        // Create addendum content with lab result summary
        const addendumContent = `Lab Result Available:
Test: ${order.testName}
Priority: ${order.priority}
Status: ${result.resultStatus}
${result.resultText ? `Result: ${result.resultText}` : ''}
${result.fileUrl ? `Report: ${result.fileUrl}` : ''}
Recorded: ${new Date(result.createdAt).toLocaleString()}`;

        await this.emrNoteService.addAddendum(
          latestNote.id,
          { content: addendumContent },
          userId,
        );
      }
    } catch (error) {
      // If no SOAP note exists or other error, silently fail
      // In production, you might want to log this differently
      console.warn('Could not create EMR addendum for lab result:', error);
    }
  }

  /**
   * Validate state transition
   * Throws BadRequestException if transition is invalid
   * ADMIN can bypass validation
   */
  private validateStateTransition(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
    userId: string,
  ): void {
    // ADMIN can always override
    if (this.identityContext.hasRole('ADMIN')) {
      return;
    }

    // Check if transition is valid
    const allowedTransitions = this.validTransitions.get(currentStatus);
    if (!allowedTransitions || !allowedTransitions.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid state transition from ${currentStatus} to ${targetStatus}`,
      );
    }
  }

  /**
   * Phase 2: Auto-consume lab supplies when result is recorded
   * Consumes common lab supplies (reagents, swabs, collection containers)
   */
  private async consumeLabSupplies(
    order: any,
    userId: string,
    context: any,
  ): Promise<void> {
    // In a real system, you'd have a configuration table mapping test types to required supplies
    // For Phase 2, we'll use a simple approach: consume common lab supplies
    // This would typically be configured per test type

    // Common lab supplies that might be consumed:
    // - Test swabs, collection containers, reagents (specific to test)
    // For MVP, we'll make this configurable via test name or skip if not configured

    // Example: If testName contains certain keywords, consume specific supplies
    // This is a placeholder - in production, use a proper configuration system

    // For now, we'll log that supplies should be consumed
    // Actual implementation would:
    // 1. Look up test-specific supply requirements
    // 2. For each required supply:
    //    - Consume from inventory using InventoryService
    //    - Create InventoryUsage linked to consultation
    //    - Emit consumption events

    console.log(
      `Lab supplies should be auto-consumed for test: ${order.testName}`,
    );
    // TODO: Implement lab supply consumption based on test type configuration
  }
}

