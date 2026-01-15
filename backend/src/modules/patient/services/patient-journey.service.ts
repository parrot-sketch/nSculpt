import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, JourneyStage } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

import { AccessControlService } from '../../auth/services/access-control.service';

@Injectable()
export class PatientJourneyService {
    private prisma: PrismaClient;
    private accessControl: AccessControlService;

    constructor() {
        this.prisma = getPrismaClient();
        this.accessControl = new AccessControlService();
    }

    // Allowed transitions map
    private readonly ALLOWED_TRANSITIONS: Record<JourneyStage, JourneyStage[]> = {
        [JourneyStage.DISCOVERY]: [JourneyStage.ENGAGEMENT, JourneyStage.LEAD, JourneyStage.REGISTERED],
        [JourneyStage.ENGAGEMENT]: [JourneyStage.LEAD, JourneyStage.REGISTERED, JourneyStage.APPOINTMENT_REQUESTED],
        [JourneyStage.LEAD]: [JourneyStage.REGISTERED],
        [JourneyStage.REGISTERED]: [JourneyStage.APPOINTMENT_REQUESTED, JourneyStage.APPOINTMENT_BOOKED],
        [JourneyStage.APPOINTMENT_REQUESTED]: [JourneyStage.APPOINTMENT_SCHEDULED],
        [JourneyStage.APPOINTMENT_SCHEDULED]: [JourneyStage.APPOINTMENT_CONFIRMED],
        [JourneyStage.APPOINTMENT_CONFIRMED]: [JourneyStage.APPOINTMENT_BOOKED, JourneyStage.CHECKED_IN],
        [JourneyStage.APPOINTMENT_BOOKED]: [JourneyStage.CHECKED_IN],
        [JourneyStage.CHECKED_IN]: [JourneyStage.CONSULTED],
        [JourneyStage.CONSULTED]: [JourneyStage.TREATMENT_PLAN, JourneyStage.COMPLETED],
        [JourneyStage.TREATMENT_PLAN]: [JourneyStage.PROCEDURE_SCHEDULED],
        [JourneyStage.PROCEDURE_SCHEDULED]: [JourneyStage.PROCEDURE_DONE],
        [JourneyStage.PROCEDURE_DONE]: [JourneyStage.FOLLOW_UP],
        [JourneyStage.FOLLOW_UP]: [JourneyStage.MAINTENANCE],
        [JourneyStage.MAINTENANCE]: [JourneyStage.CLOSED],
        [JourneyStage.COMPLETED]: [JourneyStage.FOLLOW_UP, JourneyStage.CLOSED],
        [JourneyStage.CLOSED]: [], // Terminal state
    };

    /**
     * Advance patient journey stage with validation and audit history
     */
    async advanceJourney(
        patientId: string,
        nextStage: JourneyStage,
        triggeredByUserId: string,
        sourceEntity?: { type: string; id: string }
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            // 1. Get current journey
            let journey = await tx.patientJourney.findUnique({
                where: { patientId },
            });

            // 2. If no journey exists, initialize with LEAD or requested stage if it's the first step
            if (!journey) {
                if (nextStage !== JourneyStage.LEAD && nextStage !== JourneyStage.REGISTERED) {
                    throw new BadRequestException(`Cannot start journey at ${nextStage}. Must start at LEAD or REGISTERED.`);
                }

                journey = await tx.patientJourney.create({
                    data: {
                        patientId,
                        currentStage: nextStage,
                        lastUpdatedBy: triggeredByUserId,
                    },
                });

                // Record history
                await tx.patientJourneyHistory.create({
                    data: {
                        journeyId: journey.id,
                        fromStage: null as any, // Starting point
                        toStage: nextStage,
                        changedBy: triggeredByUserId,
                        reason: 'Journey initialized',
                        sourceType: sourceEntity?.type,
                        sourceId: sourceEntity?.id,
                    },
                });

                return;
            }

            const currentStage = journey.currentStage;

            // 3. Prevent same stage transition
            if (currentStage === nextStage) {
                return;
            }

            // 4. Validate transition
            const allowedNext = this.ALLOWED_TRANSITIONS[currentStage];
            if (!allowedNext || !allowedNext.includes(nextStage)) {
                throw new BadRequestException(
                    `Illegal transition: Cannot move from ${currentStage} to ${nextStage}.`
                );
            }

            // 5. Update journey
            await tx.patientJourney.update({
                where: { id: journey.id },
                data: {
                    currentStage: nextStage,
                    lastUpdatedBy: triggeredByUserId,
                },
            });

            // 6. Record history (Audit)
            await tx.patientJourneyHistory.create({
                data: {
                    journeyId: journey.id,
                    fromStage: currentStage,
                    toStage: nextStage,
                    changedBy: triggeredByUserId,
                    reason: `Advanced to ${nextStage}`,
                    sourceType: sourceEntity?.type,
                    sourceId: sourceEntity?.id,
                },
            });
        });
    }

    /**
     * Get patient's current journey status
     */
    async getJourneyStatus(patientId: string) {
        return this.prisma.patientJourney.findUnique({
            where: { patientId },
            include: {
                history: {
                    orderBy: { changedAt: 'desc' },
                    take: 10,
                },
            },
        });
    }
}
