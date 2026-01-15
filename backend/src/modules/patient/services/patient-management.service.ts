import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PatientRepository } from '../repositories/patient.repository';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { PatientEventType, PatientMergedPayload, PatientRestrictedPayload, PatientUnrestrictedPayload } from '../events/patient.events';
import { Prisma, Domain } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PatientManagementService {
    private readonly logger = new Logger(PatientManagementService.name);
    private readonly prisma = getPrismaClient();

    constructor(
        private readonly patientRepository: PatientRepository,
        private readonly domainEventService: DomainEventService,
        private readonly correlationService: CorrelationService,
    ) { }

    async createPatientUserAccount(
        patientData: { email: string; password: string; firstName: string; lastName: string; phone?: string },
        createdBy: string,
        tx?: Prisma.TransactionClient,
    ): Promise<{ userId: string; email: string }> {
        const prisma = tx || this.prisma;

        if (!patientData.email) {
            throw new ConflictException('Email is required to create user account');
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: patientData.email },
        });
        if (existingUser) {
            throw new ConflictException('An account with this email already exists.');
        }

        const patientRole = await prisma.role.findUnique({
            where: { code: 'PATIENT' },
        });
        if (!patientRole) {
            throw new Error('PATIENT role not found. Please run database seed.');
        }

        const passwordHash = await bcrypt.hash(patientData.password, 12);

        const user = await prisma.user.create({
            data: {
                email: patientData.email,
                firstName: patientData.firstName,
                lastName: patientData.lastName,
                phone: patientData.phone,
                passwordHash,
                isEmailVerified: false,
                isActive: true,
                createdBy,
            },
        });

        await prisma.userRoleAssignment.create({
            data: {
                userId: user.id,
                roleId: patientRole.id,
                isActive: true,
                createdBy,
            },
        });

        return { userId: user.id, email: user.email };
    }

    async mergePatients(sourcePatientId: string, targetPatientId: string, reason?: string, userId?: string) {
        const creatorId = userId || 'SYSTEM';

        // 1. Create domain event first to get its ID (required by repository)
        const context = this.correlationService.getContext();
        const event = await this.domainEventService.createEvent({
            eventType: PatientEventType.MERGED,
            domain: Domain.MEDICAL_RECORDS,
            aggregateId: targetPatientId,
            aggregateType: 'Patient',
            payload: {
                sourcePatientId,
                targetPatientId,
                reason,
            } as PatientMergedPayload,
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: creatorId,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        // 2. Perform merge with event reference
        const result = await this.patientRepository.mergePatients(
            sourcePatientId,
            targetPatientId,
            reason,
            creatorId,
            event.id,
        );

        return result;
    }

    async restrictPatient(id: string, reason: string, userId: string) {
        const patient = await this.patientRepository.restrictPatient(id, reason, userId);

        // Emit domain event
        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: PatientEventType.RESTRICTED,
            domain: Domain.MEDICAL_RECORDS,
            aggregateId: id,
            aggregateType: 'Patient',
            payload: {
                patientId: id,
                reason,
                restrictedBy: userId,
            } as PatientRestrictedPayload,
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: userId,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return patient;
    }

    async unrestrictPatient(id: string, userId: string) {
        const patient = await this.patientRepository.unrestrictPatient(id, userId);

        // Emit domain event
        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: PatientEventType.UNRESTRICTED,
            domain: Domain.MEDICAL_RECORDS,
            aggregateId: id,
            aggregateType: 'Patient',
            payload: {
                patientId: id,
                unrestrictedBy: userId,
            } as PatientUnrestrictedPayload,
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: userId,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return patient;
    }
}
