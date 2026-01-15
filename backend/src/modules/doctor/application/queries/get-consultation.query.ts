/**
 * Get Consultation Query
 * 
 * Application layer query for retrieving a single consultation.
 * 
 * @application-layer
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Consultation } from '../../domain/entities/consultation.entity';
import { ConsultationResponseDto } from '../dtos/consultation-response.dto';
import { ConsultationRepository } from '../../infrastructure/repositories/consultation.repository';

@Injectable()
export class GetConsultationQuery {
  private readonly logger = new Logger(GetConsultationQuery.name);

  constructor(
    private readonly consultationRepository: ConsultationRepository,
  ) {}

  async execute(
    consultationId: string,
    doctorId?: string,
  ): Promise<ConsultationResponseDto> {
    this.logger.log(`Retrieving consultation ${consultationId}`);

    // 1. Load consultation
    const consultation = await this.consultationRepository.findById(
      consultationId,
    );
    if (!consultation) {
      throw new NotFoundException(
        `Consultation with ID ${consultationId} not found`,
      );
    }

    // 2. Validate doctor access if doctorId provided
    if (doctorId && !consultation.canBeAccessedBy(doctorId)) {
      throw new NotFoundException(
        `Consultation with ID ${consultationId} not found`,
      );
    }

    // 3. Map to response DTO
    return ConsultationResponseDto.fromEntity(consultation);
  }
}
