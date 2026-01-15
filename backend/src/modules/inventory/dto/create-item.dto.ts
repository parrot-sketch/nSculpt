import { IsString, IsUUID, IsOptional, IsBoolean, IsNumber, IsDecimal } from 'class-validator';

export class CreateItemDto {
  @IsString()
  itemNumber: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  categoryId: string;

  @IsString()
  itemType: string;

  @IsUUID()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsOptional()
  vendorPartNumber?: string;

  @IsString()
  @IsOptional()
  manufacturerName?: string;

  @IsNumber()
  @IsOptional()
  unitCost?: number;

  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @IsString()
  unitOfMeasure: string;

  @IsBoolean()
  @IsOptional()
  isBillable?: boolean;
}












