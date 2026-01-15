# Aesthetic Surgery Domain Model & Workflow Design

## Executive Summary

This document extends the existing EHR domain model to support aesthetic surgery center workflows. The design builds upon existing entities (Appointment, Consultation, ProcedurePlan) while introducing minimal new concepts to maintain architectural consistency.

**Key Insight**: The system already has `ProcedurePlan`, but it needs to be extended to support:
- Non-surgical treatment plans (conservative management, series treatments)
- Multi-session plans
- Clear consultation outcomes/decisions
- Follow-up planning structures

---

## 1. CURRENT STATE ANALYSIS

### Existing Entities (Well-Designed)

#### Appointment (Time Container)
- ✅ Time slot booking
- ✅ Payment confirmation required
- ✅ `appointmentType`: CONSULTATION, FOLLOW_UP, PRE_OP, POST_OP, EMERGENCY
- ✅ Status workflow: PENDING_PAYMENT → CONFIRMED → CHECKED_IN → COMPLETED
- ✅ Links to Consultation (one-to-one)

#### Consultation (Clinical Encounter)
- ✅ Created from Appointment
- ✅ `consultationType`: INITIAL, FOLLOW_UP, PRE_OP, POST_OP, EMERGENCY
- ✅ Status workflow: SCHEDULED → CHECKED_IN → IN_TRIAGE → IN_CONSULTATION → PLAN_CREATED → CLOSED/FOLLOW_UP/SURGERY_SCHEDULED
- ✅ Has `followUpRequired` and `followUpDate` fields
- ✅ Links to multiple ProcedurePlans (one-to-many)

#### ProcedurePlan (Treatment Planning)
- ✅ Links to Consultation
- ✅ Status: DRAFT, APPROVED, SCHEDULED, COMPLETED, CANCELLED
- ✅ Links to SurgicalCase (for theatre scheduling)
- ✅ Has inventory requirements

### Gaps Identified

1. **Consultation Outcome Not Explicitly Modeled**
   - No clear field for "what did the doctor decide?"
   - `followUpRequired` is boolean, but doesn't capture decision type

2. **ProcedurePlan Too Surgery-Focused**
   - Status assumes surgical workflow
   - No support for non-surgical plans (conservative management, series treatments)
   - No multi-session support

3. **Follow-Up Planning Unstructured**
   - `followUpDate` is a single date
   - No support for structured follow-up plans
   - No link between follow-up and original consultation

4. **Multi-Session Plans Not Supported**
   - No way to model "6 PRP sessions" or "3 laser treatments"
   - Each session would need separate ProcedurePlan (inefficient)

---

## 2. REFINED DOMAIN MODEL

### 2.1 Consultation Extensions

#### Add: `consultationOutcome` Field
```prisma
enum ConsultationOutcome {
  NO_ACTION          // No further action needed
  FOLLOW_UP         // Follow-up consultation required
  PROCEDURE_PLANNED  // Procedure/treatment plan created
  CONSERVATIVE       // Conservative management (no procedure)
  REFERRED          // Referred to another provider
}

// Add to Consultation model:
consultationOutcome ConsultationOutcome? // Decision made during consultation
```

**Rationale**: Makes the clinical decision explicit and queryable. FrontDesk can see "this consultation resulted in a procedure plan" vs "this was consult-only."

#### Enhance: `consultationType` Usage
- **INITIAL**: First consultation with patient
- **FOLLOW_UP**: Scheduled follow-up from previous consultation
- **PRE_OP**: Pre-operative visit before surgery
- **POST_OP**: Post-operative review after surgery
- **REVIEW**: General review (not tied to specific procedure)
- **EMERGENCY**: Urgent consultation

**No schema change needed** - just clarify usage.

### 2.2 ProcedurePlan Extensions

#### Add: `planType` Field
```prisma
enum ProcedurePlanType {
  SURGICAL           // Surgical procedure (requires theatre)
  NON_SURGICAL       // Non-surgical treatment (injections, laser, etc.)
  CONSERVATIVE       // Conservative management (no procedure)
  SERIES             // Multi-session treatment series
}

// Add to ProcedurePlan model:
planType ProcedurePlanType @default(SURGICAL)
```

**Rationale**: Distinguishes surgical vs non-surgical plans. Enables different workflows.

#### Add: `sessionCount` and `sessionDetails` Fields
```prisma
// Add to ProcedurePlan model:
sessionCount Int? @default(1) // Number of sessions (1 for single, >1 for series)
currentSession Int? @default(1) // Current session number (for series)
sessionIntervalDays Int? // Days between sessions (for series)
sessionDetails String? @db.Text // JSON or structured text for session-specific notes
```

**Rationale**: Supports series-based treatments (PRP, laser, skin treatments) without creating multiple ProcedurePlans.

#### Enhance: Status Workflow
```prisma
enum ProcedurePlanStatus {
  DRAFT              // Being created/edited
  APPROVED           // Approved by doctor/surgeon
  SCHEDULED          // First appointment scheduled
  IN_PROGRESS        // Series in progress (for multi-session)
  COMPLETED          // All sessions completed
  CANCELLED          // Cancelled before completion
  ON_HOLD            // Temporarily paused
}

// Update ProcedurePlan model:
status ProcedurePlanStatus @default(DRAFT)
```

**Rationale**: Clearer lifecycle for aesthetic workflows, especially multi-session plans.

#### Add: `followUpPlan` Field
```prisma
// Add to ProcedurePlan model:
followUpRequired Boolean @default(false)
followUpIntervalDays Int? // Days after completion for follow-up
followUpConsultationId String? @db.Uuid // Link to follow-up consultation when created
```

**Rationale**: Links procedure completion to follow-up consultation.

### 2.3 New Entity: FollowUpPlan (Optional Enhancement)

**Alternative Approach**: Instead of adding fields to Consultation, create a dedicated entity:

```prisma
model FollowUpPlan {
  id String @id @default(uuid()) @db.Uuid
  
  // Core relationships
  consultationId String @db.Uuid // Original consultation
  patientId String @db.Uuid
  doctorId String @db.Uuid
  
  // Follow-up details
  followUpType String @db.VarChar(50) // REVIEW, POST_OP, SERIES_SESSION
  scheduledDate DateTime? @db.Date
  intervalDays Int? // Days from original consultation
  reason String? @db.Text
  
  // Status
  status String @default("PENDING") @db.VarChar(50) // PENDING, SCHEDULED, COMPLETED, CANCELLED
  appointmentId String? @unique @db.Uuid // Link to appointment when scheduled
  
  // Relations
  consultation Consultation @relation(fields: [consultationId], references: [id])
  patient Patient @relation(fields: [patientId], references: [id])
  doctor User @relation(fields: [doctorId], references: [id])
  appointment Appointment? @relation(fields: [appointmentId], references: [id])
  
  @@index([consultationId])
  @@index([patientId])
  @@index([status])
  @@map("follow_up_plans")
}
```

**Rationale**: More structured than boolean + date. Supports multiple follow-ups from one consultation.

**Decision**: **RECOMMENDED** - Provides better structure for complex follow-up workflows.

---

## 3. WORKFLOW MAPS

### 3.1 Consult-Only Patient Journey

```
1. Patient books INITIAL consultation appointment
   └─> Appointment: status=PENDING_PAYMENT, type=CONSULTATION

2. Patient pays → Appointment: status=CONFIRMED

3. Patient arrives → Appointment: status=CHECKED_IN

4. Doctor conducts consultation
   └─> Consultation: status=IN_CONSULTATION

5. Doctor decides: "No procedure recommended"
   └─> Consultation: 
       - status=PLAN_CREATED
       - consultationOutcome=NO_ACTION
       - followUpRequired=false
       - diagnosis="Patient advised on [topic], no procedure indicated"

6. Consultation finalized
   └─> Consultation: status=CLOSED
   └─> Appointment: status=COMPLETED

7. Patient receives consultation summary (read-only)
```

**Key Points**:
- No ProcedurePlan created
- Consultation outcome explicitly recorded
- Patient can view consultation but sees "no procedure recommended"

### 3.2 Surgical Patient Journey

```
1. Patient books INITIAL consultation appointment
   └─> Appointment: status=PENDING_PAYMENT, type=CONSULTATION

2. Patient pays → Appointment: status=CONFIRMED

3. Patient arrives → Appointment: status=CHECKED_IN

4. Doctor conducts consultation
   └─> Consultation: status=IN_CONSULTATION

5. Doctor decides: "Rhinoplasty recommended"
   └─> Consultation: 
       - status=PLAN_CREATED
       - consultationOutcome=PROCEDURE_PLANNED
   └─> ProcedurePlan created:
       - planType=SURGICAL
       - procedureName="Rhinoplasty"
       - status=DRAFT
       - sessionCount=1

6. Doctor finalizes plan
   └─> ProcedurePlan: status=APPROVED

7. FrontDesk schedules PRE_OP appointment
   └─> Appointment created:
       - type=PRE_OP
       - linked to ProcedurePlan (via consultation)
   └─> ProcedurePlan: status=SCHEDULED

8. Patient attends PRE_OP
   └─> Consultation: type=PRE_OP, status=CLOSED
   └─> Consent obtained (linked to ProcedurePlan)

9. FrontDesk schedules surgery in theatre
   └─> SurgicalCase created (linked to ProcedurePlan)
   └─> Appointment created: type=EMERGENCY (or specific surgery type)

10. Surgery performed
    └─> SurgicalCase: status=COMPLETED
    └─> ProcedurePlan: status=COMPLETED

11. Follow-up POST_OP scheduled
    └─> FollowUpPlan created:
        - followUpType=POST_OP
        - intervalDays=7
    └─> Appointment created: type=POST_OP

12. Patient attends POST_OP
    └─> Consultation: type=POST_OP, status=CLOSED
    └─> FollowUpPlan: status=COMPLETED
```

**Key Points**:
- ProcedurePlan drives the workflow
- Multiple appointments (PRE_OP, surgery, POST_OP) linked via ProcedurePlan
- Follow-up explicitly planned

### 3.3 Multi-Session Treatment Patient Journey

```
1. Patient books INITIAL consultation appointment
   └─> Appointment: status=PENDING_PAYMENT, type=CONSULTATION

2. Patient pays → Appointment: status=CONFIRMED

3. Patient arrives → Appointment: status=CHECKED_IN

4. Doctor conducts consultation
   └─> Consultation: status=IN_CONSULTATION

5. Doctor decides: "6 PRP sessions recommended"
   └─> Consultation: 
       - status=PLAN_CREATED
       - consultationOutcome=PROCEDURE_PLANNED
   └─> ProcedurePlan created:
       - planType=SERIES
       - procedureName="PRP Facial Rejuvenation"
       - sessionCount=6
       - currentSession=1
       - sessionIntervalDays=14
       - status=DRAFT

6. Doctor finalizes plan
   └─> ProcedurePlan: status=APPROVED

7. FrontDesk schedules first session
   └─> Appointment created: type=CONSULTATION (or specific type)
   └─> ProcedurePlan: status=SCHEDULED

8. Patient attends session 1
   └─> Consultation: status=CLOSED
   └─> ProcedurePlan: 
       - status=IN_PROGRESS
       - currentSession=1

9. FrontDesk schedules session 2 (14 days later)
   └─> Appointment created
   └─> ProcedurePlan: currentSession=2

10. [Repeat for sessions 3-6]

11. Patient attends session 6
    └─> Consultation: status=CLOSED
    └─> ProcedurePlan: 
        - status=COMPLETED
        - currentSession=6

12. Follow-up REVIEW scheduled (optional)
    └─> FollowUpPlan created:
        - followUpType=REVIEW
        - intervalDays=30
    └─> Appointment created: type=REVIEW
```

**Key Points**:
- Single ProcedurePlan for entire series
- `currentSession` tracks progress
- Status transitions: SCHEDULED → IN_PROGRESS → COMPLETED
- Each session creates new Appointment + Consultation

### 3.4 Follow-Up Patient Journey

```
1. Previous consultation completed
   └─> Consultation: 
       - status=CLOSED
       - consultationOutcome=FOLLOW_UP
       - followUpRequired=true

2. FollowUpPlan created automatically
   └─> FollowUpPlan:
       - consultationId=[original]
       - followUpType=REVIEW
       - intervalDays=30
       - status=PENDING

3. FrontDesk schedules follow-up appointment
   └─> Appointment created: type=FOLLOW_UP
   └─> FollowUpPlan: 
       - appointmentId=[new appointment]
       - status=SCHEDULED
       - scheduledDate=[appointment date]

4. Patient attends follow-up
   └─> Consultation created: type=FOLLOW_UP
   └─> Consultation: status=CLOSED
   └─> FollowUpPlan: status=COMPLETED
```

**Key Points**:
- FollowUpPlan bridges original consultation to follow-up appointment
- Can be scheduled immediately or deferred
- Supports multiple follow-ups from one consultation

---

## 4. ENTITY RELATIONSHIP DIAGRAM

```
Patient
  ├─> Appointment (1:N) [Time container]
  │     └─> Consultation (1:1) [Clinical encounter]
  │           ├─> ProcedurePlan (1:N) [Treatment plan]
  │           │     ├─> SurgicalCase (1:N) [Theatre booking]
  │           │     └─> Prescription (1:N) [Medications]
  │           ├─> FollowUpPlan (1:N) [Follow-up planning]
  │           │     └─> Appointment (N:1) [Follow-up appointment]
  │           └─> Prescription (1:N) [Medications]
  │
  └─> ProcedurePlan (1:N) [All plans for patient]
        └─> Consultation (N:1) [Originating consultation]
```

**Key Relationships**:
- **Appointment → Consultation**: One-to-one (time container → clinical encounter)
- **Consultation → ProcedurePlan**: One-to-many (one consultation can create multiple plans)
- **ProcedurePlan → SurgicalCase**: One-to-many (one plan can have multiple surgeries, e.g., revisions)
- **Consultation → FollowUpPlan**: One-to-many (one consultation can have multiple follow-ups)
- **FollowUpPlan → Appointment**: Many-to-one (follow-up plan links to appointment when scheduled)

---

## 5. DECISION POINTS

### 5.1 Where Should Decisions Live?

**Recommendation**: **Consultation + ProcedurePlan**

- **Consultation.consultationOutcome**: High-level decision (NO_ACTION, FOLLOW_UP, PROCEDURE_PLANNED, etc.)
- **ProcedurePlan**: Detailed plan if procedure is recommended

**Rationale**:
- Consultation captures the clinical decision
- ProcedurePlan captures the treatment details
- FrontDesk can query `consultationOutcome` to see what kind of booking to make
- Patient dashboard can show "Consultation: Procedure Recommended" vs "Consultation: No Action"

### 5.2 Should Consultations Have Types?

**Recommendation**: **YES, but clarify usage**

Current `consultationType` (INITIAL, FOLLOW_UP, PRE_OP, POST_OP, EMERGENCY, REVIEW) is sufficient.

**Usage Guidelines**:
- **INITIAL**: First consultation with patient (creates ProcedurePlan if needed)
- **FOLLOW_UP**: Scheduled follow-up from previous consultation (links to FollowUpPlan)
- **PRE_OP**: Pre-operative visit (links to ProcedurePlan)
- **POST_OP**: Post-operative review (links to completed ProcedurePlan)
- **REVIEW**: General review (not tied to specific procedure)
- **EMERGENCY**: Urgent consultation

**No schema change needed** - just document usage.

### 5.3 Should Procedure Plans Have Lifecycle States?

**Recommendation**: **YES, enhanced status workflow**

Current status (DRAFT, APPROVED, SCHEDULED, COMPLETED, CANCELLED) is good but needs:
- **IN_PROGRESS**: For multi-session plans (sessions in progress)
- **ON_HOLD**: Temporarily paused

**Status Flow**:
```
DRAFT → APPROVED → SCHEDULED → IN_PROGRESS → COMPLETED
                              ↓
                          ON_HOLD (can resume)
                              ↓
                          CANCELLED
```

### 5.4 How Should Patient Dashboards Reflect These Journeys?

**Recommendation**: **Structured View by Journey Type**

#### Patient Dashboard Sections:

1. **Upcoming Appointments**
   - All appointments (consultations, follow-ups, pre-op, post-op)
   - Grouped by date
   - Shows appointment type and purpose

2. **Active Treatment Plans**
   - ProcedurePlans with status IN_PROGRESS or SCHEDULED
   - Shows: procedure name, session progress (e.g., "Session 3 of 6"), next appointment

3. **Completed Treatments**
   - ProcedurePlans with status COMPLETED
   - Shows: procedure name, completion date, follow-up status

4. **Consultations**
   - All consultations (read-only)
   - Shows: date, type, outcome (e.g., "Procedure Recommended", "No Action")

5. **Follow-Ups**
   - Pending follow-ups (FollowUpPlan with status PENDING or SCHEDULED)
   - Shows: reason, scheduled date, link to original consultation

**Key UX Principle**: Patient sees their journey, not technical entities.

---

## 6. FRONTDESK WORKFLOW

### 6.1 Scheduling After Consultation

**Scenario**: Doctor completes consultation, creates ProcedurePlan

**FrontDesk sees**:
1. Consultation with `consultationOutcome=PROCEDURE_PLANNED`
2. ProcedurePlan with `status=APPROVED`
3. ProcedurePlan details: `planType`, `sessionCount`, `procedureName`

**FrontDesk actions**:
- **If `planType=SURGICAL`**:
  - Schedule PRE_OP appointment (if not already scheduled)
  - Schedule surgery in theatre (creates SurgicalCase)
  - Schedule POST_OP appointment (creates FollowUpPlan)

- **If `planType=SERIES`**:
  - Schedule first session appointment
  - Set reminder to schedule subsequent sessions

- **If `planType=NON_SURGICAL`**:
  - Schedule treatment appointment
  - No PRE_OP/POST_OP needed

- **If `consultationOutcome=FOLLOW_UP`**:
  - Schedule follow-up appointment (creates FollowUpPlan)

### 6.2 Booking Types

**Appointment Types** (existing, clarify usage):
- **CONSULTATION**: Initial or general consultation
- **FOLLOW_UP**: Scheduled follow-up from previous consultation
- **PRE_OP**: Pre-operative visit
- **POST_OP**: Post-operative review
- **EMERGENCY**: Urgent consultation

**FrontDesk selects type based on**:
- ProcedurePlan existence → PRE_OP or POST_OP
- FollowUpPlan existence → FOLLOW_UP
- Consultation outcome → CONSULTATION or FOLLOW_UP

---

## 7. IMPLEMENTATION RECOMMENDATIONS

### 7.1 Schema Changes (Minimal)

#### Required Changes:

1. **Add to Consultation**:
   ```prisma
   consultationOutcome ConsultationOutcome?
   ```

2. **Add to ProcedurePlan**:
   ```prisma
   planType ProcedurePlanType @default(SURGICAL)
   sessionCount Int? @default(1)
   currentSession Int? @default(1)
   sessionIntervalDays Int?
   sessionDetails String? @db.Text
   followUpRequired Boolean @default(false)
   followUpIntervalDays Int?
   followUpConsultationId String? @db.Uuid
   ```

3. **Update ProcedurePlan status**:
   ```prisma
   status ProcedurePlanStatus @default(DRAFT)
   // Change from String to enum
   ```

4. **Create FollowUpPlan entity** (recommended):
   ```prisma
   model FollowUpPlan {
     // As defined in section 2.3
   }
   ```

#### Optional Enhancements:

- Add indexes for common queries
- Add denormalized fields for performance (e.g., `patientName` on ProcedurePlan)

### 7.2 Service Layer Extensions

#### New Services:

1. **ProcedurePlanService** (if not exists):
   - `createPlan(consultationId, dto)`
   - `updatePlan(id, dto)`
   - `approvePlan(id)`
   - `schedulePlan(id, appointmentId)`
   - `completeSession(id, sessionNumber)`
   - `completePlan(id)`

2. **FollowUpPlanService** (new):
   - `createFollowUp(consultationId, dto)`
   - `scheduleFollowUp(id, appointmentId)`
   - `completeFollowUp(id)`

#### Enhanced Services:

1. **ConsultationService**:
   - `finalizePlan(id, outcome, dto)` - Set outcome and create plans
   - `getConsultationOutcomes(patientId)` - Query outcomes

### 7.3 Frontend Extensions

#### New Components:

1. **ProcedurePlanEditor**:
   - Create/edit procedure plans
   - Support for series planning
   - Link to consultation

2. **FollowUpPlanEditor**:
   - Create/edit follow-up plans
   - Link to consultation and appointment

3. **PatientJourneyView**:
   - Show patient's complete journey
   - Timeline of consultations, plans, appointments

#### Enhanced Components:

1. **ConsultationEditor**:
   - Add "Consultation Outcome" selector
   - Show ProcedurePlan section (if outcome=PROCEDURE_PLANNED)
   - Show FollowUpPlan section (if outcome=FOLLOW_UP)

2. **PatientDashboard**:
   - Show active treatment plans
   - Show upcoming follow-ups
   - Show consultation outcomes

---

## 8. FUTURE FEATURES (Natural Extensions)

### 8.1 Theatre Scheduling
- **Fits naturally**: SurgicalCase already links to ProcedurePlan
- **Workflow**: ProcedurePlan (SURGICAL, APPROVED) → Create SurgicalCase → Schedule in theatre

### 8.2 Billing Per Procedure
- **Fits naturally**: ProcedurePlan can link to BillLineItem
- **Workflow**: ProcedurePlan → BillLineItem → Invoice

### 8.3 Packages
- **Fits naturally**: ProcedurePlan can have `packageId` field
- **Workflow**: Package → ProcedurePlan (multiple plans in package)

### 8.4 Analytics & Reports
- **Fits naturally**: Query by `consultationOutcome`, `planType`, `status`
- **Reports**: 
  - Consultations by outcome
  - Procedure plans by type
  - Multi-session completion rates
  - Follow-up adherence

### 8.5 Revenue Tracking
- **Fits naturally**: ProcedurePlan → BillLineItem → Revenue
- **Metrics**: 
  - Revenue by plan type
  - Series completion rates
  - Follow-up conversion rates

---

## 9. SUCCESS CRITERIA

### 9.1 Workflow Support

✅ **Consult-only journey**: Consultation with outcome=NO_ACTION, no ProcedurePlan
✅ **Surgical journey**: Consultation → ProcedurePlan (SURGICAL) → PRE_OP → Surgery → POST_OP
✅ **Multi-session journey**: Consultation → ProcedurePlan (SERIES) → Multiple sessions → Completion
✅ **Follow-up journey**: Consultation → FollowUpPlan → Follow-up appointment

### 9.2 FrontDesk Clarity

✅ FrontDesk can see consultation outcome
✅ FrontDesk knows what type of appointment to schedule
✅ FrontDesk can see active ProcedurePlans
✅ FrontDesk can schedule follow-ups

### 9.3 Patient Experience

✅ Patient sees their journey (not technical entities)
✅ Patient sees active treatment plans
✅ Patient sees upcoming follow-ups
✅ Patient sees consultation outcomes

### 9.4 Scalability

✅ Theatre scheduling fits naturally
✅ Billing fits naturally
✅ Packages fit naturally
✅ Analytics fit naturally

---

## 10. MIGRATION STRATEGY

### 10.1 Phase 1: Schema Extensions (Non-Breaking)

1. Add `consultationOutcome` to Consultation (nullable)
2. Add `planType` to ProcedurePlan (default=SURGICAL)
3. Add series fields to ProcedurePlan (nullable)
4. Create FollowUpPlan entity

**Impact**: Minimal - all new fields are nullable or have defaults.

### 10.2 Phase 2: Service Layer

1. Update ConsultationService to set `consultationOutcome`
2. Create/update ProcedurePlanService
3. Create FollowUpPlanService

**Impact**: Backend only - no frontend changes yet.

### 10.3 Phase 3: Frontend Integration

1. Update ConsultationEditor to capture outcome
2. Create ProcedurePlanEditor
3. Update PatientDashboard
4. Create FollowUpPlanEditor

**Impact**: Frontend only - existing workflows continue to work.

### 10.4 Phase 4: Data Migration

1. Backfill `consultationOutcome` for existing consultations
2. Backfill `planType` for existing ProcedurePlans
3. Create FollowUpPlans for existing follow-up appointments

**Impact**: Data migration - can be done incrementally.

---

## 11. CONCLUSION

The existing domain model is well-designed and can be extended with minimal changes to support aesthetic surgery workflows. The key additions are:

1. **Consultation Outcome**: Makes clinical decisions explicit
2. **ProcedurePlan Extensions**: Support for non-surgical plans and multi-session treatments
3. **FollowUpPlan Entity**: Structured follow-up planning

These changes maintain architectural consistency while enabling the complex workflows required for aesthetic surgery centers.

**Next Steps**:
1. Review and approve design
2. Implement Phase 1 (schema extensions)
3. Implement Phase 2 (service layer)
4. Implement Phase 3 (frontend integration)
5. Implement Phase 4 (data migration)

---

## APPENDIX: ENUM DEFINITIONS

```prisma
enum ConsultationOutcome {
  NO_ACTION
  FOLLOW_UP
  PROCEDURE_PLANNED
  CONSERVATIVE
  REFERRED
}

enum ProcedurePlanType {
  SURGICAL
  NON_SURGICAL
  CONSERVATIVE
  SERIES
}

enum ProcedurePlanStatus {
  DRAFT
  APPROVED
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  ON_HOLD
}
```

---

**Document Version**: 1.0  
**Date**: 2026-01-13  
**Author**: Senior Healthcare Product Architect  
**Status**: Ready for Review
