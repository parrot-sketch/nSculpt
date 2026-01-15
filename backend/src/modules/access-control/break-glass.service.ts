import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BreakGlassService {
    constructor(private prisma: PrismaService) { }

    /**
     * Log a break-glass event and return true if successful.
     * This should be called when a user explicitly requests emergency access.
     */
    async breakGlass(
        actorId: string,
        patientId: string,
        reason: string
    ): Promise<boolean> {
        if (!reason || reason.trim().length < 10) {
            throw new ForbiddenException('A valid reason (min 10 chars) is required for emergency access.');
        }

        // 1. Log the event locally
        await this.prisma.breakGlassLog.create({
            data: {
                actorId,
                patientId,
                reason,
                reviewed: false,
            },
        });

        // 2. TODO: Trigger alerts (Email/SMS to Security Officer)
        // this.alertService.notifySecurityOfficer(...)

        return true;
    }

    async getLogs(patientId?: string) {
        return this.prisma.breakGlassLog.findMany({
            where: patientId ? { patientId } : {},
            orderBy: { accessTime: 'desc' },
            take: 50,
            // include: {}
        });
    }
}
