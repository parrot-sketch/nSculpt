/**
 * Update Consultation Use Case
 * 
 * Application layer use case for updating clinical findings during active consultation.
 * Enforces business rules and state machine transitions.
 * 
 * @application-layer
 */

import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Consultation, ConsultationStatus } from '../../domain/entities/consultation.entity';
import { ConsultationStateMachineService } from '../../domain/services/consultation-state-machine.service';
import { UpdateConsultationDto } from '../dtos/update-consultation.dto';
import { ConsultationResponseDto } from '../dtos/consultation-response.dto';
import { ConsultationRepository } from '../../infrastructure/repositories/consultation.repository';

@Injectable()
export class UpdateConsultationUseCase {
  private readonly logger = new Logger(UpdateConsultationUseCase.name);

  constructor(
    private readonly consultationRepository: ConsultationRepository,
    private readonly stateMachine: ConsultationStateMachineService,
  ) {}

  async execute(
    consultationId: string,
    dto: UpdateConsultationDto,
    doctorId: string,
  ): Promise<ConsultationResponseDto> {
    this.logger.log(`Updating consultation ${consultationId}`);

    // 1. Load consultation
    const consultation = await this.consultationRepository.findById(
      consultationId,
    );
    if (!consultation) {
      throw new NotFoundException(
        `Consultation with ID ${consultationId} not found`,
      );
    }

    // 2. Validate doctor access
    if (!consultation.canBeAccessedBy(doctorId)) {
      throw new BadRequestException(
        'Only the assigned doctor can update this consultation',
      );
    }

    // 3. Validate consultation is editable
    if (!consultation.isEditable()) {
      throw new BadRequestException(
        `Cannot update consultation in ${consultation.status} status. Consultation must be SCHEDULED or IN_PROGRESS.`,
      );
    }

    // 4. Optimistic locking check
    if (dto.version !== undefined && dto.version !== consultation.version) {
      throw new ConflictException(
        'Consultation record was modified by another user. Please refresh and try again.',
      );
    }

    // 5. If consultation is SCHEDULED, start it automatically when updating
    if (consultation.status === ConsultationStatus.SCHEDULED) {
      consultation.start(doctorId);
    }

    // 6. Update clinical findings
    consultation.updateClinicalFindings({
      chiefComplaint: dto.chiefComplaint,
      diagnosis: dto.diagnosis,
      notes: dto.notes,
      doctorId,
    });

    // 7. Increment version for optimistic locking
    consultation.incrementVersion();

    // 8. Persist changes
    const updatedConsultation = await this.consultationRepository.update(
      consultation,
    );

    this.logger.log(`Consultation ${consultationId} updated successfully`);

    // 9. Map to response DTO
    return ConsultationResponseDto.fromEntity(updatedConsultation);
  }
}
