import { IsUUID, IsString, IsObject, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum StructuredDataType {
  BOTOX_TRACKING = 'BOTOX_TRACKING',
  CAPRINI_ASSESSMENT = 'CAPRINI_ASSESSMENT',
}

export class CreateStructuredDataDto {
  @IsUUID()
  instanceId: string;

  @IsEnum(StructuredDataType)
  dataType: StructuredDataType;

  @IsString()
  schema: string; // JSON schema as string

  @IsObject()
  data: any; // JSON data object
}









