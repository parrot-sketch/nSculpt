import { IsString, IsOptional } from 'class-validator';

export class LogoutDto {
  @IsString()
  @IsOptional()
  reason?: string;
}












