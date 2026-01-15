import { IsString, IsUUID, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class ReceiveStockDto {
  @IsUUID()
  itemId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  @IsOptional()
  unitCost?: number;

  @IsString()
  @IsOptional()
  batchNumber?: string;

  @IsString()
  @IsOptional()
  lotNumber?: string;

  @IsDateString()
  @IsOptional()
  manufactureDate?: string;

  @IsDateString()
  @IsOptional()
  expirationDate?: string;

  @IsUUID()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsOptional()
  purchaseOrderNumber?: string;

  @IsUUID()
  @IsOptional()
  toLocationId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}









