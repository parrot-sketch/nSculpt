import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { NoteType } from '@prisma/client';

export class ListNotesDto {
  @IsOptional()
  @IsEnum(NoteType)
  noteType?: NoteType;

  @IsOptional()
  @IsBoolean()
  includeArchived?: boolean;
}









