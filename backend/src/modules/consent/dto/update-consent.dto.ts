import { PartialType } from '@nestjs/mapped-types';
import { CreateConsentDto } from './create-consent.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdateConsentDto extends PartialType(CreateConsentDto) {
  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  allSectionsAcknowledged?: boolean;

  @IsOptional()
  understandingChecksPassed?: boolean;
}




