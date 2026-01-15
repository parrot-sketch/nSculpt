import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { PatientRepository } from '../repositories/patient.repository';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { Domain } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * Patient Invitation Service
 * 
 * Handles the workflow for admin-created patients to get portal access.
 * 
 * Flow:
 * 1. Admin creates patient record (no User account)
 * 2. Admin invites patient to create account
 * 3. System generates secure invitation token
 * 4. Patient receives email with invitation link
 * 5. Patient clicks link and sets password
 * 6. System creates User account and links to Patient via userId FK
 * 
 * Security:
 * - Tokens are cryptographically random (32 bytes = 256 bits)
 * - Tokens expire after 72 hours
 * - Tokens are single-use (cleared after acceptance)
 * - All actions are audit logged
 */
@Injectable()
export class PatientInvitationService {
  private readonly logger = new Logger(PatientInvitationService.name);
  private readonly prisma: PrismaClient;
  
  // Token expiry: 72 hours
  private readonly INVITATION_EXPIRY_HOURS = 72;

  constructor(
    private readonly patientRepository: PatientRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly dataAccessLogService: DataAccessLogService,
  ) {
    this.prisma = getPrismaClient();
  }

  /**
   * Invite a patient to create an account
   * 
   * Only for admin-created patients without a User account.
   * 
   * @param patientId - The patient ID to invite
   * @param invitedBy - The user ID of the admin sending the invitation
   * @returns Invitation details (token for email)
   */
  async invitePatient(patientId: string, invitedBy: string): Promise<{
    patient: any;
    invitation: {
      token: string;
      expiresAt: Date;
      message: string;
    };
  }> {
    // 1. Verify patient exists
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    // 2. Verify patient doesn't already have a User account
    if (patient.userId) {
      throw new ConflictException(
        `Patient ${patient.patientNumber} already has a portal account. No invitation needed.`
      );
    }

    // 3. Verify patient has an email address
    if (!patient.email) {
      throw new BadRequestException(
        `Patient ${patient.patientNumber} does not have an email address. ` +
        `Please update the patient record with an email before sending an invitation.`
      );
    }

    // 4. Check for existing valid invitation
    if (patient.invitationToken && patient.invitationExpiresAt) {
      const now = new Date();
      if (patient.invitationExpiresAt > now) {
        // Existing valid invitation - return it
        this.logger.log(`Patient ${patientId} already has a valid invitation, returning existing`);
        
        return {
          patient,
          invitation: {
            token: patient.invitationToken,
            expiresAt: patient.invitationExpiresAt,
            message: 'Existing invitation is still valid. You can resend the email.',
          },
        };
      }
    }

    // 5. Generate secure invitation token
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + this.INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

    // 6. Store invitation on patient record
    await this.patientRepository.setInvitation(patientId, token, expiresAt, invitedBy);

    // 7. Log invitation
    await this.dataAccessLogService.log({
      userId: invitedBy,
      resourceType: 'Patient',
      resourceId: patientId,
      action: 'PATIENT_INVITATION_SENT',
      reason: `Invitation sent to ${patient.email} for patient ${patient.patientNumber}`,
      accessedPHI: true,
      success: true,
    });

    // 8. Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'Patient.InvitationSent',
      domain: Domain.MEDICAL_RECORDS,
      aggregateId: patientId,
      aggregateType: 'Patient',
      payload: {
        patientId,
        patientNumber: patient.patientNumber,
        email: patient.email,
        invitedBy,
        expiresAt: expiresAt.toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: invitedBy,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // 9. TODO: Send email
    // await this.emailService.sendPatientInvitation(patient.email, {
    //   firstName: patient.firstName,
    //   token,
    //   expiresAt,
    // });

    this.logger.log(
      `Invitation sent to patient ${patientId} (${patient.email}), expires at ${expiresAt.toISOString()}`
    );

    // Reload patient to get updated invitation fields
    const updatedPatient = await this.patientRepository.findById(patientId);

    return {
      patient: updatedPatient,
      invitation: {
        token,
        expiresAt,
        message: `Invitation sent to ${patient.email}. Token expires in ${this.INVITATION_EXPIRY_HOURS} hours.`,
      },
    };
  }

  /**
   * Accept invitation and create User account
   * 
   * Called when patient clicks invitation link and sets password.
   * 
   * @param token - The invitation token
   * @param password - The password for the new account
   * @returns Created user and patient info
   */
  async acceptInvitation(
    token: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    user: any;
    patient: any;
    message: string;
  }> {
    // 1. Find patient by invitation token
    const patient = await this.patientRepository.findByInvitationToken(token);
    if (!patient) {
      throw new BadRequestException(
        'Invalid or expired invitation token. Please contact the front desk for a new invitation.'
      );
    }

    // 2. Verify token hasn't expired
    if (!patient.invitationExpiresAt || patient.invitationExpiresAt < new Date()) {
      // Clear expired invitation
      await this.patientRepository.clearInvitation(patient.id);
      
      throw new BadRequestException(
        'This invitation has expired. Please contact the front desk for a new invitation.'
      );
    }

    // 3. Verify patient doesn't already have a User account
    if (patient.userId) {
      await this.patientRepository.clearInvitation(patient.id);
      
      throw new ConflictException(
        'This patient already has a portal account. Please log in instead.'
      );
    }

    // 4. Verify email isn't already used by another user
    const existingUser = await this.prisma.user.findUnique({
      where: { email: patient.email! },
    });
    if (existingUser) {
      throw new ConflictException(
        'An account with this email already exists. Please contact the front desk.'
      );
    }

    // 5. Find PATIENT role
    const patientRole = await this.prisma.role.findUnique({
      where: { code: 'PATIENT' },
    });
    if (!patientRole) {
      throw new Error('PATIENT role not found. Please run database seed.');
    }

    // 6. Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // 7. Create User account in transaction
    const user = await this.prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: patient.email!,
          firstName: patient.firstName,
          lastName: patient.lastName,
          phone: patient.phone,
          passwordHash,
          isEmailVerified: true, // Verified via invitation flow
          isActive: true,
          createdBy: patient.invitedBy, // Track who initiated
        },
      });

      // Assign PATIENT role
      await tx.userRoleAssignment.create({
        data: {
          userId: newUser.id,
          roleId: patientRole!.id,
          isActive: true,
          createdBy: patient.invitedBy,
        },
      });

      // Link patient to user (CRITICAL: proper FK linkage)
      await tx.patient.update({
        where: { id: patient.id },
        data: {
          userId: newUser.id,
          invitationToken: null, // Clear invitation
          invitationExpiresAt: null,
        },
      });

      return newUser;
    });

    // 8. Log acceptance
    await this.dataAccessLogService.log({
      userId: user.id,
      resourceType: 'Patient',
      resourceId: patient.id,
      action: 'PATIENT_INVITATION_ACCEPTED',
      ipAddress,
      userAgent,
      reason: `Patient ${patient.patientNumber} accepted invitation and created account`,
      accessedPHI: true,
      success: true,
    });

    // 9. Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'Patient.InvitationAccepted',
      domain: Domain.MEDICAL_RECORDS,
      aggregateId: patient.id,
      aggregateType: 'Patient',
      payload: {
        patientId: patient.id,
        patientNumber: patient.patientNumber,
        userId: user.id,
        email: patient.email,
      },
      correlationId: context.correlationId || undefined,
      createdBy: user.id,
    });

    this.logger.log(
      `Patient ${patient.id} accepted invitation, User ${user.id} created`
    );

    // Reload patient to get updated userId
    const updatedPatient = await this.patientRepository.findById(patient.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      patient: updatedPatient,
      message: 'Account created successfully. You can now log in to the patient portal.',
    };
  }

  /**
   * Resend invitation (if expired or not received)
   */
  async resendInvitation(patientId: string, invitedBy: string): Promise<{
    patient: any;
    invitation: {
      token: string;
      expiresAt: Date;
      message: string;
    };
  }> {
    // Clear any existing invitation and send a new one
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    // Clear existing invitation
    await this.patientRepository.clearInvitation(patientId);

    // Send new invitation
    return this.invitePatient(patientId, invitedBy);
  }

  /**
   * Validate invitation token (check if valid without accepting)
   */
  async validateToken(token: string): Promise<{
    valid: boolean;
    patient?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    expiresAt?: Date;
    error?: string;
  }> {
    const patient = await this.patientRepository.findByInvitationToken(token);
    
    if (!patient) {
      return {
        valid: false,
        error: 'Invalid or expired invitation token',
      };
    }

    if (!patient.invitationExpiresAt || patient.invitationExpiresAt < new Date()) {
      return {
        valid: false,
        error: 'This invitation has expired',
      };
    }

    if (patient.userId) {
      return {
        valid: false,
        error: 'This patient already has an account',
      };
    }

    return {
      valid: true,
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email!,
      },
      expiresAt: patient.invitationExpiresAt,
    };
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(patientId: string, cancelledBy: string): Promise<void> {
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    if (!patient.invitationToken) {
      throw new BadRequestException('This patient does not have a pending invitation');
    }

    await this.patientRepository.clearInvitation(patientId);

    await this.dataAccessLogService.log({
      userId: cancelledBy,
      resourceType: 'Patient',
      resourceId: patientId,
      action: 'PATIENT_INVITATION_CANCELLED',
      reason: `Invitation cancelled for patient ${patient.patientNumber}`,
      accessedPHI: false,
      success: true,
    });

    this.logger.log(`Invitation cancelled for patient ${patientId} by ${cancelledBy}`);
  }

  /**
   * Generate cryptographically secure token
   */
  private generateSecureToken(): string {
    // 32 bytes = 256 bits of randomness
    return crypto.randomBytes(32).toString('hex');
  }
}
