import { IsOptional, IsString, IsUUID, IsEnum, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Domain } from '@prisma/client';

/**
 * Domain Event Query DTO
 * 
 * Query parameters for listing domain events with filters and pagination.
 * AC-002: View Domain Events
 */
export class DomainEventQueryDto {
  @IsString()
  @IsOptional()
  eventType?: string;

  @IsEnum(Domain)
  @IsOptional()
  domain?: Domain;

  @IsUUID()
  @IsOptional()
  aggregateId?: string;

  @IsString()
  @IsOptional()
  aggregateType?: string;

  @IsUUID()
  @IsOptional()
  createdBy?: string;

  @IsUUID()
  @IsOptional()
  correlationId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  skip?: number = 0;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  take?: number = 50;
}









