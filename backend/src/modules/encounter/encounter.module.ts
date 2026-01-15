import { Module } from '@nestjs/common';
import { EncounterService } from './encounter.service';
import { EncounterController } from './encounter.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        PrismaModule,
        AuditModule,
        AuthModule,
    ],
    controllers: [EncounterController],
    providers: [EncounterService],
    exports: [EncounterService],
})
export class EncounterModule { }
