import { IsUUID, IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

/**
 * Merge Medical Records DTO
 * 
 * Validation for merging two medical records.
 * CD-001: Merge Medical Records
 */
export class MergeRecordsDto {
  @IsUUID()
  targetRecordId: string; // Record to merge INTO (primary record)

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason: string; // Required reason for merge
}









