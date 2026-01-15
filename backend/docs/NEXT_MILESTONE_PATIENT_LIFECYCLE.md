# Next Milestone: Patient Merge + Restrict + Archive UI & API Alignment

**Date**: 2026-01-03  
**Status**: 📋 **ROADMAP - Ready for Implementation**

---

## Why This Is Next

The foundation is now mature:
- ✅ Safe data (Prisma models, migrations applied)
- ✅ Correct permissions (field-level restrictions enforced)
- ✅ Correct lifecycle (archive, merge, restrict methods exist)

**Surgical workflows depend on**:
- **Duplicate resolution** (patient merge)
- **Restricted charts** (privacy-sensitive patients)
- **Soft deletion** (archive for compliance)

---

## Current State Assessment

### ✅ Repository Layer (Complete)
- `mergePatients()` - Merges duplicate patients
- `restrictPatient()` - Marks patient as privacy-sensitive
- `unrestrictPatient()` - Removes restriction
- `archive()` - Soft deletes patient (already used by `remove()`)

### ✅ Service Layer (Partial)
- `remove()` - Calls `archive()` ✅
- `mergePatients()` - **MISSING** (repository exists, service method needed)
- `restrictPatient()` - **MISSING** (repository exists, service method needed)
- `unrestrictPatient()` - **MISSING** (repository exists, service method needed)

### ⚠️ Controller Layer (Missing)
- `DELETE /patients/:id` - Exists (calls `remove()` → `archive()`) ✅
- `POST /patients/:id/merge` - **MISSING**
- `POST /patients/:id/restrict` - **MISSING**
- `POST /patients/:id/unrestrict` - **MISSING**

### ⚠️ UI Layer (Missing)
- Archive confirmation dialog
- Merge patient form (select source + target)
- Restrict/unrestrict toggle
- Patient lifecycle status indicators

---

## Implementation Plan

### Phase 1: Service Layer Methods

**Goal**: Expose repository methods through service layer with proper domain events.

#### 1.1 Merge Patients Service Method

**File**: `backend/src/modules/patient/services/patient.service.ts`

**Method**:
```typescript
async mergePatients(
  sourcePatientId: string,
  targetPatientId: string,
  reason: string | undefined,
  userId: string,
): Promise<void> {
  // 1. Validate access to both patients
  await this.findOne(sourcePatientId, userId);
  await this.findOne(targetPatientId, userId);
  
  // 2. Validate user has permission (ADMIN only for merge)
  if (!this.identityContext.hasRole('ADMIN')) {
    throw new ForbiddenException('Only ADMIN can merge patients');
  }
  
  // 3. Perform merge
  await this.patientRepository.mergePatients(
    sourcePatientId,
    targetPatientId,
    reason,
    userId,
  );
  
  // 4. Emit domain event
  const context = this.correlationService.getContext();
  await this.domainEventService.createEvent({
    eventType: PatientEventType.MERGED,
    domain: Domain.MEDICAL_RECORDS,
    aggregateId: targetPatientId,
    aggregateType: 'Patient',
    payload: {
      sourcePatientId,
      targetPatientId,
      reason,
    },
    correlationId: context.correlationId || undefined,
    causationId: context.causationId || undefined,
    createdBy: userId,
    sessionId: context.sessionId || undefined,
    requestId: context.requestId || undefined,
  });
}
```

**Requirements**:
- ✅ Validate access to both patients (RLS)
- ✅ Only ADMIN can merge (sensitive operation)
- ✅ Emit domain event
- ✅ Return void (merge is idempotent)

---

#### 1.2 Restrict Patient Service Method

**File**: `backend/src/modules/patient/services/patient.service.ts`

**Method**:
```typescript
async restrictPatient(
  patientId: string,
  reason: string,
  userId: string,
): Promise<any> {
  // 1. Validate access
  await this.findOne(patientId, userId);
  
  // 2. Validate user has permission (ADMIN only)
  if (!this.fieldPermissionService.canRestrictPatient()) {
    throw new ForbiddenException('Only ADMIN can restrict patients');
  }
  
  // 3. Restrict patient
  const restrictedPatient = await this.patientRepository.restrictPatient(
    patientId,
    userId,
    reason,
  );
  
  // 4. Emit domain event
  const context = this.correlationService.getContext();
  await this.domainEventService.createEvent({
    eventType: PatientEventType.RESTRICTED,
    domain: Domain.MEDICAL_RECORDS,
    aggregateId: patientId,
    aggregateType: 'Patient',
    payload: {
      patientId,
      reason,
    },
    correlationId: context.correlationId || undefined,
    causationId: context.causationId || undefined,
    createdBy: userId,
    sessionId: context.sessionId || undefined,
    requestId: context.requestId || undefined,
  });
  
  return restrictedPatient;
}
```

**Requirements**:
- ✅ Validate access (RLS)
- ✅ Only ADMIN can restrict (use `fieldPermissionService.canRestrictPatient()`)
- ✅ Emit domain event
- ✅ Return updated patient

---

#### 1.3 Unrestrict Patient Service Method

**File**: `backend/src/modules/patient/services/patient.service.ts`

**Method**:
```typescript
async unrestrictPatient(
  patientId: string,
  userId: string,
): Promise<any> {
  // 1. Validate access
  await this.findOne(patientId, userId);
  
  // 2. Validate user has permission (ADMIN only)
  if (!this.fieldPermissionService.canRestrictPatient()) {
    throw new ForbiddenException('Only ADMIN can unrestrict patients');
  }
  
  // 3. Unrestrict patient
  const unrestrictedPatient = await this.patientRepository.unrestrictPatient(
    patientId,
    userId,
  );
  
  // 4. Emit domain event
  const context = this.correlationService.getContext();
  await this.domainEventService.createEvent({
    eventType: PatientEventType.UNRESTRICTED,
    domain: Domain.MEDICAL_RECORDS,
    aggregateId: patientId,
    aggregateType: 'Patient',
    payload: {
      patientId,
    },
    correlationId: context.correlationId || undefined,
    causationId: context.causationId || undefined,
    createdBy: userId,
    sessionId: context.sessionId || undefined,
    requestId: context.requestId || undefined,
  });
  
  return unrestrictedPatient;
}
```

**Requirements**:
- ✅ Validate access (RLS)
- ✅ Only ADMIN can unrestrict
- ✅ Emit domain event
- ✅ Return updated patient

---

### Phase 2: Controller Endpoints

**Goal**: Expose service methods through REST API.

#### 2.1 Merge Patients Endpoint

**File**: `backend/src/modules/patient/controllers/patient.controller.ts`

**Endpoint**:
```typescript
@Post(':id/merge')
@Roles('ADMIN')
@Permissions('patients:*:write')
async merge(
  @Param('id') targetId: string,
  @Body() mergeDto: { sourcePatientId: string; reason?: string },
  @CurrentUser() user: UserIdentity,
) {
  return this.patientService.mergePatients(
    mergeDto.sourcePatientId,
    targetId,
    mergeDto.reason,
    user.id,
  );
}
```

**DTO**:
```typescript
// backend/src/modules/patient/dto/merge-patient.dto.ts
export class MergePatientDto {
  @IsUUID()
  sourcePatientId: string;
  
  @IsString()
  @IsOptional()
  reason?: string;
}
```

**Requirements**:
- ✅ ADMIN only
- ✅ Requires `patients:*:write` permission
- ✅ RLS validation (via service)

---

#### 2.2 Restrict Patient Endpoint

**File**: `backend/src/modules/patient/controllers/patient.controller.ts`

**Endpoint**:
```typescript
@Post(':id/restrict')
@Roles('ADMIN')
@Permissions('patients:*:write')
async restrict(
  @Param('id') id: string,
  @Body() restrictDto: { reason: string },
  @CurrentUser() user: UserIdentity,
) {
  return this.patientService.restrictPatient(id, restrictDto.reason, user.id);
}
```

**DTO**:
```typescript
// backend/src/modules/patient/dto/restrict-patient.dto.ts
export class RestrictPatientDto {
  @IsString()
  @MinLength(10) // Require meaningful reason
  reason: string;
}
```

**Requirements**:
- ✅ ADMIN only
- ✅ Requires reason (minimum length)
- ✅ RLS validation (via service)

---

#### 2.3 Unrestrict Patient Endpoint

**File**: `backend/src/modules/patient/controllers/patient.controller.ts`

**Endpoint**:
```typescript
@Post(':id/unrestrict')
@Roles('ADMIN')
@Permissions('patients:*:write')
async unrestrict(
  @Param('id') id: string,
  @CurrentUser() user: UserIdentity,
) {
  return this.patientService.unrestrictPatient(id, user.id);
}
```

**Requirements**:
- ✅ ADMIN only
- ✅ No body required (just removes restriction)
- ✅ RLS validation (via service)

---

### Phase 3: Domain Events

**Goal**: Add missing event types.

**File**: `backend/src/modules/patient/events/patient.events.ts`

**Add**:
```typescript
export enum PatientEventType {
  CREATED = 'Patient.Created',
  UPDATED = 'Patient.Updated',
  MERGED = 'Patient.Merged',
  ARCHIVED = 'Patient.Archived',
  RESTRICTED = 'Patient.Restricted',      // NEW
  UNRESTRICTED = 'Patient.Unrestricted',  // NEW
  CONSENT_SIGNED = 'Patient.ConsentSigned',
  RECORD_ACCESSED = 'Patient.RecordAccessed',
}
```

---

### Phase 4: UI Components (Frontend)

**Goal**: Build UI for patient lifecycle operations.

#### 4.1 Merge Patient Form
- Select source patient (search/autocomplete)
- Select target patient (search/autocomplete)
- Reason field (optional)
- Confirmation dialog
- Success/error handling

#### 4.2 Restrict/Unrestrict Toggle
- Toggle button in patient detail page
- Reason modal (for restrict)
- Confirmation dialog
- Status indicator (badge showing "RESTRICTED")

#### 4.3 Archive Confirmation
- Enhance existing delete button
- Show confirmation dialog with reason field
- Display archived status in patient list

---

## Testing Checklist

### Service Layer
- [ ] Merge patients (ADMIN only)
- [ ] Merge fails for non-ADMIN
- [ ] Restrict patient (ADMIN only)
- [ ] Restrict fails for non-ADMIN
- [ ] Unrestrict patient (ADMIN only)
- [ ] Domain events emitted correctly

### Controller Layer
- [ ] Merge endpoint (ADMIN only)
- [ ] Restrict endpoint (ADMIN only)
- [ ] Unrestrict endpoint (ADMIN only)
- [ ] RLS validation works
- [ ] Error handling (404, 403, 409)

### Integration
- [ ] Merge creates merge history record
- [ ] Restricted patients show restriction status
- [ ] Archived patients excluded from lists
- [ ] Audit logs capture all operations

---

## Estimated Effort

- **Phase 1 (Service Methods)**: 2-3 hours
- **Phase 2 (Controller Endpoints)**: 1-2 hours
- **Phase 3 (Domain Events)**: 30 minutes
- **Phase 4 (UI Components)**: 4-6 hours

**Total**: ~8-12 hours

---

## Dependencies

- ✅ Repository methods exist
- ✅ Field-level permissions implemented
- ✅ Domain event service available
- ✅ RLS validation service available
- ⚠️ Frontend patient service needs update

---

## Success Criteria

1. ✅ ADMIN can merge duplicate patients
2. ✅ ADMIN can restrict/unrestrict patients
3. ✅ All operations emit domain events
4. ✅ All operations are audited
5. ✅ UI provides clear feedback
6. ✅ Error handling is comprehensive

---

**Status**: 📋 **Ready for Implementation**









