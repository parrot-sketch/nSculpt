import { IsNumber, IsOptional, IsString } from 'class-validator';

export class DispensePrescriptionDto {
  @IsNumber()
  quantityToDispense: number;

  @IsString()
  @IsOptional()
  notes?: string;
}









