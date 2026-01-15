import { IsUUID } from 'class-validator';

export class CompleteAppointmentDto {
    @IsUUID()
    consultationId: string;
}
