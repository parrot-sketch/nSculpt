import { PartialType } from '@nestjs/mapped-types';
import { CreateCaseDto } from './create-case.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdateCaseDto extends PartialType(CreateCaseDto) {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  reason?: string; // For status changes
}












