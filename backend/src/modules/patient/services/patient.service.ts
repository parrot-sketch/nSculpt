import { Injectable } from '@nestjs/common';
import { PatientCoreService } from './patient-core.service';
import { PatientManagementService } from './patient-management.service';
import { PatientSelfService } from './patient-self.service';
import { CreatePatientDto } from '../dto/create-patient.dto';
import { UpdatePatientDto } from '../dto/update-patient.dto';

@Injectable()
export class PatientService {
  constructor(
    private readonly coreService: PatientCoreService,
    private readonly managementService: PatientManagementService,
    private readonly selfService: PatientSelfService,
  ) { }

  // --- Core CRUD ---
  async findAll(skip?: number, take?: number, userId?: string) {
    return this.coreService.findAll(skip, take, userId);
  }

  async search(query: string, skip?: number, take?: number) {
    return this.coreService.search(query, skip, take);
  }

  async findOne(id: string, userId?: string) {
    return this.coreService.findOne(id, userId);
  }

  async create(createPatientDto: CreatePatientDto, user: { id: string; roles?: string[] } | string) {
    const creatorId = typeof user === 'string' ? user : user.id;
    return this.coreService.create(createPatientDto, creatorId);
  }

  async update(id: string, updatePatientDto: UpdatePatientDto, userId: string) {
    return this.coreService.update(id, updatePatientDto, userId);
  }

  async remove(id: string, userId: string) {
    return this.coreService.remove(id, userId);
  }

  // --- Clinical Data ---
  async getConsentsByPatient(patientId: string, userId: string, includeArchived: boolean = false) {
    return this.coreService.getConsentsByPatient(patientId, userId, includeArchived);
  }

  async getActiveConsents(patientId: string, userId: string) {
    return this.coreService.getActiveConsents(patientId, userId);
  }

  async getRevokedConsents(patientId: string, userId: string) {
    return this.coreService.getRevokedConsents(patientId, userId);
  }

  // --- Administrative Management ---
  async mergePatients(sourcePatientId: string, targetPatientId: string, reason?: string, userId?: string) {
    return this.managementService.mergePatients(sourcePatientId, targetPatientId, reason, userId);
  }

  async restrictPatient(id: string, reason: string, userId: string) {
    return this.managementService.restrictPatient(id, reason, userId);
  }

  async unrestrictPatient(id: string, userId: string) {
    return this.managementService.unrestrictPatient(id, userId);
  }

  // --- Self-Service & Portal ---
  async selfRegister(registerDto: any) {
    return this.selfService.selfRegister(registerDto);
  }

  async getPatientByUserId(userId: string, email?: string) {
    return this.selfService.getPatientByUserId(userId, email);
  }

  async updatePatientSelf(userId: string, email: string, updateDto: any) {
    return this.selfService.updatePatientSelf(userId, email, updateDto);
  }
}
