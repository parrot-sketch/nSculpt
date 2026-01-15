import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ResultStatus } from '@prisma/client';

export class RecordResultDto {
  @IsString()
  @IsOptional()
  resultText?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsEnum(ResultStatus)
  @IsOptional()
  resultStatus?: ResultStatus;
}









