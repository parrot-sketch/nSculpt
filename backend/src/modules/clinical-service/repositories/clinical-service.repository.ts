import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

@Injectable()
export class ClinicalServiceRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = getPrismaClient();
    }

    async findAll() {
        return (this.prisma as any).clinicalService.findMany({
            where: { isEnabled: true },
            orderBy: { displayOrder: 'asc' },
        });
    }

    async findByCategory(category: string) {
        return (this.prisma as any).clinicalService.findMany({
            where: { category, isEnabled: true },
            orderBy: { displayOrder: 'asc' },
        });
    }

    async findByCode(code: string) {
        return (this.prisma as any).clinicalService.findUnique({
            where: { code },
        });
    }
}
