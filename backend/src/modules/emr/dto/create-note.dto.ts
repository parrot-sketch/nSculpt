import { IsString, IsUUID, IsEnum } from 'class-validator';
import { NoteType } from '@prisma/client';

export class CreateNoteDto {
  @IsUUID()
  consultationId: string;

  @IsEnum(NoteType)
  noteType: NoteType;

  @IsString()
  content: string;
}









