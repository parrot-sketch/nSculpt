# Phase 2: Patient Service Integration Audit

**Date**: 2026-01-03  
**Status**: Audit Complete - Ready for Incremental Refactoring

---

## Step 1: Current Implementation Audit

### ✅ What's Already Good

1. **PatientService** already uses `PatientRepository` ✅
   - No direct Prisma calls in service
   - Repository is properly injected
   - Domain events are emitted correctly

2. **PatientController** structure is correct ✅
   - Guards are properly configured
   - Routes are well-defined
   - User context is passed correctly

3. **Repository** is fully implemented ✅
   - All methods exist and work
   - MRN generation is automatic
   - Optimistic locking is supported

### ⚠️ Issues Found

#### Issue 1: `create()` - Missing `createdBy`
**Location**: `PatientService.create()`
**Problem**: Repository expects `createdBy` but service doesn't pass it
```typescript
// Current (line 24):
const patient = await this.patientRepository.create(createPatientDto);

// Should be:
const patient = await this.patientRepository.create({
  ...createPatientDto,
  createdBy: userId,
});
```

**Risk**: LOW - Patient will be created but `createdBy` will be NULL
**Impact**: Audit trail incomplete

---

#### Issue 2: `update()` - Missing Version & `updatedBy`
**Location**: `PatientService.update()`
**Problem**: 
- Repository supports optimistic locking with `version` field
- Service doesn't pass `version` from DTO
- Service doesn't pass `updatedBy`

```typescript
// Current (line 74):
const updatedPatient = await this.patientRepository.update(id, updatePatientDto);

// Should be:
const updatedPatient = await this.patientRepository.update(id, {
  ...updatePatientDto,
  version: updatePatientDto.version, // From DTO
  updatedBy: userId,
});
```

**Risk**: MEDIUM - Optimistic locking won't work, potential lost updates
**Impact**: Concurrent edits could overwrite each other

---

#### Issue 3: `remove()` - Calls Wrong Method
**Location**: `PatientService.remove()`
**Problem**: Calls `delete()` but should call `archive()` (soft delete)
```typescript
// Current (line 105):
await this.patientRepository.delete(id);

// Should be:
await this.patientRepository.archive(id, undefined, userId);
```

**Risk**: HIGH - Repository doesn't have `delete()` method (will throw error)
**Impact**: DELETE endpoint will fail

---

#### Issue 4: `findAll()` - Wrong Return Format
**Location**: `PatientService.findAll()`
**Problem**: Repository returns `{ data, total }` but service returns raw array
```typescript
// Current (line 135, 142):
return this.patientRepository.findAll(skip, take);
return this.patientRepository.findAllFiltered(skip, take, userId);

// Repository actually returns:
{ data: Patient[], total: number }

// Should be:
const result = await this.patientRepository.findAll(skip, take);
return result; // Returns { data, total }
```

**Risk**: MEDIUM - API response format will change (breaking change for frontend)
**Impact**: Frontend expecting array will break

---

#### Issue 5: `UpdatePatientDto` - Missing Version Field
**Location**: `dto/update-patient.dto.ts`
**Problem**: No `version` field for optimistic locking
```typescript
// Current:
export class UpdatePatientDto extends PartialType(CreatePatientDto) {}

// Should add:
@IsInt()
@IsOptional()
version?: number;
```

**Risk**: MEDIUM - Optimistic locking can't work without version
**Impact**: Lost updates in concurrent scenarios

---

#### Issue 6: `CreatePatientDto` - Missing Fields
**Location**: `dto/create-patient.dto.ts`
**Problem**: Missing fields that repository expects:
- `middleName` (optional)
- `bloodType` (optional)
- `phoneSecondary` (optional)
- `addressLine1`, `addressLine2` (currently just `address`)

**Risk**: LOW - Repository will work, but some fields won't be settable via API
**Impact**: Limited functionality

---

#### Issue 7: `findOne()` - Missing UserId in Controller
**Location**: `PatientController.findOne()`
**Problem**: Service expects `userId` for RLS check, but controller doesn't pass it
```typescript
// Current (line 59):
findOne(@Param('id') id: string) {
  return this.patientService.findOne(id);
}

// Should be:
findOne(
  @Param('id') id: string,
  @CurrentUser() user: UserIdentity,
) {
  return this.patientService.findOne(id, user.id);
}
```

**Risk**: LOW - RlsGuard handles it, but defensive check in service won't work
**Impact**: Redundant but safe

---

## Step 2: Refactoring Plan (Incremental)

### Phase 2A: Critical Fixes (Do First)
1. ✅ Fix `remove()` → `archive()` call
2. ✅ Add `createdBy` to `create()`
3. ✅ Add `updatedBy` to `update()`

### Phase 2B: Version Support
4. ✅ Add `version` to `UpdatePatientDto`
5. ✅ Pass `version` to repository `update()`
6. ✅ Handle `ConflictException` from repository

### Phase 2C: Response Format
7. ✅ Fix `findAll()` return format
8. ✅ Update controller to handle pagination response

### Phase 2D: DTO Enhancements (Optional)
9. ⚠️ Add missing fields to `CreatePatientDto` (if needed)
10. ⚠️ Add `middleName`, `bloodType` to DTOs

---

## Step 3: Risk Assessment

### Safe Changes (No Breaking Changes)
- ✅ Adding `createdBy` to create
- ✅ Adding `updatedBy` to update
- ✅ Fixing `delete()` → `archive()`
- ✅ Adding `version` field to DTO (optional field)

### Potentially Breaking Changes
- ⚠️ `findAll()` return format change: `Patient[]` → `{ data: Patient[], total: number }`
  - **Mitigation**: Check frontend usage first
  - **Alternative**: Keep backward compatibility wrapper

### No Risk Changes
- ✅ All internal refactoring
- ✅ Adding optional fields to DTOs
- ✅ Passing additional parameters to repository

---

## Step 4: Testing Checklist

After each change, test:

1. **Create Patient**:
   - [ ] POST `/api/v1/patients` creates patient with MRN
   - [ ] `createdBy` is set correctly
   - [ ] Domain event is emitted

2. **Update Patient**:
   - [ ] PATCH `/api/v1/patients/:id` updates successfully
   - [ ] `updatedBy` is set correctly
   - [ ] Version conflict throws 409 Conflict
   - [ ] Domain event is emitted

3. **Delete Patient**:
   - [ ] DELETE `/api/v1/patients/:id` archives (soft delete)
   - [ ] Patient is not actually deleted
   - [ ] Domain event is emitted

4. **List Patients**:
   - [ ] GET `/api/v1/patients` returns correct format
   - [ ] Pagination works (skip/take)
   - [ ] RLS filtering works for non-ADMIN users

5. **Get Patient**:
   - [ ] GET `/api/v1/patients/:id` returns patient
   - [ ] Includes related data (contacts, allergies, etc.)

---

## Implementation Order

1. **Fix Critical Issues** (Phase 2A) - 5 minutes
2. **Add Version Support** (Phase 2B) - 10 minutes
3. **Fix Response Format** (Phase 2C) - 10 minutes
4. **Test Everything** - 15 minutes

**Total Estimated Time**: 40 minutes

---

## Next Steps

Proceed with incremental fixes, starting with Phase 2A (critical fixes).









