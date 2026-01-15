import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient, Prisma, PatientStatus } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreatePatientDto } from '../dto/create-patient.dto';
import { UpdatePatientDto } from '../dto/update-patient.dto';

@Injectable()
export class PatientRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Generate unique patient number (MRN) in format: MRN-YYYY-XXXXX
   * Format: MRN-2026-00001, MRN-2026-00002, etc.
   */
  private async generatePatientNumber(tx?: Prisma.TransactionClient): Promise<string> {
    const prisma = tx || this.prisma;
    const year = new Date().getFullYear();
    const prefix = `MRN-${year}-`;

    const lastPatient = await prisma.patient.findFirst({
      where: {
        patientNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        patientNumber: 'desc',
      },
      select: {
        patientNumber: true,
      },
    });

    let nextNumber = 1;
    if (lastPatient) {
      // Extract number from last patient number (e.g., "MRN-2026-00042" -> 42)
      const match = lastPatient.patientNumber.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format with leading zeros (5 digits)
    const formattedNumber = nextNumber.toString().padStart(5, '0');
    return `${prefix}${formattedNumber}`;
  }

  /**
   * Generate unique file number in format: NS001, NS002, NS003, etc.
   * Format: NS followed by 3-digit sequential number (first patient is NS001)
   */
  private async generateFileNumber(tx?: Prisma.TransactionClient): Promise<string> {
    const prisma = tx || this.prisma;
    const lastPatient = await prisma.patient.findFirst({
      where: {
        fileNumber: {
          startsWith: 'NS',
        },
      },
      orderBy: {
        fileNumber: 'desc',
      },
      select: {
        fileNumber: true,
      },
    });

    let nextNumber = 1;
    if (lastPatient) {
      // Extract number from last file number (e.g., "NS042" -> 42)
      const match = lastPatient.fileNumber.match(/NS(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format with leading zeros (3 digits): NS001, NS002, etc.
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    return `NS${formattedNumber}`;
  }

  /**
   * Check for duplicate patients
   * Duplicate criteria:
   * 1. Same email (if provided)
   * 2. Same phone (if provided)
   * 3. Same firstName + lastName + dateOfBirth
   * 
   * Returns specific error message indicating which field(s) caused the duplicate
   */
  private async checkDuplicates(data: CreatePatientDto, tx?: Prisma.TransactionClient): Promise<void> {
    const prisma = tx || this.prisma;
    const duplicateReasons: string[] = [];
    let existing: any = null;

    const baseWhere = {
      mergedInto: null, // Ignore merged patients
      status: {
        not: PatientStatus.ARCHIVED, // Exclude archived patients
      },
    };

    // Check by email (if provided)
    if (data.email) {
      const emailMatch = await prisma.patient.findFirst({
        where: {
          ...baseWhere,
          email: data.email,
        },
        select: {
          id: true,
          fileNumber: true,
          patientNumber: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      if (emailMatch) {
        existing = emailMatch;
        duplicateReasons.push(`email (${data.email})`);
      }
    }

    // Check by phone (if provided and not already found by email)
    if (data.phone && !existing) {
      const phoneMatch = await prisma.patient.findFirst({
        where: {
          ...baseWhere,
          OR: [
            { phone: data.phone },
            { alternatePhone: data.phone },
          ],
        },
        select: {
          id: true,
          fileNumber: true,
          patientNumber: true,
          firstName: true,
          lastName: true,
          phone: true,
          alternatePhone: true,
        },
      });

      if (phoneMatch) {
        existing = phoneMatch;
        duplicateReasons.push(`phone number (${data.phone})`);
      }
    }

    // Check by name + DOB (if provided and not already found)
    if (data.firstName && data.lastName && data.dateOfBirth && !existing) {
      const nameDobMatch = await prisma.patient.findFirst({
        where: {
          ...baseWhere,
          AND: [
            { firstName: { equals: data.firstName, mode: 'insensitive' } },
            { lastName: { equals: data.lastName, mode: 'insensitive' } },
            { dateOfBirth: new Date(data.dateOfBirth) },
          ],
        },
        select: {
          id: true,
          fileNumber: true,
          patientNumber: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
        },
      });

      if (nameDobMatch) {
        existing = nameDobMatch;
        duplicateReasons.push(`name and date of birth (${data.firstName} ${data.lastName}, DOB: ${new Date(data.dateOfBirth).toLocaleDateString()})`);
      }
    }

    // If duplicate found, throw error with specific reason
    if (existing) {
      const fileNumber = existing.fileNumber || existing.patientNumber || 'N/A';
      const patientName = `${existing.firstName} ${existing.lastName}`;
      const reasonText = duplicateReasons.length === 1
        ? duplicateReasons[0]
        : duplicateReasons.join(', ');

      throw new ConflictException(
        `Duplicate patient found: ${fileNumber} (${patientName}). ` +
        `Matching on: ${reasonText}. ` +
        `Please search for this patient or use a different ${duplicateReasons.length === 1 ? 'value' : 'values'}.`
      );
    }
  }

  /**
   * Check for duplicates when updating a patient
   * Same logic as checkDuplicates but excludes the current patient
   * Returns specific error message indicating which field(s) caused the duplicate
   */
  private async checkDuplicatesForUpdate(data: CreatePatientDto, excludePatientId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const prisma = tx || this.prisma;
    const duplicateReasons: string[] = [];
    let existing: any = null;

    const baseWhere = {
      id: { not: excludePatientId }, // Exclude current patient
      mergedInto: null, // Ignore merged patients
      status: {
        not: PatientStatus.ARCHIVED, // Exclude archived patients
      },
    };

    // Check by email (if provided)
    if (data.email) {
      const emailMatch = await prisma.patient.findFirst({
        where: {
          ...baseWhere,
          email: data.email,
        },
        select: {
          id: true,
          fileNumber: true,
          patientNumber: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      if (emailMatch) {
        existing = emailMatch;
        duplicateReasons.push(`email (${data.email})`);
      }
    }

    // Check by phone (if provided and not already found by email)
    if (data.phone && !existing) {
      const phoneMatch = await prisma.patient.findFirst({
        where: {
          ...baseWhere,
          OR: [
            { phone: data.phone },
            { alternatePhone: data.phone },
          ],
        },
        select: {
          id: true,
          fileNumber: true,
          patientNumber: true,
          firstName: true,
          lastName: true,
          phone: true,
          alternatePhone: true,
        },
      });

      if (phoneMatch) {
        existing = phoneMatch;
        duplicateReasons.push(`phone number (${data.phone})`);
      }
    }

    // Check by name + DOB (if provided and not already found)
    if (data.firstName && data.lastName && data.dateOfBirth && !existing) {
      const nameDobMatch = await prisma.patient.findFirst({
        where: {
          ...baseWhere,
          AND: [
            { firstName: { equals: data.firstName, mode: 'insensitive' } },
            { lastName: { equals: data.lastName, mode: 'insensitive' } },
            { dateOfBirth: new Date(data.dateOfBirth) },
          ],
        },
        select: {
          id: true,
          fileNumber: true,
          patientNumber: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
        },
      });

      if (nameDobMatch) {
        existing = nameDobMatch;
        duplicateReasons.push(`name and date of birth (${data.firstName} ${data.lastName}, DOB: ${new Date(data.dateOfBirth).toLocaleDateString()})`);
      }
    }

    // If duplicate found, throw error with specific reason
    if (existing) {
      const fileNumber = existing.fileNumber || existing.patientNumber || 'N/A';
      const patientName = `${existing.firstName} ${existing.lastName}`;
      const reasonText = duplicateReasons.length === 1
        ? duplicateReasons[0]
        : duplicateReasons.join(', ');

      throw new ConflictException(
        `Duplicate patient found: ${fileNumber} (${patientName}). ` +
        `Matching on: ${reasonText}. ` +
        `Please search for this patient or use a different ${duplicateReasons.length === 1 ? 'value' : 'values'}.`
      );
    }
  }

  /**
   * Create a new patient record
   * 
   * @param data - Patient data including demographics and optional doctor/user links
   * @param tx - Optional transaction client for atomic operations
   */
  async create(
    data: CreatePatientDto & { userId?: string; createdBy?: string },
    tx?: Prisma.TransactionClient
  ) {
    const prisma = tx || this.prisma;

    // 1. Check for duplicates (within transaction if provided)
    await this.checkDuplicates(data, tx);

    // 2. Generate unique identifiers
    const patientNumber = await this.generatePatientNumber(tx);
    const fileNumber = await this.generateFileNumber(tx);

    // 3. Prepare creation data
    const patientData: Prisma.PatientCreateInput = {
      patientNumber,
      fileNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || null,
      dateOfBirth: new Date(data.dateOfBirth),
      gender: data.gender || null,
      email: data.email || null,
      phone: data.phone || null,
      whatsapp: data.whatsapp || null,
      alternatePhone: (data as any).alternatePhone || null,
      occupation: data.occupation || null,
      address: data.address || null,
      city: data.city || 'Nairobi',
      state: data.state || null,
      zipCode: data.zipCode || null,
      country: data.country || 'Kenya',
      bloodType: data.bloodType || null,
      status: PatientStatus.ACTIVE,

      // Relations
      doctorInCharge: data.doctorInChargeId
        ? { connect: { id: data.doctorInChargeId } }
        : undefined,

      // Link to User identity if provided (for self-reg or staff-led setup)
      userAccount: data.userId
        ? { connect: { id: data.userId } }
        : undefined,

      // Audit fields - MUST use connect for relations
      createdByUser: data.createdBy
        ? { connect: { id: data.createdBy } }
        : undefined,
    };

    // 4. Persistence
    const patient = await prisma.patient.create({
      data: patientData,
      include: {
        doctorInCharge: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        userAccount: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // 5. Handle Next of Kin / Emergency Contacts
    await this.processPatientContacts(patient.id, data, tx);

    return patient;
  }

  /**
   * Internal helper to process and create patient contacts
   */
  private async processPatientContacts(
    patientId: string,
    data: CreatePatientDto & { createdBy?: string },
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const prisma = tx || this.prisma;
    const contactsToCreate: Prisma.PatientContactCreateManyInput[] = [];

    // Next of Kin
    if (data.nextOfKinFirstName || data.nextOfKinLastName || data.nextOfKinName) {
      const firstName = data.nextOfKinFirstName || data.nextOfKinName?.split(' ')[0] || 'Unknown';
      const lastName = data.nextOfKinLastName || data.nextOfKinName?.split(' ').slice(1).join(' ') || 'Unknown';

      contactsToCreate.push({
        patientId,
        firstName,
        lastName,
        relationship: data.nextOfKinRelationship || 'UNKNOWN',
        phone: data.nextOfKinContact || null,
        isNextOfKin: true,
        isEmergencyContact: false,
        priority: 1,
        createdBy: data.createdBy || null,
      });
    }

    // Emergency Contact
    if (data.emergencyContactName || data.emergencyContactPhone) {
      const nameParts = data.emergencyContactName?.split(' ') || [];
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'Unknown';

      // Only add if not identical to next of kin (naive check)
      const isDuplicate = contactsToCreate.some(c =>
        c.firstName === firstName && c.lastName === lastName && c.phone === data.emergencyContactPhone
      );

      if (!isDuplicate) {
        contactsToCreate.push({
          patientId,
          firstName,
          lastName,
          relationship: 'EMERGENCY_CONTACT',
          phone: data.emergencyContactPhone || null,
          isNextOfKin: false,
          isEmergencyContact: true,
          priority: 2,
          createdBy: data.createdBy || null,
        });
      }
    }

    if (contactsToCreate.length > 0) {
      await prisma.patientContact.createMany({
        data: contactsToCreate,
      });
    }
  }

  async findById(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        doctorInCharge: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        contacts: {
          where: {
            isNextOfKin: true,
          },
          orderBy: {
            priority: 'asc',
          },
        },
        allergies: {
          where: {
            active: true,
          },
          orderBy: {
            severity: 'desc',
          },
        },
      } as any,
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    return {
      ...patient,
      age: patient.dateOfBirth ? this.calculateAge(patient.dateOfBirth) : undefined,
    };
  }

  async findByPatientNumber(patientNumber: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { patientNumber },
      include: {
        doctorInCharge: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with number ${patientNumber} not found`);
    }

    return patient;
  }

  async findByUserId(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      include: {
        doctorInCharge: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        contacts: {
          where: {
            isNextOfKin: true,
          },
          orderBy: {
            priority: 'asc',
          },
        },
        allergies: {
          where: {
            active: true,
          },
          orderBy: {
            severity: 'desc',
          },
        },
      } as any,
    });

    if (!patient) {
      return null;
    }

    return {
      ...patient,
      age: patient.dateOfBirth ? this.calculateAge(patient.dateOfBirth) : undefined,
    };
  }

  async findByInvitationToken(token: string) {
    return await this.prisma.patient.findUnique({
      where: { invitationToken: token },
      include: {
        doctorInCharge: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async linkToUserAccount(patientId: string, userId: string) {
    return await this.prisma.patient.update({
      where: { id: patientId },
      data: {
        userId,
        invitationToken: null,
        invitationExpiresAt: null,
      },
    });
  }

  async setInvitation(patientId: string, token: string, expiresAt: Date, invitedBy: string) {
    return await this.prisma.patient.update({
      where: { id: patientId },
      data: {
        invitationToken: token,
        invitationExpiresAt: expiresAt,
        invitedAt: new Date(),
        invitedBy,
      },
    });
  }

  async clearInvitation(patientId: string) {
    return await this.prisma.patient.update({
      where: { id: patientId },
      data: {
        invitationToken: null,
        invitationExpiresAt: null,
      },
    });
  }

  async update(
    id: string,
    data: UpdatePatientDto & { updatedBy?: string },
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;
    // CRITICAL: Reject any attempt to update lifecycle-related fields
    // Lifecycle state MUST be managed ONLY by PatientLifecycleService
    if ('lifecycleState' in data || 'lifecycle_state' in data ||
      'lifecycleStateChangedAt' in data || 'lifecycleStateChangedBy' in data) {
      throw new ConflictException(
        'Cannot update lifecycle state through patient update. Use PatientLifecycleService.transitionPatient() instead.'
      );
    }

    // Verify patient exists and get current data
    const existingPatient = await this.findById(id);

    // Check for duplicates if email, phone, or name+DOB are being changed
    // Only check if the new value is different from current value
    if (
      (data.email && data.email !== existingPatient.email) ||
      (data.phone && data.phone !== existingPatient.phone) ||
      (data.firstName && data.firstName !== existingPatient.firstName) ||
      (data.lastName && data.lastName !== existingPatient.lastName) ||
      (data.dateOfBirth && data.dateOfBirth !== existingPatient.dateOfBirth.toISOString().split('T')[0])
    ) {
      // Create a DTO-like object for duplicate checking
      const checkData: CreatePatientDto = {
        firstName: data.firstName || existingPatient.firstName,
        lastName: data.lastName || existingPatient.lastName,
        dateOfBirth: data.dateOfBirth || existingPatient.dateOfBirth.toISOString().split('T')[0],
        email: data.email !== undefined ? data.email : existingPatient.email,
        phone: data.phone !== undefined ? data.phone : existingPatient.phone,
      };

      // Check for duplicates, excluding current patient
      await this.checkDuplicatesForUpdate(checkData, id, tx);
    }

    // Prepare update data
    // NOTE: Explicitly exclude lifecycle fields - they are managed ONLY by PatientLifecycleService
    const updateData: Prisma.PatientUpdateInput = {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.middleName !== undefined && { middleName: data.middleName }),
      ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
      ...(data.gender !== undefined && { gender: data.gender }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp }),
      ...(data.occupation !== undefined && { occupation: data.occupation }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.state !== undefined && { state: data.state }),
      ...(data.zipCode !== undefined && { zipCode: data.zipCode }),
      ...(data.country !== undefined && { country: data.country }),
      ...(data.doctorInChargeId !== undefined && {
        doctorInCharge: data.doctorInChargeId
          ? { connect: { id: data.doctorInChargeId } }
          : { disconnect: true },
      }),
      ...(data.bloodType !== undefined && { bloodType: data.bloodType }),
      // CRITICAL: lifecycleState, lifecycleStateChangedAt, lifecycleStateChangedBy are NOT included here
      // They are managed exclusively by PatientLifecycleService
      // allergies and chronicConditions columns don't exist in database yet
      // ...(data.allergies !== undefined && { allergies: data.allergies }),
      // ...(data.chronicConditions !== undefined && { chronicConditions: data.chronicConditions }),
      // CRITICAL: lifecycleState, lifecycleStateChangedAt, lifecycleStateChangedBy are NOT included here
      // They are managed exclusively by PatientLifecycleService
      // allergies and chronicConditions columns don't exist in database yet
      // ...(data.allergies !== undefined && { allergies: data.allergies }),
      // ...(data.chronicConditions !== undefined && { chronicConditions: data.chronicConditions }),
      ...(data.updatedBy && {
        updatedByUser: { connect: { id: data.updatedBy } },
      }),
      version: { increment: 1 }, // Optimistic locking
    };

    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: updateData,
      include: {
        doctorInCharge: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Update next of kin and emergency contacts if provided
    if (
      data.nextOfKinFirstName !== undefined ||
      data.nextOfKinLastName !== undefined ||
      data.nextOfKinName !== undefined ||
      data.nextOfKinRelationship !== undefined ||
      data.nextOfKinContact !== undefined ||
      data.emergencyContactName !== undefined ||
      data.emergencyContactPhone !== undefined
    ) {
      // Delete existing next of kin and emergency contacts
      await (prisma as any).patientContact.deleteMany({
        where: {
          patientId: id,
          OR: [
            { isNextOfKin: true },
            { isEmergencyContact: true },
          ],
        },
      });

      // Create new contacts
      const contactsToCreate: any[] = [];

      // Next of Kin
      if (data.nextOfKinFirstName || data.nextOfKinLastName || data.nextOfKinName) {
        const firstName = data.nextOfKinFirstName || data.nextOfKinName?.split(' ')[0] || '';
        const lastName = data.nextOfKinLastName || data.nextOfKinName?.split(' ').slice(1).join(' ') || '';

        if (firstName || lastName) {
          contactsToCreate.push({
            patient: { connect: { id } },
            firstName: firstName || 'Unknown',
            lastName: lastName || 'Unknown',
            relationship: data.nextOfKinRelationship || 'UNKNOWN',
            phone: data.nextOfKinContact || undefined,
            isNextOfKin: true,
            isEmergencyContact: false,
            priority: 1,
            createdByUser: data.updatedBy ? { connect: { id: data.updatedBy } } : undefined,
          });
        }
      }

      // Emergency Contact
      if (data.emergencyContactName || data.emergencyContactPhone) {
        const nameParts = data.emergencyContactName?.split(' ') || [];
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || 'Unknown';

        contactsToCreate.push({
          patient: { connect: { id } },
          firstName,
          lastName,
          relationship: 'EMERGENCY_CONTACT',
          phone: data.emergencyContactPhone || undefined,
          isNextOfKin: false,
          isEmergencyContact: true,
          priority: 1,
          createdByUser: data.updatedBy ? { connect: { id: data.updatedBy } } : undefined,
        });
      }

      // Create all contacts
      if (contactsToCreate.length > 0) {
        await Promise.all(
          contactsToCreate.map(contact => (prisma as any).patientContact.create({ data: contact }))
        );
      }
    }

    // Return patient with contacts included
    return prisma.patient.findUnique({
      where: { id },
      include: {
        doctorInCharge: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        contacts: true,
      } as any,
    });
  }

  async delete(id: string, userId: string, tx?: Prisma.TransactionClient) {
    const prisma = tx || this.prisma;
    // Soft delete: mark as archived
    await this.findById(id);

    return await prisma.patient.update({
      where: { id },
      data: {
        status: PatientStatus.ARCHIVED,
        updatedByUser: { connect: { id: userId } },
        version: { increment: 1 },
      },
    });
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Optimized findAll for list view
   * Only selects fields needed for patient list display
   */
  async findAll(skip?: number, take?: number) {
    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        skip: skip || 0,
        take: take || 50,
        where: {
          mergedInto: null, // Exclude merged patients
        },
        orderBy: {
          createdAt: 'desc',
        },
        // Use select instead of include for better performance
        select: {
          id: true,
          fileNumber: true,
          patientNumber: true,
          firstName: true,
          lastName: true,
          middleName: true,
          dateOfBirth: true,
          email: true,
          phone: true,
          whatsapp: true,
          occupation: true,
          city: true,
          status: true,
          lifecycleState: true, // Include lifecycle state for client observation
          lifecycleStateChangedAt: true, // Include lifecycle state timestamp
          // Only get primary next of kin contact
          contacts: {
            where: {
              isNextOfKin: true,
            },
            orderBy: {
              priority: 'asc',
            },
            take: 1, // Only primary contact
            select: {
              firstName: true,
              lastName: true,
              relationship: true,
              phone: true,
              email: true,
            },
          },
          // Only get doctor name
          doctorInCharge: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.patient.count({
        where: {
          mergedInto: null, // Exclude merged patients
        },
      }),
    ]);

    // Transform data for UI consumption
    const data = patients.map((patient) => {
      const primaryContact = patient.contacts?.[0];
      return {
        id: patient.id,
        fileNumber: patient.fileNumber,
        patientNumber: patient.patientNumber,
        firstName: patient.firstName,
        lastName: patient.lastName,
        middleName: patient.middleName,
        dateOfBirth: patient.dateOfBirth,
        age: this.calculateAge(patient.dateOfBirth),
        email: patient.email,
        phone: patient.phone,
        whatsapp: patient.whatsapp,
        occupation: patient.occupation,
        city: patient.city,
        nextOfKinName: primaryContact
          ? `${primaryContact.firstName} ${primaryContact.lastName}`.trim()
          : undefined,
        nextOfKinRelationship: primaryContact?.relationship,
        nextOfKinContact: primaryContact?.phone || primaryContact?.email,
        doctorInChargeName: patient.doctorInCharge
          ? `Dr. ${patient.doctorInCharge.firstName} ${patient.doctorInCharge.lastName}`.trim()
          : undefined,
        status: patient.status,
        lifecycleState: (patient as any).lifecycleState, // Include lifecycle state (will be typed once Prisma generates)
        lifecycleStateChangedAt: (patient as any).lifecycleStateChangedAt, // Include lifecycle state timestamp
      };
    });

    return {
      data,
      total,
      skip: skip || 0,
      take: take || 50,
    };
  }

  /**
   * Optimized findAllFiltered for list view
   * Uses same optimized select as findAll
   */
  async findAllFiltered(skip?: number, take?: number, userId?: string) {
    if (!userId) {
      return { data: [], total: 0, skip: skip || 0, take: take || 50 };
    }

    // Find patients via surgical case assignments
    const cases = await this.prisma.surgicalCase.findMany({
      where: {
        OR: [
          { primarySurgeonId: userId },
          {
            resourceAllocations: {
              some: {
                resourceType: 'STAFF',
                resourceId: userId,
                status: 'ALLOCATED',
              },
            },
          },
        ],
      },
      select: {
        patientId: true,
      },
      distinct: ['patientId'],
    });

    const patientIds = cases.map((c) => c.patientId).filter(Boolean);

    if (patientIds.length === 0) {
      return { data: [], total: 0, skip: skip || 0, take: take || 50 };
    }

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where: {
          id: { in: patientIds },
          mergedInto: null, // Exclude merged patients
        },
        skip: skip || 0,
        take: take || 50,
        orderBy: {
          createdAt: 'desc',
        },
        // Use same optimized select as findAll
        select: {
          id: true,
          fileNumber: true,
          patientNumber: true,
          firstName: true,
          lastName: true,
          middleName: true,
          dateOfBirth: true,
          email: true,
          phone: true,
          whatsapp: true,
          occupation: true,
          city: true,
          status: true,
          contacts: {
            where: {
              isNextOfKin: true,
            },
            orderBy: {
              priority: 'asc',
            },
            take: 1,
            select: {
              firstName: true,
              lastName: true,
              relationship: true,
              phone: true,
              email: true,
            },
          },
          doctorInCharge: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.patient.count({
        where: {
          id: { in: patientIds },
          mergedInto: null, // Exclude merged patients
        },
      }),
    ]);

    // Transform data for UI consumption (same as findAll)
    const data = patients.map((patient) => {
      const primaryContact = patient.contacts?.[0];
      return {
        id: patient.id,
        fileNumber: patient.fileNumber,
        patientNumber: patient.patientNumber,
        firstName: patient.firstName,
        lastName: patient.lastName,
        middleName: patient.middleName,
        dateOfBirth: patient.dateOfBirth,
        age: this.calculateAge(patient.dateOfBirth),
        email: patient.email,
        phone: patient.phone,
        whatsapp: patient.whatsapp,
        occupation: patient.occupation,
        city: patient.city,
        nextOfKinName: primaryContact
          ? `${primaryContact.firstName} ${primaryContact.lastName}`.trim()
          : undefined,
        nextOfKinRelationship: primaryContact?.relationship,
        nextOfKinContact: primaryContact?.phone || primaryContact?.email,
        doctorInChargeName: patient.doctorInCharge
          ? `Dr. ${patient.doctorInCharge.firstName} ${patient.doctorInCharge.lastName}`.trim()
          : undefined,
        status: patient.status,
      };
    });

    return {
      data,
      total,
      skip: skip || 0,
      take: take || 50,
    };
  }

  /**
   * Optimized search for list view
   * Uses same optimized select as findAll
   */
  /**
   * Find patient by email (for user-patient linking)
   */
  async findByEmail(email: string) {
    return this.prisma.patient.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        mergedInto: null, // Exclude merged patients
      },
      select: {
        id: true,
        patientNumber: true,
        fileNumber: true,
        firstName: true,
        lastName: true,
        middleName: true,
        dateOfBirth: true,
        gender: true,
        bloodType: true,
        email: true,
        userId: true,
        phone: true,
        whatsapp: true,
        alternatePhone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        occupation: true,
        doctorInChargeId: true,
        status: true,
        restricted: true,
        restrictedReason: true,
        lifecycleState: true,
        lifecycleStateChangedAt: true,
        createdAt: true,
        updatedAt: true,
        version: true,
        doctorInCharge: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
      },
    });
  }

  async search(query: string, skip?: number, take?: number) {
    const searchTerm = query.trim();
    if (!searchTerm) {
      return this.findAll(skip, take);
    }

    const where: Prisma.PatientWhereInput = {
      AND: [
        {
          mergedInto: null, // Exclude merged patients
        },
        {
          OR: [
            { fileNumber: { contains: searchTerm, mode: 'insensitive' } },
            { patientNumber: { contains: searchTerm, mode: 'insensitive' } },
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm, mode: 'insensitive' } },
            { whatsapp: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      ],
    };

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip: skip || 0,
        take: take || 50,
        orderBy: {
          createdAt: 'desc',
        },
        // Use same optimized select as findAll
        select: {
          id: true,
          fileNumber: true,
          patientNumber: true,
          firstName: true,
          lastName: true,
          middleName: true,
          dateOfBirth: true,
          email: true,
          phone: true,
          whatsapp: true,
          occupation: true,
          city: true,
          status: true,
          contacts: {
            where: {
              isNextOfKin: true,
            },
            orderBy: {
              priority: 'asc',
            },
            take: 1,
            select: {
              firstName: true,
              lastName: true,
              relationship: true,
              phone: true,
              email: true,
            },
          },
          doctorInCharge: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    // Transform data for UI consumption (same as findAll)
    const data = patients.map((patient) => {
      const primaryContact = patient.contacts?.[0];
      return {
        id: patient.id,
        fileNumber: patient.fileNumber,
        patientNumber: patient.patientNumber,
        firstName: patient.firstName,
        lastName: patient.lastName,
        middleName: patient.middleName,
        dateOfBirth: patient.dateOfBirth,
        age: this.calculateAge(patient.dateOfBirth),
        email: patient.email,
        phone: patient.phone,
        whatsapp: patient.whatsapp,
        occupation: patient.occupation,
        city: patient.city,
        nextOfKinName: primaryContact
          ? `${primaryContact.firstName} ${primaryContact.lastName}`.trim()
          : undefined,
        nextOfKinRelationship: primaryContact?.relationship,
        nextOfKinContact: primaryContact?.phone || primaryContact?.email,
        doctorInChargeName: patient.doctorInCharge
          ? `Dr. ${patient.doctorInCharge.firstName} ${patient.doctorInCharge.lastName}`.trim()
          : undefined,
        status: patient.status,
      };
    });

    return {
      data,
      total,
      skip: skip || 0,
      take: take || 50,
    };
  }

  async mergePatients(
    sourcePatientId: string,
    targetPatientId: string,
    reason: string | undefined,
    userId: string,
    eventId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;
    // Verify both patients exist
    const sourcePatient = await this.findById(sourcePatientId);
    const targetPatient = await this.findById(targetPatientId);

    if (sourcePatient.mergedInto) {
      throw new ConflictException('Source patient is already merged');
    }

    if (targetPatient.mergedInto) {
      throw new ConflictException('Target patient is already merged');
    }

    // Create PatientMergeHistory record (immutable audit trail)
    await prisma.patientMergeHistory.create({
      data: {
        sourcePatientId,
        targetPatientId,
        triggeringEventId: eventId,
        reason,
        mergedBy: userId, // PatientMergeHistory uses scalar mergedBy
      },
    });

    // Update source patient to mark as merged
    // Set mergedInto to indicate this patient was merged into another
    // Status is set to ARCHIVED for merged patients
    return await prisma.patient.update({
      where: { id: sourcePatientId },
      data: {
        mergedInto: targetPatientId,
        mergedAt: new Date(),
        mergedByUser: { connect: { id: userId } },
        status: PatientStatus.ARCHIVED, // Archive merged patients
        updatedByUser: { connect: { id: userId } },
        version: { increment: 1 },
      } as any, // mergedAt may need Prisma regeneration
    });
  }

  async restrictPatient(id: string, reason: string, userId: string, tx?: Prisma.TransactionClient) {
    const prisma = tx || this.prisma;
    await this.findById(id);

    // Note: We don't have a 'restricted' field in the schema yet
    // This would need to be added to the Patient model
    // For now, we'll use a status field or add a note
    // TODO: Add restricted field to Patient model
    return await prisma.patient.update({
      where: { id },
      data: {
        updatedByUser: { connect: { id: userId } },
        version: { increment: 1 },
        // TODO: Add restricted fields when schema is updated
      },
    });
  }

  async unrestrictPatient(id: string, userId: string, tx?: Prisma.TransactionClient) {
    const prisma = tx || this.prisma;
    await this.findById(id);

    // TODO: Implement when restricted fields are added
    return await prisma.patient.update({
      where: { id },
      data: {
        updatedByUser: { connect: { id: userId } },
        version: { increment: 1 },
      },
    });
  }
}
