import { Module } from '@nestjs/common';
import { ClinicalService } from './clinical.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StartupSafetyCheckService } from './services/startup-safety.service';

@Module({
    providers: [ClinicalService, PrismaService, StartupSafetyCheckService],
    exports: [ClinicalService],
})
export class ClinicalModule { }
