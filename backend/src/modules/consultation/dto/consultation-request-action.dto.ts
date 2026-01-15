import { IsString, IsOptional } from 'class-validator';

export class ApproveConsultationRequestDto {
    @IsString()
    @IsOptional()
    notes?: string;
}

export class RejectConsultationRequestDto {
    @IsString()
    rejectionReason: string;
}
