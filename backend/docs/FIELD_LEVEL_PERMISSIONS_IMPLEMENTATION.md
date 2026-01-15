# Field-Level Permissions Implementation

**Date**: 2026-01-03  
**Status**: ✅ **COMPLETE**

---

## Overview

Field-level permissions have been implemented to enforce role-based restrictions on patient data updates. This prevents unauthorized modifications and ensures data integrity.

---

## What Was Implemented

### 1. **PatientFieldPermissionService** ✅

**File**: `backend/src/modules/patient/services/patient-field-permission.service.ts`

A new service that:
- Categorizes patient fields into demographic, clinical, restricted, and system fields
- Provides permission check methods for each category
- Validates field-level permissions before updates

**Key Methods**:
- `canEditDemographics()` - Checks if user can edit demographic fields
- `canEditClinicalData()` - Checks if user can edit clinical fields
- `canAttachDocuments()` - Checks if user can attach documents
- `canRestrictPatient()` - Checks if user can restrict/unrestrict patients
- `getChangedFields()` - Detects which fields changed in update DTO
- `validateFieldPermissions()` - Validates all changed fields against user permissions

---

## Field Categories

### Demographics (Front Desk can edit)
- `firstName`, `lastName`, `middleName`
- `dateOfBirth`
- `gender`
- `email`, `phone`, `phoneSecondary`
- `address`, `addressLine1`, `addressLine2`
- `city`, `state`, `zipCode`, `country`

**Rationale**: These are non-clinical identity and contact fields that Front Desk staff handle during patient registration.

---

### Clinical (Nurses/Doctors can edit)
- `bloodType`

**Note**: Allergies and risk flags are in separate tables (`PatientAllergy`, `PatientRiskFlag`) and are handled via separate endpoints, not through patient update.

**Rationale**: These require clinical knowledge and should not be modified by Front Desk staff.

---

### Restricted (Admin only)
- `restricted`
- `restrictedReason`
- `restrictedBy`
- `restrictedAt`

**Rationale**: Restricting a patient marks them as privacy-sensitive (VIP, celebrity, etc.). This is a sensitive operation that should only be done by administrators.

---

### System (Never editable via update)
- `id`, `mrn` (immutable)
- `createdAt`, `createdBy` (audit)
- `updatedAt`, `updatedBy` (managed automatically)
- `version` (optimistic locking)
- `archived`, `archivedAt`, `archivedBy` (soft delete)
- `deceased`, `deceasedAt`, `deceasedBy` (deceased status)
- `mergedInto`, `mergedAt`, `mergedBy` (merge history)

**Rationale**: These fields are managed automatically by the system and should never be modified via update DTO.

---

## Role Permissions

### FRONT_DESK
- ✅ Can edit demographics
- ❌ Cannot edit clinical fields
- ❌ Cannot restrict patients
- ✅ Can attach documents

**Use Case**: Front Desk staff register patients and update contact information.

---

### NURSE / DOCTOR
- ❌ Cannot edit demographics
- ✅ Can edit clinical fields
- ❌ Cannot restrict patients
- ❌ Cannot attach documents (typically)

**Use Case**: Clinical staff update patient medical information (blood type, allergies, risk flags).

---

### ADMIN
- ✅ Can edit everything (override)
- ✅ Can restrict/unrestrict patients
- ✅ Can attach documents
- ✅ Full access to all fields

**Use Case**: Administrators have full access for data management and compliance.

---

## Integration

### PatientService.update()

**File**: `backend/src/modules/patient/services/patient.service.ts`

The `update()` method now:
1. Validates RLS access (existing)
2. **NEW**: Validates field-level permissions before update
3. Updates patient with optimistic locking
4. Emits domain event

**Code Change**:
```typescript
async update(id: string, updatePatientDto: UpdatePatientDto, userId: string) {
  // Validate access (RLS check)
  const existingPatient = await this.findOne(id, userId);

  // FIELD-LEVEL PERMISSION CHECK
  // This enforces role-based field restrictions
  this.fieldPermissionService.validateFieldPermissions(updatePatientDto);

  // ... rest of update logic
}
```

---

## Error Handling

### ForbiddenException

When a user attempts to edit a field they don't have permission for, a `ForbiddenException` is thrown with a descriptive message:

**Example**:
```
Insufficient permissions: Cannot edit clinical fields (bloodType). 
Only NURSE, DOCTOR, and ADMIN can edit clinical data.
```

**HTTP Status**: `403 Forbidden`

---

## Testing Scenarios

### ✅ Test 1: Front Desk edits demographics
**Request**: `PATCH /api/v1/patients/:id`
```json
{
  "firstName": "John",
  "email": "john@example.com"
}
```
**Expected**: ✅ Success (Front Desk can edit demographics)

---

### ❌ Test 2: Front Desk edits clinical field
**Request**: `PATCH /api/v1/patients/:id`
```json
{
  "bloodType": "O+"
}
```
**Expected**: ❌ 403 Forbidden (Front Desk cannot edit clinical fields)

---

### ✅ Test 3: Nurse edits clinical field
**Request**: `PATCH /api/v1/patients/:id`
```json
{
  "bloodType": "O+"
}
```
**Expected**: ✅ Success (Nurse can edit clinical fields)

---

### ❌ Test 4: Nurse edits demographics
**Request**: `PATCH /api/v1/patients/:id`
```json
{
  "firstName": "Jane"
}
```
**Expected**: ❌ 403 Forbidden (Nurse cannot edit demographics)

---

### ✅ Test 5: Admin edits everything
**Request**: `PATCH /api/v1/patients/:id`
```json
{
  "firstName": "John",
  "bloodType": "O+",
  "restricted": true
}
```
**Expected**: ✅ Success (Admin can edit everything)

---

### ❌ Test 6: Non-admin restricts patient
**Request**: `PATCH /api/v1/patients/:id`
```json
{
  "restricted": true
}
```
**Expected**: ❌ 403 Forbidden (Only Admin can restrict patients)

---

## What Changed

### Files Modified

1. ✅ **Created**: `backend/src/modules/patient/services/patient-field-permission.service.ts`
   - New service for field-level permission checks

2. ✅ **Modified**: `backend/src/modules/patient/services/patient.service.ts`
   - Added `PatientFieldPermissionService` injection
   - Added field permission validation in `update()` method
   - Added comprehensive comments explaining the permission check

3. ✅ **Modified**: `backend/src/modules/patient/patient.module.ts`
   - Registered `PatientFieldPermissionService` as a provider

### Files Unchanged

- ✅ `PatientController` - No changes (routes unchanged)
- ✅ `UpdatePatientDto` - No changes (structure unchanged)
- ✅ `CreatePatientDto` - No changes (create doesn't need field-level checks)

---

## Why This Is Safe

### ✅ Incremental Change
- Only added permission validation to `update()` method
- No changes to controller routes or DTOs
- Existing behavior preserved

### ✅ Backward Compatible
- Admin users (who typically test) can still edit everything
- Permission checks only restrict unauthorized access
- No breaking changes to API contracts

### ✅ Defensive Programming
- Validates permissions before database update
- Clear error messages for debugging
- System fields are logged but not blocked (handled by repository)

---

## Future Enhancements

### Potential Additions

1. **Document Attachment Permissions**
   - Currently `canAttachDocuments()` exists but isn't used
   - Can be integrated into document upload endpoints

2. **Allergy/Risk Flag Permissions**
   - These are in separate tables and endpoints
   - Can add similar permission checks there

3. **Audit Logging**
   - Log field-level permission denials for security monitoring
   - Track which fields were blocked and why

4. **Granular Permissions**
   - Could add more granular permissions (e.g., "patients:demographics:write")
   - Currently uses role-based checks (simpler, sufficient for now)

---

## Summary

✅ **Field-level permissions are now enforced**:
- Front Desk can only edit demographics
- Nurses/Doctors can only edit clinical fields
- Admin can edit everything
- Clear error messages for unauthorized attempts

✅ **No breaking changes**:
- Controller routes unchanged
- DTOs unchanged
- Existing behavior preserved

✅ **Ready for testing**:
- All permission scenarios documented
- Error handling in place
- Comprehensive comments added

---

**Status**: ✅ **COMPLETE AND READY FOR TESTING**









