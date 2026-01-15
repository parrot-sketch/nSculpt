import { IsString, IsUUID, IsNumber, IsOptional } from 'class-validator';

export class TransferStockDto {
  @IsUUID()
  itemId: string;

  @IsNumber()
  quantity: number;

  @IsUUID()
  fromLocationId: string;

  @IsUUID()
  toLocationId: string;

  @IsUUID()
  @IsOptional()
  batchId?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}









