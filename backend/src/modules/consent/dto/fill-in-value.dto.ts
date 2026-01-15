import { IsUUID, IsString, IsOptional } from 'class-validator';

export class CreateFillInValueDto {
  @IsUUID()
  instanceId: string;

  @IsUUID()
  fieldId: string;

  @IsString()
  value: string;
}

export class UpdateFillInValueDto {
  @IsString()
  value: string;
}









