# Doctor Workflows - Technical Specification
## Nairobi Sculpt Aesthetic Surgery Center

> **Architecture Philosophy**: Database-first design ensuring referential integrity, immutability where required, and complete audit trails.

---

## 🎯 **Critical Doctor Workflows** (Schema-Driven)

### **Workflow 1: Patient Onboarding & Assignment**
```
Database Models: Patient → User (doctorInCharge)
Status: Patient.status (ACTIVE, INACTIVE, ARCHIVED, DECEASED, MERGED)
```

**Business Rules:**
1. Patient must have `doctorInChargeId` assigned
2. Doctor must have `DOCTOR` role
3. Assignment creates audit trail (`createdBy`, `updatedBy`)
4. Patient data protected by RLS (Row-Level Security)

**Database Constraints:**
```prisma
doctorInCharge User? @relation("PatientDoctorInCharge", 
  fields: [doctorInChargeId], references: [id])
```

---

### **Workflow 2: Appointment Booking → Payment → Confirmation**
```
Database Models: Appointment → Payment → Consultation
Critical Constraint: Appointment MUST have confirmed payment before consultation
```

**State Machine:**
```
PENDING_PAYMENT → PAYMENT_CONFIRMED → CHECKED_IN → COMPLETED
                ↓
              CANCELLED (with refund tracking)
```

**Business Rules:**
1. **Payment First**: `paymentId` must exist before status = `PAYMENT_CONFIRMED`
2. **One Payment Per Appointment**: `paymentId` is `@unique`
3. **Cancellation Tracking**: 
   - `cancelledAt`, `cancelledBy`
   - `cancellationReason` (enum)
   - `refundIssued`, `refundAmount`, `refundPaymentId`
4. **Rescheduling Chain**: `rescheduledFrom` → `rescheduledTo` (one-to-one)

**Database Constraints:**
```prisma
status AppointmentStatus @default(PENDING_PAYMENT)
paymentId String? @unique @db.Uuid
consultationId String? @unique @db.Uuid // Created when completed
```

---

### **Workflow 3: Consultation (Clinical Encounter)**
```
Database Models: Consultation (created FROM Appointment)
Critical Constraint: consultationId LINKS to Appointment.consultationId
```

**State Machine:**
```
SCHEDULED → IN_PROGRESS → COMPLETED → REQUIRES_FOLLOW_UP
```

**Business Rules:**
1. **Appointment Required**: `appointmentId` is `@unique` and REQUIRED
2. **Doctor Assignment**: `doctorId` matches appointment doctor
3. **Consultation Types**: INITIAL, FOLLOW_UP, PRE_OP, POST_OP, EMERGENCY
4. **Billing Integration**: `billable` flag, `billed` status
5. **Follow-up Tracking**: `followUpRequired`, `followUpDate`

**Database Constraints:**
```prisma
appointmentId String @unique @db.Uuid // REQUIRED link
doctor User @relation("ConsultationDoctor", 
  fields: [doctorId], references: [id])
```

**Relations:**
- `consentInstances` (one-to-many)
- `procedurePlans` (one-to-many)
- `prescriptions` (one-to-many)
- `labOrders` (one-to-many)
- `emrNotes` (one-to-many)

---

### **Workflow 4: Procedure Planning & Quotation**
```
Database Models: ProcedurePlan → Consultation
Critical Constraint: Plan must be APPROVED before surgical case
```

**State Machine:**
```
DRAFT → APPROVED → SCHEDULED → COMPLETED → CANCELLED
```

**Business Rules:**
1. **Consultation Link**: `consultationId` is REQUIRED
2. **Surgeon Assignment**: `surgeonId` (primary surgeon)
3. **Approval Workflow**: `approvedAt`, `approvedBy`
4. **Cost Estimation**: Linked to billing via line items
5. **Inventory Planning**: `ProcedureInventoryRequirement[]`

**Database Constraints:**
```prisma
consultation Consultation @relation(
  fields: [consultationId], references: [id], onDelete: Restrict)
surgeon User @relation("ProcedurePlanSurgeon", 
  fields: [surgeonId], references: [id])
```

**Relations:**
- `consentInstance` (one-to-one) - One consent per plan
- `surgicalCases` (one-to-many) - Multiple surgeries possible (revisions)
- `inventoryRequirements` (one-to-many)

---

### **Workflow 5: Consent Generation & Signing**
```
Database Models: PDFConsent / PatientConsentInstance
Critical Constraint: Consent linked to ProcedurePlan OR Consultation
```

**State Machine:**
```
DRAFT → READY_FOR_SIGNATURE → PARTIALLY_SIGNED → SIGNED → REVOKED
```

**Business Rules:**
1. **Template-Based**: Generated from `PDFConsentTemplate`
2. **Digital Signatures**: `PDFConsentSignature[]` with order enforcement
3. **Signature Order**: DOCTOR signs first, then PATIENT/GUARDIAN
4. **Immutability**: Once SIGNED, document is locked
5. **Audit Trail**: Every signature tracked with IP, device, timestamp
6. **PDF Integrity**: Hash verification (`finalPdfHash`)

**Database Constraints:**
```prisma
status ConsentStatus @default(DRAFT)
signatures PDFConsentSignature[] // Immutable after signing
annotations PDFConsentAnnotation[] // Editable until SIGNED
```

---

### **Workflow 6: Theater Booking & Surgical Case**
```
Database Models: SurgicalCase → ProcedurePlan → TheaterReservation
Critical Constraint: Case MUST link to approved ProcedurePlan
```

**State Machine:**
```
SCHEDULED → IN_PROGRESS → COMPLETED → CANCELLED → POSTPONED
```

**Business Rules:**
1. **Procedure Plan Required**: `procedurePlanId` is REQUIRED
2. **Data Denormalization**: 
   - `procedureName`, `procedureCode`, `description` copied from plan
   - Enables queries without joins
3. **Time Tracking**: 
   - `scheduledStartAt`, `scheduledEndAt` (planned)
   - `actualStartAt`, `actualEndAt` (actual)
4. **Team Assignment**: `primarySurgeonId` + team members
5. **Resource Allocation**: `ResourceAllocation[]` (inventory, equipment)
6. **Theater Reservation**: `TheaterReservation[]`

**Database Constraints:**
```prisma
procedurePlan ProcedurePlan @relation(
  fields: [procedurePlanId], references: [id], onDelete: Restrict)
primarySurgeon User? @relation("SurgicalCasePrimarySurgeon", 
  fields: [primarySurgeonId], references: [id])
```

---

### **Workflow 7: Clinical Documentation (EMR)**
```
Database Models: MedicalRecord → ClinicalNote
Critical Constraint: Append-only, versioned, immutable
```

**Business Rules:**
1. **Immutability**: Notes cannot be deleted, only amended
2. **Amendment Tracking**: Amendments create new version
3. **Attachments**: `MedicalRecordAttachment[]` (images, scans)
4. **Record Merging**: `mergedInto`, `mergeHistory`
5. **PHI Protection**: Strict access controls via RLS

**Database Constraints:**
```prisma
patient Patient @relation(
  fields: [patientId], references: [id], onDelete: Restrict)
version Int @default(1) // Optimistic locking
```

---

### **Workflow 8: Prescriptions & Orders**
```
Database Models: Prescription, LabOrder
Critical Constraint: Must link to Consultation
```

**Business Rules:**
1. **Consultation Link**: `consultationId` is REQUIRED
2. **Prescriber**: `prescriberId` (must be doctor)
3. **Dispensing Tracking**: 
   - `dispensed`, `dispensedAt`, `dispensedBy`
   - Links to inventory transactions
4. **Lab Orders**: `LabOrder` for diagnostics
5. **Verification**: `verifiedAt`, `verifiedBy`

---

## 🏗️ **Implementation Architecture**

### **Layer 1: Database (Prisma)**
```
✅ Schema defined
✅ Relations enforced
✅ Constraints validated
✅ Audit fields present
```

### **Layer 2: Domain Layer**
```typescript
// backend/src/modules/doctor/domain/
├── entities/
│   ├── consultation.entity.ts
│   ├── procedure-plan.entity.ts
│   ├── surgical-case.entity.ts
│   └── prescription.entity.ts
├── value-objects/
│   ├── consultation-number.vo.ts
│   └── procedure-complexity.vo.ts
└── services/
    ├── consultation-state-machine.service.ts
    └── procedure-plan-validator.service.ts
```

### **Layer 3: Application Layer**
```typescript
// backend/src/modules/doctor/application/
├── use-cases/
│   ├── create-consultation.use-case.ts
│   ├── create-procedure-plan.use-case.ts
│   ├── approve-procedure-plan.use-case.ts
│   ├── book-theater.use-case.ts
│   └── prescribe-medication.use-case.ts
├── dtos/
│   ├── create-consultation.dto.ts
│   ├── create-procedure-plan.dto.ts
│   └── create-prescription.dto.ts
└── queries/
    ├── get-doctor-dashboard.query.ts
    ├── get-patient-consultations.query.ts
    └── get-upcoming-surgeries.query.ts
```

### **Layer 4: Infrastructure Layer**
```typescript
// backend/src/modules/doctor/infrastructure/
├── repositories/
│   ├── consultation.repository.ts
│   ├── procedure-plan.repository.ts
│   └── surgical-case.repository.ts
└── services/
    ├── number-generator.service.ts // APT-2026-00001, etc.
    └── notification.service.ts
```

### **Layer 5: Presentation Layer (API)**
```typescript
// backend/src/modules/doctor/controllers/
├── consultation.controller.ts
├── procedure-plan.controller.ts
├── surgical-case.controller.ts
└── prescription.controller.ts
```

### **Layer 6: Frontend (Next.js)**
```typescript
// client/app/(protected)/doctor/
├── dashboard/
│   └── page.tsx
├── patients/
│   ├── page.tsx
│   └── [id]/
│       ├── page.tsx
│       ├── consultations/
│       ├── procedures/
│       └── medical-records/
├── consultations/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/page.tsx
├── procedures/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/page.tsx
└── surgeries/
    ├── page.tsx
    └── [id]/page.tsx
```

---

## 📋 **API Endpoints (RESTful)**

### **Consultations**
```
GET    /api/v1/doctor/consultations              // List all
GET    /api/v1/doctor/consultations/:id          // Get one
POST   /api/v1/doctor/consultations              // Create
PATCH  /api/v1/doctor/consultations/:id          // Update
POST   /api/v1/doctor/consultations/:id/complete // Mark complete
```

### **Procedure Plans**
```
GET    /api/v1/doctor/procedure-plans
POST   /api/v1/doctor/procedure-plans
GET    /api/v1/doctor/procedure-plans/:id
PATCH  /api/v1/doctor/procedure-plans/:id
POST   /api/v1/doctor/procedure-plans/:id/approve
POST   /api/v1/doctor/procedure-plans/:id/reject
```

### **Surgical Cases**
```
GET    /api/v1/doctor/surgical-cases
POST   /api/v1/doctor/surgical-cases
GET    /api/v1/doctor/surgical-cases/:id
PATCH  /api/v1/doctor/surgical-cases/:id
POST   /api/v1/doctor/surgical-cases/:id/start
POST   /api/v1/doctor/surgical-cases/:id/complete
```

### **Dashboard**
```
GET    /api/v1/doctor/dashboard/stats
GET    /api/v1/doctor/dashboard/upcoming-consultations
GET    /api/v1/doctor/dashboard/pending-approvals
GET    /api/v1/doctor/dashboard/today-schedule
```

---

## 🎨 **Frontend Components (Reusable)**

### **Shared Components**
```typescript
// client/components/doctor/
├── ConsultationCard.tsx
├── ProcedurePlanCard.tsx
├── SurgicalCaseCard.tsx
├── PatientQuickView.tsx
├── TimelineView.tsx
├── ApprovalWorkflow.tsx
└── SignatureWidget.tsx
```

---

## 🔐 **Security & Authorization**

### **Role-Based Access Control (RBAC)**
```typescript
@Roles('DOCTOR')
@Permissions('consultation:*:write')
```

### **Row-Level Security (RLS)**
```typescript
// Doctor can only access:
// - Their assigned patients
// - Their consultations
// - Their surgical cases
```

---

## 📊 **Key Performance Indicators (KPIs)**

### **Doctor Dashboard Metrics**
1. **Today's Consultations**: Count, status breakdown
2. **Pending Approvals**: Procedure plans awaiting approval
3. **Upcoming Surgeries**: Next 7 days
4. **Active Patients**: Assigned to doctor
5. **Revenue Generated**: Consultation fees + procedures

---

## 🚀 **Implementation Priority**

### **Phase 1: Core Consultation Flow** (Week 1)
1. ✅ Database models (done)
2. ⬜ Doctor dashboard API
3. ⬜ Consultation CRUD API
4. ⬜ Frontend: Dashboard + Consultation list

### **Phase 2: Procedure Planning** (Week 2)
1. ⬜ Procedure Plan API
2. ⬜ Approval workflow
3. ⬜ Cost estimation
4. ⬜ Frontend: Plan creation + approval

### **Phase 3: Surgical Case Management** (Week 3)
1. ⬜ Theater booking API
2. ⬜ Case lifecycle management
3. ⬜ Resource allocation
4. ⬜ Frontend: Surgery schedule + case details

### **Phase 4: Clinical Documentation** (Week 4)
1. ⬜ EMR notes API
2. ⬜ Prescription management
3. ⬜ Lab orders
4. ⬜ Frontend: Medical records view

---

## 📝 **Next Steps**

**Should I proceed with Phase 1 implementation?**

I'll create:
1. Domain entities with business logic
2. Repository layer with Prisma
3. Use cases with validation
4. API controllers with DTOs
5. Frontend pages with React Query
6. Comprehensive test suite

All following **Clean Architecture**, **SOLID principles**, and **DDD patterns**.


