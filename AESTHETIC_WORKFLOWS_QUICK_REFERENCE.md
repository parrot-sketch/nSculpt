# Aesthetic Surgery Workflows - Quick Reference

## Workflow Decision Tree

```
Consultation Completed
│
├─> consultationOutcome = NO_ACTION
│   └─> No ProcedurePlan created
│       └─> Consultation closed
│           └─> Patient receives summary
│
├─> consultationOutcome = FOLLOW_UP
│   └─> FollowUpPlan created
│       └─> FrontDesk schedules follow-up appointment
│           └─> Follow-up consultation
│
├─> consultationOutcome = PROCEDURE_PLANNED
│   └─> ProcedurePlan created
│       │
│       ├─> planType = SURGICAL
│       │   └─> PRE_OP appointment
│       │       └─> SurgicalCase (theatre)
│       │           └─> POST_OP appointment
│       │
│       ├─> planType = NON_SURGICAL
│       │   └─> Treatment appointment
│       │       └─> Procedure completed
│       │
│       └─> planType = SERIES
│           └─> sessionCount = N
│               └─> Schedule session 1
│                   └─> Schedule session 2 (intervalDays later)
│                       └─> ... (repeat for N sessions)
│                           └─> Series completed
│
└─> consultationOutcome = CONSERVATIVE
    └─> ProcedurePlan created (planType=CONSERVATIVE)
        └─> No appointments scheduled
            └─> Patient receives management plan
```

---

## Entity State Transitions

### Consultation Status Flow
```
SCHEDULED → CHECKED_IN → IN_TRIAGE → IN_CONSULTATION → PLAN_CREATED
                                                              │
                                                              ├─> CLOSED
                                                              ├─> FOLLOW_UP
                                                              ├─> SURGERY_SCHEDULED
                                                              └─> REFERRED
```

### ProcedurePlan Status Flow
```
DRAFT → APPROVED → SCHEDULED → IN_PROGRESS → COMPLETED
                              │
                              ├─> ON_HOLD (can resume)
                              └─> CANCELLED
```

### FollowUpPlan Status Flow
```
PENDING → SCHEDULED → COMPLETED
         │
         └─> CANCELLED
```

---

## FrontDesk Scheduling Guide

### After Consultation with Outcome = PROCEDURE_PLANNED

**Check ProcedurePlan.planType:**

1. **SURGICAL**:
   - Schedule PRE_OP appointment (if not already scheduled)
   - Schedule surgery in theatre (create SurgicalCase)
   - Schedule POST_OP appointment (create FollowUpPlan)

2. **NON_SURGICAL**:
   - Schedule treatment appointment
   - No PRE_OP/POST_OP needed

3. **SERIES**:
   - Schedule first session appointment
   - Set reminder for subsequent sessions (every `sessionIntervalDays`)
   - Update `currentSession` after each session

4. **CONSERVATIVE**:
   - No appointments needed
   - Patient receives management plan document

### After Consultation with Outcome = FOLLOW_UP

- Create FollowUpPlan (or use existing)
- Schedule follow-up appointment
- Link appointment to FollowUpPlan

### After Consultation with Outcome = NO_ACTION

- No further scheduling needed
- Consultation is complete

---

## Patient Dashboard Sections

### 1. Upcoming Appointments
- All appointments (consultations, follow-ups, pre-op, post-op)
- Grouped by date
- Shows appointment type and purpose

### 2. Active Treatment Plans
- ProcedurePlans with status IN_PROGRESS or SCHEDULED
- Shows: procedure name, session progress (e.g., "Session 3 of 6"), next appointment

### 3. Completed Treatments
- ProcedurePlans with status COMPLETED
- Shows: procedure name, completion date, follow-up status

### 4. Consultations
- All consultations (read-only)
- Shows: date, type, outcome (e.g., "Procedure Recommended", "No Action")

### 5. Follow-Ups
- Pending follow-ups (FollowUpPlan with status PENDING or SCHEDULED)
- Shows: reason, scheduled date, link to original consultation

---

## Key Fields Reference

### Consultation
- `consultationType`: INITIAL, FOLLOW_UP, PRE_OP, POST_OP, REVIEW, EMERGENCY
- `consultationOutcome`: NO_ACTION, FOLLOW_UP, PROCEDURE_PLANNED, CONSERVATIVE, REFERRED
- `status`: SCHEDULED → CHECKED_IN → IN_TRIAGE → IN_CONSULTATION → PLAN_CREATED → CLOSED/FOLLOW_UP/SURGERY_SCHEDULED

### ProcedurePlan
- `planType`: SURGICAL, NON_SURGICAL, CONSERVATIVE, SERIES
- `status`: DRAFT → APPROVED → SCHEDULED → IN_PROGRESS → COMPLETED
- `sessionCount`: Number of sessions (1 for single, >1 for series)
- `currentSession`: Current session number (for series)
- `sessionIntervalDays`: Days between sessions (for series)

### FollowUpPlan
- `followUpType`: REVIEW, POST_OP, SERIES_SESSION
- `status`: PENDING → SCHEDULED → COMPLETED
- `intervalDays`: Days from original consultation

### Appointment
- `appointmentType`: CONSULTATION, FOLLOW_UP, PRE_OP, POST_OP, EMERGENCY
- `status`: PENDING_PAYMENT → CONFIRMED → CHECKED_IN → COMPLETED

---

## Common Queries

### Get all active treatment plans for patient
```typescript
ProcedurePlan.where({
  patientId: patientId,
  status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
})
```

### Get consultations that resulted in procedures
```typescript
Consultation.where({
  patientId: patientId,
  consultationOutcome: 'PROCEDURE_PLANNED'
})
```

### Get pending follow-ups for patient
```typescript
FollowUpPlan.where({
  patientId: patientId,
  status: { in: ['PENDING', 'SCHEDULED'] }
})
```

### Get multi-session plans in progress
```typescript
ProcedurePlan.where({
  planType: 'SERIES',
  status: 'IN_PROGRESS'
})
```

---

## Implementation Checklist

### Phase 1: Schema Extensions
- [ ] Add `consultationOutcome` enum and field to Consultation
- [ ] Add `planType` enum and field to ProcedurePlan
- [ ] Add series fields to ProcedurePlan (sessionCount, currentSession, sessionIntervalDays)
- [ ] Add follow-up fields to ProcedurePlan (followUpRequired, followUpIntervalDays, followUpConsultationId)
- [ ] Update ProcedurePlan status to enum (ProcedurePlanStatus)
- [ ] Create FollowUpPlan entity

### Phase 2: Service Layer
- [ ] Update ConsultationService to set `consultationOutcome`
- [ ] Create/update ProcedurePlanService with new methods
- [ ] Create FollowUpPlanService
- [ ] Update AppointmentService to handle plan-based scheduling

### Phase 3: Frontend Integration
- [ ] Update ConsultationEditor to capture outcome
- [ ] Create ProcedurePlanEditor component
- [ ] Create FollowUpPlanEditor component
- [ ] Update PatientDashboard with new sections
- [ ] Create PatientJourneyView component

### Phase 4: Data Migration
- [ ] Backfill `consultationOutcome` for existing consultations
- [ ] Backfill `planType` for existing ProcedurePlans
- [ ] Create FollowUpPlans for existing follow-up appointments

---

**Quick Reference Version**: 1.0  
**Date**: 2026-01-13
