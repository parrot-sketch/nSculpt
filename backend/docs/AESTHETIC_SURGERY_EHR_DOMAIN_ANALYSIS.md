# Aesthetic Surgery EHR - Domain Analysis & Workflow Reconciliation

## Executive Summary

This document reconciles the **Patient**, **Billing**, **Inventory**, **Insurance**, and **Procedures** domains for an **Aesthetic Surgery EHR** system. Aesthetic surgery clinics have unique workflows that differ from general hospitals, requiring specialized handling of cosmetic vs. reconstructive procedures, cash-pay vs. insurance billing, and implant tracking.

---

## 1. Domain-Specific Characteristics of Aesthetic Surgery

### 1.1 Procedure Categories

**Cosmetic (Cash-Pay):**
- Elective procedures (breast augmentation, liposuction, rhinoplasty, facelift)
- No insurance coverage
- Patient pays directly (cash, credit card, financing)
- Higher profit margins
- Focus on patient experience

**Reconstructive (Insurance-Covered):**
- Medically necessary procedures (breast reconstruction post-mastectomy, rhinoplasty for breathing, scar revision)
- Requires prior authorization
- Insurance billing with CPT/ICD-10 codes
- Lower profit margins but higher volume potential

**Hybrid Procedures:**
- Some procedures have both cosmetic and reconstructive components
- Requires split billing (patient portion + insurance portion)

### 1.2 Unique Inventory Requirements

**Implants:**
- **Breast Implants**: Silicone/saline, size, shape, manufacturer, serial numbers (FDA tracking)
- **Facial Implants**: Chin, cheek, jaw, custom-made
- **Buttock Implants**: Size, shape tracking
- **All require serial number tracking for FDA compliance and recall capability**

**Consumables:**
- Sutures (various types for different procedures)
- Drains, dressings
- Anesthesia supplies
- Surgical supplies (gloves, drapes, etc.)

**Before/After Photos:**
- Critical for marketing, patient education, and clinical documentation
- Must be HIPAA-compliant
- Used for consent documentation

### 1.3 Payment Models

**Cash-Pay Flow:**
1. Consultation → Quote → Payment plan or upfront payment
2. Pre-op payment (often 50-100% before surgery)
3. Payment plans common (CareCredit, in-house financing)
4. No insurance claims

**Insurance Flow:**
1. Consultation → Verify insurance eligibility
2. Prior authorization request → Approval/Denial
3. Surgery → Claim submission → Payment
4. Patient copay/deductible handling

**Hybrid Flow:**
1. Insurance covers reconstructive portion
2. Patient pays cosmetic upgrade (e.g., larger breast implants)
3. Split billing required

---

## 2. Current Architecture Analysis

### 2.1 Patient Module Integration Points

**Existing Relations:**
- ✅ `Patient` → `InsurancePolicy[]` (insurance tracking)
- ✅ `Patient` → `Bill[]` (billing history)
- ✅ `Patient` → `SurgicalCase[]` (procedure history)
- ✅ `Patient` → `Consultation[]` (visit history)
- ✅ `Patient` → `Prescription[]` (medications)

**Missing for Aesthetic Surgery:**
- ❌ Before/After photo tracking
- ❌ Procedure preferences/history (which procedures patient has had)
- ❌ Payment plan tracking at patient level
- ❌ Marketing consent (use of photos for marketing)
- ❌ Referral source tracking

### 2.2 Billing Workflow Gaps

**Current State:**
- ✅ `Bill` → `BillLineItem` (line items)
- ✅ `InsuranceClaim` (claim submission)
- ✅ `Payment` → `PaymentAllocation` (payment tracking)
- ✅ `BillingCode` (CPT/ICD-10 codes)
- ✅ `FeeSchedule` (pricing by insurance or cash-pay)

**Missing for Aesthetic Surgery:**
- ❌ **Prior Authorization** tracking and workflow
- ❌ **Procedure Packages/Bundles** (multiple procedures in one package)
- ❌ **Payment Plans** linked to procedures (installment payments)
- ❌ **Quote/Estimate** workflow (before surgery)
- ❌ **Deposit/Payment Schedule** tracking
- ❌ **Split Billing** (insurance + patient portion for hybrid procedures)

### 2.3 Inventory Integration Gaps

**Current State:**
- ✅ `InventoryItem` (catalog)
- ✅ `InventoryBatch` (lot tracking)
- ✅ `InventoryTransaction` (ledger)
- ✅ `InventoryUsage` (clinical consumption)
- ✅ `InventoryStock` (current stock)

**Missing for Aesthetic Surgery:**
- ❌ **Serial Number Tracking** for implants (FDA requirement)
- ❌ **Implant Registry** (link implants to patients for recall)
- ❌ **Procedure-Specific Inventory Templates** (which items needed for each procedure)
- ❌ **Pre-allocated Inventory** (reserve implants before surgery)

### 2.4 Insurance Workflow Gaps

**Current State:**
- ✅ `InsuranceProvider` (payer master)
- ✅ `InsurancePolicy` (patient policies)
- ✅ `InsuranceClaim` (claim submission)
- ✅ Eligibility verification support (structure exists)

**Missing for Aesthetic Surgery:**
- ❌ **Prior Authorization Request** workflow
- ❌ **Prior Authorization Tracking** (approval/denial, expiration)
- ❌ **Medical Necessity Documentation** (photos, notes for auth)
- ❌ **Appeal Workflow** (if auth denied)
- ❌ **Insurance Verification** at consultation (real-time check)

### 2.5 Procedure/Consultation Workflow Gaps

**Current State:**
- ✅ `Consultation` (clinical encounter)
- ✅ `SurgicalCase` (scheduled surgery)
- ✅ `procedureCode` (CPT code on case)
- ✅ Links to billing and inventory

**Missing for Aesthetic Surgery:**
- ❌ **Procedure Plan/Template** (standardized procedure definitions)
- ❌ **Procedure Packages** (bundles like "Mommy Makeover")
- ❌ **Quote Generation** from procedure plan
- ❌ **Before/After Photo Management**
- ❌ **Consent Forms** specific to aesthetic procedures
- ❌ **Pre-op/Post-op Checklists**

---

## 3. Reconciled Workflow Design

### 3.1 Complete Patient Journey: Cosmetic Procedure (Cash-Pay)

```
1. PATIENT REGISTRATION
   └─> Create Patient record
   └─> Capture referral source (marketing tracking)
   └─> Marketing consent (use photos)
   
2. CONSULTATION
   └─> Consultation record created
   └─> Chief complaint: "Breast augmentation"
   └─> Photos taken (before photos)
   └─> Procedure plan created
       ├─> Procedure: Breast Augmentation
       ├─> CPT Code: 19325 (if insurance) or custom cosmetic code
       ├─> Estimated cost: $8,000
       ├─> Required inventory: Breast implants, sutures, etc.
       └─> Quote generated
   
3. QUOTE & PAYMENT ARRANGEMENT
   └─> Quote sent to patient
   └─> Payment plan created (if needed)
       ├─> Down payment: $2,000
       ├─> Monthly payments: $1,000 x 6 months
       └─> Payment schedule tracked
   └─> Deposit received → Payment record created
   
4. SURGERY SCHEDULING
   └─> SurgicalCase created
   └─> Procedure plan linked
   └─> Inventory pre-allocation (if implants chosen)
       ├─> Implant serial numbers reserved
       └─> InventoryTransaction (RESERVATION)
   
5. PRE-OP
   └─> Final payment received (if required)
   └─> Consent forms signed (procedure-specific)
   └─> Pre-op photos (if updated)
   
6. SURGERY
   └─> Case status: IN_PROGRESS
   └─> Inventory consumption recorded
       ├─> Breast implants used (serial numbers attached)
       ├─> InventoryUsage created
       └─> InventoryTransaction (CONSUMPTION)
   └─> Photos taken (immediate post-op)
   
7. POST-OP & BILLING
   └─> Case status: COMPLETED
   └─> BillLineItem created (if not pre-paid)
       ├─> Triggered by Inventory.Consumed event
       └─> Links to InventoryUsage
   └─> Bill finalized
   └─> Payment allocation (if deposit exists)
   
8. FOLLOW-UP
   └─> Post-op Consultation (7 days, 30 days, 90 days)
   └─> After photos taken
   └─> Before/After comparison generated
   └─> Patient satisfaction tracking
```

### 3.2 Complete Patient Journey: Reconstructive Procedure (Insurance)

```
1. PATIENT REGISTRATION
   └─> Create Patient record
   └─> InsurancePolicy created/updated
   └─> Real-time eligibility verification
       ├─> Coverage type: Reconstructive
       ├─> Deductible: $500
       └─> Copay: $50
   
2. CONSULTATION
   └─> Consultation record created
   └─> Chief complaint: "Breast reconstruction post-mastectomy"
   └─> Medical necessity documentation
       ├─> Photos taken
       ├─> Clinical notes (surgeon)
       └─> Diagnosis codes (ICD-10: C50.9, Z85.3)
   └─> Procedure plan created
       ├─> Procedure: Breast Reconstruction
       ├─> CPT Code: 19357 (breast reconstruction)
       ├─> Estimated cost: $15,000 (insurance negotiated rate)
       └─> Required inventory: Breast implants, mesh, etc.
   
3. PRIOR AUTHORIZATION
   └─> PriorAuthorizationRequest created
       ├─> Linked to Consultation
       ├─> Procedure codes: 19357
       ├─> Diagnosis codes: C50.9, Z85.3
       ├─> Medical necessity documentation attached
       └─> Photos attached
   └─> Authorization submitted to insurance
   └─> Status: PENDING
   └─> Approval received → PriorAuthorization status: APPROVED
       ├─> Authorization number: AUTH-12345
       ├─> Approved amount: $15,000
       └─> Expiration date: 90 days
   
4. SURGERY SCHEDULING
   └─> SurgicalCase created
   └─> PriorAuthorization linked (required)
   └─> Inventory pre-allocation
   
5. SURGERY
   └─> Inventory consumption
   └─> Implant serial numbers attached
   
6. CLAIM SUBMISSION
   └─> Bill created
   └─> BillLineItem created (procedure charge)
   └─> InsuranceClaim created
       ├─> Linked to PriorAuthorization
       ├─> Claim type: PRIMARY
       ├─> Total billed: $15,000
       └─> EDI submission (X12 837P)
   └─> Claim status: SUBMITTED
   
7. CLAIM PROCESSING
   └─> Insurance response received
   └─> Claim status: PAID (or PARTIAL, DENIED)
   └─> Payment received → Payment record
   └─> Patient responsibility calculated
       ├─> Deductible applied: $500
       ├─> Copay: $50
       └─> Balance billed to patient
   
8. FOLLOW-UP
   └─> Post-op consultations
   └─> Before/After photos
```

### 3.3 Hybrid Procedure Workflow

```
1. CONSULTATION
   └─> Procedure plan: Breast Augmentation with Reconstruction Component
   └─> Insurance covers: Reconstruction portion (19357)
   └─> Patient pays: Cosmetic upgrade (larger implants)
   
2. PRIOR AUTHORIZATION
   └─> Authorization for reconstructive portion only
   
3. SURGERY
   └─> Inventory consumed
   
4. SPLIT BILLING
   └─> Bill created with two line items:
       ├─> Line Item 1: Reconstructive (19357)
       │   ├─> Billed to insurance: $10,000
       │   └─> InsuranceClaim created
       └─> Line Item 2: Cosmetic upgrade
           ├─> Patient pays: $5,000
           └─> Payment plan available
```

---

## 4. Enhanced Schema Design

### 4.1 Patient Module Enhancements

```prisma
model Patient {
  // ... existing fields ...
  
  // Aesthetic Surgery Specific
  referralSource String? @db.VarChar(200) // How patient found clinic
  marketingConsent Boolean @default(false) // Can use photos for marketing
  photoConsent Boolean @default(false) // Can take/store photos
  preferredLanguage String? @db.VarChar(50)
  
  // New Relations
  procedurePlans ProcedurePlan[]
  priorAuthorizations PriorAuthorization[]
  quotes Quote[]
  photoGalleries PatientPhotoGallery[]
  paymentPlans PaymentPlan[]
}

model PatientPhotoGallery {
  id String @id @default(uuid()) @db.Uuid
  patientId String @db.Uuid
  galleryType String @db.VarChar(50) // BEFORE_AFTER, CONSULTATION, POST_OP
  procedureCode String? @db.VarChar(50) // CPT code if procedure-specific
  
  // Photos
  photos PatientPhoto[]
  
  createdAt DateTime @default(now())
  version Int @default(1)
  
  patient Patient @relation(fields: [patientId], references: [id])
}

model PatientPhoto {
  id String @id @default(uuid()) @db.Uuid
  galleryId String @db.Uuid
  photoType String @db.VarChar(50) // FRONT, SIDE, BACK, CLOSE_UP, etc.
  photoDate DateTime @default(now())
  
  // Storage
  fileName String @db.VarChar(500)
  filePath String @db.VarChar(1000)
  fileHash String @db.VarChar(64) // SHA-256
  
  // Metadata
  isBefore Boolean @default(true)
  isAfter Boolean @default(false)
  angle String? @db.VarChar(50) // FRONTAL, PROFILE, OBLIQUE
  
  // HIPAA
  accessLevel String @default("RESTRICTED") @db.VarChar(50)
  
  gallery PatientPhotoGallery @relation(fields: [galleryId], references: [id])
  
  @@index([galleryId])
  @@index([photoDate])
  @@map("patient_photos")
}
```

### 4.2 Procedure Plan Model

```prisma
model ProcedurePlan {
  id String @id @default(uuid()) @db.Uuid
  patientId String @db.Uuid
  consultationId String? @db.Uuid
  procedureName String @db.VarChar(500)
  
  // Procedure details
  procedureType String @db.VarChar(50) // COSMETIC, RECONSTRUCTIVE, HYBRID
  primaryCPTCode String? @db.VarChar(50)
  diagnosisCodes String[] // ICD-10 codes
  
  // Pricing
  estimatedCost Decimal @db.Decimal(10, 2)
  insuranceCoverage Boolean @default(false)
  patientPortion Decimal? @db.Decimal(10, 2) // If hybrid
  
  // Inventory requirements
  requiredInventory ProcedureInventoryRequirement[]
  
  // Status
  status String @default("DRAFT") @db.VarChar(50) // DRAFT, QUOTED, APPROVED, SCHEDULED
  
  // Relations
  patient Patient @relation(fields: [patientId], references: [id])
  consultation Consultation? @relation(fields: [consultationId], references: [id])
  quotes Quote[]
  priorAuthorizations PriorAuthorization[]
  surgicalCase SurgicalCase?
  
  createdAt DateTime @default(now())
  version Int @default(1)
  
  @@index([patientId])
  @@index([consultationId])
  @@map("procedure_plans")
}

model ProcedureInventoryRequirement {
  id String @id @default(uuid()) @db.Uuid
  planId String @db.Uuid
  inventoryItemId String @db.Uuid
  quantity Int @default(1)
  
  // Specific requirements
  requiresSerialNumber Boolean @default(false) // For implants
  sizeRequirement String? @db.VarChar(200) // "300cc", "Large", etc.
  
  plan ProcedurePlan @relation(fields: [planId], references: [id])
  inventoryItem InventoryItem @relation(fields: [inventoryItemId], references: [id])
  
  @@index([planId])
  @@map("procedure_inventory_requirements")
}
```

### 4.3 Prior Authorization Model

```prisma
model PriorAuthorization {
  id String @id @default(uuid()) @db.Uuid
  patientId String @db.Uuid
  insurancePolicyId String @db.Uuid
  procedurePlanId String? @db.Uuid
  
  // Authorization details
  authorizationNumber String? @unique @db.VarChar(100)
  requestedProcedure String @db.VarChar(500)
  cptCodes String[] // Array of CPT codes
  icd10Codes String[] // Array of ICD-10 codes
  
  // Amounts
  requestedAmount Decimal @db.Decimal(10, 2)
  approvedAmount Decimal? @db.Decimal(10, 2)
  patientResponsibility Decimal? @db.Decimal(10, 2)
  
  // Status
  status String @default("PENDING") @db.VarChar(50) // PENDING, APPROVED, DENIED, EXPIRED
  submittedAt DateTime? @db.Timestamptz(6)
  approvedAt DateTime? @db.Timestamptz(6)
  expirationDate DateTime? @db.Date
  
  // Documentation
  medicalNecessityNotes String? @db.Text
  attachmentIds String[] // References to PatientPhoto or documents
  
  // Denial information
  denialReason String? @db.Text
  appealSubmitted Boolean @default(false)
  
  // Relations
  patient Patient @relation(fields: [patientId], references: [id])
  insurancePolicy InsurancePolicy @relation(fields: [insurancePolicyId], references: [id])
  procedurePlan ProcedurePlan? @relation(fields: [procedurePlanId], references: [id])
  claims InsuranceClaim[]
  
  createdAt DateTime @default(now())
  version Int @default(1)
  
  @@index([patientId])
  @@index([insurancePolicyId])
  @@index([authorizationNumber])
  @@index([status])
  @@map("prior_authorizations")
}
```

### 4.4 Quote & Payment Plan Models

```prisma
model Quote {
  id String @id @default(uuid()) @db.Uuid
  quoteNumber String @unique @db.VarChar(50)
  patientId String @db.Uuid
  procedurePlanId String @db.Uuid
  
  // Pricing breakdown
  procedureCost Decimal @db.Decimal(10, 2)
  facilityFee Decimal? @db.Decimal(10, 2)
  anesthesiaFee Decimal? @db.Decimal(10, 2)
  implantCost Decimal? @db.Decimal(10, 2) // If applicable
  totalAmount Decimal @db.Decimal(10, 2)
  
  // Validity
  validUntil DateTime @db.Date
  acceptedAt DateTime? @db.Timestamptz(6)
  
  // Status
  status String @default("DRAFT") @db.VarChar(50) // DRAFT, SENT, ACCEPTED, EXPIRED, REJECTED
  
  // Relations
  patient Patient @relation(fields: [patientId], references: [id])
  procedurePlan ProcedurePlan @relation(fields: [procedurePlanId], references: [id])
  paymentPlan PaymentPlan?
  
  createdAt DateTime @default(now())
  version Int @default(1)
  
  @@index([patientId])
  @@index([procedurePlanId])
  @@index([status])
  @@map("quotes")
}

model PaymentPlan {
  id String @id @default(uuid()) @db.Uuid
  planNumber String @unique @db.VarChar(50)
  patientId String @db.Uuid
  quoteId String? @db.Uuid
  
  // Plan details
  totalAmount Decimal @db.Decimal(10, 2)
  downPayment Decimal? @db.Decimal(10, 2)
  installmentAmount Decimal @db.Decimal(10, 2)
  numberOfInstallments Int
  frequency String @db.VarChar(50) // MONTHLY, WEEKLY, BIWEEKLY
  
  // Status
  status String @default("ACTIVE") @db.VarChar(50) // ACTIVE, COMPLETED, CANCELLED, DEFAULTED
  
  // Relations
  patient Patient @relation(fields: [patientId], references: [id])
  quote Quote? @relation(fields: [quoteId], references: [id])
  installments PaymentPlanInstallment[]
  
  createdAt DateTime @default(now())
  version Int @default(1)
  
  @@index([patientId])
  @@index([status])
  @@map("payment_plans")
}
```

### 4.5 Enhanced Inventory for Implants

```prisma
model InventoryItem {
  // ... existing fields ...
  
  // Implant-specific
  isImplant Boolean @default(false)
  implantType String? @db.VarChar(50) // BREAST, FACIAL, BUTTOCK, CUSTOM
  size String? @db.VarChar(100) // "300cc", "Large", "Medium"
  shape String? @db.VarChar(100) // "Round", "Teardrop", "Anatomical"
  
  // Serial number requirement (FDA)
  requiresSerialTracking Boolean @default(false)
}

model InventoryBatch {
  // ... existing fields ...
  
  // Implant-specific
  serialNumbers String[] // Array of serial numbers for implants
}

model InventoryUsage {
  // ... existing fields ...
  
  // Implant tracking
  serialNumber String? @db.VarChar(100) // Serial number of implant used
  implantSize String? @db.VarChar(100)
  implantShape String? @db.VarChar(100)
  
  // For FDA recall
  recallChecked Boolean @default(false)
  recallStatus String? @db.VarChar(50) // CLEAR, AFFECTED, ACTION_REQUIRED
}
```

---

## 5. Integration Points Reconciliation

### 5.1 Consultation → Procedure Plan → Quote

```
Consultation.created
  ↓
ProcedurePlan.createFromConsultation()
  ├─> Link consultation
  ├─> Determine procedure type (cosmetic/reconstructive)
  ├─> Select CPT codes
  └─> Calculate estimated cost from FeeSchedule
  ↓
Quote.generateFromProcedurePlan()
  ├─> Break down costs (procedure, facility, anesthesia, implants)
  ├─> Apply fee schedule (cash-pay or insurance)
  └─> Set validity period
```

### 5.2 Procedure Plan → Prior Authorization (Insurance)

```
ProcedurePlan.status = "APPROVED" AND procedureType = "RECONSTRUCTIVE"
  ↓
PriorAuthorizationRequest.create()
  ├─> Link insurance policy
  ├─> Extract CPT/ICD-10 codes from plan
  ├─> Attach medical necessity documentation
  └─> Attach photos
  ↓
PriorAuthorization.submit()
  ├─> Create DomainEvent: PRIOR_AUTHORIZATION_SUBMITTED
  └─> External API call (if integrated)
  ↓
PriorAuthorization.approve() (when response received)
  ├─> Update status
  ├─> Store authorization number
  └─> Set expiration date
```

### 5.3 Surgery → Inventory Consumption → Billing

```
SurgicalCase.status = "COMPLETED"
  ↓
InventoryUsage.create()
  ├─> Link case, patient, consultation
  ├─> Record implant serial numbers
  └─> Create DomainEvent: INVENTORY_CONSUMED
  ↓
BillLineItem.createFromInventoryUsage() (if billable)
  ├─> Check InventoryItem.isBillable
  ├─> Get pricing from FeeSchedule
  ├─> Link to InventoryUsage
  └─> Create DomainEvent: BILL_LINE_ITEM_CREATED
  ↓
Bill.createOrUpdate()
  ├─> Group line items
  ├─> Calculate totals
  └─> Determine insurance vs. patient portion
```

### 5.4 Insurance Claim → Prior Authorization Link

```
InsuranceClaim.create()
  ├─> Link PriorAuthorization (required for reconstructive)
  ├─> Use authorization number
  ├─> Validate authorization not expired
  └─> Submit via EDI (X12 837P)
```

---

## 6. Implementation Priorities

### Phase 1: Core Enhancements (MVP)
1. ✅ Add `PatientPhotoGallery` and `PatientPhoto` models
2. ✅ Add `ProcedurePlan` model with inventory requirements
3. ✅ Enhance `InventoryItem` for implant tracking (serial numbers)
4. ✅ Add `PriorAuthorization` model
5. ✅ Link `PriorAuthorization` to `InsuranceClaim`

### Phase 2: Workflow Integration
1. ✅ Build Consultation → Procedure Plan creation
2. ✅ Build Procedure Plan → Quote generation
3. ✅ Build Prior Authorization workflow
4. ✅ Enhance Surgery → Inventory → Billing flow
5. ✅ Add payment plan tracking

### Phase 3: Advanced Features
1. ✅ Before/After photo comparison
2. ✅ Procedure package templates
3. ✅ Split billing automation
4. ✅ Insurance verification API integration
5. ✅ Marketing consent management

---

## 7. Key Workflow Rules

### 7.1 Procedure Billing Rules

**Cosmetic Procedures:**
- Always cash-pay (no insurance)
- Can create payment plan
- Quote must be accepted before surgery
- Deposit typically required

**Reconstructive Procedures:**
- Requires prior authorization (before scheduling)
- Authorization must be valid (not expired)
- Insurance claim must link to authorization
- Patient copay/deductible calculated

**Hybrid Procedures:**
- Split billing: insurance portion + patient portion
- Insurance portion requires authorization
- Patient portion can have payment plan

### 7.2 Inventory Rules

**Implants:**
- Must have serial number tracking
- Serial number attached to patient at surgery
- Required for FDA recall capability
- Pre-allocation recommended (reserve before surgery)

**Consumables:**
- Standard FIFO consumption
- Linked to surgical case
- Billable if `isBillable = true`

### 7.3 Prior Authorization Rules

**Required When:**
- Procedure type = RECONSTRUCTIVE
- Insurance policy exists
- Procedure requires authorization (check insurance rules)

**Expiration:**
- Authorization expires after set period (typically 90 days)
- Cannot schedule surgery if authorization expired
- Re-authorization required if expired

---

## 8. API Endpoints to Add

### Patient Module
- `POST /patients/:id/photos` - Upload patient photos
- `GET /patients/:id/photos/before-after` - Get before/after gallery
- `GET /patients/:id/procedure-history` - Get all procedures

### Procedure Planning
- `POST /consultations/:id/procedure-plan` - Create procedure plan
- `GET /procedure-plans/:id` - Get procedure plan details
- `POST /procedure-plans/:id/quote` - Generate quote

### Prior Authorization
- `POST /prior-authorizations` - Create authorization request
- `POST /prior-authorizations/:id/submit` - Submit to insurance
- `GET /prior-authorizations/:id/status` - Check status

### Payment Plans
- `POST /quotes/:id/payment-plan` - Create payment plan from quote
- `GET /payment-plans/:id/installments` - Get installment schedule

---

## 9. Next Steps

1. **Review & Validate**: Review this analysis with domain experts
2. **Schema Migration**: Create migrations for new models
3. **Service Implementation**: Build services for new workflows
4. **Integration Testing**: Test end-to-end workflows
5. **Documentation**: Update API documentation

---

## 10. References

- CPT Codes for Aesthetic Surgery (American Society of Plastic Surgeons)
- FDA Implant Tracking Requirements
- HIPAA Photo Storage Requirements
- Prior Authorization Best Practices
- Insurance Claim Submission (X12 837P Format)









