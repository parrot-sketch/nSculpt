import { IsString, IsUUID, IsNumber, IsOptional } from 'class-validator';

export class LabSupplyConfigDto {
  @IsUUID()
  inventoryItemId: string;

  @IsNumber()
  quantityPerOrder: number; // How much of this supply is consumed per lab order
}









