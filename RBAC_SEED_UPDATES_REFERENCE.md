# RBAC Seed Updates - Reference Implementation

This document provides the exact code additions needed for the seed file.

## Step 1: Update Domain Enum

**File:** `backend/prisma/schema/foundation.prisma`

```prisma
enum Domain {
  THEATER
  MEDICAL_RECORDS
  CONSENT
  RBAC
  AUDIT
  INVENTORY
  BILLING
  CLINICAL_NOTES  // ADD THIS
  SURGERY          // ADD THIS
}
```

**Migration:** Run `npx prisma migrate dev --name add_clinical_notes_surgery_domains`

---

## Step 2: Add New Roles to seed.ts

**Location:** After line 98 (after FRONT_DESK role)

```typescript
    {
      code: 'FRONT_DESK',
      name: 'Front Desk',
      description: 'Front desk staff with patient registration access',
      active: true,
    },
    // ===== NEW ROLES FOR SURGICAL EHR =====
    {
      code: 'PATIENT',
      name: 'Patient',
      description: 'Patient portal access, view own records',
      active: true,
    },
    {
      code: 'GUARDIAN',
      name: 'Guardian',
      description: 'Guardian/proxy access for minors or incapacitated patients',
      active: true,
    },
    {
      code: 'ASSISTANT_SURGEON',
      name: 'Assistant Surgeon',
      description: 'Assistant surgeon in surgical procedures',
      active: true,
    },
    {
      code: 'ANESTHESIOLOGIST',
      name: 'Anesthesiologist',
      description: 'Anesthesia provider for surgical cases',
      active: true,
    },
    {
      code: 'MEDICAL_DIRECTOR',
      name: 'Medical Director',
      description: 'Medical director with oversight responsibilities',
      active: true,
    },
    {
      code: 'RECEPTIONIST',
      name: 'Receptionist',
      description: 'Reception staff handling appointments and check-in',
      active: true,
    },
    {
      code: 'PRACTICE_MANAGER',
      name: 'Practice Manager',
      description: 'Practice administration and operations management',
      active: true,
    },
    {
      code: 'BILLING_OFFICER',
      name: 'Billing Officer',
      description: 'Senior billing staff with approval authority',
      active: true,
    },
    {
      code: 'INSURANCE_OFFICER',
      name: 'Insurance Officer',
      description: 'Insurance claims specialist and coordinator',
      active: true,
    },
    {
      code: 'AUDIT_OFFICER',
      name: 'Audit Officer',
      description: 'Compliance and audit specialist with read-only access to audit logs',
      active: true,
    },
  ];
```

---

## Step 3: Add New Permissions to seed.ts

**Location:** After existing permissions array (around line 348, after audit permissions)

```typescript
    // Audit Domain
    {
      code: 'audit:read',
      name: 'Audit: Read',
      description: 'Read audit logs and access history',
      domain: Domain.AUDIT,
      resource: 'DataAccessLog',
      action: 'read',
    },
    
    // ===== NEW PERMISSIONS FOR SURGICAL EHR =====
    
    // CONSENT Domain - Extended Actions
    {
      code: 'consent:assign',
      name: 'Consent: Assign',
      description: 'Assign consent template to patient',
      domain: Domain.CONSENT,
      resource: 'PatientConsentInstance',
      action: 'assign',
    },
    {
      code: 'consent:sign',
      name: 'Consent: Sign',
      description: 'Sign/acknowledge consent (patient/guardian)',
      domain: Domain.CONSENT,
      resource: 'PatientConsentInstance',
      action: 'sign',
    },
    {
      code: 'consent:verify',
      name: 'Consent: Verify',
      description: 'Verify consent signature validity',
      domain: Domain.CONSENT,
      resource: 'PatientConsentInstance',
      action: 'verify',
    },
    {
      code: 'consent:lock',
      name: 'Consent: Lock',
      description: 'Lock consent after signing (prevent modifications)',
      domain: Domain.CONSENT,
      resource: 'PatientConsentInstance',
      action: 'lock',
    },
    {
      code: 'consent:view_history',
      name: 'Consent: View History',
      description: 'View consent history and audit trail',
      domain: Domain.CONSENT,
      resource: 'PatientConsentInstance',
      action: 'view_history',
    },
    {
      code: 'consent:revoke',
      name: 'Consent: Revoke',
      description: 'Revoke consent instance',
      domain: Domain.CONSENT,
      resource: 'PatientConsentInstance',
      action: 'revoke',
    },
    
    // CLINICAL_NOTES Domain - New Domain
    {
      code: 'clinical_notes:read',
      name: 'Clinical Notes: Read',
      description: 'Read clinical notes',
      domain: Domain.CLINICAL_NOTES,
      resource: 'ClinicalNote',
      action: 'read',
    },
    {
      code: 'clinical_notes:write',
      name: 'Clinical Notes: Write',
      description: 'Create and update clinical notes',
      domain: Domain.CLINICAL_NOTES,
      resource: 'ClinicalNote',
      action: 'write',
    },
    {
      code: 'clinical_notes:sign',
      name: 'Clinical Notes: Sign',
      description: 'Sign clinical notes (author attestation)',
      domain: Domain.CLINICAL_NOTES,
      resource: 'ClinicalNote',
      action: 'sign',
    },
    {
      code: 'clinical_notes:cosign',
      name: 'Clinical Notes: Co-sign',
      description: 'Co-sign clinical notes (supervisor attestation)',
      domain: Domain.CLINICAL_NOTES,
      resource: 'ClinicalNote',
      action: 'cosign',
    },
    {
      code: 'clinical_notes:amend',
      name: 'Clinical Notes: Amend',
      description: 'Amend clinical notes (create amendment)',
      domain: Domain.CLINICAL_NOTES,
      resource: 'ClinicalNote',
      action: 'amend',
    },
    
    // SURGERY Domain - New Domain
    {
      code: 'surgery:schedule',
      name: 'Surgery: Schedule',
      description: 'Schedule surgical case',
      domain: Domain.SURGERY,
      resource: 'SurgicalCase',
      action: 'schedule',
    },
    {
      code: 'surgery:prep',
      name: 'Surgery: Prep',
      description: 'Prepare surgical case (pre-op checklist)',
      domain: Domain.SURGERY,
      resource: 'SurgicalCase',
      action: 'prep',
    },
    {
      code: 'surgery:perform',
      name: 'Surgery: Perform',
      description: 'Perform surgery (start case)',
      domain: Domain.SURGERY,
      resource: 'SurgicalCase',
      action: 'perform',
    },
    {
      code: 'surgery:close_case',
      name: 'Surgery: Close Case',
      description: 'Close surgical case (post-op)',
      domain: Domain.SURGERY,
      resource: 'SurgicalCase',
      action: 'close_case',
    },
    {
      code: 'surgery:cancel',
      name: 'Surgery: Cancel',
      description: 'Cancel scheduled surgical case',
      domain: Domain.SURGERY,
      resource: 'SurgicalCase',
      action: 'cancel',
    },
    {
      code: 'surgery:view_schedule',
      name: 'Surgery: View Schedule',
      description: 'View surgical schedule',
      domain: Domain.SURGERY,
      resource: 'SurgicalCase',
      action: 'view_schedule',
    },
    
    // BILLING Domain - Extended Actions
    {
      code: 'billing:adjust',
      name: 'Billing: Adjust',
      description: 'Adjust bill amounts',
      domain: Domain.BILLING,
      resource: 'Bill',
      action: 'adjust',
    },
    {
      code: 'billing:refund',
      name: 'Billing: Refund',
      description: 'Process refunds',
      domain: Domain.BILLING,
      resource: 'Payment',
      action: 'refund',
    },
    {
      code: 'billing:view_balances',
      name: 'Billing: View Balances',
      description: 'View patient account balances',
      domain: Domain.BILLING,
      resource: 'Bill',
      action: 'view_balances',
    },
    {
      code: 'billing:submit_claim',
      name: 'Billing: Submit Claim',
      description: 'Submit insurance claims',
      domain: Domain.BILLING,
      resource: 'InsuranceClaim',
      action: 'submit',
    },
    {
      code: 'billing:reconcile',
      name: 'Billing: Reconcile',
      description: 'Reconcile payments and allocations',
      domain: Domain.BILLING,
      resource: 'Payment',
      action: 'reconcile',
    },
    
    // INVENTORY Domain - Extended Actions
    {
      code: 'inventory:audit',
      name: 'Inventory: Audit',
      description: 'Perform inventory audit',
      domain: Domain.INVENTORY,
      resource: 'InventoryStock',
      action: 'audit',
    },
    {
      code: 'inventory:reorder',
      name: 'Inventory: Reorder',
      description: 'Create reorder requests',
      domain: Domain.INVENTORY,
      resource: 'InventoryItem',
      action: 'reorder',
    },
    {
      code: 'inventory:receive',
      name: 'Inventory: Receive',
      description: 'Receive stock from vendor',
      domain: Domain.INVENTORY,
      resource: 'InventoryTransaction',
      action: 'receive',
    },
    {
      code: 'inventory:consume',
      name: 'Inventory: Consume',
      description: 'Consume inventory in surgical case',
      domain: Domain.INVENTORY,
      resource: 'InventoryUsage',
      action: 'consume',
    },
    {
      code: 'inventory:transfer',
      name: 'Inventory: Transfer',
      description: 'Transfer inventory between locations',
      domain: Domain.INVENTORY,
      resource: 'InventoryTransaction',
      action: 'transfer',
    },
  ];
```

---

## Step 4: Update Role-Permission Assignments

**Location:** After existing role-permission assignments (around line 520, after FRONT_DESK permissions)

Add these new role-permission assignments:

```typescript
  // FRONT_DESK: Basic read access
  const frontDeskRole = roleMap.get('FRONT_DESK')!;
  const frontDeskPermissions = [
    'medical_records:read',
    'theater:read',
    'billing:read',
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

  // ===== NEW ROLE-PERMISSION ASSIGNMENTS =====
  
  // PATIENT: Own records and consents only (RLS enforced)
  const patientRole = roleMap.get('PATIENT')!;
  const patientPermissions = [
    'medical_records:read',
    'consent:read',
    'consent:sign',
    'billing:read',
    'billing:view_balances',
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

  // GUARDIAN: All patient permissions plus proxy signing
  const guardianRole = roleMap.get('GUARDIAN')!;
  const guardianPermissions = [
    'medical_records:read',
    'consent:read',
    'consent:sign',
    'consent:view_history',
    'billing:read',
    'billing:view_balances',
  ];
  for (const permCode of guardianPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: guardianRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // ASSISTANT_SURGEON: Assist in surgery, read records
  const assistantSurgeonRole = roleMap.get('ASSISTANT_SURGEON')!;
  const assistantSurgeonPermissions = [
    'medical_records:read',
    'clinical_notes:read',
    'clinical_notes:write',
    'theater:read',
    'surgery:view_schedule',
    'surgery:prep',
    'surgery:perform',
    'inventory:read',
    'inventory:consume',
  ];
  for (const permCode of assistantSurgeonPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: assistantSurgeonRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // ANESTHESIOLOGIST: Anesthesia provider
  const anesthesiologistRole = roleMap.get('ANESTHESIOLOGIST')!;
  const anesthesiologistPermissions = [
    'medical_records:read',
    'clinical_notes:read',
    'clinical_notes:write',
    'theater:read',
    'surgery:view_schedule',
    'surgery:prep',
    'surgery:perform',
    'inventory:read',
    'inventory:consume',
  ];
  for (const permCode of anesthesiologistPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: anesthesiologistRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // MEDICAL_DIRECTOR: Oversight and co-signing
  const medicalDirectorRole = roleMap.get('MEDICAL_DIRECTOR')!;
  const medicalDirectorPermissions = [
    'medical_records:read',
    'medical_records:write',
    'medical_records:*:manage',
    'clinical_notes:read',
    'clinical_notes:write',
    'clinical_notes:cosign',
    'theater:read',
    'surgery:view_schedule',
    'consent:read',
    'consent:verify',
    'audit:read',
  ];
  for (const permCode of medicalDirectorPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: medicalDirectorRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // RECEPTIONIST: Appointments and check-in
  const receptionistRole = roleMap.get('RECEPTIONIST')!;
  const receptionistPermissions = [
    'medical_records:read',
    'theater:read',
    'surgery:view_schedule',
    'surgery:schedule',
    'consent:read',
    'consent:assign',
    'billing:read',
  ];
  for (const permCode of receptionistPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: receptionistRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // PRACTICE_MANAGER: Operations management
  const practiceManagerRole = roleMap.get('PRACTICE_MANAGER')!;
  const practiceManagerPermissions = [
    'medical_records:read',
    'theater:read',
    'theater:write',
    'surgery:view_schedule',
    'surgery:schedule',
    'surgery:cancel',
    'consent:read',
    'billing:read',
    'billing:view_balances',
    'inventory:read',
    'audit:read',
  ];
  for (const permCode of practiceManagerPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: practiceManagerRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // BILLING_OFFICER: Senior billing with approvals
  const billingOfficerRole = roleMap.get('BILLING_OFFICER')!;
  const billingOfficerPermissions = [
    'billing:read',
    'billing:write',
    'billing:approve',
    'billing:adjust',
    'billing:refund',
    'billing:view_balances',
    'billing:submit_claim',
    'billing:reconcile',
    'medical_records:read',
  ];
  for (const permCode of billingOfficerPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: billingOfficerRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // INSURANCE_OFFICER: Insurance claims specialist
  const insuranceOfficerRole = roleMap.get('INSURANCE_OFFICER')!;
  const insuranceOfficerPermissions = [
    'billing:read',
    'billing:view_balances',
    'billing:submit_claim',
    'medical_records:read',
  ];
  for (const permCode of insuranceOfficerPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: insuranceOfficerRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // AUDIT_OFFICER: Compliance and audit (read-only)
  const auditOfficerRole = roleMap.get('AUDIT_OFFICER')!;
  const auditOfficerPermissions = [
    'audit:read',
    'medical_records:read',
    'consent:read',
    'billing:read',
  ];
  for (const permCode of auditOfficerPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: auditOfficerRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // Update existing SURGEON role with new permissions
  const surgeonRole = roleMap.get('SURGEON')!;
  const additionalSurgeonPermissions = [
    'clinical_notes:read',
    'clinical_notes:write',
    'clinical_notes:sign',
    'surgery:schedule',
    'surgery:prep',
    'surgery:perform',
    'surgery:close_case',
    'surgery:view_schedule',
    'consent:assign',
    'consent:verify',
    'inventory:consume',
  ];
  for (const permCode of additionalSurgeonPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      // Check if already assigned
      const existing = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: surgeonRole.id,
            permissionId: perm.id,
          },
        },
      });
      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            roleId: surgeonRole.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }

  // Update existing DOCTOR role with clinical notes permissions
  const doctorRole = roleMap.get('DOCTOR')!;
  const additionalDoctorPermissions = [
    'clinical_notes:read',
    'clinical_notes:write',
    'clinical_notes:sign',
  ];
  for (const permCode of additionalDoctorPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      const existing = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: doctorRole.id,
            permissionId: perm.id,
          },
        },
      });
      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            roleId: doctorRole.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }

  // Update existing BILLING role with new billing permissions
  const billingRole = roleMap.get('BILLING')!;
  const additionalBillingPermissions = [
    'billing:adjust',
    'billing:view_balances',
    'billing:submit_claim',
  ];
  for (const permCode of additionalBillingPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      const existing = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: billingRole.id,
            permissionId: perm.id,
          },
        },
      });
      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            roleId: billingRole.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }

  // Update existing INVENTORY_MANAGER role with new inventory permissions
  const inventoryManagerRole = roleMap.get('INVENTORY_MANAGER')!;
  const additionalInventoryManagerPermissions = [
    'inventory:audit',
    'inventory:reorder',
    'inventory:receive',
    'inventory:transfer',
  ];
  for (const permCode of additionalInventoryManagerPermissions) {
    const perm = permissionMap.get(permCode);
    if (perm) {
      const existing = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: inventoryManagerRole.id,
            permissionId: perm.id,
          },
        },
      });
      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            roleId: inventoryManagerRole.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }

  console.log('✅ Assigned permissions to roles');
```

---

## Step 5: Update Test Users (Optional)

**Location:** After test users creation (around line 603)

Add test users for new roles:

```typescript
  // Additional test users
  const testUsers = [
    {
      email: 'doctor@nairobi-sculpt.com',
      firstName: 'John',
      lastName: 'Doctor',
      title: 'MD',
      employeeId: 'EMP-002',
      roleCode: 'DOCTOR',
    },
    // ... existing users ...
    
    // ===== NEW TEST USERS =====
    {
      email: 'patient@nairobi-sculpt.com',
      firstName: 'Jane',
      lastName: 'Patient',
      title: null,
      employeeId: null,
      roleCode: 'PATIENT',
    },
    {
      email: 'assistant-surgeon@nairobi-sculpt.com',
      firstName: 'Bob',
      lastName: 'Assistant',
      title: 'MD',
      employeeId: 'EMP-005',
      roleCode: 'ASSISTANT_SURGEON',
    },
    {
      email: 'anesthesiologist@nairobi-sculpt.com',
      firstName: 'Alice',
      lastName: 'Anesthesia',
      title: 'MD',
      employeeId: 'EMP-006',
      roleCode: 'ANESTHESIOLOGIST',
    },
    {
      email: 'medical-director@nairobi-sculpt.com',
      firstName: 'Dr. Sarah',
      lastName: 'Director',
      title: 'MD, FACS',
      employeeId: 'EMP-007',
      roleCode: 'MEDICAL_DIRECTOR',
    },
    {
      email: 'receptionist@nairobi-sculpt.com',
      firstName: 'Mary',
      lastName: 'Reception',
      title: null,
      employeeId: 'EMP-008',
      roleCode: 'RECEPTIONIST',
    },
    {
      email: 'practice-manager@nairobi-sculpt.com',
      firstName: 'Tom',
      lastName: 'Manager',
      title: 'MBA',
      employeeId: 'EMP-009',
      roleCode: 'PRACTICE_MANAGER',
    },
    {
      email: 'billing-officer@nairobi-sculpt.com',
      firstName: 'Lisa',
      lastName: 'Billing',
      title: 'CPA',
      employeeId: 'EMP-010',
      roleCode: 'BILLING_OFFICER',
    },
    {
      email: 'insurance-officer@nairobi-sculpt.com',
      firstName: 'David',
      lastName: 'Insurance',
      title: null,
      employeeId: 'EMP-011',
      roleCode: 'INSURANCE_OFFICER',
    },
    {
      email: 'audit-officer@nairobi-sculpt.com',
      firstName: 'Carol',
      lastName: 'Audit',
      title: 'CIA',
      employeeId: 'EMP-012',
      roleCode: 'AUDIT_OFFICER',
    },
  ];
```

---

## Step 6: Run Migrations and Seed

```bash
# 1. Generate Prisma client with new domains
npx prisma generate

# 2. Create migration for new domains
npx prisma migrate dev --name add_clinical_notes_surgery_domains

# 3. Run seed to create roles and permissions
npm run db:seed
```

---

## Verification

After running seed, verify:

```typescript
// Check roles
const roles = await prisma.role.findMany();
console.log(`Total roles: ${roles.length}`); // Should be 18 (8 existing + 10 new)

// Check permissions
const permissions = await prisma.permission.findMany();
console.log(`Total permissions: ${permissions.length}`); // Should be ~60+ (existing + new)

// Check role-permission assignments
const surgeonRole = await prisma.role.findUnique({
  where: { code: 'SURGEON' },
  include: { permissions: true },
});
console.log(`SURGEON has ${surgeonRole.permissions.length} permissions`);
```

---

**End of Reference Implementation**









