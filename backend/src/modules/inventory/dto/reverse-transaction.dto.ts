import { IsString, IsUUID } from 'class-validator';

export class ReverseTransactionDto {
  @IsUUID()
  transactionId: string;

  @IsString()
  reason: string; // Required for audit when reversing
}









