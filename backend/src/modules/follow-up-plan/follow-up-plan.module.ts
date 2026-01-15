import { Module } from '@nestjs/common';
import { FollowUpPlanService } from './services/follow-up-plan.service';
import { FollowUpPlanController } from './controllers/follow-up-plan.controller';
import { FollowUpPlanRepository } from './repositories/follow-up-plan.repository';
import { DomainEventService } from '../../services/domainEvent.service';
import { CorrelationService } from '../../services/correlation.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [FollowUpPlanController],
  providers: [
    FollowUpPlanService,
    FollowUpPlanRepository,
    DomainEventService,
    CorrelationService,
  ],
  exports: [FollowUpPlanService, FollowUpPlanRepository],
})
export class FollowUpPlanModule {}
