import { IsUUID, IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class AcknowledgeSectionDto {
  @IsUUID()
  instanceId: string;

  @IsUUID()
  @IsOptional()
  sectionId?: string;

  @IsUUID()
  @IsOptional()
  clauseId?: string;

  @IsBoolean()
  acknowledged: boolean;

  @IsBoolean()
  @IsOptional()
  understandingCheckPassed?: boolean;

  @IsString()
  @IsOptional()
  understandingResponse?: string; // "YES", "NEED_DISCUSSION", "NO"

  @IsBoolean()
  @IsOptional()
  discussionRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  discussionCompleted?: boolean;

  @IsUUID()
  @IsOptional()
  discussedWith?: string; // Clinician who discussed

  @IsString()
  @IsOptional()
  declinedReason?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  timeSpentSeconds?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  scrollDepth?: number; // 0-100 percentage
}









