-- CreateEnum
CREATE TYPE "Domain" AS ENUM ('THEATER', 'MEDICAL_RECORDS', 'CONSENT', 'RBAC', 'AUDIT', 'INVENTORY', 'BILLING', 'CONSULTATION', 'EMR', 'ORDERS', 'PRESCRIPTION');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('RECEIPT', 'RESERVATION', 'CONSUMPTION', 'RETURN', 'WASTAGE', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'ALLOCATION', 'DEALLOCATION', 'REVERSAL');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('DRAFT', 'PENDING', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'VOIDED');

-- CreateEnum
CREATE TYPE "BillingAdjustmentType" AS ENUM ('DISCOUNT', 'WRITE_OFF', 'CORRECTION', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('SCHEDULED', 'CHECKED_IN', 'IN_TRIAGE', 'IN_CONSULTATION', 'PLAN_CREATED', 'CLOSED', 'FOLLOW_UP', 'REFERRED', 'SURGERY_SCHEDULED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ObservationStatus" AS ENUM ('PRELIMINARY', 'FINAL', 'AMENDED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "ConditionClinicalStatus" AS ENUM ('ACTIVE', 'RECURRENCE', 'RELAPSE', 'INACTIVE', 'REMISSION', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ConditionVerificationStatus" AS ENUM ('PROVISIONAL', 'DIFFERENTIAL', 'CONFIRMED', 'REFUTED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DECEASED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PatientLifecycleState" AS ENUM ('REGISTERED', 'VERIFIED', 'INTAKE_IN_PROGRESS', 'INTAKE_COMPLETED', 'INTAKE_VERIFIED', 'CONSULTATION_REQUESTED', 'CONSULTATION_APPROVED', 'APPOINTMENT_SCHEDULED', 'CONSULTATION_COMPLETED', 'PROCEDURE_PLANNED', 'CONSENT_SIGNED', 'SURGERY_SCHEDULED', 'SURGERY_COMPLETED', 'FOLLOW_UP', 'DISCHARGED');

-- CreateEnum
CREATE TYPE "PatientIntakeStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'CANCELLED_AFTER_PAYMENT', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('PATIENT_REQUEST', 'DOCTOR_UNAVAILABLE', 'EMERGENCY', 'WEATHER', 'OTHER');

-- CreateEnum
CREATE TYPE "ConsultationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('NURSE_TRIAGE', 'DOCTOR_SOAP', 'ADDENDUM');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('LAB');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('PENDING', 'AVAILABLE', 'AMENDED');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('PRESCRIBED', 'DISPENSED', 'PARTIALLY_DISPENSED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MedicationType" AS ENUM ('ORAL', 'INJECTION', 'TOPICAL', 'INHALATION', 'IV', 'OTHER');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('PLANNED', 'ARRIVED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EncounterClass" AS ENUM ('AMBULATORY', 'INPATIENT', 'SURGICAL', 'EMERGENCY', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('DRAFT', 'READY_FOR_SIGNATURE', 'PARTIALLY_SIGNED', 'SIGNED', 'REVOKED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SignerType" AS ENUM ('PATIENT', 'GUARDIAN', 'DOCTOR', 'NURSE_WITNESS', 'ADMIN');

-- CreateEnum
CREATE TYPE "AnnotationType" AS ENUM ('HIGHLIGHT', 'COMMENT', 'TEXT_EDIT', 'DRAWING', 'ARROW', 'RECTANGLE', 'CIRCLE', 'SIGNATURE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "employeeId" VARCHAR(100),
    "username" VARCHAR(100),
    "passwordHash" VARCHAR(255) NOT NULL,
    "passwordChangedAt" TIMESTAMPTZ(6),
    "passwordResetToken" VARCHAR(255),
    "passwordResetExpiresAt" TIMESTAMPTZ(6),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_failed_login_at" TIMESTAMPTZ(6),
    "locked_until" TIMESTAMPTZ(6),
    "firstName" VARCHAR(200) NOT NULL,
    "lastName" VARCHAR(200) NOT NULL,
    "middleName" VARCHAR(200),
    "title" VARCHAR(100),
    "phone" VARCHAR(50),
    "departmentId" UUID,
    "specialization" VARCHAR(200),
    "licenseNumber" VARCHAR(100),
    "npiNumber" VARCHAR(20),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMPTZ(6),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" VARCHAR(255),
    "backupCodes" TEXT[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "domain" "Domain",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(200) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "domain" "Domain" NOT NULL,
    "resource" VARCHAR(100),
    "action" VARCHAR(50) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "validFrom" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMPTZ(6),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMPTZ(6),
    "revokedBy" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "mrn" VARCHAR(50) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "middleName" VARCHAR(100),
    "dateOfBirth" DATE NOT NULL,
    "gender" VARCHAR(20),
    "bloodType" VARCHAR(10),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "whatsapp" VARCHAR(50),
    "phoneSecondary" VARCHAR(50),
    "addressLine1" VARCHAR(200),
    "city" VARCHAR(100),
    "state" VARCHAR(50),
    "zipCode" VARCHAR(20),
    "country" VARCHAR(100) DEFAULT 'Kenya',
    "occupation" VARCHAR(200),
    "fileNumber" VARCHAR(50) NOT NULL,
    "doctorInChargeId" UUID,
    "userId" UUID,
    "invitationToken" VARCHAR(255),
    "invitationExpiresAt" TIMESTAMPTZ(6),
    "invitedAt" TIMESTAMPTZ(6),
    "invitedBy" UUID,
    "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE',
    "restricted" BOOLEAN NOT NULL DEFAULT false,
    "restrictedReason" TEXT,
    "restrictedBy" UUID,
    "restrictedAt" TIMESTAMPTZ(6),
    "mergedInto" UUID,
    "mergedAt" TIMESTAMPTZ(6),
    "mergedBy" UUID,
    "lifecycleState" "PatientLifecycleState" NOT NULL DEFAULT 'REGISTERED',
    "lifecycleStateChangedAt" TIMESTAMPTZ(6),
    "lifecycleStateChangedBy" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_contacts" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "relationship" VARCHAR(50) NOT NULL,
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "address" VARCHAR(500),
    "isNextOfKin" BOOLEAN NOT NULL DEFAULT false,
    "isEmergencyContact" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "patient_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_allergies" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "allergen" VARCHAR(200) NOT NULL,
    "allergyType" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(50) NOT NULL,
    "reaction" TEXT,
    "diagnosedAt" DATE,
    "diagnosedBy" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "patient_allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_intakes" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "status" "PatientIntakeStatus" NOT NULL DEFAULT 'DRAFT',
    "medicalHistory" JSONB,
    "allergies" JSONB,
    "medications" JSONB,
    "chronicConditions" JSONB,
    "notes" TEXT,
    "patientAttestation" TEXT,
    "reason" TEXT,
    "verificationNotes" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(6),
    "verifiedAt" TIMESTAMPTZ(6),
    "verifiedBy" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "patient_intakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_lifecycle_transitions" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "fromState" VARCHAR(50) NOT NULL,
    "toState" VARCHAR(50) NOT NULL,
    "actorUserId" UUID NOT NULL,
    "actorRole" VARCHAR(50) NOT NULL,
    "reason" TEXT,
    "context" JSONB,
    "ipAddress" VARCHAR(100),
    "userAgent" TEXT,
    "correlationId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_lifecycle_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "appointmentNumber" VARCHAR(50) NOT NULL,
    "patientId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "scheduledStartTime" TIMESTAMPTZ(6) NOT NULL,
    "scheduledEndTime" TIMESTAMPTZ(6) NOT NULL,
    "estimatedDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "appointmentType" VARCHAR(50) NOT NULL,
    "reason" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "consultationFee" DECIMAL(10,2) NOT NULL,
    "paymentId" UUID,
    "paymentConfirmedAt" TIMESTAMPTZ(6),
    "consultationId" UUID,
    "cancelledAt" TIMESTAMPTZ(6),
    "cancelledBy" UUID,
    "cancellationReason" "CancellationReason",
    "cancellationNotes" TEXT,
    "refundIssued" BOOLEAN NOT NULL DEFAULT false,
    "refundAmount" DECIMAL(10,2),
    "refundPaymentId" UUID,
    "rescheduledFrom" UUID,
    "rescheduledTo" UUID,
    "rescheduledAt" TIMESTAMPTZ(6),
    "rescheduledBy" UUID,
    "checkedInAt" TIMESTAMPTZ(6),
    "checkedInBy" UUID,
    "reminderSentAt" TIMESTAMPTZ(6),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_requests" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "specialistId" UUID,
    "status" "ConsultationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMPTZ(6),
    "approvedBy" UUID,
    "rejectedAt" TIMESTAMPTZ(6),
    "rejectedBy" UUID,
    "rejectionReason" TEXT,
    "reason" TEXT,
    "preferredDate" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "consultation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" UUID NOT NULL,
    "consultationNumber" VARCHAR(50) NOT NULL,
    "patientId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "consultationType" VARCHAR(50) NOT NULL,
    "chiefComplaint" TEXT,
    "consultationDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "completedAt" TIMESTAMPTZ(6),
    "diagnosis" TEXT,
    "notes" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" DATE,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "billed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emr_notes" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "consultationId" UUID NOT NULL,
    "encounterId" UUID,
    "authorId" UUID NOT NULL,
    "noteType" "NoteType" NOT NULL,
    "content" TEXT NOT NULL,
    "parentNoteId" UUID,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMPTZ(6),
    "archivedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "emr_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_orders" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "consultationId" UUID NOT NULL,
    "orderedById" UUID NOT NULL,
    "approvedById" UUID,
    "orderType" "OrderType" NOT NULL DEFAULT 'LAB',
    "testName" VARCHAR(500) NOT NULL,
    "priority" VARCHAR(20) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMPTZ(6),
    "archivedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "id" UUID NOT NULL,
    "labOrderId" UUID NOT NULL,
    "recordedById" UUID,
    "resultStatus" "ResultStatus" NOT NULL DEFAULT 'PENDING',
    "resultText" TEXT,
    "fileUrl" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "consultationId" UUID NOT NULL,
    "prescribedById" UUID NOT NULL,
    "dispensedById" UUID,
    "medicationName" VARCHAR(500) NOT NULL,
    "medicationType" "MedicationType" NOT NULL,
    "dosage" VARCHAR(200) NOT NULL,
    "frequency" VARCHAR(100) NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "quantityDispensed" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "inventoryItemId" UUID,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'PRESCRIBED',
    "instructions" TEXT,
    "duration" VARCHAR(100),
    "refills" INTEGER NOT NULL DEFAULT 0,
    "refillsRemaining" INTEGER NOT NULL DEFAULT 0,
    "prescribedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispensedAt" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_dispensations" (
    "id" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "quantityDispensed" DECIMAL(10,3) NOT NULL,
    "inventoryTransactionId" UUID,
    "inventoryUsageId" UUID,
    "dispensedBy" UUID NOT NULL,
    "dispensedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "prescription_dispensations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_administrations" (
    "id" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "consultationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "administeredBy" UUID NOT NULL,
    "administeredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dosageGiven" VARCHAR(200) NOT NULL,
    "route" VARCHAR(50) NOT NULL,
    "response" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "medication_administrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_plans" (
    "id" UUID NOT NULL,
    "planNumber" VARCHAR(50) NOT NULL,
    "patientId" UUID NOT NULL,
    "consultationId" UUID NOT NULL,
    "surgeonId" UUID NOT NULL,
    "procedureName" VARCHAR(500) NOT NULL,
    "procedureCode" VARCHAR(50),
    "procedureDescription" TEXT,
    "plannedDate" DATE,
    "estimatedDurationMinutes" INTEGER,
    "complexity" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMPTZ(6),
    "approvedBy" UUID,
    "notes" TEXT,
    "preoperativeNotes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "procedure_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_inventory_requirements" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "inventoryItemId" UUID NOT NULL,
    "quantityRequired" DECIMAL(10,3) NOT NULL,
    "quantityReserved" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "procedure_inventory_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operating_theaters" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "departmentId" UUID NOT NULL,
    "capacity" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "operating_theaters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surgical_cases" (
    "id" UUID NOT NULL,
    "caseNumber" VARCHAR(50) NOT NULL,
    "patientId" UUID NOT NULL,
    "procedurePlanId" UUID NOT NULL,
    "procedureName" VARCHAR(500) NOT NULL,
    "procedureCode" VARCHAR(50),
    "description" TEXT,
    "estimatedDurationMinutes" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "status" VARCHAR(50) NOT NULL,
    "scheduledStartAt" TIMESTAMPTZ(6) NOT NULL,
    "scheduledEndAt" TIMESTAMPTZ(6) NOT NULL,
    "actualStartAt" TIMESTAMPTZ(6),
    "actualEndAt" TIMESTAMPTZ(6),
    "primarySurgeonId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "surgical_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theater_reservations" (
    "id" UUID NOT NULL,
    "theaterId" UUID NOT NULL,
    "caseId" UUID,
    "reservedFrom" TIMESTAMPTZ(6) NOT NULL,
    "reservedUntil" TIMESTAMPTZ(6) NOT NULL,
    "reservationType" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "theater_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_allocations" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "theaterId" UUID NOT NULL,
    "caseId" UUID,
    "resourceType" VARCHAR(50) NOT NULL,
    "resourceId" UUID NOT NULL,
    "resourceName" VARCHAR(200) NOT NULL,
    "role" VARCHAR(100),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "allocatedFrom" TIMESTAMPTZ(6) NOT NULL,
    "allocatedUntil" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ALLOCATED',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "resource_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounters" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "status" "EncounterStatus" NOT NULL,
    "class" "EncounterClass" NOT NULL,
    "type" TEXT NOT NULL,
    "periodStart" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEnd" TIMESTAMPTZ(6),
    "appointmentId" UUID,
    "surgicalCaseId" UUID,
    "locationId" UUID,
    "serviceProviderId" UUID NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMPTZ(6),
    "lockedById" UUID,
    "createdById" UUID NOT NULL,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conditions" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID,
    "clinicalStatus" "ConditionClinicalStatus" NOT NULL,
    "verificationStatus" "ConditionVerificationStatus" NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT,
    "code" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "onsetDate" TIMESTAMPTZ(6),
    "abatementDate" TIMESTAMPTZ(6),
    "note" TEXT,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" UUID,
    "createdById" UUID NOT NULL,

    CONSTRAINT "conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID,
    "status" "ObservationStatus" NOT NULL DEFAULT 'FINAL',
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "valueQuantity" DOUBLE PRECISION,
    "valueUnit" TEXT,
    "valueString" TEXT,
    "effectiveDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performerId" UUID,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" UUID,
    "rootVersionId" UUID,
    "createdById" UUID NOT NULL,
    "updatedById" UUID,
    "enteredInErrorById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "break_glass_logs" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "accessTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" UUID,
    "reviewNote" TEXT,

    CONSTRAINT "break_glass_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_records" (
    "id" UUID NOT NULL,
    "recordNumber" VARCHAR(50) NOT NULL,
    "patientId" UUID NOT NULL,
    "dateOfBirth" DATE,
    "gender" VARCHAR(20),
    "bloodType" VARCHAR(10),
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "mergedInto" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "noteType" VARCHAR(100) NOT NULL,
    "category" VARCHAR(100),
    "content" TEXT NOT NULL,
    "contentHash" VARCHAR(64) NOT NULL,
    "encounterDate" TIMESTAMPTZ(6),
    "authoredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authoredBy" UUID NOT NULL,
    "isAmendment" BOOLEAN NOT NULL DEFAULT false,
    "amendsNoteId" UUID,
    "amendmentReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_record_attachments" (
    "id" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "fileName" VARCHAR(500) NOT NULL,
    "filePath" VARCHAR(1000) NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "fileHash" VARCHAR(64) NOT NULL,
    "checksumVerifiedAt" TIMESTAMPTZ(6),
    "accessLevel" VARCHAR(50) NOT NULL DEFAULT 'RESTRICTED',
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "medical_record_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_merge_history" (
    "id" UUID NOT NULL,
    "sourceRecordId" UUID NOT NULL,
    "targetRecordId" UUID NOT NULL,
    "triggeringEventId" UUID NOT NULL,
    "reason" TEXT,
    "mergedBy" UUID,
    "reversedAt" TIMESTAMPTZ(6),
    "reversalEventId" UUID,
    "reversedBy" UUID,
    "mergedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "record_merge_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_templates" (
    "id" UUID NOT NULL,
    "templateCode" VARCHAR(100) NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "templateType" VARCHAR(50) NOT NULL,
    "procedureCode" VARCHAR(50),
    "applicableCPTCodes" TEXT[],
    "version" VARCHAR(50) NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMPTZ(6),
    "legalReviewDate" TIMESTAMPTZ(6),
    "approvedBy" VARCHAR(200),
    "originalDocumentPath" VARCHAR(1000),
    "originalDocumentHash" VARCHAR(64),
    "fileUrl" VARCHAR(1000),
    "placeholders" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "lockVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "consent_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_sections" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "sectionCode" VARCHAR(100) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "plainLanguageContent" TEXT,
    "order" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "requiresAcknowledgment" BOOLEAN NOT NULL DEFAULT true,
    "requiresUnderstandingCheck" BOOLEAN NOT NULL DEFAULT false,
    "understandingCheckPrompt" VARCHAR(500),
    "isExpandable" BOOLEAN NOT NULL DEFAULT false,
    "showTooltip" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "consent_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_clauses" (
    "id" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "clauseCode" VARCHAR(100) NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "requiresAcknowledgment" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "consent_clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_consent_instances" (
    "id" UUID NOT NULL,
    "instanceNumber" VARCHAR(50) NOT NULL,
    "templateId" UUID NOT NULL,
    "templateVersion" VARCHAR(50) NOT NULL,
    "patientId" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6),
    "validUntil" DATE,
    "revocationEventId" UUID,
    "relatedCaseId" UUID,
    "relatedRecordId" UUID,
    "consultationId" UUID NOT NULL,
    "procedurePlanId" UUID NOT NULL,
    "presentedBy" UUID NOT NULL,
    "revokedBy" UUID,
    "understandingChecksPassed" BOOLEAN NOT NULL DEFAULT false,
    "questionsRaised" BOOLEAN NOT NULL DEFAULT false,
    "allSectionsAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "translated" BOOLEAN NOT NULL DEFAULT false,
    "supersededBy" UUID,
    "supersedesId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "patient_consent_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_consent_acknowledgements" (
    "id" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "sectionId" UUID,
    "clauseId" UUID,
    "acknowledgedBy" UUID NOT NULL,
    "acknowledgedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sectionCode" VARCHAR(100),
    "clauseCode" VARCHAR(100),
    "clauseContent" TEXT,
    "acknowledged" BOOLEAN NOT NULL DEFAULT true,
    "declinedReason" TEXT,
    "understandingCheckPassed" BOOLEAN NOT NULL DEFAULT false,
    "understandingResponse" VARCHAR(50),
    "discussionRequired" BOOLEAN NOT NULL DEFAULT false,
    "discussionCompleted" BOOLEAN NOT NULL DEFAULT false,
    "discussedWith" UUID,
    "timeSpentSeconds" INTEGER,
    "scrollDepth" INTEGER,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "deviceType" VARCHAR(50),
    "signatureHash" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "patient_consent_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_artifacts" (
    "id" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "artifactType" VARCHAR(50) NOT NULL,
    "fileName" VARCHAR(500) NOT NULL,
    "filePath" VARCHAR(1000) NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "fileHash" VARCHAR(64) NOT NULL,
    "checksumVerifiedAt" TIMESTAMPTZ(6),
    "generatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" UUID NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "consent_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_interactions" (
    "id" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "interactionType" VARCHAR(50) NOT NULL,
    "sectionId" UUID,
    "clauseId" UUID,
    "userId" UUID NOT NULL,
    "userRole" VARCHAR(50) NOT NULL,
    "details" JSONB,
    "ipAddress" VARCHAR(50),
    "userAgent" VARCHAR(500),
    "deviceType" VARCHAR(50),
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_template_required_parties" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "partyType" VARCHAR(50) NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "consent_template_required_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_signatures" (
    "id" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "partyType" VARCHAR(50) NOT NULL,
    "signedBy" UUID NOT NULL,
    "signedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signatureMethod" VARCHAR(50) NOT NULL,
    "signatureData" TEXT,
    "ipAddress" VARCHAR(50),
    "userAgent" VARCHAR(500),
    "deviceType" VARCHAR(50),
    "signatureHash" VARCHAR(64),
    "guardianRelationship" VARCHAR(100),
    "guardianConsentFor" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "consent_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_document_snapshots" (
    "id" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "fullDocumentText" TEXT NOT NULL,
    "sectionSnapshots" JSONB,
    "templateVersion" VARCHAR(50) NOT NULL,
    "templateVersionNumber" INTEGER NOT NULL,
    "snapshottedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "consent_document_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_version_history" (
    "id" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "previousInstanceId" UUID,
    "changeReason" TEXT,
    "changesSummary" TEXT,
    "versionCreatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,

    CONSTRAINT "consent_version_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_fill_in_fields" (
    "id" UUID NOT NULL,
    "templateId" UUID,
    "sectionId" UUID,
    "clauseId" UUID,
    "fieldCode" VARCHAR(100) NOT NULL,
    "fieldType" VARCHAR(50) NOT NULL,
    "label" VARCHAR(500) NOT NULL,
    "placeholder" VARCHAR(500),
    "defaultValue" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "options" TEXT[],
    "contentMarker" VARCHAR(200) NOT NULL,
    "helpText" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "consent_fill_in_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_fill_in_values" (
    "id" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "fieldId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "filledBy" UUID NOT NULL,
    "filledAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_fill_in_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_structured_data" (
    "id" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "dataType" VARCHAR(100) NOT NULL,
    "schema" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "consent_structured_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_pages" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "title" VARCHAR(500),
    "content" TEXT,
    "sectionIds" TEXT[],
    "clauseIds" TEXT[],
    "requiresInitials" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "consent_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_page_acknowledgements" (
    "id" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "acknowledgedBy" UUID NOT NULL,
    "acknowledgedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "initialsData" TEXT,
    "timeSpentSeconds" INTEGER,
    "scrollDepth" INTEGER,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "deviceType" VARCHAR(50),

    CONSTRAINT "consent_page_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_consents" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "consultationId" UUID,
    "templateId" UUID NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedPdfUrl" VARCHAR(1000),
    "finalPdfUrl" VARCHAR(1000),
    "finalPdfHash" VARCHAR(64),
    "sentForSignatureAt" TIMESTAMPTZ(6),
    "lockedAt" TIMESTAMPTZ(6),
    "annotationVersion" INTEGER NOT NULL DEFAULT 1,
    "lastAnnotationAt" TIMESTAMPTZ(6),
    "createdById" UUID NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),
    "archivedById" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pdf_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_consent_signatures" (
    "id" UUID NOT NULL,
    "consentId" UUID NOT NULL,
    "signerId" UUID,
    "signerName" VARCHAR(200) NOT NULL,
    "signerType" "SignerType" NOT NULL,
    "signatureUrl" VARCHAR(1000) NOT NULL,
    "pageNumber" INTEGER,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "signedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(45),
    "deviceInfo" VARCHAR(500),
    "userAgent" VARCHAR(500),
    "signatureHash" VARCHAR(64),

    CONSTRAINT "pdf_consent_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_consent_annotations" (
    "id" UUID NOT NULL,
    "consentId" UUID NOT NULL,
    "annotationType" "AnnotationType" NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "coordinates" JSONB,
    "content" TEXT,
    "color" VARCHAR(7) NOT NULL DEFAULT '#000000',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),
    "isImmutable" BOOLEAN NOT NULL DEFAULT false,
    "createdEventId" UUID,
    "deletedEventId" UUID,

    CONSTRAINT "pdf_consent_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_providers" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "payerId" VARCHAR(50),
    "taxId" VARCHAR(50),
    "address" VARCHAR(500),
    "city" VARCHAR(100),
    "state" VARCHAR(50),
    "zipCode" VARCHAR(20),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "insurance_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_policies" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "policyNumber" VARCHAR(100) NOT NULL,
    "groupNumber" VARCHAR(100),
    "planName" VARCHAR(200),
    "effectiveDate" DATE NOT NULL,
    "expirationDate" DATE,
    "coverageType" VARCHAR(50) NOT NULL,
    "planType" VARCHAR(50),
    "subscriberName" VARCHAR(200),
    "subscriberId" VARCHAR(100),
    "subscriberDOB" DATE,
    "subscriberRelationship" VARCHAR(50),
    "deductible" DECIMAL(10,2),
    "copay" DECIMAL(10,2),
    "coinsurance" DECIMAL(5,4),
    "outOfPocketMax" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "insurance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_codes" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "codeType" VARCHAR(20) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "category" VARCHAR(100),
    "defaultCharge" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "billing_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_schedules" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "scheduleType" VARCHAR(50) NOT NULL,
    "insuranceProviderId" UUID,
    "effectiveDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "fee_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_schedule_items" (
    "id" UUID NOT NULL,
    "scheduleId" UUID NOT NULL,
    "billingCodeId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(50),
    "effectiveDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "fee_schedule_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" UUID NOT NULL,
    "billNumber" VARCHAR(50) NOT NULL,
    "patientId" UUID NOT NULL,
    "insurancePolicyId" UUID,
    "billDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATE NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(10,2) NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMPTZ(6),
    "paidAt" TIMESTAMPTZ(6),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_line_items" (
    "id" UUID NOT NULL,
    "billId" UUID NOT NULL,
    "billingCodeId" UUID NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,
    "serviceDate" DATE NOT NULL,
    "triggeringEventId" UUID NOT NULL,
    "caseId" UUID,
    "recordId" UUID,
    "usageId" UUID,
    "procedureCode" VARCHAR(50),
    "procedureName" VARCHAR(500),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "bill_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_adjustments" (
    "id" UUID NOT NULL,
    "billId" UUID NOT NULL,
    "lineItemId" UUID,
    "adjustmentType" "BillingAdjustmentType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceNumber" VARCHAR(100),
    "triggeringEventId" UUID NOT NULL,
    "adjustedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adjustedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "billing_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "paymentNumber" VARCHAR(50) NOT NULL,
    "patientId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" VARCHAR(50) NOT NULL,
    "paymentSource" VARCHAR(50) NOT NULL,
    "insuranceClaimId" UUID,
    "referenceNumber" VARCHAR(100),
    "checkDate" DATE,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMPTZ(6),
    "triggeringEventId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "billId" UUID,
    "lineItemId" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "allocatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocatedBy" UUID,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_claims" (
    "id" UUID NOT NULL,
    "claimNumber" VARCHAR(50) NOT NULL,
    "externalClaimId" VARCHAR(100),
    "patientId" UUID NOT NULL,
    "insurancePolicyId" UUID NOT NULL,
    "billId" UUID NOT NULL,
    "claimType" VARCHAR(50) NOT NULL,
    "totalBilled" DECIMAL(10,2) NOT NULL,
    "totalPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "patientResponsibility" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "serviceFromDate" DATE NOT NULL,
    "serviceToDate" DATE NOT NULL,
    "submittedAt" TIMESTAMPTZ(6),
    "respondedAt" TIMESTAMPTZ(6),
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "ediFormat" VARCHAR(50),
    "submissionFile" VARCHAR(1000),
    "responseFile" VARCHAR(1000),
    "triggeringEventId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "insurance_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_categories" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "parentId" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "inventory_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL,
    "itemNumber" VARCHAR(100) NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "categoryId" UUID NOT NULL,
    "itemType" VARCHAR(50) NOT NULL,
    "vendorId" UUID,
    "vendorPartNumber" VARCHAR(100),
    "manufacturerName" VARCHAR(200),
    "manufacturerPartNumber" VARCHAR(100),
    "unitCost" DECIMAL(10,2),
    "unitPrice" DECIMAL(10,2),
    "unitOfMeasure" VARCHAR(50) NOT NULL,
    "reorderPoint" DECIMAL(10,3),
    "reorderQuantity" DECIMAL(10,3),
    "maxStock" DECIMAL(10,3),
    "trackSerialNumber" BOOLEAN NOT NULL DEFAULT false,
    "trackLotNumber" BOOLEAN NOT NULL DEFAULT false,
    "trackExpiration" BOOLEAN NOT NULL DEFAULT false,
    "trackBatch" BOOLEAN NOT NULL DEFAULT false,
    "isEquipment" BOOLEAN NOT NULL DEFAULT false,
    "equipmentType" VARCHAR(100),
    "requiresCalibration" BOOLEAN NOT NULL DEFAULT false,
    "calibrationFrequencyDays" INTEGER,
    "fdaNumber" VARCHAR(100),
    "fdaCleared" BOOLEAN NOT NULL DEFAULT false,
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "taxId" VARCHAR(50),
    "accountNumber" VARCHAR(100),
    "primaryContact" VARCHAR(200),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" VARCHAR(500),
    "city" VARCHAR(100),
    "state" VARCHAR(50),
    "zipCode" VARCHAR(20),
    "country" VARCHAR(100),
    "paymentTerms" VARCHAR(100),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_batches" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "batchNumber" VARCHAR(100) NOT NULL,
    "lotNumber" VARCHAR(100),
    "manufactureDate" DATE,
    "expirationDate" DATE,
    "receivedDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedQuantity" DECIMAL(10,3) NOT NULL,
    "unitCost" DECIMAL(10,2),
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "vendorId" UUID,
    "purchaseOrderNumber" VARCHAR(100),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_stock" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "batchId" UUID,
    "locationId" UUID,
    "quantityOnHand" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "quantityReserved" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "quantityAvailable" DECIMAL(10,3) NOT NULL,
    "lastComputedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "inventory_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" UUID NOT NULL,
    "transactionNumber" VARCHAR(50) NOT NULL,
    "itemId" UUID NOT NULL,
    "batchId" UUID,
    "transactionType" "InventoryTransactionType" NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitCost" DECIMAL(10,2),
    "fromLocationId" UUID,
    "toLocationId" UUID,
    "referenceType" VARCHAR(50),
    "referenceId" UUID,
    "triggeringEventId" UUID NOT NULL,
    "caseId" UUID,
    "patientId" UUID,
    "batchNumber" VARCHAR(100),
    "lotNumber" VARCHAR(100),
    "serialNumber" VARCHAR(100),
    "expirationDate" DATE,
    "notes" TEXT,
    "reason" TEXT,
    "authorizedBy" UUID,
    "transactionDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_usages" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "batchId" UUID,
    "transactionId" UUID NOT NULL,
    "caseId" UUID,
    "consultationId" UUID,
    "patientId" UUID NOT NULL,
    "quantityUsed" DECIMAL(10,3) NOT NULL,
    "unitCost" DECIMAL(10,2),
    "batchNumber" VARCHAR(100),
    "lotNumber" VARCHAR(100),
    "serialNumber" VARCHAR(100),
    "expirationDate" DATE,
    "clinicalEventId" UUID NOT NULL,
    "billingEventId" UUID,
    "theaterId" UUID,
    "locationId" UUID,
    "notes" TEXT,
    "usedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "inventory_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_history" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "changedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" UUID,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "reason" TEXT,

    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_events" (
    "id" UUID NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "domain" "Domain" NOT NULL,
    "aggregateId" UUID NOT NULL,
    "aggregateType" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "correlationId" UUID,
    "causationId" UUID,
    "createdBy" UUID,
    "sessionId" VARCHAR(100),
    "requestId" VARCHAR(100),
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentHash" VARCHAR(64) NOT NULL,

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_access_logs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "resourceType" VARCHAR(100) NOT NULL,
    "resourceId" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "sessionId" VARCHAR(100),
    "reason" TEXT,
    "justification" TEXT,
    "accessedPHI" BOOLEAN NOT NULL DEFAULT false,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "accessedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "refreshTokenHash" VARCHAR(255) NOT NULL,
    "deviceInfo" VARCHAR(500),
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "revokedBy" UUID,
    "revokedReason" VARCHAR(200),
    "mfaVerified" BOOLEAN NOT NULL DEFAULT false,
    "mfaMethod" VARCHAR(50),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_status_history" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "fromStatus" VARCHAR(50),
    "toStatus" VARCHAR(50) NOT NULL,
    "changedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeringEventId" UUID NOT NULL,
    "reason" TEXT,
    "changedBy" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "case_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_merge_history" (
    "id" UUID NOT NULL,
    "sourcePatientId" UUID NOT NULL,
    "targetPatientId" UUID NOT NULL,
    "triggeringEventId" UUID NOT NULL,
    "reason" TEXT,
    "mergedBy" UUID,
    "reversedAt" TIMESTAMPTZ(6),
    "reversalEventId" UUID,
    "reversedBy" UUID,
    "mergedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "patient_merge_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeId_key" ON "users"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_employeeId_idx" ON "users"("employeeId");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_departmentId_idx" ON "users"("departmentId");

-- CreateIndex
CREATE INDEX "users_active_idx" ON "users"("active");

-- CreateIndex
CREATE INDEX "users_emailVerified_idx" ON "users"("emailVerified");

-- CreateIndex
CREATE INDEX "users_lastLoginAt_idx" ON "users"("lastLoginAt");

-- CreateIndex
CREATE INDEX "users_locked_until_idx" ON "users"("locked_until");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE INDEX "roles_code_idx" ON "roles"("code");

-- CreateIndex
CREATE INDEX "roles_domain_idx" ON "roles"("domain");

-- CreateIndex
CREATE INDEX "roles_active_idx" ON "roles"("active");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_code_idx" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_domain_idx" ON "permissions"("domain");

-- CreateIndex
CREATE INDEX "permissions_resource_idx" ON "permissions"("resource");

-- CreateIndex
CREATE INDEX "permissions_action_idx" ON "permissions"("action");

-- CreateIndex
CREATE INDEX "permissions_isActive_idx" ON "permissions"("isActive");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "user_role_assignments_userId_idx" ON "user_role_assignments"("userId");

-- CreateIndex
CREATE INDEX "user_role_assignments_roleId_idx" ON "user_role_assignments"("roleId");

-- CreateIndex
CREATE INDEX "user_role_assignments_validFrom_validUntil_idx" ON "user_role_assignments"("validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "user_role_assignments_active_idx" ON "user_role_assignments"("active");

-- CreateIndex
CREATE INDEX "user_role_assignments_revokedAt_idx" ON "user_role_assignments"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "patients_mrn_key" ON "patients"("mrn");

-- CreateIndex
CREATE UNIQUE INDEX "patients_fileNumber_key" ON "patients"("fileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "patients_userId_key" ON "patients"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_invitationToken_key" ON "patients"("invitationToken");

-- CreateIndex
CREATE INDEX "patients_mrn_idx" ON "patients"("mrn");

-- CreateIndex
CREATE INDEX "patients_fileNumber_idx" ON "patients"("fileNumber");

-- CreateIndex
CREATE INDEX "patients_firstName_lastName_idx" ON "patients"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "patients_email_idx" ON "patients"("email");

-- CreateIndex
CREATE INDEX "patients_phone_idx" ON "patients"("phone");

-- CreateIndex
CREATE INDEX "patients_whatsapp_idx" ON "patients"("whatsapp");

-- CreateIndex
CREATE INDEX "patients_dateOfBirth_idx" ON "patients"("dateOfBirth");

-- CreateIndex
CREATE INDEX "patients_status_idx" ON "patients"("status");

-- CreateIndex
CREATE INDEX "patients_doctorInChargeId_idx" ON "patients"("doctorInChargeId");

-- CreateIndex
CREATE INDEX "patients_mergedInto_idx" ON "patients"("mergedInto");

-- CreateIndex
CREATE INDEX "patients_city_idx" ON "patients"("city");

-- CreateIndex
CREATE INDEX "patients_occupation_idx" ON "patients"("occupation");

-- CreateIndex
CREATE INDEX "patients_lifecycleState_idx" ON "patients"("lifecycleState");

-- CreateIndex
CREATE INDEX "patients_lifecycleStateChangedAt_idx" ON "patients"("lifecycleStateChangedAt");

-- CreateIndex
CREATE INDEX "patients_invitationToken_idx" ON "patients"("invitationToken");

-- CreateIndex
CREATE INDEX "patients_invitedBy_idx" ON "patients"("invitedBy");

-- CreateIndex
CREATE INDEX "patients_firstName_lastName_dateOfBirth_idx" ON "patients"("firstName", "lastName", "dateOfBirth");

-- CreateIndex
CREATE INDEX "patients_fileNumber_status_idx" ON "patients"("fileNumber", "status");

-- CreateIndex
CREATE INDEX "patient_contacts_patientId_idx" ON "patient_contacts"("patientId");

-- CreateIndex
CREATE INDEX "patient_contacts_isEmergencyContact_idx" ON "patient_contacts"("isEmergencyContact");

-- CreateIndex
CREATE INDEX "patient_contacts_isNextOfKin_idx" ON "patient_contacts"("isNextOfKin");

-- CreateIndex
CREATE INDEX "patient_allergies_patientId_idx" ON "patient_allergies"("patientId");

-- CreateIndex
CREATE INDEX "patient_allergies_active_idx" ON "patient_allergies"("active");

-- CreateIndex
CREATE INDEX "patient_allergies_allergyType_idx" ON "patient_allergies"("allergyType");

-- CreateIndex
CREATE INDEX "patient_intakes_patientId_idx" ON "patient_intakes"("patientId");

-- CreateIndex
CREATE INDEX "patient_intakes_status_idx" ON "patient_intakes"("status");

-- CreateIndex
CREATE INDEX "patient_intakes_completedAt_idx" ON "patient_intakes"("completedAt");

-- CreateIndex
CREATE INDEX "patient_intakes_verifiedAt_idx" ON "patient_intakes"("verifiedAt");

-- CreateIndex
CREATE INDEX "patient_intakes_startedAt_idx" ON "patient_intakes"("startedAt");

-- CreateIndex
CREATE INDEX "patient_lifecycle_transitions_patientId_idx" ON "patient_lifecycle_transitions"("patientId");

-- CreateIndex
CREATE INDEX "patient_lifecycle_transitions_createdAt_idx" ON "patient_lifecycle_transitions"("createdAt");

-- CreateIndex
CREATE INDEX "patient_lifecycle_transitions_fromState_toState_idx" ON "patient_lifecycle_transitions"("fromState", "toState");

-- CreateIndex
CREATE INDEX "patient_lifecycle_transitions_actorUserId_idx" ON "patient_lifecycle_transitions"("actorUserId");

-- CreateIndex
CREATE INDEX "patient_lifecycle_transitions_actorRole_idx" ON "patient_lifecycle_transitions"("actorRole");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_appointmentNumber_key" ON "appointments"("appointmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_paymentId_key" ON "appointments"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_consultationId_key" ON "appointments"("consultationId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_refundPaymentId_key" ON "appointments"("refundPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_rescheduledFrom_key" ON "appointments"("rescheduledFrom");

-- CreateIndex
CREATE INDEX "appointments_appointmentNumber_idx" ON "appointments"("appointmentNumber");

-- CreateIndex
CREATE INDEX "appointments_patientId_idx" ON "appointments"("patientId");

-- CreateIndex
CREATE INDEX "appointments_doctorId_idx" ON "appointments"("doctorId");

-- CreateIndex
CREATE INDEX "appointments_scheduledDate_idx" ON "appointments"("scheduledDate");

-- CreateIndex
CREATE INDEX "appointments_scheduledStartTime_scheduledEndTime_idx" ON "appointments"("scheduledStartTime", "scheduledEndTime");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_paymentId_idx" ON "appointments"("paymentId");

-- CreateIndex
CREATE INDEX "appointments_consultationId_idx" ON "appointments"("consultationId");

-- CreateIndex
CREATE INDEX "appointments_appointmentType_idx" ON "appointments"("appointmentType");

-- CreateIndex
CREATE INDEX "appointments_createdAt_idx" ON "appointments"("createdAt");

-- CreateIndex
CREATE INDEX "consultation_requests_patientId_idx" ON "consultation_requests"("patientId");

-- CreateIndex
CREATE INDEX "consultation_requests_status_idx" ON "consultation_requests"("status");

-- CreateIndex
CREATE INDEX "consultation_requests_requestedAt_idx" ON "consultation_requests"("requestedAt");

-- CreateIndex
CREATE INDEX "consultation_requests_approvedAt_idx" ON "consultation_requests"("approvedAt");

-- CreateIndex
CREATE INDEX "consultation_requests_specialistId_idx" ON "consultation_requests"("specialistId");

-- CreateIndex
CREATE UNIQUE INDEX "consultations_consultationNumber_key" ON "consultations"("consultationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "consultations_appointmentId_key" ON "consultations"("appointmentId");

-- CreateIndex
CREATE INDEX "consultations_consultationNumber_idx" ON "consultations"("consultationNumber");

-- CreateIndex
CREATE INDEX "consultations_patientId_idx" ON "consultations"("patientId");

-- CreateIndex
CREATE INDEX "consultations_doctorId_idx" ON "consultations"("doctorId");

-- CreateIndex
CREATE INDEX "consultations_appointmentId_idx" ON "consultations"("appointmentId");

-- CreateIndex
CREATE INDEX "consultations_consultationDate_idx" ON "consultations"("consultationDate");

-- CreateIndex
CREATE INDEX "consultations_status_idx" ON "consultations"("status");

-- CreateIndex
CREATE INDEX "consultations_consultationType_idx" ON "consultations"("consultationType");

-- CreateIndex
CREATE INDEX "emr_notes_patientId_idx" ON "emr_notes"("patientId");

-- CreateIndex
CREATE INDEX "emr_notes_consultationId_idx" ON "emr_notes"("consultationId");

-- CreateIndex
CREATE INDEX "emr_notes_noteType_idx" ON "emr_notes"("noteType");

-- CreateIndex
CREATE INDEX "emr_notes_authorId_idx" ON "emr_notes"("authorId");

-- CreateIndex
CREATE INDEX "emr_notes_archived_idx" ON "emr_notes"("archived");

-- CreateIndex
CREATE INDEX "emr_notes_parentNoteId_idx" ON "emr_notes"("parentNoteId");

-- CreateIndex
CREATE INDEX "emr_notes_createdAt_idx" ON "emr_notes"("createdAt");

-- CreateIndex
CREATE INDEX "emr_notes_archivedAt_idx" ON "emr_notes"("archivedAt");

-- CreateIndex
CREATE INDEX "emr_notes_locked_idx" ON "emr_notes"("locked");

-- CreateIndex
CREATE INDEX "lab_orders_consultationId_idx" ON "lab_orders"("consultationId");

-- CreateIndex
CREATE INDEX "lab_orders_patientId_idx" ON "lab_orders"("patientId");

-- CreateIndex
CREATE INDEX "lab_orders_status_idx" ON "lab_orders"("status");

-- CreateIndex
CREATE INDEX "lab_orders_orderedById_idx" ON "lab_orders"("orderedById");

-- CreateIndex
CREATE INDEX "lab_orders_approvedById_idx" ON "lab_orders"("approvedById");

-- CreateIndex
CREATE INDEX "lab_orders_archived_idx" ON "lab_orders"("archived");

-- CreateIndex
CREATE INDEX "lab_orders_createdAt_idx" ON "lab_orders"("createdAt");

-- CreateIndex
CREATE INDEX "lab_orders_archivedAt_idx" ON "lab_orders"("archivedAt");

-- CreateIndex
CREATE INDEX "lab_results_labOrderId_idx" ON "lab_results"("labOrderId");

-- CreateIndex
CREATE INDEX "lab_results_recordedById_idx" ON "lab_results"("recordedById");

-- CreateIndex
CREATE INDEX "lab_results_resultStatus_idx" ON "lab_results"("resultStatus");

-- CreateIndex
CREATE INDEX "lab_results_createdAt_idx" ON "lab_results"("createdAt");

-- CreateIndex
CREATE INDEX "prescriptions_inventoryItemId_idx" ON "prescriptions"("inventoryItemId");

-- CreateIndex
CREATE INDEX "prescriptions_patientId_idx" ON "prescriptions"("patientId");

-- CreateIndex
CREATE INDEX "prescriptions_consultationId_idx" ON "prescriptions"("consultationId");

-- CreateIndex
CREATE INDEX "prescriptions_prescribedById_idx" ON "prescriptions"("prescribedById");

-- CreateIndex
CREATE INDEX "prescriptions_dispensedById_idx" ON "prescriptions"("dispensedById");

-- CreateIndex
CREATE INDEX "prescriptions_status_idx" ON "prescriptions"("status");

-- CreateIndex
CREATE INDEX "prescriptions_prescribedAt_idx" ON "prescriptions"("prescribedAt");

-- CreateIndex
CREATE INDEX "prescriptions_dispensedAt_idx" ON "prescriptions"("dispensedAt");

-- CreateIndex
CREATE INDEX "prescriptions_expiresAt_idx" ON "prescriptions"("expiresAt");

-- CreateIndex
CREATE INDEX "prescriptions_createdAt_idx" ON "prescriptions"("createdAt");

-- CreateIndex
CREATE INDEX "prescription_dispensations_prescriptionId_idx" ON "prescription_dispensations"("prescriptionId");

-- CreateIndex
CREATE INDEX "prescription_dispensations_inventoryTransactionId_idx" ON "prescription_dispensations"("inventoryTransactionId");

-- CreateIndex
CREATE INDEX "prescription_dispensations_inventoryUsageId_idx" ON "prescription_dispensations"("inventoryUsageId");

-- CreateIndex
CREATE INDEX "prescription_dispensations_dispensedBy_idx" ON "prescription_dispensations"("dispensedBy");

-- CreateIndex
CREATE INDEX "prescription_dispensations_dispensedAt_idx" ON "prescription_dispensations"("dispensedAt");

-- CreateIndex
CREATE INDEX "medication_administrations_prescriptionId_idx" ON "medication_administrations"("prescriptionId");

-- CreateIndex
CREATE INDEX "medication_administrations_consultationId_idx" ON "medication_administrations"("consultationId");

-- CreateIndex
CREATE INDEX "medication_administrations_patientId_idx" ON "medication_administrations"("patientId");

-- CreateIndex
CREATE INDEX "medication_administrations_administeredBy_idx" ON "medication_administrations"("administeredBy");

-- CreateIndex
CREATE INDEX "medication_administrations_administeredAt_idx" ON "medication_administrations"("administeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "procedure_plans_planNumber_key" ON "procedure_plans"("planNumber");

-- CreateIndex
CREATE INDEX "procedure_plans_planNumber_idx" ON "procedure_plans"("planNumber");

-- CreateIndex
CREATE INDEX "procedure_plans_patientId_idx" ON "procedure_plans"("patientId");

-- CreateIndex
CREATE INDEX "procedure_plans_consultationId_idx" ON "procedure_plans"("consultationId");

-- CreateIndex
CREATE INDEX "procedure_plans_surgeonId_idx" ON "procedure_plans"("surgeonId");

-- CreateIndex
CREATE INDEX "procedure_plans_status_idx" ON "procedure_plans"("status");

-- CreateIndex
CREATE INDEX "procedure_plans_plannedDate_idx" ON "procedure_plans"("plannedDate");

-- CreateIndex
CREATE INDEX "procedure_inventory_requirements_planId_idx" ON "procedure_inventory_requirements"("planId");

-- CreateIndex
CREATE INDEX "procedure_inventory_requirements_inventoryItemId_idx" ON "procedure_inventory_requirements"("inventoryItemId");

-- CreateIndex
CREATE INDEX "procedure_inventory_requirements_status_idx" ON "procedure_inventory_requirements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE INDEX "departments_code_idx" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "operating_theaters_code_key" ON "operating_theaters"("code");

-- CreateIndex
CREATE INDEX "operating_theaters_code_idx" ON "operating_theaters"("code");

-- CreateIndex
CREATE INDEX "operating_theaters_departmentId_idx" ON "operating_theaters"("departmentId");

-- CreateIndex
CREATE INDEX "operating_theaters_active_idx" ON "operating_theaters"("active");

-- CreateIndex
CREATE UNIQUE INDEX "surgical_cases_caseNumber_key" ON "surgical_cases"("caseNumber");

-- CreateIndex
CREATE INDEX "surgical_cases_caseNumber_idx" ON "surgical_cases"("caseNumber");

-- CreateIndex
CREATE INDEX "surgical_cases_patientId_idx" ON "surgical_cases"("patientId");

-- CreateIndex
CREATE INDEX "surgical_cases_procedurePlanId_idx" ON "surgical_cases"("procedurePlanId");

-- CreateIndex
CREATE INDEX "surgical_cases_status_idx" ON "surgical_cases"("status");

-- CreateIndex
CREATE INDEX "surgical_cases_scheduledStartAt_scheduledEndAt_idx" ON "surgical_cases"("scheduledStartAt", "scheduledEndAt");

-- CreateIndex
CREATE INDEX "surgical_cases_primarySurgeonId_idx" ON "surgical_cases"("primarySurgeonId");

-- CreateIndex
CREATE INDEX "theater_reservations_theaterId_reservedFrom_reservedUntil_idx" ON "theater_reservations"("theaterId", "reservedFrom", "reservedUntil");

-- CreateIndex
CREATE INDEX "theater_reservations_caseId_idx" ON "theater_reservations"("caseId");

-- CreateIndex
CREATE INDEX "theater_reservations_status_idx" ON "theater_reservations"("status");

-- CreateIndex
CREATE INDEX "theater_reservations_reservedFrom_reservedUntil_idx" ON "theater_reservations"("reservedFrom", "reservedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "theater_reservations_theaterId_reservedFrom_reservedUntil_key" ON "theater_reservations"("theaterId", "reservedFrom", "reservedUntil");

-- CreateIndex
CREATE INDEX "resource_allocations_reservationId_idx" ON "resource_allocations"("reservationId");

-- CreateIndex
CREATE INDEX "resource_allocations_theaterId_idx" ON "resource_allocations"("theaterId");

-- CreateIndex
CREATE INDEX "resource_allocations_caseId_idx" ON "resource_allocations"("caseId");

-- CreateIndex
CREATE INDEX "resource_allocations_resourceType_resourceId_idx" ON "resource_allocations"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "resource_allocations_allocatedFrom_allocatedUntil_idx" ON "resource_allocations"("allocatedFrom", "allocatedUntil");

-- CreateIndex
CREATE INDEX "resource_allocations_status_idx" ON "resource_allocations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "encounters_appointmentId_key" ON "encounters"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "encounters_surgicalCaseId_key" ON "encounters"("surgicalCaseId");

-- CreateIndex
CREATE INDEX "encounters_patientId_idx" ON "encounters"("patientId");

-- CreateIndex
CREATE INDEX "encounters_locked_idx" ON "encounters"("locked");

-- CreateIndex
CREATE INDEX "encounters_status_idx" ON "encounters"("status");

-- CreateIndex
CREATE INDEX "encounters_periodStart_idx" ON "encounters"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "conditions_previousVersionId_key" ON "conditions"("previousVersionId");

-- CreateIndex
CREATE INDEX "conditions_patientId_clinicalStatus_isLatest_idx" ON "conditions"("patientId", "clinicalStatus", "isLatest");

-- CreateIndex
CREATE UNIQUE INDEX "observations_previousVersionId_key" ON "observations"("previousVersionId");

-- CreateIndex
CREATE INDEX "observations_patientId_idx" ON "observations"("patientId");

-- CreateIndex
CREATE INDEX "observations_encounterId_isLatest_idx" ON "observations"("encounterId", "isLatest");

-- CreateIndex
CREATE INDEX "observations_code_idx" ON "observations"("code");

-- CreateIndex
CREATE INDEX "observations_effectiveDateTime_idx" ON "observations"("effectiveDateTime");

-- CreateIndex
CREATE INDEX "observations_rootVersionId_idx" ON "observations"("rootVersionId");

-- CreateIndex
CREATE INDEX "break_glass_logs_actorId_idx" ON "break_glass_logs"("actorId");

-- CreateIndex
CREATE INDEX "break_glass_logs_patientId_idx" ON "break_glass_logs"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "medical_records_recordNumber_key" ON "medical_records"("recordNumber");

-- CreateIndex
CREATE INDEX "medical_records_recordNumber_idx" ON "medical_records"("recordNumber");

-- CreateIndex
CREATE INDEX "medical_records_patientId_idx" ON "medical_records"("patientId");

-- CreateIndex
CREATE INDEX "medical_records_status_idx" ON "medical_records"("status");

-- CreateIndex
CREATE INDEX "medical_records_mergedInto_idx" ON "medical_records"("mergedInto");

-- CreateIndex
CREATE INDEX "clinical_notes_recordId_idx" ON "clinical_notes"("recordId");

-- CreateIndex
CREATE INDEX "clinical_notes_authoredBy_idx" ON "clinical_notes"("authoredBy");

-- CreateIndex
CREATE INDEX "clinical_notes_authoredAt_idx" ON "clinical_notes"("authoredAt");

-- CreateIndex
CREATE INDEX "clinical_notes_noteType_idx" ON "clinical_notes"("noteType");

-- CreateIndex
CREATE INDEX "clinical_notes_amendsNoteId_idx" ON "clinical_notes"("amendsNoteId");

-- CreateIndex
CREATE INDEX "clinical_notes_contentHash_idx" ON "clinical_notes"("contentHash");

-- CreateIndex
CREATE INDEX "medical_record_attachments_recordId_idx" ON "medical_record_attachments"("recordId");

-- CreateIndex
CREATE INDEX "medical_record_attachments_createdBy_idx" ON "medical_record_attachments"("createdBy");

-- CreateIndex
CREATE INDEX "medical_record_attachments_accessLevel_idx" ON "medical_record_attachments"("accessLevel");

-- CreateIndex
CREATE INDEX "medical_record_attachments_fileHash_idx" ON "medical_record_attachments"("fileHash");

-- CreateIndex
CREATE INDEX "record_merge_history_sourceRecordId_idx" ON "record_merge_history"("sourceRecordId");

-- CreateIndex
CREATE INDEX "record_merge_history_targetRecordId_idx" ON "record_merge_history"("targetRecordId");

-- CreateIndex
CREATE INDEX "record_merge_history_triggeringEventId_idx" ON "record_merge_history"("triggeringEventId");

-- CreateIndex
CREATE INDEX "record_merge_history_reversalEventId_idx" ON "record_merge_history"("reversalEventId");

-- CreateIndex
CREATE INDEX "record_merge_history_mergedAt_idx" ON "record_merge_history"("mergedAt");

-- CreateIndex
CREATE INDEX "record_merge_history_reversedAt_idx" ON "record_merge_history"("reversedAt");

-- CreateIndex
CREATE UNIQUE INDEX "consent_templates_templateCode_key" ON "consent_templates"("templateCode");

-- CreateIndex
CREATE INDEX "consent_templates_templateCode_versionNumber_idx" ON "consent_templates"("templateCode", "versionNumber");

-- CreateIndex
CREATE INDEX "consent_templates_templateType_idx" ON "consent_templates"("templateType");

-- CreateIndex
CREATE INDEX "consent_templates_isActive_idx" ON "consent_templates"("isActive");

-- CreateIndex
CREATE INDEX "consent_templates_procedureCode_idx" ON "consent_templates"("procedureCode");

-- CreateIndex
CREATE INDEX "consent_templates_effectiveFrom_effectiveUntil_idx" ON "consent_templates"("effectiveFrom", "effectiveUntil");

-- CreateIndex
CREATE INDEX "consent_sections_templateId_idx" ON "consent_sections"("templateId");

-- CreateIndex
CREATE INDEX "consent_sections_sectionCode_idx" ON "consent_sections"("sectionCode");

-- CreateIndex
CREATE INDEX "consent_sections_order_idx" ON "consent_sections"("order");

-- CreateIndex
CREATE INDEX "consent_clauses_sectionId_idx" ON "consent_clauses"("sectionId");

-- CreateIndex
CREATE INDEX "consent_clauses_clauseCode_idx" ON "consent_clauses"("clauseCode");

-- CreateIndex
CREATE INDEX "consent_clauses_order_idx" ON "consent_clauses"("order");

-- CreateIndex
CREATE UNIQUE INDEX "patient_consent_instances_instanceNumber_key" ON "patient_consent_instances"("instanceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "patient_consent_instances_procedurePlanId_key" ON "patient_consent_instances"("procedurePlanId");

-- CreateIndex
CREATE INDEX "patient_consent_instances_instanceNumber_idx" ON "patient_consent_instances"("instanceNumber");

-- CreateIndex
CREATE INDEX "patient_consent_instances_templateId_idx" ON "patient_consent_instances"("templateId");

-- CreateIndex
CREATE INDEX "patient_consent_instances_patientId_idx" ON "patient_consent_instances"("patientId");

-- CreateIndex
CREATE INDEX "patient_consent_instances_status_idx" ON "patient_consent_instances"("status");

-- CreateIndex
CREATE INDEX "patient_consent_instances_signedAt_idx" ON "patient_consent_instances"("signedAt");

-- CreateIndex
CREATE INDEX "patient_consent_instances_revokedAt_idx" ON "patient_consent_instances"("revokedAt");

-- CreateIndex
CREATE INDEX "patient_consent_instances_revocationEventId_idx" ON "patient_consent_instances"("revocationEventId");

-- CreateIndex
CREATE INDEX "patient_consent_instances_relatedCaseId_idx" ON "patient_consent_instances"("relatedCaseId");

-- CreateIndex
CREATE INDEX "patient_consent_instances_consultationId_idx" ON "patient_consent_instances"("consultationId");

-- CreateIndex
CREATE INDEX "patient_consent_instances_procedurePlanId_idx" ON "patient_consent_instances"("procedurePlanId");

-- CreateIndex
CREATE INDEX "patient_consent_instances_presentedBy_idx" ON "patient_consent_instances"("presentedBy");

-- CreateIndex
CREATE INDEX "patient_consent_instances_revokedBy_idx" ON "patient_consent_instances"("revokedBy");

-- CreateIndex
CREATE INDEX "patient_consent_instances_createdAt_idx" ON "patient_consent_instances"("createdAt");

-- CreateIndex
CREATE INDEX "patient_consent_instances_expiresAt_idx" ON "patient_consent_instances"("expiresAt");

-- CreateIndex
CREATE INDEX "patient_consent_acknowledgements_instanceId_idx" ON "patient_consent_acknowledgements"("instanceId");

-- CreateIndex
CREATE INDEX "patient_consent_acknowledgements_sectionId_idx" ON "patient_consent_acknowledgements"("sectionId");

-- CreateIndex
CREATE INDEX "patient_consent_acknowledgements_clauseId_idx" ON "patient_consent_acknowledgements"("clauseId");

-- CreateIndex
CREATE INDEX "patient_consent_acknowledgements_acknowledgedBy_idx" ON "patient_consent_acknowledgements"("acknowledgedBy");

-- CreateIndex
CREATE INDEX "patient_consent_acknowledgements_acknowledgedAt_idx" ON "patient_consent_acknowledgements"("acknowledgedAt");

-- CreateIndex
CREATE UNIQUE INDEX "patient_consent_acknowledgements_instanceId_sectionId_claus_key" ON "patient_consent_acknowledgements"("instanceId", "sectionId", "clauseId");

-- CreateIndex
CREATE INDEX "consent_artifacts_instanceId_idx" ON "consent_artifacts"("instanceId");

-- CreateIndex
CREATE INDEX "consent_artifacts_fileHash_idx" ON "consent_artifacts"("fileHash");

-- CreateIndex
CREATE INDEX "consent_artifacts_generatedAt_idx" ON "consent_artifacts"("generatedAt");

-- CreateIndex
CREATE INDEX "consent_interactions_instanceId_idx" ON "consent_interactions"("instanceId");

-- CreateIndex
CREATE INDEX "consent_interactions_userId_idx" ON "consent_interactions"("userId");

-- CreateIndex
CREATE INDEX "consent_interactions_interactionType_idx" ON "consent_interactions"("interactionType");

-- CreateIndex
CREATE INDEX "consent_interactions_sectionId_idx" ON "consent_interactions"("sectionId");

-- CreateIndex
CREATE INDEX "consent_interactions_occurredAt_idx" ON "consent_interactions"("occurredAt");

-- CreateIndex
CREATE INDEX "consent_template_required_parties_templateId_idx" ON "consent_template_required_parties"("templateId");

-- CreateIndex
CREATE INDEX "consent_template_required_parties_partyType_idx" ON "consent_template_required_parties"("partyType");

-- CreateIndex
CREATE UNIQUE INDEX "consent_template_required_parties_templateId_partyType_key" ON "consent_template_required_parties"("templateId", "partyType");

-- CreateIndex
CREATE INDEX "consent_signatures_instanceId_idx" ON "consent_signatures"("instanceId");

-- CreateIndex
CREATE INDEX "consent_signatures_signedBy_idx" ON "consent_signatures"("signedBy");

-- CreateIndex
CREATE INDEX "consent_signatures_partyType_idx" ON "consent_signatures"("partyType");

-- CreateIndex
CREATE INDEX "consent_signatures_signedAt_idx" ON "consent_signatures"("signedAt");

-- CreateIndex
CREATE UNIQUE INDEX "consent_signatures_instanceId_partyType_key" ON "consent_signatures"("instanceId", "partyType");

-- CreateIndex
CREATE INDEX "consent_document_snapshots_instanceId_idx" ON "consent_document_snapshots"("instanceId");

-- CreateIndex
CREATE INDEX "consent_document_snapshots_templateId_idx" ON "consent_document_snapshots"("templateId");

-- CreateIndex
CREATE INDEX "consent_document_snapshots_snapshottedAt_idx" ON "consent_document_snapshots"("snapshottedAt");

-- CreateIndex
CREATE UNIQUE INDEX "consent_document_snapshots_instanceId_key" ON "consent_document_snapshots"("instanceId");

-- CreateIndex
CREATE INDEX "consent_version_history_instanceId_idx" ON "consent_version_history"("instanceId");

-- CreateIndex
CREATE INDEX "consent_version_history_previousInstanceId_idx" ON "consent_version_history"("previousInstanceId");

-- CreateIndex
CREATE INDEX "consent_version_history_versionCreatedAt_idx" ON "consent_version_history"("versionCreatedAt");

-- CreateIndex
CREATE INDEX "consent_fill_in_fields_templateId_idx" ON "consent_fill_in_fields"("templateId");

-- CreateIndex
CREATE INDEX "consent_fill_in_fields_sectionId_idx" ON "consent_fill_in_fields"("sectionId");

-- CreateIndex
CREATE INDEX "consent_fill_in_fields_clauseId_idx" ON "consent_fill_in_fields"("clauseId");

-- CreateIndex
CREATE INDEX "consent_fill_in_fields_fieldCode_idx" ON "consent_fill_in_fields"("fieldCode");

-- CreateIndex
CREATE INDEX "consent_fill_in_values_instanceId_idx" ON "consent_fill_in_values"("instanceId");

-- CreateIndex
CREATE INDEX "consent_fill_in_values_fieldId_idx" ON "consent_fill_in_values"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "consent_fill_in_values_instanceId_fieldId_key" ON "consent_fill_in_values"("instanceId", "fieldId");

-- CreateIndex
CREATE INDEX "consent_structured_data_instanceId_idx" ON "consent_structured_data"("instanceId");

-- CreateIndex
CREATE INDEX "consent_structured_data_dataType_idx" ON "consent_structured_data"("dataType");

-- CreateIndex
CREATE UNIQUE INDEX "consent_structured_data_instanceId_dataType_key" ON "consent_structured_data"("instanceId", "dataType");

-- CreateIndex
CREATE INDEX "consent_pages_templateId_idx" ON "consent_pages"("templateId");

-- CreateIndex
CREATE INDEX "consent_pages_pageNumber_idx" ON "consent_pages"("pageNumber");

-- CreateIndex
CREATE INDEX "consent_page_acknowledgements_instanceId_idx" ON "consent_page_acknowledgements"("instanceId");

-- CreateIndex
CREATE INDEX "consent_page_acknowledgements_pageId_idx" ON "consent_page_acknowledgements"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "consent_page_acknowledgements_instanceId_pageId_key" ON "consent_page_acknowledgements"("instanceId", "pageId");

-- CreateIndex
CREATE INDEX "pdf_consents_patientId_idx" ON "pdf_consents"("patientId");

-- CreateIndex
CREATE INDEX "pdf_consents_consultationId_idx" ON "pdf_consents"("consultationId");

-- CreateIndex
CREATE INDEX "pdf_consents_templateId_idx" ON "pdf_consents"("templateId");

-- CreateIndex
CREATE INDEX "pdf_consents_status_idx" ON "pdf_consents"("status");

-- CreateIndex
CREATE INDEX "pdf_consents_createdById_idx" ON "pdf_consents"("createdById");

-- CreateIndex
CREATE INDEX "pdf_consents_archivedAt_idx" ON "pdf_consents"("archivedAt");

-- CreateIndex
CREATE INDEX "pdf_consent_signatures_consentId_idx" ON "pdf_consent_signatures"("consentId");

-- CreateIndex
CREATE INDEX "pdf_consent_signatures_signerId_idx" ON "pdf_consent_signatures"("signerId");

-- CreateIndex
CREATE INDEX "pdf_consent_signatures_signerType_idx" ON "pdf_consent_signatures"("signerType");

-- CreateIndex
CREATE INDEX "pdf_consent_signatures_signedAt_idx" ON "pdf_consent_signatures"("signedAt");

-- CreateIndex
CREATE INDEX "pdf_consent_annotations_consentId_idx" ON "pdf_consent_annotations"("consentId");

-- CreateIndex
CREATE INDEX "pdf_consent_annotations_createdById_idx" ON "pdf_consent_annotations"("createdById");

-- CreateIndex
CREATE INDEX "pdf_consent_annotations_pageNumber_idx" ON "pdf_consent_annotations"("pageNumber");

-- CreateIndex
CREATE INDEX "pdf_consent_annotations_annotationType_idx" ON "pdf_consent_annotations"("annotationType");

-- CreateIndex
CREATE INDEX "pdf_consent_annotations_deletedAt_idx" ON "pdf_consent_annotations"("deletedAt");

-- CreateIndex
CREATE INDEX "pdf_consent_annotations_isImmutable_idx" ON "pdf_consent_annotations"("isImmutable");

-- CreateIndex
CREATE INDEX "pdf_consent_annotations_consentId_pageNumber_idx" ON "pdf_consent_annotations"("consentId", "pageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_providers_code_key" ON "insurance_providers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_providers_payerId_key" ON "insurance_providers"("payerId");

-- CreateIndex
CREATE INDEX "insurance_providers_code_idx" ON "insurance_providers"("code");

-- CreateIndex
CREATE INDEX "insurance_providers_payerId_idx" ON "insurance_providers"("payerId");

-- CreateIndex
CREATE INDEX "insurance_providers_active_idx" ON "insurance_providers"("active");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_policies_policyNumber_key" ON "insurance_policies"("policyNumber");

-- CreateIndex
CREATE INDEX "insurance_policies_providerId_idx" ON "insurance_policies"("providerId");

-- CreateIndex
CREATE INDEX "insurance_policies_patientId_idx" ON "insurance_policies"("patientId");

-- CreateIndex
CREATE INDEX "insurance_policies_policyNumber_idx" ON "insurance_policies"("policyNumber");

-- CreateIndex
CREATE INDEX "insurance_policies_effectiveDate_expirationDate_idx" ON "insurance_policies"("effectiveDate", "expirationDate");

-- CreateIndex
CREATE UNIQUE INDEX "billing_codes_code_key" ON "billing_codes"("code");

-- CreateIndex
CREATE INDEX "billing_codes_code_idx" ON "billing_codes"("code");

-- CreateIndex
CREATE INDEX "billing_codes_codeType_idx" ON "billing_codes"("codeType");

-- CreateIndex
CREATE INDEX "billing_codes_active_idx" ON "billing_codes"("active");

-- CreateIndex
CREATE INDEX "fee_schedules_scheduleType_idx" ON "fee_schedules"("scheduleType");

-- CreateIndex
CREATE INDEX "fee_schedules_insuranceProviderId_idx" ON "fee_schedules"("insuranceProviderId");

-- CreateIndex
CREATE INDEX "fee_schedules_effectiveDate_expirationDate_idx" ON "fee_schedules"("effectiveDate", "expirationDate");

-- CreateIndex
CREATE INDEX "fee_schedule_items_scheduleId_idx" ON "fee_schedule_items"("scheduleId");

-- CreateIndex
CREATE INDEX "fee_schedule_items_billingCodeId_idx" ON "fee_schedule_items"("billingCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "fee_schedule_items_scheduleId_billingCodeId_effectiveDate_key" ON "fee_schedule_items"("scheduleId", "billingCodeId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "bills_billNumber_key" ON "bills"("billNumber");

-- CreateIndex
CREATE INDEX "bills_billNumber_idx" ON "bills"("billNumber");

-- CreateIndex
CREATE INDEX "bills_patientId_idx" ON "bills"("patientId");

-- CreateIndex
CREATE INDEX "bills_insurancePolicyId_idx" ON "bills"("insurancePolicyId");

-- CreateIndex
CREATE INDEX "bills_status_idx" ON "bills"("status");

-- CreateIndex
CREATE INDEX "bills_billDate_idx" ON "bills"("billDate");

-- CreateIndex
CREATE INDEX "bills_dueDate_idx" ON "bills"("dueDate");

-- CreateIndex
CREATE INDEX "bill_line_items_billId_idx" ON "bill_line_items"("billId");

-- CreateIndex
CREATE INDEX "bill_line_items_billingCodeId_idx" ON "bill_line_items"("billingCodeId");

-- CreateIndex
CREATE INDEX "bill_line_items_triggeringEventId_idx" ON "bill_line_items"("triggeringEventId");

-- CreateIndex
CREATE INDEX "bill_line_items_caseId_idx" ON "bill_line_items"("caseId");

-- CreateIndex
CREATE INDEX "bill_line_items_recordId_idx" ON "bill_line_items"("recordId");

-- CreateIndex
CREATE INDEX "bill_line_items_usageId_idx" ON "bill_line_items"("usageId");

-- CreateIndex
CREATE INDEX "bill_line_items_serviceDate_idx" ON "bill_line_items"("serviceDate");

-- CreateIndex
CREATE INDEX "billing_adjustments_billId_idx" ON "billing_adjustments"("billId");

-- CreateIndex
CREATE INDEX "billing_adjustments_lineItemId_idx" ON "billing_adjustments"("lineItemId");

-- CreateIndex
CREATE INDEX "billing_adjustments_triggeringEventId_idx" ON "billing_adjustments"("triggeringEventId");

-- CreateIndex
CREATE INDEX "billing_adjustments_adjustedAt_idx" ON "billing_adjustments"("adjustedAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentNumber_key" ON "payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "payments_paymentNumber_idx" ON "payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "payments_patientId_idx" ON "payments"("patientId");

-- CreateIndex
CREATE INDEX "payments_paymentDate_idx" ON "payments"("paymentDate");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_triggeringEventId_idx" ON "payments"("triggeringEventId");

-- CreateIndex
CREATE INDEX "payment_allocations_paymentId_idx" ON "payment_allocations"("paymentId");

-- CreateIndex
CREATE INDEX "payment_allocations_billId_idx" ON "payment_allocations"("billId");

-- CreateIndex
CREATE INDEX "payment_allocations_lineItemId_idx" ON "payment_allocations"("lineItemId");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_claims_claimNumber_key" ON "insurance_claims"("claimNumber");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_claims_externalClaimId_key" ON "insurance_claims"("externalClaimId");

-- CreateIndex
CREATE INDEX "insurance_claims_claimNumber_idx" ON "insurance_claims"("claimNumber");

-- CreateIndex
CREATE INDEX "insurance_claims_externalClaimId_idx" ON "insurance_claims"("externalClaimId");

-- CreateIndex
CREATE INDEX "insurance_claims_patientId_idx" ON "insurance_claims"("patientId");

-- CreateIndex
CREATE INDEX "insurance_claims_billId_idx" ON "insurance_claims"("billId");

-- CreateIndex
CREATE INDEX "insurance_claims_status_idx" ON "insurance_claims"("status");

-- CreateIndex
CREATE INDEX "insurance_claims_triggeringEventId_idx" ON "insurance_claims"("triggeringEventId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_categories_code_key" ON "inventory_categories"("code");

-- CreateIndex
CREATE INDEX "inventory_categories_code_idx" ON "inventory_categories"("code");

-- CreateIndex
CREATE INDEX "inventory_categories_parentId_idx" ON "inventory_categories"("parentId");

-- CreateIndex
CREATE INDEX "inventory_categories_active_idx" ON "inventory_categories"("active");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_itemNumber_key" ON "inventory_items"("itemNumber");

-- CreateIndex
CREATE INDEX "inventory_items_itemNumber_idx" ON "inventory_items"("itemNumber");

-- CreateIndex
CREATE INDEX "inventory_items_categoryId_idx" ON "inventory_items"("categoryId");

-- CreateIndex
CREATE INDEX "inventory_items_vendorId_idx" ON "inventory_items"("vendorId");

-- CreateIndex
CREATE INDEX "inventory_items_itemType_idx" ON "inventory_items"("itemType");

-- CreateIndex
CREATE INDEX "inventory_items_isEquipment_idx" ON "inventory_items"("isEquipment");

-- CreateIndex
CREATE INDEX "inventory_items_isBillable_idx" ON "inventory_items"("isBillable");

-- CreateIndex
CREATE INDEX "inventory_items_active_idx" ON "inventory_items"("active");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_code_key" ON "vendors"("code");

-- CreateIndex
CREATE INDEX "vendors_code_idx" ON "vendors"("code");

-- CreateIndex
CREATE INDEX "vendors_active_idx" ON "vendors"("active");

-- CreateIndex
CREATE INDEX "inventory_batches_itemId_idx" ON "inventory_batches"("itemId");

-- CreateIndex
CREATE INDEX "inventory_batches_batchNumber_idx" ON "inventory_batches"("batchNumber");

-- CreateIndex
CREATE INDEX "inventory_batches_lotNumber_idx" ON "inventory_batches"("lotNumber");

-- CreateIndex
CREATE INDEX "inventory_batches_expirationDate_idx" ON "inventory_batches"("expirationDate");

-- CreateIndex
CREATE INDEX "inventory_batches_isExpired_idx" ON "inventory_batches"("isExpired");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_batches_itemId_batchNumber_key" ON "inventory_batches"("itemId", "batchNumber");

-- CreateIndex
CREATE INDEX "inventory_stock_itemId_idx" ON "inventory_stock"("itemId");

-- CreateIndex
CREATE INDEX "inventory_stock_batchId_idx" ON "inventory_stock"("batchId");

-- CreateIndex
CREATE INDEX "inventory_stock_locationId_idx" ON "inventory_stock"("locationId");

-- CreateIndex
CREATE INDEX "inventory_stock_lastComputedAt_idx" ON "inventory_stock"("lastComputedAt");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_stock_itemId_batchId_locationId_key" ON "inventory_stock"("itemId", "batchId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_transactions_transactionNumber_key" ON "inventory_transactions"("transactionNumber");

-- CreateIndex
CREATE INDEX "inventory_transactions_transactionNumber_idx" ON "inventory_transactions"("transactionNumber");

-- CreateIndex
CREATE INDEX "inventory_transactions_itemId_idx" ON "inventory_transactions"("itemId");

-- CreateIndex
CREATE INDEX "inventory_transactions_batchId_idx" ON "inventory_transactions"("batchId");

-- CreateIndex
CREATE INDEX "inventory_transactions_transactionType_idx" ON "inventory_transactions"("transactionType");

-- CreateIndex
CREATE INDEX "inventory_transactions_transactionDate_idx" ON "inventory_transactions"("transactionDate");

-- CreateIndex
CREATE INDEX "inventory_transactions_triggeringEventId_idx" ON "inventory_transactions"("triggeringEventId");

-- CreateIndex
CREATE INDEX "inventory_transactions_referenceType_referenceId_idx" ON "inventory_transactions"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "inventory_transactions_caseId_idx" ON "inventory_transactions"("caseId");

-- CreateIndex
CREATE INDEX "inventory_transactions_patientId_idx" ON "inventory_transactions"("patientId");

-- CreateIndex
CREATE INDEX "inventory_usages_itemId_idx" ON "inventory_usages"("itemId");

-- CreateIndex
CREATE INDEX "inventory_usages_batchId_idx" ON "inventory_usages"("batchId");

-- CreateIndex
CREATE INDEX "inventory_usages_caseId_idx" ON "inventory_usages"("caseId");

-- CreateIndex
CREATE INDEX "inventory_usages_consultationId_idx" ON "inventory_usages"("consultationId");

-- CreateIndex
CREATE INDEX "inventory_usages_patientId_idx" ON "inventory_usages"("patientId");

-- CreateIndex
CREATE INDEX "inventory_usages_transactionId_idx" ON "inventory_usages"("transactionId");

-- CreateIndex
CREATE INDEX "inventory_usages_clinicalEventId_idx" ON "inventory_usages"("clinicalEventId");

-- CreateIndex
CREATE INDEX "inventory_usages_billingEventId_idx" ON "inventory_usages"("billingEventId");

-- CreateIndex
CREATE INDEX "inventory_usages_theaterId_idx" ON "inventory_usages"("theaterId");

-- CreateIndex
CREATE INDEX "inventory_usages_batchNumber_idx" ON "inventory_usages"("batchNumber");

-- CreateIndex
CREATE INDEX "inventory_usages_lotNumber_idx" ON "inventory_usages"("lotNumber");

-- CreateIndex
CREATE INDEX "password_history_userId_changedAt_idx" ON "password_history"("userId", "changedAt");

-- CreateIndex
CREATE INDEX "domain_events_eventType_idx" ON "domain_events"("eventType");

-- CreateIndex
CREATE INDEX "domain_events_domain_idx" ON "domain_events"("domain");

-- CreateIndex
CREATE INDEX "domain_events_aggregateId_aggregateType_idx" ON "domain_events"("aggregateId", "aggregateType");

-- CreateIndex
CREATE INDEX "domain_events_occurredAt_idx" ON "domain_events"("occurredAt");

-- CreateIndex
CREATE INDEX "domain_events_correlationId_idx" ON "domain_events"("correlationId");

-- CreateIndex
CREATE INDEX "domain_events_causationId_idx" ON "domain_events"("causationId");

-- CreateIndex
CREATE INDEX "domain_events_createdBy_idx" ON "domain_events"("createdBy");

-- CreateIndex
CREATE INDEX "domain_events_sessionId_idx" ON "domain_events"("sessionId");

-- CreateIndex
CREATE INDEX "domain_events_contentHash_idx" ON "domain_events"("contentHash");

-- CreateIndex
CREATE INDEX "data_access_logs_userId_idx" ON "data_access_logs"("userId");

-- CreateIndex
CREATE INDEX "data_access_logs_resourceType_resourceId_idx" ON "data_access_logs"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "data_access_logs_accessedAt_idx" ON "data_access_logs"("accessedAt");

-- CreateIndex
CREATE INDEX "data_access_logs_accessedPHI_idx" ON "data_access_logs"("accessedPHI");

-- CreateIndex
CREATE INDEX "data_access_logs_action_idx" ON "data_access_logs"("action");

-- CreateIndex
CREATE INDEX "data_access_logs_success_idx" ON "data_access_logs"("success");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_tokenHash_idx" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_refreshTokenHash_idx" ON "sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "sessions_revokedAt_idx" ON "sessions"("revokedAt");

-- CreateIndex
CREATE INDEX "sessions_startedAt_idx" ON "sessions"("startedAt");

-- CreateIndex
CREATE INDEX "case_status_history_caseId_idx" ON "case_status_history"("caseId");

-- CreateIndex
CREATE INDEX "case_status_history_toStatus_idx" ON "case_status_history"("toStatus");

-- CreateIndex
CREATE INDEX "case_status_history_changedAt_idx" ON "case_status_history"("changedAt");

-- CreateIndex
CREATE INDEX "case_status_history_triggeringEventId_idx" ON "case_status_history"("triggeringEventId");

-- CreateIndex
CREATE INDEX "patient_merge_history_sourcePatientId_idx" ON "patient_merge_history"("sourcePatientId");

-- CreateIndex
CREATE INDEX "patient_merge_history_targetPatientId_idx" ON "patient_merge_history"("targetPatientId");

-- CreateIndex
CREATE INDEX "patient_merge_history_triggeringEventId_idx" ON "patient_merge_history"("triggeringEventId");

-- CreateIndex
CREATE INDEX "patient_merge_history_reversalEventId_idx" ON "patient_merge_history"("reversalEventId");

-- CreateIndex
CREATE INDEX "patient_merge_history_mergedAt_idx" ON "patient_merge_history"("mergedAt");

-- CreateIndex
CREATE INDEX "patient_merge_history_reversedAt_idx" ON "patient_merge_history"("reversedAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_revokedBy_fkey" FOREIGN KEY ("revokedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_doctorInChargeId_fkey" FOREIGN KEY ("doctorInChargeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_mergedBy_fkey" FOREIGN KEY ("mergedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_mergedInto_fkey" FOREIGN KEY ("mergedInto") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_lifecycleStateChangedBy_fkey" FOREIGN KEY ("lifecycleStateChangedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_contacts" ADD CONSTRAINT "patient_contacts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_intakes" ADD CONSTRAINT "patient_intakes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_intakes" ADD CONSTRAINT "patient_intakes_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_lifecycle_transitions" ADD CONSTRAINT "patient_lifecycle_transitions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_lifecycle_transitions" ADD CONSTRAINT "patient_lifecycle_transitions_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_refundPaymentId_fkey" FOREIGN KEY ("refundPaymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cancelledBy_fkey" FOREIGN KEY ("cancelledBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_rescheduledBy_fkey" FOREIGN KEY ("rescheduledBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_checkedInBy_fkey" FOREIGN KEY ("checkedInBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_rescheduledFrom_fkey" FOREIGN KEY ("rescheduledFrom") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emr_notes" ADD CONSTRAINT "emr_notes_parentNoteId_fkey" FOREIGN KEY ("parentNoteId") REFERENCES "emr_notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emr_notes" ADD CONSTRAINT "emr_notes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emr_notes" ADD CONSTRAINT "emr_notes_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emr_notes" ADD CONSTRAINT "emr_notes_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emr_notes" ADD CONSTRAINT "emr_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_orderedById_fkey" FOREIGN KEY ("orderedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "lab_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_prescribedById_fkey" FOREIGN KEY ("prescribedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_dispensations" ADD CONSTRAINT "prescription_dispensations_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_dispensations" ADD CONSTRAINT "prescription_dispensations_inventoryTransactionId_fkey" FOREIGN KEY ("inventoryTransactionId") REFERENCES "inventory_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_dispensations" ADD CONSTRAINT "prescription_dispensations_inventoryUsageId_fkey" FOREIGN KEY ("inventoryUsageId") REFERENCES "inventory_usages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_administeredBy_fkey" FOREIGN KEY ("administeredBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_plans" ADD CONSTRAINT "procedure_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_plans" ADD CONSTRAINT "procedure_plans_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_plans" ADD CONSTRAINT "procedure_plans_surgeonId_fkey" FOREIGN KEY ("surgeonId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_plans" ADD CONSTRAINT "procedure_plans_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_plans" ADD CONSTRAINT "procedure_plans_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_plans" ADD CONSTRAINT "procedure_plans_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_inventory_requirements" ADD CONSTRAINT "procedure_inventory_requirements_planId_fkey" FOREIGN KEY ("planId") REFERENCES "procedure_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_inventory_requirements" ADD CONSTRAINT "procedure_inventory_requirements_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operating_theaters" ADD CONSTRAINT "operating_theaters_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_cases" ADD CONSTRAINT "surgical_cases_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_cases" ADD CONSTRAINT "surgical_cases_procedurePlanId_fkey" FOREIGN KEY ("procedurePlanId") REFERENCES "procedure_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_cases" ADD CONSTRAINT "surgical_cases_primarySurgeonId_fkey" FOREIGN KEY ("primarySurgeonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_cases" ADD CONSTRAINT "surgical_cases_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_cases" ADD CONSTRAINT "surgical_cases_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theater_reservations" ADD CONSTRAINT "theater_reservations_theaterId_fkey" FOREIGN KEY ("theaterId") REFERENCES "operating_theaters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theater_reservations" ADD CONSTRAINT "theater_reservations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "surgical_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "theater_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_theaterId_fkey" FOREIGN KEY ("theaterId") REFERENCES "operating_theaters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "surgical_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_surgicalCaseId_fkey" FOREIGN KEY ("surgicalCaseId") REFERENCES "surgical_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "conditions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "observations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_amendsNoteId_fkey" FOREIGN KEY ("amendsNoteId") REFERENCES "clinical_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_record_attachments" ADD CONSTRAINT "medical_record_attachments_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_merge_history" ADD CONSTRAINT "record_merge_history_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_merge_history" ADD CONSTRAINT "record_merge_history_targetRecordId_fkey" FOREIGN KEY ("targetRecordId") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_merge_history" ADD CONSTRAINT "record_merge_history_triggeringEventId_fkey" FOREIGN KEY ("triggeringEventId") REFERENCES "domain_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_merge_history" ADD CONSTRAINT "record_merge_history_reversalEventId_fkey" FOREIGN KEY ("reversalEventId") REFERENCES "domain_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_sections" ADD CONSTRAINT "consent_sections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "consent_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_clauses" ADD CONSTRAINT "consent_clauses_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "consent_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_instances" ADD CONSTRAINT "patient_consent_instances_presentedBy_fkey" FOREIGN KEY ("presentedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_instances" ADD CONSTRAINT "patient_consent_instances_revokedBy_fkey" FOREIGN KEY ("revokedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_instances" ADD CONSTRAINT "patient_consent_instances_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "consent_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_instances" ADD CONSTRAINT "patient_consent_instances_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_instances" ADD CONSTRAINT "patient_consent_instances_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_instances" ADD CONSTRAINT "patient_consent_instances_procedurePlanId_fkey" FOREIGN KEY ("procedurePlanId") REFERENCES "procedure_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_instances" ADD CONSTRAINT "patient_consent_instances_revocationEventId_fkey" FOREIGN KEY ("revocationEventId") REFERENCES "domain_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_acknowledgements" ADD CONSTRAINT "patient_consent_acknowledgements_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "patient_consent_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_acknowledgements" ADD CONSTRAINT "patient_consent_acknowledgements_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "consent_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_acknowledgements" ADD CONSTRAINT "patient_consent_acknowledgements_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "consent_clauses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_artifacts" ADD CONSTRAINT "consent_artifacts_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "patient_consent_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_interactions" ADD CONSTRAINT "consent_interactions_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "patient_consent_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_interactions" ADD CONSTRAINT "consent_interactions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "consent_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_interactions" ADD CONSTRAINT "consent_interactions_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "consent_clauses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_template_required_parties" ADD CONSTRAINT "consent_template_required_parties_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "consent_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_signatures" ADD CONSTRAINT "consent_signatures_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "patient_consent_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_document_snapshots" ADD CONSTRAINT "consent_document_snapshots_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "patient_consent_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_document_snapshots" ADD CONSTRAINT "consent_document_snapshots_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "consent_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_version_history" ADD CONSTRAINT "consent_version_history_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "patient_consent_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_version_history" ADD CONSTRAINT "consent_version_history_previousInstanceId_fkey" FOREIGN KEY ("previousInstanceId") REFERENCES "patient_consent_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_fill_in_fields" ADD CONSTRAINT "consent_fill_in_fields_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "consent_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_fill_in_fields" ADD CONSTRAINT "consent_fill_in_fields_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "consent_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_fill_in_fields" ADD CONSTRAINT "consent_fill_in_fields_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "consent_clauses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_fill_in_values" ADD CONSTRAINT "consent_fill_in_values_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "patient_consent_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_fill_in_values" ADD CONSTRAINT "consent_fill_in_values_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "consent_fill_in_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_structured_data" ADD CONSTRAINT "consent_structured_data_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "patient_consent_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_pages" ADD CONSTRAINT "consent_pages_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "consent_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_page_acknowledgements" ADD CONSTRAINT "consent_page_acknowledgements_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "patient_consent_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_page_acknowledgements" ADD CONSTRAINT "consent_page_acknowledgements_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "consent_pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_consents" ADD CONSTRAINT "pdf_consents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_consents" ADD CONSTRAINT "pdf_consents_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_consents" ADD CONSTRAINT "pdf_consents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "consent_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_consents" ADD CONSTRAINT "pdf_consents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_consents" ADD CONSTRAINT "pdf_consents_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_consent_signatures" ADD CONSTRAINT "pdf_consent_signatures_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "pdf_consents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_consent_signatures" ADD CONSTRAINT "pdf_consent_signatures_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_consent_annotations" ADD CONSTRAINT "pdf_consent_annotations_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "pdf_consents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_consent_annotations" ADD CONSTRAINT "pdf_consent_annotations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "insurance_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES "insurance_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedule_items" ADD CONSTRAINT "fee_schedule_items_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "fee_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedule_items" ADD CONSTRAINT "fee_schedule_items_billingCodeId_fkey" FOREIGN KEY ("billingCodeId") REFERENCES "billing_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_insurancePolicyId_fkey" FOREIGN KEY ("insurancePolicyId") REFERENCES "insurance_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_billingCodeId_fkey" FOREIGN KEY ("billingCodeId") REFERENCES "billing_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "surgical_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "medical_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_usageId_fkey" FOREIGN KEY ("usageId") REFERENCES "inventory_usages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_triggeringEventId_fkey" FOREIGN KEY ("triggeringEventId") REFERENCES "domain_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_adjustments" ADD CONSTRAINT "billing_adjustments_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_adjustments" ADD CONSTRAINT "billing_adjustments_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "bill_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_adjustments" ADD CONSTRAINT "billing_adjustments_triggeringEventId_fkey" FOREIGN KEY ("triggeringEventId") REFERENCES "domain_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_insuranceClaimId_fkey" FOREIGN KEY ("insuranceClaimId") REFERENCES "insurance_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_triggeringEventId_fkey" FOREIGN KEY ("triggeringEventId") REFERENCES "domain_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "bill_line_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_insurancePolicyId_fkey" FOREIGN KEY ("insurancePolicyId") REFERENCES "insurance_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_triggeringEventId_fkey" FOREIGN KEY ("triggeringEventId") REFERENCES "domain_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_categories" ADD CONSTRAINT "inventory_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "inventory_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "inventory_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "surgical_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_triggeringEventId_fkey" FOREIGN KEY ("triggeringEventId") REFERENCES "domain_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_usages" ADD CONSTRAINT "inventory_usages_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_usages" ADD CONSTRAINT "inventory_usages_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_usages" ADD CONSTRAINT "inventory_usages_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_usages" ADD CONSTRAINT "inventory_usages_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "surgical_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_usages" ADD CONSTRAINT "inventory_usages_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_usages" ADD CONSTRAINT "inventory_usages_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "inventory_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_usages" ADD CONSTRAINT "inventory_usages_clinicalEventId_fkey" FOREIGN KEY ("clinicalEventId") REFERENCES "domain_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_usages" ADD CONSTRAINT "inventory_usages_billingEventId_fkey" FOREIGN KEY ("billingEventId") REFERENCES "domain_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_access_logs" ADD CONSTRAINT "data_access_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_revokedBy_fkey" FOREIGN KEY ("revokedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "surgical_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_triggeringEventId_fkey" FOREIGN KEY ("triggeringEventId") REFERENCES "domain_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_merge_history" ADD CONSTRAINT "patient_merge_history_sourcePatientId_fkey" FOREIGN KEY ("sourcePatientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_merge_history" ADD CONSTRAINT "patient_merge_history_targetPatientId_fkey" FOREIGN KEY ("targetPatientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_merge_history" ADD CONSTRAINT "patient_merge_history_triggeringEventId_fkey" FOREIGN KEY ("triggeringEventId") REFERENCES "domain_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
