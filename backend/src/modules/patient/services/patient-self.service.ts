import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PatientRepository } from '../repositories/patient.repository';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { PatientLifecycleService } from '../domain/services/patient-lifecycle.service';
import { PatientLifecycleState } from '../domain/patient-lifecycle-state.enum';
import { PatientEventType, PatientCreatedPayload, PatientUpdatedPayload } from '../events/patient.events';
import { Prisma, Domain } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import * as bcrypt from 'bcrypt';
import { CreatePatientDto } from '../dto/create-patient.dto';

@Injectable()
export class PatientSelfService {
    private readonly logger = new Logger(PatientSelfService.name);
    private readonly prisma = getPrismaClient();

    constructor(
        private readonly patientRepository: PatientRepository,
        private readonly domainEventService: DomainEventService,
        private readonly correlationService: CorrelationService,
        private readonly lifecycleService: PatientLifecycleService,
    ) { }

    async selfRegister(registerDto: any): Promise<{
        patient: any;
        account: {
            email: string;
            message: string;
        };
    }> {
        return await this.prisma.$transaction(async (tx) => {
            const patientRole = await tx.role.findUnique({
                where: { code: 'PATIENT' },
            });

            if (!patientRole) {
                throw new Error('PATIENT role not found. Please run database seed.');
            }

            const existingUser = await tx.user.findUnique({
                where: { email: registerDto.email },
            });

            if (existingUser) {
                throw new ConflictException('An account with this email already exists.');
            }

            const patientData = {
                firstName: registerDto.firstName,
                lastName: registerDto.lastName,
                email: registerDto.email,
                phone: registerDto.phone,
                dateOfBirth: registerDto.dateOfBirth,
                gender: registerDto.gender,
            };

            const password = registerDto.password || Math.random().toString(36).slice(-8);
            const passwordHash = await bcrypt.hash(password, 12);

            const user = await tx.user.create({
                data: {
                    email: registerDto.email,
                    firstName: registerDto.firstName,
                    lastName: registerDto.lastName,
                    phone: registerDto.phone,
                    passwordHash,
                    isEmailVerified: false,
                    isActive: true,
                },
            });

            await tx.userRoleAssignment.create({
                data: {
                    userId: user.id,
                    roleId: patientRole.id,
                    isActive: true,
                },
            });

            const patient = await this.patientRepository.create(
                {
                    ...patientData,
                    userId: user.id,
                } as CreatePatientDto & { userId: string },
                tx,
            );

            await this.lifecycleService.transitionPatient(
                patient.id,
                PatientLifecycleState.REGISTERED,
                { userId: user.id, role: 'PATIENT' },
                { reason: 'Patient self-registered' },
            );

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
                    firstName: registerDto.firstName,
                    lastName: registerDto.lastName,
                    email: registerDto.email,
                    dateOfBirth: registerDto.dateOfBirth,
                    selfRegistered: true,
                    userId: user.id,
                } as PatientCreatedPayload,
                correlationId: context.correlationId || undefined,
                causationId: context.causationId || undefined,
                createdBy: user.id,
                sessionId: context.sessionId || undefined,
                requestId: context.requestId || undefined,
            });

            return {
                patient,
                account: {
                    email: user.email,
                    message: 'Patient account created successfully. Please check your email for confirmation.',
                },
            };
        });
    }

    async getPatientByUserId(userId: string, email?: string) {
        let patient = await this.patientRepository.findByUserId(userId);

        if (!patient && email) {
            this.logger.log(`Patient not found by userId ${userId}, attempting lazy-link by email ${email}`);
            const patientByEmail = await this.patientRepository.findByEmail(email);

            if (patientByEmail && !patientByEmail.userId) {
                this.logger.log(`Found orphaned patient record for email ${email}, linking to userId ${userId}`);
                await this.patientRepository.linkToUserAccount(patientByEmail.id, userId);
                patient = await this.patientRepository.findByUserId(userId);
            }
        }

        if (!patient) {
            throw new NotFoundException(
                'Patient record not found. If you registered recently, please contact support.',
            );
        }

        return patient;
    }

    async updatePatientSelf(userId: string, email: string, updateDto: any) {
        const patient = await this.getPatientByUserId(userId, email);

        const allowedFields = [
            'firstName', 'lastName', 'middleName', 'email', 'phone', 'whatsapp',
            'address', 'city', 'state', 'zipCode', 'country', 'occupation',
            'nextOfKinName', 'nextOfKinFirstName', 'nextOfKinLastName',
            'nextOfKinRelationship', 'nextOfKinContact', 'emergencyContactName',
            'emergencyContactPhone',
        ];

        const filteredDto: any = {};
        for (const field of Object.keys(updateDto)) {
            if (allowedFields.includes(field)) {
                filteredDto[field] = updateDto[field];
            }
        }

        const updatedPatient = await this.patientRepository.update(patient.id, {
            ...filteredDto,
            updatedBy: userId,
        });

        // Emit domain event
        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: PatientEventType.UPDATED,
            domain: Domain.MEDICAL_RECORDS,
            aggregateId: patient.id,
            aggregateType: 'Patient',
            payload: {
                patientId: patient.id,
                changes: filteredDto,
                previousValues: patient,
                selfUpdate: true,
            } as PatientUpdatedPayload,
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: userId,
        });

        return updatedPatient;
    }
}
