# Plastic Surgery Center - Complete Workflow & Database Setup

## 🎯 Executive Summary

This document outlines the **complete end-to-end workflow** for a plastic surgery center, from patient intake through surgery execution, and provides clear instructions for database management.

---

## 📦 Local Development Setup

### Database Configuration

**Stack:**
- **Database**: PostgreSQL 16 (Docker container: `ehr-postgres`)
- **Database Name**: `surgical_ehr`
- **User**: `ehr_user`
- **Password**: `1xetra*onmi` (URL-encoded: `1xetra%2Aonmi`)
- **Port**: `5432` (host) → `5432` (container)
- **Connection URL**: `postgresql://ehr_user:1xetra%2Aonmi@localhost:5432/surgical_ehr?schema=public`

**Container Architecture:**
```
Host Machine (Port 5432)
  ↓
Docker Network (ehr-network: 172.28.0.0/16)
  ↓
ehr-postgres container (postgres:5432)
```

**Backend Service:**
- **Container**: `ehr-backend` (NestJS)
- **Internal Port**: `3001`
- **External Port**: `3002` (http://localhost:3002/api/v1)
- **Database Connection**: Uses service name `postgres` within Docker network

**Frontend Service:**
- **Container**: `ehr-frontend` (Next.js)
- **Port**: `3000` (http://localhost:3000)
- **API URL**: `http://localhost:3002/api/v1` (browser requests)

---

## 🔧 Database Migration Commands

### Starting the Stack
```bash
# Start all services
docker-compose up -d

# Start with frontend
docker-compose --profile frontend up -d

# Check service health
docker-compose ps
```

### Running Migrations

**Option 1: From Host Machine (Recommended)**
```bash
cd /home/bkg/ns/backend

# Validate schema
npx prisma validate

# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name add_pdf_consent_annotations

# Apply migrations
npx prisma migrate deploy

# View migration status
npx prisma migrate status
```

**Option 2: Inside Docker Container**
```bash
# Enter backend container
docker exec -it ehr-backend /bin/sh

# Run migrations
npx prisma migrate deploy

# Exit container
exit
```

**Option 3: Using Helper Scripts**
```bash
cd /home/bkg/ns/backend

# Safe migration (with backups)
./scripts/safe-migrate.sh

# Generate client safely
./scripts/safe-generate.sh
```

### Database Access

**Option 1: pgAdmin (Web Interface)**
```bash
# Start pgAdmin
docker-compose --profile tools up -d pgadmin

# Access at: http://localhost:5050
# Email: admin@ehr.local
# Password: admin
```

**Option 2: psql (Command Line)**
```bash
# From host (if psql installed)
psql postgresql://ehr_user:1xetra*onmi@localhost:5432/surgical_ehr

# From Docker
docker exec -it ehr-postgres psql -U ehr_user -d surgical_ehr
```

**Common SQL Commands:**
```sql
-- List all tables
\dt

-- Describe table structure
\d+ patients

-- View migrations
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC;

-- Check row counts
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

---

## 🏥 Complete Plastic Surgery Center Workflow

### Overview

```
Patient Intake → Appointment Booking → Payment → Check-In → 
Consultation → Procedure Planning → Consent Generation → 
Consent Signing → Surgery Scheduling → Surgery Execution
```

### Detailed Workflow Stages

#### **Stage 1: Patient Intake**
**Goal**: Register new patient in the system

**Database Model**: `Patient`

**Process:**
1. Front desk collects patient information
2. Create patient record with unique MRN and File Number
3. Capture demographics, contact info, emergency contacts
4. Record doctor assignment (doctorInChargeId)
5. Capture allergies and medical history

**Key Fields:**
- `patientNumber` (MRN): Auto-generated unique identifier
- `fileNumber`: Physical file number (unique)
- `doctorInChargeId`: Assigned plastic surgeon
- `status`: ACTIVE | INACTIVE | DECEASED | ARCHIVED

**Relations Created:**
- `Patient` → `User` (doctorInCharge)
- `Patient` → `PatientContact[]` (emergency contacts)
- `Patient` → `PatientAllergy[]` (drug allergies)

**Status**: `Patient.status = ACTIVE`

---

#### **Stage 2: Appointment Booking**
**Goal**: Schedule consultation with payment requirement

**Database Model**: `Appointment`

**Process:**
1. Patient requests appointment (online or phone)
2. Front desk creates appointment record
3. Set consultation fee
4. Appointment status: `PENDING_PAYMENT`
5. Payment link sent to patient

**Key Fields:**
- `appointmentNumber`: Human-readable (APT-2026-00001)
- `scheduledStartTime`, `scheduledEndTime`: Exact time slot
- `appointmentType`: CONSULTATION | FOLLOW_UP | PRE_OP | POST_OP
- `consultationFee`: Amount to be paid
- `status`: PENDING_PAYMENT

**Relations Created:**
- `Appointment` → `Patient`
- `Appointment` → `User` (doctor)

**Status**: `Appointment.status = PENDING_PAYMENT`

---

#### **Stage 3: Payment Confirmation**
**Goal**: Confirm appointment with payment

**Database Models**: `Payment`, `Appointment`

**Process:**
1. Patient makes payment (online or at front desk)
2. Payment record created and linked to appointment
3. Appointment status updated to `CONFIRMED`
4. Payment confirmation timestamp recorded
5. Appointment confirmation sent to patient and doctor

**Key Fields:**
- `Payment.amount`: Paid amount
- `Payment.status`: COMPLETED
- `Appointment.paymentId`: Links to payment
- `Appointment.paymentConfirmedAt`: Confirmation timestamp
- `Appointment.status`: CONFIRMED

**Relations Updated:**
- `Appointment` → `Payment` (paymentId)

**Status**: `Appointment.status = CONFIRMED`

---

#### **Stage 4: Check-In**
**Goal**: Patient arrives for appointment

**Database Model**: `Appointment`

**Process:**
1. Patient arrives at clinic
2. Front desk checks in patient
3. Update appointment status to `CHECKED_IN`
4. Record check-in time and staff member

**Key Fields:**
- `checkedInAt`: Check-in timestamp
- `checkedInBy`: Staff member ID
- `status`: CHECKED_IN

**Status**: `Appointment.status = CHECKED_IN`

---

#### **Stage 5: Consultation**
**Goal**: Doctor evaluates patient and plans procedure

**Database Model**: `Consultation`

**Process:**
1. Doctor sees patient (appointment must be CHECKED_IN or CONFIRMED)
2. Create consultation record FROM appointment
3. Record chief complaint, diagnosis, notes
4. Update consultation status through workflow

**Key Fields:**
- `consultationNumber`: Human-readable (CONS-2026-00001)
- `appointmentId`: **REQUIRED** - Links to source appointment
- `consultationType`: INITIAL | FOLLOW_UP | PRE_OP | POST_OP
- `chiefComplaint`: Patient's main concern
- `diagnosis`: Doctor's assessment
- `status`: SCHEDULED → IN_PROGRESS → COMPLETED

**Relations Created:**
- `Consultation` → `Appointment` (one-to-one, REQUIRED)
- `Consultation` → `Patient`
- `Consultation` → `User` (doctor)

**Critical Rules:**
- **ONE** Consultation per Appointment
- Appointment MUST be CONFIRMED or CHECKED_IN
- Consultation CANNOT be created without Appointment

**Status**: `Consultation.status = IN_PROGRESS`

---

#### **Stage 6: Procedure Planning**
**Goal**: Create detailed surgical plan during consultation

**Database Model**: `ProcedurePlan`

**Process:**
1. During consultation, doctor plans procedure
2. Create procedure plan record linked to consultation
3. Define procedure details, estimated duration, complexity
4. Request inventory items needed
5. Plan approval workflow

**Key Fields:**
- `planNumber`: Human-readable (PLAN-2026-00001)
- `consultationId`: **REQUIRED** - Links to consultation
- `surgeonId`: Primary surgeon
- `procedureName`: e.g., "Breast Augmentation"
- `procedureCode`: CPT code (e.g., "19324")
- `estimatedDurationMinutes`: Surgery time estimate
- `complexity`: SIMPLE | MODERATE | COMPLEX
- `status`: DRAFT → APPROVED → SCHEDULED → COMPLETED

**Relations Created:**
- `ProcedurePlan` → `Consultation` (REQUIRED)
- `ProcedurePlan` → `Patient`
- `ProcedurePlan` → `User` (surgeon)
- `ProcedurePlan` → `ProcedureInventoryRequirement[]` (inventory needs)

**Critical Rules:**
- Multiple procedures CAN be planned in ONE consultation
- Each procedure plan requires SEPARATE consent

**Status**: `ProcedurePlan.status = DRAFT`

---

#### **Stage 7: Consent Generation**
**Goal**: Generate procedure-specific consent form

**Database Model**: `PDFConsent` (simplified workflow)

**Process:**
1. After procedure plan created, generate consent
2. Select appropriate consent template
3. Generate PDF with patient-specific data merged
4. Consent enters DRAFT status

**Key Fields:**
- `patientId`: Patient
- `consultationId`: Optional - links to consultation
- `templateId`: ConsentTemplate used
- `status`: DRAFT → READY_FOR_SIGNATURE → SIGNED
- `generatedPdfUrl`: Working PDF (before signing)
- `finalPdfUrl`: Immutable signed PDF
- `finalPdfHash`: SHA-256 integrity hash

**Relations Created:**
- `PDFConsent` → `Patient`
- `PDFConsent` → `Consultation` (optional)
- `PDFConsent` → `ConsentTemplate`
- `PDFConsent` → `User` (createdBy)

**Status**: `PDFConsent.status = DRAFT`

---

#### **Stage 8: Consent Review & Annotation**
**Goal**: Doctor reviews and annotates consent before sending for signature

**Database Model**: `PDFConsentAnnotation` (NEW)

**Process:**
1. Doctor opens generated consent PDF
2. Adds notes, highlights, comments to specific pages
3. Marks areas requiring patient attention
4. Annotations saved to database

**Key Fields:**
- `consentId`: Links to PDFConsent
- `annotationType`: TEXT | HIGHLIGHT | STICKY_NOTE | SIGNATURE_FIELD
- `pageNumber`: Which page (1-indexed)
- `x`, `y`, `width`, `height`: Position on page
- `content`: Annotation text/content
- `color`: Annotation color (hex)
- `createdById`: Doctor who created annotation

**Relations Created:**
- `PDFConsentAnnotation` → `PDFConsent`
- `PDFConsentAnnotation` → `User` (createdBy)

**Status**: `PDFConsent.status = DRAFT`

---

#### **Stage 9: Consent Signing**
**Goal**: Collect signatures from all required parties

**Database Model**: `PDFConsentSignature`

**Process:**
1. Doctor marks consent READY_FOR_SIGNATURE
2. Consent sent to patient (tablet/email)
3. Signatures collected in order:
   - Patient/Guardian signs first
   - Doctor signs second
   - Witness signs last (if required)
4. After all signatures: Generate final PDF
5. Calculate SHA-256 hash of final PDF
6. Lock consent (immutable)
7. Status changes to SIGNED

**Key Fields:**
- `consentId`: Links to PDFConsent
- `signerId`: User who signed
- `signerName`: Full name of signer
- `signerType`: PATIENT | GUARDIAN | DOCTOR | NURSE_WITNESS
- `signatureUrl`: Signature image URL
- `signedAt`: Timestamp
- `ipAddress`, `deviceInfo`: Legal evidence

**Relations Created:**
- `PDFConsentSignature` → `PDFConsent`
- `PDFConsentSignature` → `User` (signer)

**Signature Order Enforcement:**
1. Patient/Guardian MUST sign first
2. Doctor signs after patient
3. Witness signs last (if required)

**After All Signatures:**
- Generate final PDF with all signatures
- Save to `PDFConsent.finalPdfUrl`
- Calculate `PDFConsent.finalPdfHash` (SHA-256)
- Set `PDFConsent.lockedAt` (immutable timestamp)
- Update `PDFConsent.status = SIGNED`

**Status**: `PDFConsent.status = SIGNED`

---

#### **Stage 10: Surgery Scheduling**
**Goal**: Schedule approved procedure for operating theater

**Database Model**: `SurgicalCase`

**Process:**
1. After consent signed and procedure approved
2. Create surgical case record
3. Assign operating theater, staff, equipment
4. Schedule surgery date/time
5. Reserve inventory items

**Key Fields:**
- `caseNumber`: Human-readable (CASE-2026-00001)
- `patientId`: Patient
- `procedurePlanId`: Links to procedure plan
- `primarySurgeonId`: Surgeon
- `scheduledDate`: Surgery date
- `status`: SCHEDULED → IN_PROGRESS → COMPLETED

**Relations Created:**
- `SurgicalCase` → `ProcedurePlan`
- `SurgicalCase` → `Patient`
- `SurgicalCase` → `User` (surgeon)

**Status**: `SurgicalCase.status = SCHEDULED`

---

#### **Stage 11: Surgery Execution**
**Goal**: Perform procedure and record outcome

**Database Models**: `SurgicalCase`, `InventoryUsage`, `EMRNote`

**Process:**
1. Patient prepared for surgery
2. Inventory items allocated
3. Surgery performed
4. Inventory usage recorded
5. Surgical notes documented
6. Case marked COMPLETED

**Status**: `SurgicalCase.status = COMPLETED`

---

## 🔗 Critical Workflow Relationships

### **One-to-One Relationships**

| Parent | Child | Rule |
|--------|-------|------|
| `Appointment` | `Consultation` | ONE appointment → ONE consultation (REQUIRED) |
| `Appointment` | `Payment` | ONE appointment → ONE payment confirmation |
| `ProcedurePlan` | `PatientConsentInstance` | ONE procedure → ONE consent (structured workflow) |

### **One-to-Many Relationships**

| Parent | Children | Rule |
|--------|----------|------|
| `Patient` | `Appointment[]` | Patient can have multiple appointments |
| `Patient` | `Consultation[]` | Patient can have multiple consultations |
| `Patient` | `ProcedurePlan[]` | Patient can have multiple procedures planned |
| `Patient` | `PDFConsent[]` | Patient can have multiple consents |
| `Consultation` | `ProcedurePlan[]` | Multiple procedures can be planned in ONE consultation |
| `PDFConsent` | `PDFConsentSignature[]` | Multiple signatures per consent |
| `PDFConsent` | `PDFConsentAnnotation[]` | Multiple annotations per consent |
| `ProcedurePlan` | `SurgicalCase[]` | One plan can have multiple surgeries (revisions) |

---

## ✅ Database Integrity Rules

### **MUST HAVE Rules**

1. ✅ **Consultation REQUIRES Appointment**
   - `Consultation.appointmentId` is UNIQUE and REQUIRED
   - Cannot create consultation without confirmed appointment

2. ✅ **Procedure Plan REQUIRES Consultation**
   - `ProcedurePlan.consultationId` is REQUIRED
   - Procedure planning happens during/after consultation

3. ✅ **Consent REQUIRES Patient**
   - `PDFConsent.patientId` is REQUIRED
   - Consent is patient-specific

4. ✅ **Signature REQUIRES Consent**
   - `PDFConsentSignature.consentId` is REQUIRED
   - Signatures belong to specific consent

5. ✅ **Annotation REQUIRES Consent**
   - `PDFConsentAnnotation.consentId` is REQUIRED
   - Annotations belong to specific consent

### **Business Logic Rules**

1. ✅ **Payment Before Confirmation**
   - Appointment.status = CONFIRMED only after payment
   - `Appointment.paymentId` must be set

2. ✅ **Consent Before Surgery**
   - `ProcedurePlan.status` can only be APPROVED if consent is SIGNED
   - Check `PDFConsent.status = SIGNED` before approving procedure

3. ✅ **Signature Order**
   - Patient/Guardian signs first
   - Doctor signs second
   - Witness signs last

4. ✅ **Immutability After Signing**
   - Once `PDFConsent.status = SIGNED`, no modifications allowed
   - `finalPdfUrl` and `finalPdfHash` are immutable

---

## 🔄 Status Transitions

### Appointment Status Flow
```
PENDING_PAYMENT → (payment received) → CONFIRMED
CONFIRMED → (patient arrives) → CHECKED_IN
CHECKED_IN → (consultation completed) → COMPLETED
```

### Consultation Status Flow
```
SCHEDULED → (doctor starts) → IN_PROGRESS → (doctor completes) → COMPLETED
```

### Procedure Plan Status Flow
```
DRAFT → (doctor approves) → APPROVED → (surgery scheduled) → SCHEDULED → (surgery done) → COMPLETED
```

### Consent Status Flow
```
DRAFT → (doctor reviews) → READY_FOR_SIGNATURE → 
(partial signatures) → PARTIALLY_SIGNED → 
(all signatures) → SIGNED
```

---

## 🚨 Current Issues & Recommendations

### Issue 1: PDFConsentAnnotation Model Missing ✅ FIXED
**Problem**: Annotations endpoints return 404 because Prisma model doesn't exist

**Solution**: Added `PDFConsentAnnotation` model to schema

**Migration Required**: Yes

---

### Issue 2: Consent-Procedure Linking (Two Workflows)

**Current State**:
- ✅ Structured Workflow: `ProcedurePlan` → `PatientConsentInstance` (one-to-one)
- ✅ PDF Workflow: `PDFConsent` → `Consultation` (optional link)

**Recommendation**: 
- Keep BOTH workflows
- Use PDFConsent for **simple, fast consents**
- Use PatientConsentInstance for **complex, multi-section consents**
- Consider adding `PDFConsent.procedurePlanId` for stronger linking

---

### Issue 3: Data Access Logging

**Current State**: 
- `DataAccessLog` records all PHI access
- Consent viewing, generation, signing logged

**Recommendation**: ✅ Already implemented well

---

## 📝 Next Steps

### Immediate Actions

1. **Run Migrations**
   ```bash
   cd /home/bkg/ns/backend
   npx prisma migrate dev --name add_pdf_consent_annotations
   ```

2. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

3. **Restart Backend**
   ```bash
   docker-compose restart backend
   ```

4. **Test Annotations Endpoint**
   ```
   GET /api/v1/consents/{consentId}/annotations
   ```

### Database Cleanup Recommendations

1. **Add Missing Indexes** (if needed for performance)
2. **Add Database Constraints** (foreign key validation)
3. **Add Check Constraints** (business rules)

### Service Layer Improvements

1. **Consent Generation Service**: Ensure procedure plan linkage
2. **Appointment Service**: Validate payment before CONFIRMED status
3. **Consultation Service**: Ensure appointment exists
4. **Signature Service**: Enforce signature order

---

## 📚 References

- **Schema Location**: `/home/bkg/ns/backend/prisma/schema.prisma`
- **Migrations**: `/home/bkg/ns/backend/prisma/migrations/`
- **Docker Compose**: `/home/bkg/ns/docker-compose.yml`
- **Environment**: `/home/bkg/ns/.env`

---

**Document Version**: 1.0
**Last Updated**: 2026-01-07
**Author**: System Architecture Documentation





