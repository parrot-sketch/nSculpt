import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

/**
 * Update User DTO
 * 
 * All fields optional for partial updates.
 * Uses PartialType to inherit validation from CreateUserDto.
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsUUID()
  @IsOptional()
  roleId?: string;
}










