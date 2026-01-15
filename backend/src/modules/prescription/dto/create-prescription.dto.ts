import { IsString, IsUUID, IsNumber, IsOptional, IsEnum, IsInt } from 'class-validator';
import { MedicationType } from '@prisma/client';

export class CreatePrescriptionDto {
  @IsUUID()
  consultationId: string;

  @IsString()
  medicationName: string;

  @IsEnum(MedicationType)
  medicationType: MedicationType;

  @IsString()
  dosage: string;

  @IsString()
  frequency: string;

  @IsNumber()
  quantity: number;

  @IsUUID()
  @IsOptional()
  inventoryItemId?: string; // Link to inventory item if tracked

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  duration?: string;

  @IsInt()
  @IsOptional()
  refills?: number;
}









