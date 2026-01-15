import { IsString, IsUUID, IsNumber, IsOptional } from 'class-validator';

export class ConsumeStockDto {
  @IsUUID()
  itemId: string;

  @IsNumber()
  quantity: number;

  @IsUUID()
  @IsOptional()
  consultationId?: string;

  @IsUUID()
  @IsOptional()
  caseId?: string;

  @IsUUID()
  @IsOptional()
  patientId?: string;

  @IsUUID()
  @IsOptional()
  fromLocationId?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}









