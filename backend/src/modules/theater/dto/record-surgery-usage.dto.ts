import { IsString, IsUUID, IsNumber, IsOptional } from 'class-validator';

export class RecordSurgeryUsageDto {
  @IsUUID()
  inventoryItemId: string;

  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  theaterId?: string;
}









