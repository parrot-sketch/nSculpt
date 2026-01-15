import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateConsultationRequestDto {
    @IsUUID()
    patientId: string;

    @IsUUID()
    @IsOptional()
    specialistId?: string;

    @IsString()
    @IsOptional()
    reason?: string;

    @IsDateString()
    @IsOptional()
    preferredDate?: string;
}
