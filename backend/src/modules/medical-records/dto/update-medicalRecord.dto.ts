import { PartialType } from '@nestjs/mapped-types';
import { CreateMedicalRecordDto } from './create-medicalRecord.dto';

export class UpdateMedicalRecordDto extends PartialType(CreateMedicalRecordDto) {}












