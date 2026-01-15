/**
 * Consultation Response DTO
 * 
 * Output format for consultation data.
 * Maps domain entity to API response.
 * 
 * @application-layer
 */

import { Consultation, ConsultationStatus, ConsultationType } from '../../domain/entities/consultation.entity';

export class ConsultationResponseDto {
  id: string;

  consultationNumber: string;

  patientId: string;

  doctorId: string;

  appointmentId: string;

  consultationType: ConsultationType;

  consultationDate: Date;

  status: ConsultationStatus;

  chiefComplaint?: string;

  diagnosis?: string;

  notes?: string;

  followUpRequired: boolean;

  followUpDate?: Date;

  billable: boolean;

  billed: boolean;

  completedAt?: Date;

  createdAt: Date;

  updatedAt: Date;

  version: number;

  /**
   * Map domain entity to DTO
   */
  static fromEntity(consultation: Consultation): ConsultationResponseDto {
    return {
      id: consultation.id,
      consultationNumber: consultation.consultationNumber,
      patientId: consultation.patientId,
      doctorId: consultation.doctorId,
      appointmentId: consultation.appointmentId,
      consultationType: consultation.consultationType,
      consultationDate: consultation.consultationDate,
      status: consultation.status,
      chiefComplaint: consultation.chiefComplaint,
      diagnosis: consultation.diagnosis,
      notes: consultation.notes,
      followUpRequired: consultation.followUpRequired,
      followUpDate: consultation.followUpDate,
      billable: consultation.billable,
      billed: consultation.billed,
      completedAt: consultation.completedAt,
      createdAt: consultation.toObject().createdAt,
      updatedAt: consultation.toObject().updatedAt,
      version: consultation.version,
    };
  }
}

export class ConsultationListResponseDto {
  data: ConsultationResponseDto[];

  total: number;

  limit: number;

  offset: number;

  hasMore: boolean;
}


