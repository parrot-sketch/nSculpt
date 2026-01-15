import { Module } from '@nestjs/common';
import { AuditController } from './controllers/audit.controller';
import { DataAccessLogService } from './services/dataAccessLog.service';
import { DataAccessLogRepository } from './repositories/dataAccessLog.repository';
import { RlsValidationService } from './services/rlsValidation.service';
// Note: AuthModule is @Global(), so IdentityContextService is available without explicit import

@Module({
  controllers: [AuditController],
  providers: [DataAccessLogService, DataAccessLogRepository, RlsValidationService],
  exports: [DataAccessLogService, DataAccessLogRepository, RlsValidationService],
})
export class AuditModule {}

