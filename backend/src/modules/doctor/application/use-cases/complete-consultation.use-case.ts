/**
 * Complete Consultation Use Case
 * 
 * Application layer use case for completing a consultation with final diagnosis.
 * Enforces business rules and state machine transitions.
 * 
 * @application-layer
 */

import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Consultation, ConsultationStatus } from '../../domain/entities/consultation.entity';
import { ConsultationStateMachineService } from '../../domain/services/consultation-state-machine.service';
import { CompleteConsultationDto } from '../dtos/complete-consultation.dto';
import { ConsultationResponseDto } from '../dtos/consultation-response.dto';
import { ConsultationRepository } from '../../infrastructure/repositories/consultation.repository';

@Injectable()
export class CompleteConsultationUseCase {
  private readonly logger = new Logger(CompleteConsultationUseCase.name);

  constructor(
    private readonly consultationRepository: ConsultationRepository,
    private readonly stateMachine: ConsultationStateMachineService,
  ) {}

  async execute(
    consultationId: string,
    dto: CompleteConsultationDto,
    doctorId: string,
  ): Promise<ConsultationResponseDto> {
    this.logger.log(`Completing consultation ${consultationId}`);

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
        'Only the assigned doctor can complete this consultation',
      );
    }

    // 3. Validate consultation is in progress
    if (consultation.status !== ConsultationStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot complete consultation in ${consultation.status} status. Consultation must be IN_PROGRESS.`,
      );
    }

    // 4. Optimistic locking check
    if (dto.version !== undefined && dto.version !== consultation.version) {
      throw new ConflictException(
        'Consultation record was modified by another user. Please refresh and try again.',
      );
    }

    // 5. Validate follow-up date if required
    if (dto.followUpRequired && dto.followUpDate) {
      const followUpDate = new Date(dto.followUpDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (followUpDate <= today) {
        throw new BadRequestException(
          'Follow-up date must be in the future',
        );
      }
    }

    // 6. Complete consultation (domain logic)
    consultation.complete({
      doctorId,
      diagnosis: dto.diagnosis,
      notes: dto.notes,
      followUpRequired: dto.followUpRequired,
      followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
    });

    // 7. Increment version for optimistic locking
    consultation.incrementVersion();

    // 8. Persist changes
    const completedConsultation = await this.consultationRepository.update(
      consultation,
    );

    this.logger.log(
      `Consultation ${consultationId} completed successfully with status ${completedConsultation.status}`,
    );

    // 9. Map to response DTO
    return ConsultationResponseDto.fromEntity(completedConsultation);
  }
}
