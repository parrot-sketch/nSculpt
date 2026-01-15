import { IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';

export class CreateLabOrderDto {
  @IsUUID()
  consultationId: string;

  @IsString()
  testName: string;

  @IsString()
  @IsEnum(['ROUTINE', 'URGENT'])
  priority: string;
}









