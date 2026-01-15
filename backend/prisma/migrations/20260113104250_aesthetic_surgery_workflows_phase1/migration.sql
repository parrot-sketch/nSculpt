-- CreateEnum: ConsultationOutcome
CREATE TYPE "ConsultationOutcome" AS ENUM ('NO_ACTION', 'FOLLOW_UP', 'PROCEDURE_PLANNED', 'CONSERVATIVE', 'REFERRED');

-- CreateEnum: ProcedurePlanType
CREATE TYPE "ProcedurePlanType" AS ENUM ('SURGICAL', 'NON_SURGICAL', 'CONSERVATIVE', 'SERIES');

-- CreateEnum: ProcedurePlanStatus
CREATE TYPE "ProcedurePlanStatus" AS ENUM ('DRAFT', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum: FollowUpPlanStatus
CREATE TYPE "FollowUpPlanStatus" AS ENUM ('PENDING', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- AlterTable: Add consultationOutcome to consultations
ALTER TABLE "consultations" ADD COLUMN "consultationOutcome" "ConsultationOutcome";

-- CreateIndex: consultations_consultationOutcome_idx
CREATE INDEX "consultations_consultationOutcome_idx" ON "consultations"("consultationOutcome");

-- AlterTable: Add new columns to procedure_plans
ALTER TABLE "procedure_plans" ADD COLUMN "planType" "ProcedurePlanType" NOT NULL DEFAULT 'SURGICAL';
ALTER TABLE "procedure_plans" ADD COLUMN "sessionCount" INTEGER DEFAULT 1;
ALTER TABLE "procedure_plans" ADD COLUMN "currentSession" INTEGER DEFAULT 1;
ALTER TABLE "procedure_plans" ADD COLUMN "sessionIntervalDays" INTEGER;
ALTER TABLE "procedure_plans" ADD COLUMN "sessionDetails" TEXT;
ALTER TABLE "procedure_plans" ADD COLUMN "followUpRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "procedure_plans" ADD COLUMN "followUpIntervalDays" INTEGER;
ALTER TABLE "procedure_plans" ADD COLUMN "followUpConsultationId" UUID;

-- AlterTable: Convert status from String to ProcedurePlanStatus enum
-- First, update existing status values to match enum (if they don't already)
UPDATE "procedure_plans" SET "status" = 'DRAFT' WHERE "status" NOT IN ('DRAFT', 'APPROVED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');
UPDATE "procedure_plans" SET "status" = 'APPROVED' WHERE "status" = 'APPROVED';
UPDATE "procedure_plans" SET "status" = 'SCHEDULED' WHERE "status" = 'SCHEDULED';
UPDATE "procedure_plans" SET "status" = 'COMPLETED' WHERE "status" = 'COMPLETED';
UPDATE "procedure_plans" SET "status" = 'CANCELLED' WHERE "status" = 'CANCELLED';

-- Now alter the column type
ALTER TABLE "procedure_plans" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "procedure_plans" ALTER COLUMN "status" TYPE "ProcedurePlanStatus" USING "status"::text::"ProcedurePlanStatus";
ALTER TABLE "procedure_plans" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateIndex: procedure_plans_planType_idx
CREATE INDEX "procedure_plans_planType_idx" ON "procedure_plans"("planType");

-- CreateIndex: procedure_plans_followUpConsultationId_idx
CREATE INDEX "procedure_plans_followUpConsultationId_idx" ON "procedure_plans"("followUpConsultationId");

-- AlterTable: Add foreign key for followUpConsultationId
ALTER TABLE "procedure_plans" ADD CONSTRAINT "procedure_plans_followUpConsultationId_fkey" FOREIGN KEY ("followUpConsultationId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: follow_up_plans
CREATE TABLE "follow_up_plans" (
    "id" UUID NOT NULL,
    "consultationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "followUpType" VARCHAR(50) NOT NULL,
    "scheduledDate" DATE,
    "intervalDays" INTEGER,
    "reason" TEXT,
    "status" "FollowUpPlanStatus" NOT NULL DEFAULT 'PENDING',
    "appointmentId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "follow_up_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: follow_up_plans_consultationId_idx
CREATE INDEX "follow_up_plans_consultationId_idx" ON "follow_up_plans"("consultationId");

-- CreateIndex: follow_up_plans_patientId_idx
CREATE INDEX "follow_up_plans_patientId_idx" ON "follow_up_plans"("patientId");

-- CreateIndex: follow_up_plans_doctorId_idx
CREATE INDEX "follow_up_plans_doctorId_idx" ON "follow_up_plans"("doctorId");

-- CreateIndex: follow_up_plans_status_idx
CREATE INDEX "follow_up_plans_status_idx" ON "follow_up_plans"("status");

-- CreateIndex: follow_up_plans_scheduledDate_idx
CREATE INDEX "follow_up_plans_scheduledDate_idx" ON "follow_up_plans"("scheduledDate");

-- CreateIndex: follow_up_plans_appointmentId_idx
CREATE INDEX "follow_up_plans_appointmentId_idx" ON "follow_up_plans"("appointmentId");

-- CreateUniqueIndex: follow_up_plans_appointmentId_key
CREATE UNIQUE INDEX "follow_up_plans_appointmentId_key" ON "follow_up_plans"("appointmentId");

-- AddForeignKey: follow_up_plans_consultationId_fkey
ALTER TABLE "follow_up_plans" ADD CONSTRAINT "follow_up_plans_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: follow_up_plans_patientId_fkey
ALTER TABLE "follow_up_plans" ADD CONSTRAINT "follow_up_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: follow_up_plans_doctorId_fkey
ALTER TABLE "follow_up_plans" ADD CONSTRAINT "follow_up_plans_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: follow_up_plans_appointmentId_fkey
ALTER TABLE "follow_up_plans" ADD CONSTRAINT "follow_up_plans_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: follow_up_plans_createdBy_fkey
ALTER TABLE "follow_up_plans" ADD CONSTRAINT "follow_up_plans_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: follow_up_plans_updatedBy_fkey
ALTER TABLE "follow_up_plans" ADD CONSTRAINT "follow_up_plans_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
