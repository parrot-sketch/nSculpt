import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

/**
 * Reverse Merge DTO
 * 
 * Validation for reversing a medical record merge.
 * CD-002: Reverse Medical Record Merge
 */
export class ReverseMergeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason: string; // Required reason for reversal
}









