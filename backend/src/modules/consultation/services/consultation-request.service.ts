import { Injectable } from '@nestjs/common';
import { ConsultationRequestRepository } from '../repositories/consultation-request.repository';
import { CreateConsultationRequestDto } from '../dto/create-consultation-request.dto';
import { ApproveConsultationRequestDto, RejectConsultationRequestDto } from '../dto/consultation-request-action.dto';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { Domain, ConsultationRequestStatus } from '@prisma/client';

@Injectable()
export class ConsultationRequestService {
    constructor(
        private readonly consultationRequestRepository: ConsultationRequestRepository,
        private readonly domainEventService: DomainEventService,
        private readonly correlationService: CorrelationService,
    ) { }

    async create(createDto: CreateConsultationRequestDto, createdBy: string) {
        const request = await this.consultationRequestRepository.create({
            patientId: createDto.patientId,
            specialistId: createDto.specialistId,
            reason: createDto.reason,
            preferredDate: createDto.preferredDate ? new Date(createDto.preferredDate) : undefined,
            createdBy,
        });

        // Emit domain event
        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'ConsultationRequest.Created',
            domain: Domain.CONSULTATION,
            aggregateType: 'ConsultationRequest',
            aggregateId: request.id,
            payload: {
                requestId: request.id,
                patientId: request.patientId,
                specialistId: request.specialistId,
                reason: request.reason,
                status: request.status,
            },
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return request;
    }

    async findAll(
        skip: number = 0,
        take: number = 20,
        filters?: {
            patientId?: string;
            specialistId?: string;
            status?: ConsultationRequestStatus;
        }
    ) {
        return await this.consultationRequestRepository.findAll(skip, take, filters);
    }

    async findOne(id: string) {
        return await this.consultationRequestRepository.findById(id);
    }

    async approve(id: string, approveDto: ApproveConsultationRequestDto, approvedBy: string) {
        const request = await this.consultationRequestRepository.approve(id, approvedBy);

        // Emit domain event
        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'ConsultationRequest.Approved',
            domain: Domain.CONSULTATION,
            aggregateType: 'ConsultationRequest',
            aggregateId: request.id,
            payload: {
                requestId: request.id,
                patientId: request.patientId,
                approvedBy,
                approvedAt: request.approvedAt?.toISOString(),
                notes: approveDto.notes,
            },
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: approvedBy,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return request;
    }

    async reject(id: string, rejectDto: RejectConsultationRequestDto, rejectedBy: string) {
        const request = await this.consultationRequestRepository.reject(
            id,
            rejectedBy,
            rejectDto.rejectionReason
        );

        // Emit domain event
        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'ConsultationRequest.Rejected',
            domain: Domain.CONSULTATION,
            aggregateType: 'ConsultationRequest',
            aggregateId: request.id,
            payload: {
                requestId: request.id,
                patientId: request.patientId,
                rejectedBy,
                rejectedAt: request.rejectedAt?.toISOString(),
                rejectionReason: rejectDto.rejectionReason,
            },
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: rejectedBy,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return request;
    }
}
