import { IsString, IsUUID, IsNumber, IsOptional } from 'class-validator';

export class AdjustStockDto {
  @IsUUID()
  itemId: string;

  @IsNumber()
  quantityAdjustment: number; // Positive = increase, Negative = decrease

  @IsUUID()
  @IsOptional()
  batchId?: string;

  @IsUUID()
  @IsOptional()
  locationId?: string;

  @IsString()
  reason: string; // Required for audit - why is this adjustment needed?
}

