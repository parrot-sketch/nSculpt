import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

@Injectable()
export class AccessControlService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = getPrismaClient();
    }

    /**
     * Enforce role-based access
     */
    async assertRole(userId: string, allowedRoles: string[]) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                roleAssignments: {
                    include: { role: true },
                    where: { isActive: true }
                }
            }
        });

        const userRoles = user?.roleAssignments.map(ra => ra.role.code) || [];
        const hasRole = allowedRoles.some(role => userRoles.includes(role));

        if (!hasRole) {
            throw new ForbiddenException(`Access denied. Allowed roles: ${allowedRoles.join(', ')}`);
        }
    }

    /**
     * Enforce resource ownership (e.g. Patient can only access their own data)
     */
    async assertOwnership(userId: string, patientId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { patientAccount: true }
        });

        // If user is a patient, check if they are the requested patient
        if (user?.patientAccount && user.patientAccount.id !== patientId) {
            throw new ForbiddenException('Access denied: You can only access your own data');
        }
    }
}
