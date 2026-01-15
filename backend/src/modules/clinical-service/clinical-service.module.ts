import { Module } from '@nestjs/common';
import { ClinicalServiceController } from './controllers/clinical-service.controller';
import { ClinicalServiceService } from './services/clinical-service.service';
import { ClinicalServiceRepository } from './repositories/clinical-service.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [AuthModule],
    controllers: [ClinicalServiceController],
    providers: [ClinicalServiceService, ClinicalServiceRepository],
    exports: [ClinicalServiceService],
})
export class ClinicalServiceModule { }
