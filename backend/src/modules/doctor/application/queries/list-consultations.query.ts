/**
 * List Consultations Query
 * 
 * Application layer query for retrieving a paginated list of consultations.
 * 
 * @application-layer
 */

import { Injectable, Logger } from '@nestjs/common';
import { Consultation } from '../../domain/entities/consultation.entity';
import { ConsultationListResponseDto, ConsultationResponseDto } from '../dtos/consultation-response.dto';
import { ConsultationRepository } from '../../infrastructure/repositories/consultation.repository';

@Injectable()
export class ListConsultationsQuery {
  private readonly logger = new Logger(ListConsultationsQuery.name);

  constructor(
    private readonly consultationRepository: ConsultationRepository,
  ) {}

  async execute(params: {
    skip?: number;
    take?: number;
    doctorId?: string;
    patientId?: string;
    status?: string;
  }): Promise<ConsultationListResponseDto> {
    this.logger.log(
      `Listing consultations with filters: ${JSON.stringify(params)}`,
    );

    // 1. Query consultations
    const result = await this.consultationRepository.findAll({
      skip: params.skip,
      take: params.take,
      doctorId: params.doctorId,
      patientId: params.patientId,
      status: params.status,
    });

    // 2. Map to response DTOs
    const data = result.data.map((consultation) =>
      ConsultationResponseDto.fromEntity(consultation),
    );

    // 3. Build pagination metadata
    const limit = params.take || 10;
    const offset = params.skip || 0;
    const hasMore = offset + data.length < result.total;

    return {
      data,
      total: result.total,
      limit,
      offset,
      hasMore,
    };
  }
}
