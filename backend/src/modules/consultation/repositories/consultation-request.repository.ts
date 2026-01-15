import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient, ConsultationRequestStatus } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

@Injectable()
export class ConsultationRequestRepository {
    private readonly prisma: PrismaClient;

    constructor() {
        this.prisma = getPrismaClient();
    }

    async create(data: {
        patientId: string;
        specialistId?: string;
        reason?: string;
        preferredDate?: Date;
        createdBy: string;
    }) {
        return await this.prisma.consultationRequest.create({
            data: {
                patientId: data.patientId,
                specialistId: data.specialistId,
                reason: data.reason,
                preferredDate: data.preferredDate,
                status: ConsultationRequestStatus.PENDING,
                createdBy: data.createdBy,
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        patientNumber: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                specialist: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
    }

    async findById(id: string) {
        const request = await this.prisma.consultationRequest.findUnique({
            where: { id },
            include: {
                patient: {
                    select: {
                        id: true,
                        patientNumber: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                specialist: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                approvedByUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                rejectedByUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        if (!request) {
            throw new NotFoundException(`Consultation request with ID ${id} not found`);
        }

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
        const where: any = {};

        if (filters?.patientId) {
            where.patientId = filters.patientId;
        }

        if (filters?.specialistId) {
            where.specialistId = filters.specialistId;
        }

        if (filters?.status) {
            where.status = filters.status;
        }

        const [data, total] = await Promise.all([
            this.prisma.consultationRequest.findMany({
                where,
                skip,
                take,
                orderBy: {
                    requestedAt: 'desc',
                },
                include: {
                    patient: {
                        select: {
                            id: true,
                            patientNumber: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                        },
                    },
                    specialist: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            }),
            this.prisma.consultationRequest.count({ where }),
        ]);

        return { data, total };
    }

    async approve(id: string, approvedBy: string) {
        const request = await this.findById(id);

        if (request.status !== ConsultationRequestStatus.PENDING) {
            throw new BadRequestException(
                `Cannot approve consultation request with status ${request.status}`
            );
        }

        return await this.prisma.consultationRequest.update({
            where: { id },
            data: {
                status: ConsultationRequestStatus.APPROVED,
                approvedAt: new Date(),
                approvedBy,
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        patientNumber: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                specialist: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
    }

    async reject(id: string, rejectedBy: string, rejectionReason: string) {
        const request = await this.findById(id);

        if (request.status !== ConsultationRequestStatus.PENDING) {
            throw new BadRequestException(
                `Cannot reject consultation request with status ${request.status}`
            );
        }

        return await this.prisma.consultationRequest.update({
            where: { id },
            data: {
                status: ConsultationRequestStatus.REJECTED,
                rejectedAt: new Date(),
                rejectedBy,
                rejectionReason,
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        patientNumber: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                specialist: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
    }
}
