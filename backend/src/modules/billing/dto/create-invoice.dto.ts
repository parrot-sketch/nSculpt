import { IsString, IsUUID, IsOptional, IsDateString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BillLineItemDto {
  @IsUUID()
  billingCodeId: string;

  @IsString()
  description: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsDateString()
  serviceDate: string;

  @IsUUID()
  @IsOptional()
  caseId?: string;

  @IsUUID()
  @IsOptional()
  recordId?: string;
}

export class CreateInvoiceDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  @IsOptional()
  insurancePolicyId?: string;

  @IsDateString()
  billDate: string;

  @IsDateString()
  dueDate: string;

  @IsNumber()
  @IsOptional()
  tax?: number;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillLineItemDto)
  lineItems: BillLineItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}












