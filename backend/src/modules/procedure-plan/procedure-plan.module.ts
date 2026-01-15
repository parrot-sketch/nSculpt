import { Module } from '@nestjs/common';
import { ProcedurePlanService } from './services/procedure-plan.service';
import { ProcedurePlanController } from './controllers/procedure-plan.controller';
import { ProcedurePlanRepository } from './repositories/procedure-plan.repository';
import { DomainEventService } from '../../services/domainEvent.service';
import { CorrelationService } from '../../services/correlation.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [ProcedurePlanController],
  providers: [
    ProcedurePlanService,
    ProcedurePlanRepository,
    DomainEventService,
    CorrelationService,
  ],
  exports: [ProcedurePlanService, ProcedurePlanRepository],
})
export class ProcedurePlanModule {}
