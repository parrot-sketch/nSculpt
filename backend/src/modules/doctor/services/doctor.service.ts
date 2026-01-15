import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DoctorRepository } from '../repositories/doctor.repository';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { AssignPatientDto, UnassignPatientDto } from '../dto/assign-patient.dto';
import { Domain } from '@prisma/client';

/**
 * Doctor Service
 * 
 * Business logic for doctor workflows:
 * - Doctor profile management
 * - Patient assignments
 * - Dashboard statistics
 * - Consultation management
 */
@Injectable()
export class DoctorService {
  constructor(
    private readonly doctorRepository: DoctorRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly dataAccessLogService: DataAccessLogService,
  ) {}

  /**
   * Get doctor profile by user ID
   */
  async getProfile(userId: string) {
    const doctor = await this.doctorRepository.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundException(`Doctor with user ID ${userId} not found`);
    }

    // Check if user has DOCTOR or SURGEON role
    const hasDoctorRole = doctor.roleAssignments.some(
      (assignment) =>
        assignment.role.code === 'DOCTOR' || assignment.role.code === 'SURGEON',
    );

    if (!hasDoctorRole) {
      throw new NotFoundException(`User ${userId} is not a doctor or surgeon`);
    }

    // Log access
    await this.dataAccessLogService.log({
      userId,
      resourceType: 'Doctor',
      resourceId: userId,
      action: 'READ',
      reason: 'Doctor viewed own profile',
      accessedPHI: false,
      success: true,
    });

    return doctor;
  }

  /**
   * Get all doctors
   */
  async getAllDoctors(userId: string) {
    const doctors = await this.doctorRepository.findAllDoctors();

    // Log access
    await this.dataAccessLogService.log({
      userId,
      resourceType: 'Doctor',
      resourceId: 'all',
      action: 'LIST',
      reason: 'Listed all doctors',
      accessedPHI: false,
      success: true,
    });

    return doctors;
  }

  /**
   * Get assigned patients
   */
  async getAssignedPatients(doctorId: string, skip?: number, take?: number) {
    const result = await this.doctorRepository.getAssignedPatients(
      doctorId,
      skip,
      take,
    );

    // Log access
    await this.dataAccessLogService.log({
      userId: doctorId,
      resourceType: 'Patient',
      resourceId: 'assigned',
      action: 'LIST',
      reason: 'Doctor viewed assigned patients',
      accessedPHI: true,
      success: true,
    });

    return result;
  }

  /**
   * Get consultations
   */
  async getConsultations(doctorId: string, skip?: number, take?: number) {
    const result = await this.doctorRepository.getConsultations(
      doctorId,
      skip,
      take,
    );

    // Log access
    await this.dataAccessLogService.log({
      userId: doctorId,
      resourceType: 'Consultation',
      resourceId: 'all',
      action: 'LIST',
      reason: 'Doctor viewed consultations',
      accessedPHI: true,
      success: true,
    });

    return result;
  }

  /**
   * Get upcoming surgeries
   */
  async getUpcomingSurgeries(doctorId: string) {
    const surgeries = await this.doctorRepository.getUpcomingSurgeries(doctorId);

    // Log access
    await this.dataAccessLogService.log({
      userId: doctorId,
      resourceType: 'SurgicalCase',
      resourceId: 'upcoming',
      action: 'LIST',
      reason: 'Doctor viewed upcoming surgeries',
      accessedPHI: true,
      success: true,
    });

    return surgeries;
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(doctorId: string) {
    const stats = await this.doctorRepository.getDashboardStats(doctorId);

    // Log access
    await this.dataAccessLogService.log({
      userId: doctorId,
      resourceType: 'Doctor',
      resourceId: doctorId,
      action: 'READ',
      reason: 'Doctor viewed dashboard stats',
      accessedPHI: false,
      success: true,
    });

    return stats;
  }

  /**
   * Assign patient to doctor
   */
  async assignPatient(assignDto: AssignPatientDto, currentUserId: string) {
    const targetDoctorId = assignDto.doctorId || currentUserId;

    // Verify target doctor exists and is a doctor/surgeon
    const doctor = await this.doctorRepository.findByUserId(targetDoctorId);
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${targetDoctorId} not found`);
    }

    const hasDoctorRole = doctor.roleAssignments.some(
      (assignment) =>
        assignment.role.code === 'DOCTOR' || assignment.role.code === 'SURGEON',
    );

    if (!hasDoctorRole) {
      throw new BadRequestException(`User ${targetDoctorId} is not a doctor or surgeon`);
    }

    // Assign patient
    const result = await this.doctorRepository.assignPatient(
      assignDto.patientId,
      targetDoctorId,
      currentUserId,
      assignDto.reason,
    );

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'PATIENT_ASSIGNED',
      domain: Domain.MEDICAL_RECORDS,
      aggregateId: assignDto.patientId,
      aggregateType: 'Patient',
      payload: {
        patientId: assignDto.patientId,
        doctorId: targetDoctorId,
        assignedBy: currentUserId,
        reason: assignDto.reason,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: currentUserId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Log access
    await this.dataAccessLogService.log({
      userId: currentUserId,
      resourceType: 'Patient',
      resourceId: assignDto.patientId,
      action: 'UPDATE',
      reason: `Patient assigned to doctor ${targetDoctorId}: ${assignDto.reason || 'No reason provided'}`,
      accessedPHI: true,
      success: true,
    });

    return result;
  }

  /**
   * Unassign patient from doctor
   */
  async unassignPatient(unassignDto: UnassignPatientDto, currentUserId: string) {
    // Verify patient is assigned to current doctor
    const patient = await this.doctorRepository.getPatientById(unassignDto.patientId);
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${unassignDto.patientId} not found`);
    }

    if (patient.doctorInChargeId !== currentUserId) {
      throw new ForbiddenException(
        `Patient is not assigned to you. Only the assigned doctor or ADMIN can unassign.`,
      );
    }

    // Unassign patient
    const result = await this.doctorRepository.unassignPatient(
      unassignDto.patientId,
      currentUserId,
      unassignDto.reason,
    );

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'PATIENT_UNASSIGNED',
      domain: Domain.MEDICAL_RECORDS,
      aggregateId: unassignDto.patientId,
      aggregateType: 'Patient',
      payload: {
        patientId: unassignDto.patientId,
        previousDoctorId: patient.doctorInChargeId,
        unassignedBy: currentUserId,
        reason: unassignDto.reason,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: currentUserId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Log access
    await this.dataAccessLogService.log({
      userId: currentUserId,
      resourceType: 'Patient',
      resourceId: unassignDto.patientId,
      action: 'UPDATE',
      reason: `Patient unassigned from doctor: ${unassignDto.reason || 'No reason provided'}`,
      accessedPHI: true,
      success: true,
    });

    return result;
  }
}

