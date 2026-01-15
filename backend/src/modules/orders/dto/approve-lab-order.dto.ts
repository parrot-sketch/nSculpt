import { IsOptional, IsString } from 'class-validator';

export class ApproveLabOrderDto {
  @IsOptional()
  @IsString()
  notes?: string;
}









