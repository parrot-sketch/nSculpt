import { IsString } from 'class-validator';

export class AddAddendumDto {
  @IsString()
  content: string;
}









