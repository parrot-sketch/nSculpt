import { PrismaClient, Domain } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seed script for test data
 * 
 * Creates:
 * - Roles (ADMIN, DOCTOR, SURGEON, NURSE, etc.)
 * - Permissions for all domains
 * - Role-permission assignments
 * - Test users with credentials
 * - User-role assignments
 * 
 * Run with: npm run db:seed
 */

// Password hashing helper
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data (optional - comment out if you want to preserve data)
  // Note: We skip deleting users due to foreign key constraints with audit logs
  console.log('🧹 Cleaning existing seed data...');
  try {
    // Delete in order to respect foreign key constraints
    // Roles and Permissions cleanup (independent of clinical data mostly)
    await prisma.userRoleAssignment.deleteMany({}).catch(() => { });
    await prisma.rolePermission.deleteMany({}).catch(() => { });
    await (prisma as any).doctorProfile.deleteMany({}).catch(() => { });
    await (prisma as any).clinicalService.deleteMany({}).catch(() => { });

    // Clinical and Patient data cleanup
    await (prisma as any).appointmentStatusHistory.deleteMany({}).catch(() => { });
    await (prisma as any).clinicVisit.deleteMany({}).catch(() => { });
    await (prisma as any).invoice.deleteMany({}).catch(() => { });
    await (prisma as any).encounter.deleteMany({}).catch(() => { });
    await (prisma as any).consultation.deleteMany({}).catch(() => { });
    await (prisma as any).appointment.deleteMany({}).catch(() => { });
    await (prisma as any).consultationRequest.deleteMany({}).catch(() => { });
    await (prisma as any).patientLifecycleTransition.deleteMany({}).catch(() => { });
    await (prisma as any).patientJourneyHistory.deleteMany({}).catch(() => { });
    await (prisma as any).patientJourney.deleteMany({}).catch(() => { });
    await (prisma as any).patient.deleteMany({}).catch(() => { });

    console.log('✅ Cleaned clinical data, patient records, and role mappings');
  } catch (error: any) {
    // If tables don't exist, that's okay - migrations haven't been run yet
    if (error.code === 'P2021') {
      console.log('⚠️  Tables do not exist yet. Please run migrations first:');
      console.log('   npm run schema:migrate');
      throw new Error('Database tables do not exist. Run migrations first.');
    }
    // Log but don't fail - might be foreign key constraints
    console.log('⚠️  Could not clean all data (may have foreign key constraints):', error.message);
  }

  // ============================================================================
  // 1. CREATE ROLES
  // ============================================================================
  console.log('👥 Creating roles...');

  const roles = [
    {
      code: 'ADMIN',
      name: 'System Administrator',
      description: 'Full system access with all permissions',
      isActive: true,
    },
    {
      code: 'DOCTOR',
      name: 'Doctor',
      description: 'Medical professional with patient care permissions',
      isActive: true,
    },
    {
      code: 'SURGEON',
      name: 'Surgeon',
      description: 'Surgical specialist with theater and medical records access',
      isActive: true,
    },
    {
      code: 'NURSE',
      name: 'Nurse',
      description: 'Nursing staff with patient care and medical records read access',
      isActive: true,
    },
    {
      code: 'THEATER_MANAGER',
      name: 'Theater Manager',
      description: 'Manages theater scheduling and reservations',
      isActive: true,
    },
    {
      code: 'INVENTORY_MANAGER',
      name: 'Inventory Manager',
      description: 'Manages inventory and stock levels',
      isActive: true,
    },
    {
      code: 'BILLING',
      name: 'Billing Staff',
      description: 'Handles billing and payment processing',
      isActive: true,
    },
    {
      code: 'FRONT_DESK',
      name: 'Front Desk',
      description: 'Front desk staff with patient registration access',
      isActive: true,
    },
    {
      code: 'PATIENT',
      name: 'Patient',
      description: 'Patient portal access for self-service',
      isActive: true,
    },
  ];

  // Use upsert to handle existing roles (don't fail if roles already exist)
  const createdRoles = await Promise.all(
    roles.map((role) =>
      prisma.role.upsert({
        where: { code: role.code },
        update: {
          name: role.name,
          description: role.description,
          isActive: role.isActive,
        },
        create: role,
      })
    )
  );

  const roleMap = new Map(createdRoles.map((r) => [r.code, r]));

  console.log(`✅ Created ${createdRoles.length} roles`);

  // ============================================================================
  // 1.5. CREATE DEPARTMENTS
  // ============================================================================
  console.log('🏢 Creating departments...');

  const departments = [
    {
      code: 'ADMINISTRATION',
      name: 'Administration',
      description: 'System administration and management',
      active: true,
    },
    {
      code: 'FRONT_DESK',
      name: 'Front Desk',
      description: 'Patient registration and front desk operations',
      active: true,
    },
    {
      code: 'SURGERY',
      name: 'Surgery',
      description: 'Surgical department for procedures and operations',
      active: true,
    },
    {
      code: 'NURSING',
      name: 'Nursing',
      description: 'Nursing department for patient care',
      active: true,
    },
    {
      code: 'THEATER',
      name: 'Operating Theater',
      description: 'Operating theater management and scheduling',
      active: true,
    },
    {
      code: 'CLEANING_AND_MAINTENANCE',
      name: 'Cleaning and Maintenance',
      description: 'Facility cleaning and maintenance operations',
      active: true,
    },
  ];

  // Only create departments if they don't exist (upsert by code)
  const createdDepartments = await Promise.all(
    departments.map((dept) =>
      prisma.department.upsert({
        where: { code: dept.code },
        update: {
          name: dept.name,
          description: dept.description,
          active: dept.active,
        },
        create: {
          code: dept.code,
          name: dept.name,
          description: dept.description,
          active: dept.active,
          createdBy: null, // Will be set when admin user is created
          updatedBy: null,
        },
      })
    )
  );

  const departmentMap = new Map(createdDepartments.map((d) => [d.code, d]));

  console.log(`✅ Created/updated ${createdDepartments.length} departments`);

  // ============================================================================
  // 1.8. CREATE CLINICAL SERVICES
  // ============================================================================
  console.log('🩺 Creating clinical services...');

  const services = [
    {
      code: 'BODY_CONTOURING',
      name: 'Body Contouring',
      category: 'Surgical',
      description: 'Surgical enhancement of body shape through advanced techniques including liposuction, abdominoplasty (tummy tucks), and Brazilian Butt Lifts (BBL).',
      imageUrl: '/images/services/body-contouring.jpg',
      displayOrder: 1,
    },
    {
      code: 'FACIAL_REJUVENATION',
      name: 'Facial Rejuvenation',
      category: 'Surgical',
      description: 'Advanced procedures like facelifts, rhinoplasty, and blepharoplasty designed to restore youthful harmony and facial aesthetics.',
      imageUrl: '/images/services/facial-rejuvenation.jpg',
      displayOrder: 2,
    },
    {
      code: 'BREAST_PROCEDURES',
      name: 'Breast Procedures',
      category: 'Surgical',
      description: 'Comprehensive breast surgery options including augmentation, mastopexy (lift), and reduction for improved comfort and confidence.',
      imageUrl: '/images/services/breast-surgery.jpg',
      displayOrder: 3,
    },
    {
      code: 'NON_SURGICAL',
      name: 'Non-Surgical Treatments',
      category: 'Aesthetic',
      description: 'Minimally invasive enhancements using Botox, fillers, Ozempic/Munjaro for weight management, and advanced skin care.',
      imageUrl: '/images/services/non-surgical.jpg',
      displayOrder: 4,
    },
    {
      code: 'HAND_SURGERY',
      name: 'Hand & Peripheral Nerve',
      category: 'Reconstructive',
      description: 'Highly specialized surgery for traumatic hand injuries, congenital differences, wrist surgery, and nerve reconstruction.',
      imageUrl: '/images/services/hand-surgery.jpg',
      displayOrder: 5,
    },
    {
      code: 'RECONSTRUCTIVE',
      name: 'Reconstructive Surgery',
      category: 'Reconstructive',
      description: 'Life-transforming reconstructive procedures to restore form and function following trauma, cancer, or congenital differences.',
      imageUrl: '/images/services/reconstructive.jpg',
      displayOrder: 6,
    },
  ];

  for (const service of services) {
    await (prisma as any).clinicalService.upsert({
      where: { code: service.code },
      update: service,
      create: service,
    });
  }

  console.log(`✅ Created ${services.length} clinical services`);

  // ============================================================================
  // 2. CREATE PERMISSIONS
  // ============================================================================
  console.log('🔐 Creating permissions...');

  const permissions = [
    // RBAC Domain - Admin permissions
    {
      code: 'admin:*:read',
      name: 'Admin: Read All',
      description: 'Read access to all admin functions',
      domain: Domain.RBAC,
      resource: 'Admin',
      action: 'read',
    },
    {
      code: 'admin:*:write',
      name: 'Admin: Write All',
      description: 'Write access to all admin functions',
      domain: Domain.RBAC,
      resource: 'Admin',
      action: 'write',
    },
    {
      code: 'admin:*:delete',
      name: 'Admin: Delete All',
      description: 'Delete access to all admin functions',
      domain: Domain.RBAC,
      resource: 'Admin',
      action: 'delete',
    },
    {
      code: 'admin:users:read',
      name: 'Admin: Read Users',
      description: 'View user accounts',
      domain: Domain.RBAC,
      resource: 'User',
      action: 'read',
    },
    {
      code: 'admin:users:write',
      name: 'Admin: Write Users',
      description: 'Create and update user accounts',
      domain: Domain.RBAC,
      resource: 'User',
      action: 'write',
    },
    {
      code: 'admin:users:delete',
      name: 'Admin: Delete Users',
      description: 'Deactivate user accounts',
      domain: Domain.RBAC,
      resource: 'User',
      action: 'delete',
    },
    {
      code: 'admin:roles:read',
      name: 'Admin: Read Roles',
      description: 'View roles',
      domain: Domain.RBAC,
      resource: 'Role',
      action: 'read',
    },
    {
      code: 'admin:roles:write',
      name: 'Admin: Write Roles',
      description: 'Create and update roles',
      domain: Domain.RBAC,
      resource: 'Role',
      action: 'write',
    },
    {
      code: 'admin:roles:delete',
      name: 'Admin: Delete Roles',
      description: 'Deactivate roles',
      domain: Domain.RBAC,
      resource: 'Role',
      action: 'delete',
    },
    {
      code: 'admin:permissions:read',
      name: 'Admin: Read Permissions',
      description: 'View permissions',
      domain: Domain.RBAC,
      resource: 'Permission',
      action: 'read',
    },

    // Patient Domain (NEW - for Patient Module)
    {
      code: 'patients:*:read',
      name: 'Patients: Read',
      description: 'Read patient records',
      domain: Domain.MEDICAL_RECORDS,
      resource: 'Patient',
      action: 'read',
    },
    {
      code: 'patients:*:write',
      name: 'Patients: Write',
      description: 'Create and update patient records',
      domain: Domain.MEDICAL_RECORDS,
      resource: 'Patient',
      action: 'write',
    },
    {
      code: 'follow_up_plans:*:read',
      name: 'Follow-up Plans: Read',
      description: 'Read follow-up plans',
      domain: Domain.CONSULTATION,
      resource: 'FollowUpPlan',
      action: 'read',
    },
    {
      code: 'follow_up_plans:self:read',
      name: 'Follow-up Plans: Read Self',
      description: 'Read own follow-up plans',
      domain: Domain.CONSULTATION,
      resource: 'FollowUpPlan',
      action: 'read',
    },
    {
      code: 'procedure_plans:*:read',
      name: 'Procedure Plans: Read',
      description: 'Read procedure plans',
      domain: Domain.CONSULTATION,
      resource: 'ProcedurePlan',
      action: 'read',
    },
    {
      code: 'procedure_plans:self:read',
      name: 'Procedure Plans: Read Self',
      description: 'Read own procedure plans',
      domain: Domain.CONSULTATION,
      resource: 'ProcedurePlan',
      action: 'read',
    },
    {
      code: 'patients:*:delete',
      name: 'Patients: Delete',
      description: 'Archive/delete patient records',
      domain: Domain.MEDICAL_RECORDS,
      resource: 'Patient',
      action: 'delete',
    },
    {
      code: 'patients:self:read',
      name: 'Patients: Read Self',
      description: 'Read own patient record',
      domain: Domain.MEDICAL_RECORDS,
      resource: 'Patient',
      action: 'read',
    },
    {
      code: 'patients:self:write',
      name: 'Patients: Write Self',
      description: 'Update own patient record',
      domain: Domain.MEDICAL_RECORDS,
      resource: 'Patient',
      action: 'write',
    },

    // Medical Records Domain
    {
      code: 'medical_records:read',
      name: 'Medical Records: Read',
      description: 'Read medical records',
      domain: Domain.MEDICAL_RECORDS,
      resource: 'MedicalRecord',
      action: 'read',
    },
    {
      code: 'medical_records:write',
      name: 'Medical Records: Write',
      description: 'Create and update medical records',
      domain: Domain.MEDICAL_RECORDS,
      resource: 'MedicalRecord',
      action: 'write',
    },
    {
      code: 'medical_records:delete',
      name: 'Medical Records: Delete',
      description: 'Delete medical records',
      domain: Domain.MEDICAL_RECORDS,
      resource: 'MedicalRecord',
      action: 'delete',
    },

    // Theater Domain
    {
      code: 'theater:read',
      name: 'Theater: Read',
      description: 'View theater schedules and reservations',
      domain: Domain.THEATER,
      resource: 'TheaterReservation',
      action: 'read',
    },
    {
      code: 'theater:write',
      name: 'Theater: Write',
      description: 'Create and update theater reservations',
      domain: Domain.THEATER,
      resource: 'TheaterReservation',
      action: 'write',
    },
    {
      code: 'theater:book',
      name: 'Theater: Book',
      description: 'Book theater time slots',
      domain: Domain.THEATER,
      resource: 'TheaterReservation',
      action: 'book',
    },
    {
      code: 'theater:manage',
      name: 'Theater: Manage',
      description: 'Manage theater operations',
      domain: Domain.THEATER,
      resource: 'TheaterReservation',
      action: 'manage',
    },

    // Consent Domain
    {
      code: 'consent:read',
      name: 'Consent: Read',
      description: 'Read consent forms and instances',
      domain: Domain.CONSENT,
      resource: 'PatientConsentInstance',
      action: 'read',
    },
    {
      code: 'consent:write',
      name: 'Consent: Write',
      description: 'Create and update consent forms',
      domain: Domain.CONSENT,
      resource: 'PatientConsentInstance',
      action: 'write',
    },
    {
      code: 'consent:approve',
      name: 'Consent: Approve',
      description: 'Approve consent instances',
      domain: Domain.CONSENT,
      resource: 'PatientConsentInstance',
      action: 'approve',
    },

    // Inventory Domain
    {
      code: 'inventory:read',
      name: 'Inventory: Read',
      description: 'Read inventory items and stock levels',
      domain: Domain.INVENTORY,
      resource: 'InventoryItem',
      action: 'read',
    },
    {
      code: 'inventory:write',
      name: 'Inventory: Write',
      description: 'Create and update inventory items',
      domain: Domain.INVENTORY,
      resource: 'InventoryItem',
      action: 'write',
    },
    {
      code: 'inventory:manage',
      name: 'Inventory: Manage',
      description: 'Manage inventory operations',
      domain: Domain.INVENTORY,
      resource: 'InventoryItem',
      action: 'manage',
    },

    // Billing Domain
    {
      code: 'billing:read',
      name: 'Billing: Read',
      description: 'Read billing information',
      domain: Domain.BILLING,
      resource: 'Bill',
      action: 'read',
    },
    {
      code: 'billing:write',
      name: 'Billing: Write',
      description: 'Create and update bills',
      domain: Domain.BILLING,
      resource: 'Bill',
      action: 'write',
    },
    {
      code: 'billing:approve',
      name: 'Billing: Approve',
      description: 'Approve billing transactions',
      domain: Domain.BILLING,
      resource: 'Bill',
      action: 'approve',
    },

    // Doctors Domain
    {
      code: 'doctors:read',
      name: 'Doctors: Read',
      description: 'Read doctor profiles and lists',
      domain: Domain.CONSULTATION,
      resource: 'Doctor',
      action: 'read',
    },

    // Appointment Domain
    {
      code: 'appointment:read',
      name: 'Appointment: Read',
      description: 'Read appointment details',
      domain: Domain.CONSULTATION,
      resource: 'Appointment',
      action: 'read',
    },
    {
      code: 'appointment:create',
      name: 'Appointment: Create',
      description: 'Create new appointments',
      domain: Domain.CONSULTATION,
      resource: 'Appointment',
      action: 'create',
    },
    {
      code: 'appointment:update',
      name: 'Appointment: Update',
      description: 'Update appointment details',
      domain: Domain.CONSULTATION,
      resource: 'Appointment',
      action: 'update',
    },
    {
      code: 'appointment:cancel',
      name: 'Appointment: Cancel',
      description: 'Cancel appointments',
      domain: Domain.CONSULTATION,
      resource: 'Appointment',
      action: 'cancel',
    },
    {
      code: 'appointment:confirm-payment',
      name: 'Appointment: Confirm Payment',
      description: 'Confirm appointment payments',
      domain: Domain.CONSULTATION,
      resource: 'Appointment',
      action: 'confirm-payment',
    },
    {
      code: 'appointment:check-in',
      name: 'Appointment: Check-in',
      description: 'Check in patient for appointment',
      domain: Domain.CONSULTATION,
      resource: 'Appointment',
      action: 'check-in',
    },

    // Consultation Domain
    {
      code: 'consultations:*:read',
      name: 'Consultations: Read',
      description: 'Read consultation records',
      domain: Domain.CONSULTATION,
      resource: 'Consultation',
      action: 'read',
    },
    {
      code: 'consultations:*:write',
      name: 'Consultations: Write',
      description: 'Create and update consultation records',
      domain: Domain.CONSULTATION,
      resource: 'Consultation',
      action: 'write',
    },

    // Audit Domain
    {
      code: 'audit:read',
      name: 'Audit: Read',
      description: 'Read audit logs and access history',
      domain: Domain.AUDIT,
      resource: 'DataAccessLog',
      action: 'read',
    },
  ];

  // Use upsert to handle existing permissions (don't fail if permissions already exist)
  const createdPermissions = await Promise.all(
    permissions.map((perm) =>
      prisma.permission.upsert({
        where: { code: perm.code },
        update: {
          name: perm.name,
          description: perm.description,
          domain: perm.domain,
          resource: perm.resource,
          action: perm.action,
        },
        create: perm,
      })
    )
  );

  const permissionMap = new Map(createdPermissions.map((p) => [p.code, p]));

  console.log(`✅ Created ${createdPermissions.length} permissions`);

  // ============================================================================
  // 3. ASSIGN PERMISSIONS TO ROLES
  // ============================================================================
  console.log('🔗 Assigning permissions to roles...');

  // ADMIN: All permissions
  const adminRole = roleMap.get('ADMIN')!;
  for (const perm of createdPermissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
  }

  // DOCTOR: Medical records, consent, theater read, appointments
  const doctorRole = roleMap.get('DOCTOR')!;
  const doctorPermissions = [
    'medical_records:read',
    'medical_records:write',
    'theater:read',
    'consent:read',
    'consent:write',
    'consent:approve',
    'doctors:read',
    'appointment:read',
    'appointment:update',
    'consultations:*:read',
    'consultations:*:write',
  ];
  for (const permCode of doctorPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: doctorRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // SURGEON: Medical records, theater full access, appointments
  const surgeonRole = roleMap.get('SURGEON')!;
  const surgeonPermissions = [
    'medical_records:read',
    'medical_records:write',
    'theater:read',
    'theater:write',
    'theater:book',
    'theater:manage',
    'consent:read',
    'consent:write',
    'consent:approve',
    'doctors:read',
    'appointment:read',
    'appointment:update',
    'consultations:*:read',
    'consultations:*:write',
  ];
  for (const permCode of surgeonPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: surgeonRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // NURSE: Medical records read, consent read
  const nurseRole = roleMap.get('NURSE')!;
  const nursePermissions = [
    'medical_records:read',
    'theater:read',
    'consent:read',
    'doctors:read',
    'appointment:read',
    'consultations:*:read',
  ];
  for (const permCode of nursePermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: nurseRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // THEATER_MANAGER: Theater full access
  const theaterManagerRole = roleMap.get('THEATER_MANAGER')!;
  const theaterManagerPermissions = [
    'theater:read',
    'theater:write',
    'theater:book',
    'theater:manage',
    'medical_records:read',
  ];
  for (const permCode of theaterManagerPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: theaterManagerRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // INVENTORY_MANAGER: Inventory full access
  const inventoryManagerRole = roleMap.get('INVENTORY_MANAGER')!;
  const inventoryManagerPermissions = [
    'inventory:read',
    'inventory:write',
    'inventory:manage',
  ];
  for (const permCode of inventoryManagerPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: inventoryManagerRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // BILLING: Billing full access
  const billingRole = roleMap.get('BILLING')!;
  const billingPermissions = [
    'billing:read',
    'billing:write',
    'billing:approve',
  ];
  for (const permCode of billingPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: billingRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // FRONT_DESK: Patient registration access
  const frontDeskRole = roleMap.get('FRONT_DESK')!;
  const frontDeskPermissions = [
    'patients:*:read',
    'patients:*:write',
    'medical_records:read',
    'theater:read',
    'billing:read',
    'doctors:read',
    'appointment:read',
    'appointment:create',
    'appointment:update',
    'appointment:cancel',
    'appointment:confirm-payment',
    'appointment:check-in',
    'consultations:*:read',
    'consultations:*:write',
  ];
  for (const permCode of frontDeskPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: frontDeskRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // PATIENT: Patient portal access (own records only)
  const patientRole = roleMap.get('PATIENT')!;
  const patientPermissions = [
    'patients:self:read', // Can read own patient record
    'patients:self:write', // Can update own patient record
    'follow_up_plans:self:read', // Can read own follow-up plans
    'procedure_plans:self:read', // Can read own procedure plans
    'consent:read', // Can read own consents
    'consent:write', // Can sign consents
    'doctors:read', // Can list doctors for booking
    'appointment:read',
    'appointment:create',
    'appointment:cancel',
    'consultations:*:read',
    'consultations:*:write',
  ];
  for (const permCode of patientPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: patientRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  console.log('✅ Assigned permissions to roles');

  // ============================================================================
  // 4. CREATE TEST USERS
  // ============================================================================
  console.log('👤 Creating test users...');

  const adminPassword = await hashPassword('Admin123!');
  const userPassword = await hashPassword('User123!');

  // Get ADMINISTRATION department for admin user
  const administrationDept = departmentMap.get('ADMINISTRATION');

  // Admin user (find existing or create new)
  let adminUser = await prisma.user.findUnique({
    where: { email: 'admin@nairobi-sculpt.com' },
  });

  if (!adminUser) {
    // Create admin user if it doesn't exist
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@nairobi-sculpt.com',
        isEmailVerified: true,
        departmentId: administrationDept?.id,
        firstName: 'System',
        lastName: 'Administrator',
        title: 'System Administrator',
        employeeId: 'EMP-001',
        isActive: true,
        passwordHash: adminPassword,
        createdBy: undefined, // Will be set after creation
        updatedBy: undefined,
      },
    });

    // Update admin user to self-reference
    await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    });
  } else {
    // Update existing admin user to ensure it has correct department
    if (administrationDept && adminUser.departmentId !== administrationDept.id) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          departmentId: administrationDept.id,
          updatedBy: adminUser.id,
        },
      });
    }
  }

  // Additional test users
  const testUsers = [
    {
      email: 'mukami@nairobisculpt.com',
      firstName: 'Mukami',
      lastName: 'Gathariki',
      title: 'Dr.',
      employeeId: 'NS-SURG-001',
      roleCode: 'SURGEON',
      profile: {
        specialty: 'Plastic, Reconstructive and Aesthetic Surgeon',
        bio: 'Dr. Mukami Gathariki is a highly focused and accomplished Board Certified Plastic, Reconstructive and Aesthetic Surgeon. With over eight years of experience, she ensures optimal quality of life for her patients through expertise in both Cosmetic and Reconstructive surgery.',
        experienceYears: 8,
        qualifications: 'MMed (Plastic Reconstructive & Aesthetic Surgery), COSECSA Fellow, ASPS SHARE Fellow',
        achievements: ['Developed Plastic Surgery Dept at Kitale County Referral Hospital', 'Editor of Kenya\'s 1st Wound Care Manual'],
      },
      services: ['BODY_CONTOURING', 'BREAST_PROCEDURES', 'FACIAL_REJUVENATION']
    },
    {
      email: 'drken@nairobisculpt.com',
      firstName: 'Ken',
      lastName: 'Aluora',
      title: 'Dr.',
      employeeId: 'NS-SURG-002',
      roleCode: 'SURGEON',
      profile: {
        specialty: 'Consultant Plastic Surgeon',
        bio: 'Dr. Ken Aluora is renowned for his expertise in non-surgical treatments and aesthetic surgery. He serves as the Secretary General of the Kenya Society of Plastic, Reconstructive and Aesthetic Surgeons (KSPRAS).',
        experienceYears: 10,
        qualifications: 'MMed (Plastic, Reconstructive and Aesthetic Surgery), KMPDC Licensed, ASPS Member',
        achievements: ['Secretary General of KSPRAS', 'Expert in non-surgical Ozempic/Munjaro protocols'],
      },
      services: ['NON_SURGICAL', 'FACIAL_REJUVENATION']
    },
    {
      email: 'drjp@nairobisculpt.com',
      firstName: 'John Paul',
      lastName: 'Ogalo',
      title: 'Dr.',
      employeeId: 'NS-SURG-003',
      roleCode: 'SURGEON',
      profile: {
        specialty: 'Consultant Plastic Surgeon',
        bio: 'Dr. John Paul Ogalo is the Head of Plastic Surgery at Nairobi Hospital. He is celebrated for pioneering Kenya’s first Pygopagus separation surgery and has transformed over 1,000 lives.',
        experienceYears: 12,
        qualifications: 'Consultant Plastic Surgeon, Head of Plastic Surgery (Nairobi Hospital)',
        achievements: ['First Pygopagus separation surgery in Kenya', 'Over 1,000 life-transforming procedures'],
      },
      services: ['BODY_CONTOURING', 'BREAST_PROCEDURES', 'RECONSTRUCTIVE']
    },
    {
      email: 'angela@nairobisculpt.com',
      firstName: 'Angela',
      lastName: 'Muoki',
      title: 'Dr.',
      employeeId: 'NS-SURG-004',
      roleCode: 'SURGEON',
      profile: {
        specialty: 'Specialist Plastic, Reconstructive and Aesthetic Surgeon',
        bio: 'Dr. Angela Muoki is a Board Certified Specialist with 12 years of experience. She is passionate about Breast Reduction, Paediatric Plastic Surgery, and Clitoral Restoration Surgery.',
        experienceYears: 12,
        qualifications: 'MMed (Plastic Reconstructive & Aesthetic Surgery), COSECSA Fellow, BFIRST Fellow',
        achievements: ['Head of Department at Defence Forces Memorial Hospital', 'Business Daily Top 40 under 40'],
      },
      services: ['BREAST_PROCEDURES', 'RECONSTRUCTIVE']
    },
    {
      email: 'dorsi@nairobisculpt.com',
      firstName: 'Dorsi',
      lastName: 'Jowi',
      title: 'Dr.',
      employeeId: 'NS-SURG-005',
      roleCode: 'SURGEON',
      profile: {
        specialty: 'Consultant Plastic Surgeon',
        bio: 'Dr. Dorsi Jowi specializes in Hand Surgery and Microsurgery. She is one of only 24 worldwide hand surgeons chosen as an international travelling fellow for the 2025 IFSSH congress.',
        experienceYears: 10,
        qualifications: 'MMed (Plastic, Reconstructive and Aesthetic Surgery), Fellowship in Hand Surgery (Ganga Hospital)',
        achievements: ['IFSSH 2025 International Travelling Fellow', 'Expert in Brachial Plexus and Peripheral Nerve Surgery'],
      },
      services: ['HAND_SURGERY', 'RECONSTRUCTIVE']
    },
    {
      email: 'nurse@nairobi-sculpt.com',
      firstName: 'Mary',
      lastName: 'Nurse',
      title: 'RN',
      employeeId: 'EMP-004',
      roleCode: 'NURSE',
    },
    {
      email: 'frontdesk@nairobi-sculpt.com',
      firstName: 'Sarah',
      lastName: 'Receptionist',
      title: 'Receptionist',
      employeeId: 'EMP-005',
      roleCode: 'FRONT_DESK',
    },
    {
      email: 'patient@nairobi-sculpt.com',
      firstName: 'John',
      lastName: 'Doe',
      title: 'Mr',
      employeeId: null, // Patients don't have employee IDs
      roleCode: 'PATIENT',
    },
  ];

  const createdUsers = [adminUser];

  for (const userData of testUsers) {
    // Find existing user or create new
    let user = await (prisma as any).user.findUnique({
      where: { email: userData.email },
      include: { doctorProfile: { include: { services: true } } }
    });

    const profileData = (userData as any).profile;
    const servicesToLink = (userData as any).services || [];

    if (!user) {
      user = await (prisma as any).user.create({
        data: {
          email: userData.email,
          isEmailVerified: true,
          firstName: userData.firstName,
          lastName: userData.lastName,
          title: userData.title,
          employeeId: userData.employeeId,
          isActive: true,
          passwordHash: userPassword,
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
          doctorProfile: profileData ? {
            create: {
              ...profileData,
              services: {
                connect: servicesToLink.map((code: string) => ({ code }))
              }
            }
          } : undefined
        },
        include: { doctorProfile: true }
      });
    } else if (profileData && !user.doctorProfile) {
      // Add profile to existing user if missing
      await (prisma as any).doctorProfile.create({
        data: {
          ...profileData,
          user: { connect: { id: user.id } },
          services: {
            connect: servicesToLink.map((code: string) => ({ code }))
          }
        }
      });
    } else if (profileData && user.doctorProfile && servicesToLink.length > 0) {
      // Update existing profile with services
      await (prisma as any).doctorProfile.update({
        where: { id: user.doctorProfile.id },
        data: {
          services: {
            connect: servicesToLink.map((code: string) => ({ code }))
          }
        }
      });
    }
    createdUsers.push(user);
  }

  console.log(`✅ Created ${createdUsers.length} users`);

  // ============================================================================
  // 5. ASSIGN ROLES TO USERS
  // ============================================================================
  console.log('🔗 Assigning roles to users...');

  // Admin user gets ADMIN role (check if exists first to avoid duplicates)
  const existingAdminAssignment = await prisma.userRoleAssignment.findFirst({
    where: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  if (!existingAdminAssignment) {
    await prisma.userRoleAssignment.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
        isActive: true,
        createdBy: adminUser.id,
      },
    });
  } else if (!existingAdminAssignment.isActive) {
    // Reactivate if it was deactivated
    await prisma.userRoleAssignment.update({
      where: { id: existingAdminAssignment.id },
      data: {
        isActive: true,
        revokedAt: null,
      },
    });
  }

  // Assign roles to test users
  for (let i = 0; i < testUsers.length; i++) {
    const user = createdUsers[i + 1]; // Skip admin user
    const roleCode = testUsers[i].roleCode;
    const role = roleMap.get(roleCode);
    if (role) {
      await prisma.userRoleAssignment.create({
        data: {
          userId: user.id,
          roleId: role.id,
          isActive: true,
          createdBy: adminUser.id,
        },
      });
    }
  }

  console.log('✅ Assigned roles to users');

  // ============================================================================
  // 6. CREATE PATIENT RECORDS FOR TEST PATIENTS
  // ============================================================================
  console.log('🏥 Creating patient records for test patients...');
  for (const user of createdUsers) {
    // Check if user should have a patient record
    const assignments = await prisma.userRoleAssignment.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    if (assignments.some(a => a.role.code === 'PATIENT')) {
      const existingPatient = await prisma.patient.findUnique({
        where: { userId: user.id }
      });

      if (!existingPatient) {
        // Generate sequential-like IDs for seed
        const timestamp = Date.now().toString().slice(-5);
        const patientNumber = `MRN-2026-${timestamp}`;
        const fileNumber = `NS${timestamp.slice(-3)}`;

        await prisma.patient.create({
          data: {
            patientNumber,
            fileNumber,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            dateOfBirth: new Date('1990-01-01'), // Default for seed
            gender: 'MALE',
            status: 'ACTIVE',
            userId: user.id,
            createdBy: adminUser.id,
          }
        });
        console.log(`   ✅ Created patient profile for: ${user.email}`);
      }
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n✨ Seed completed successfully!\n');
  console.log('📋 Summary:');
  console.log(`   - ${createdRoles.length} roles created`);
  console.log(`   - ${createdDepartments.length} departments created`);
  console.log(`   - ${createdPermissions.length} permissions created`);
  console.log(`   - ${createdUsers.length} users created\n`);
  console.log('🔑 Test Credentials:\n');
  console.log('   ADMIN USER:');
  console.log('   Email: admin@nairobi-sculpt.com');
  console.log('   Password: Admin123!\n');
  console.log('   TEST USERS (all use password: User123!):');
  testUsers.forEach((user) => {
    console.log(`   - ${user.email} (${user.roleCode})`);
  });
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

