import { IsOptional, IsString } from 'class-validator';

export class ArchiveNoteDto {
  @IsOptional()
  @IsString()
  reason?: string;
}









