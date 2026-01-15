# Admin Patient Workflows - Complete Guide

**Date**: 2026-01-03  
**Status**: 📋 **READY FOR TESTING**

---

## Overview

Administrators have **full access** to all patient operations. This document outlines all admin capabilities for patient management.

---

## Admin Capabilities Summary

### ✅ Full CRUD Operations
- Create patients
- Read all patients (no RLS restrictions)
- Update any patient field (no field-level restrictions)
- Archive (soft delete) patients

### ✅ Lifecycle Operations
- Merge duplicate patients
- Restrict/unrestrict patients (privacy-sensitive)
- Archive patients

### ✅ Override Permissions
- Can edit demographic fields (normally Front Desk only)
- Can edit clinical fields (normally Nurses/Doctors only)
- Can restrict patients (normally blocked for all roles)

---

## Detailed Workflows

### 1. Create Patient

**Endpoint**: `POST /api/v1/patients`

**Admin Access**: ✅ Full access

**What Happens**:
- Patient is created with auto-generated MRN (format: `MRN-YYYY-XXXXX`)
- `createdBy` is set to admin's user ID
- Patient status is set to `ACTIVE`
- Domain event `Patient.Created` is emitted

**Request**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "555-1234",
  "dateOfBirth": "1990-01-01",
  "gender": "MALE",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001"
}
```

**Response**: Patient object with `mrn`, `id`, and all fields

---

### 2. View All Patients

**Endpoint**: `GET /api/v1/patients?skip=0&take=50`

**Admin Access**: ✅ Sees ALL patients (no RLS filtering)

**What Happens**:
- Returns all patients (including archived if filter allows)
- Pagination supported (`skip`, `take`)
- Can filter by status, restricted, archived, deceased
- Can search by name, MRN, email

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "mrn": "MRN-2026-00001",
      "firstName": "John",
      "lastName": "Doe",
      "status": "ACTIVE",
      "restricted": false,
      "archived": false,
      ...
    }
  ],
  "total": 150
}
```

---

### 3. View Single Patient

**Endpoint**: `GET /api/v1/patients/:id`

**Admin Access**: ✅ Can view any patient (no RLS restrictions)

**What Happens**:
- Returns full patient details
- Includes related data:
  - Emergency contacts
  - Active allergies
  - Active risk flags
  - Surgical cases (summary)
  - Medical records (summary)
  - Consent instances (summary)
  - Bills (summary)
  - Insurance policies (summary)

**Response**: Full patient object with all relations

---

### 4. Update Patient (Full Access)

**Endpoint**: `PATCH /api/v1/patients/:id`

**Admin Access**: ✅ Can edit ANY field (override all restrictions)

**What Happens**:
- Field-level permissions are bypassed (admin override)
- Can edit demographics (normally Front Desk only)
- Can edit clinical fields (normally Nurses/Doctors only)
- Can edit restricted fields (normally blocked)
- Optimistic locking enforced (version field)
- `updatedBy` is set to admin's user ID
- Domain event `Patient.Updated` is emitted

**Request**:
```json
{
  "firstName": "Jane",
  "bloodType": "O+",
  "restricted": true,
  "version": 1
}
```

**Response**: Updated patient object

**Note**: Admin can update multiple field categories in one request:
- Demographics: `firstName`, `lastName`, `email`, `phone`, `address`, etc.
- Clinical: `bloodType`
- Restricted: `restricted`, `restrictedReason`

---

### 5. Archive Patient (Soft Delete)

**Endpoint**: `DELETE /api/v1/patients/:id`

**Admin Access**: ✅ Only role that can archive

**What Happens**:
- Patient is NOT deleted from database
- Patient is marked as `archived = true`
- `archivedAt` and `archivedBy` are set
- Patient status is set to `ARCHIVED`
- Patient is excluded from normal `findAll()` results
- Domain event `Patient.Archived` is emitted

**Response**: `204 No Content` (void)

**Note**: Archived patients can still be accessed via direct ID lookup if needed for audit purposes.

---

### 6. Merge Duplicate Patients

**Endpoint**: `POST /api/v1/patients/:targetId/merge`

**Admin Access**: ✅ Only role that can merge

**What Happens**:
- Source patient (duplicate) is merged into target patient (primary)
- Source patient is archived and marked as merged
- `mergedInto` field points to target patient
- Merge history record is created for audit
- Domain event `Patient.Merged` is emitted

**Request**:
```json
{
  "sourcePatientId": "uuid-of-duplicate",
  "reason": "Duplicate patient record - same person registered twice"
}
```

**Response**: `204 No Content` (void)

**Use Case**: When same patient is registered multiple times (different MRNs), merge consolidates into one record.

---

### 7. Restrict Patient (Privacy-Sensitive)

**Endpoint**: `POST /api/v1/patients/:id/restrict`

**Admin Access**: ✅ Only role that can restrict

**What Happens**:
- Patient is marked as `restricted = true`
- `restrictedReason` is recorded (required for audit)
- `restrictedBy` and `restrictedAt` are set
- Domain event `Patient.Restricted` is emitted

**Request**:
```json
{
  "reason": "Patient is a public figure requiring enhanced privacy controls"
}
```

**Response**: Updated patient object with `restricted: true`

**Use Case**: VIP patients, celebrities, or anyone requiring enhanced privacy controls.

---

### 8. Unrestrict Patient

**Endpoint**: `POST /api/v1/patients/:id/unrestrict`

**Admin Access**: ✅ Only role that can unrestrict

**What Happens**:
- Patient restriction is removed (`restricted = false`)
- `restrictedReason`, `restrictedBy`, `restrictedAt` are cleared
- Domain event `Patient.Unrestricted` is emitted

**Request**: No body required

**Response**: Updated patient object with `restricted: false`

---

## Admin Permission Matrix

| Operation | Admin | Front Desk | Nurse | Doctor |
|-----------|-------|------------|-------|--------|
| **Create Patient** | ✅ | ❌ | ✅ | ✅ |
| **View All Patients** | ✅ | ❌ | ⚠️ (filtered) | ⚠️ (filtered) |
| **View Single Patient** | ✅ | ⚠️ (RLS) | ⚠️ (RLS) | ⚠️ (RLS) |
| **Update Demographics** | ✅ | ✅ | ❌ | ❌ |
| **Update Clinical Fields** | ✅ | ❌ | ✅ | ✅ |
| **Update Restricted Fields** | ✅ | ❌ | ❌ | ❌ |
| **Archive Patient** | ✅ | ❌ | ❌ | ❌ |
| **Merge Patients** | ✅ | ❌ | ❌ | ❌ |
| **Restrict Patient** | ✅ | ❌ | ❌ | ❌ |
| **Unrestrict Patient** | ✅ | ❌ | ❌ | ❌ |

**Legend**:
- ✅ = Full access
- ⚠️ = Limited access (RLS restrictions apply)
- ❌ = No access

---

## Testing Checklist for Admin

### ✅ Create Patient
- [ ] Create patient with all fields
- [ ] Verify MRN is auto-generated
- [ ] Verify `createdBy` is set correctly
- [ ] Verify domain event is emitted

### ✅ View Patients
- [ ] List all patients (no filtering)
- [ ] View single patient with all relations
- [ ] Verify can see archived patients (if filter allows)
- [ ] Verify can see restricted patients

### ✅ Update Patient
- [ ] Update demographics (firstName, email, etc.)
- [ ] Update clinical fields (bloodType)
- [ ] Update restricted fields (restricted flag)
- [ ] Update multiple field categories in one request
- [ ] Verify optimistic locking (version conflict)
- [ ] Verify `updatedBy` is set correctly
- [ ] Verify domain event is emitted

### ✅ Archive Patient
- [ ] Archive patient
- [ ] Verify patient is NOT deleted
- [ ] Verify `archived = true`
- [ ] Verify archived patient excluded from list
- [ ] Verify domain event is emitted

### ✅ Merge Patients
- [ ] Merge duplicate patients
- [ ] Verify source patient is archived
- [ ] Verify merge history record created
- [ ] Verify domain event is emitted
- [ ] Verify cannot merge already merged patient

### ✅ Restrict Patient
- [ ] Restrict patient with reason
- [ ] Verify `restricted = true`
- [ ] Verify reason is recorded
- [ ] Verify domain event is emitted

### ✅ Unrestrict Patient
- [ ] Unrestrict patient
- [ ] Verify `restricted = false`
- [ ] Verify audit fields cleared
- [ ] Verify domain event is emitted

---

## Common Admin Scenarios

### Scenario 1: Duplicate Patient Registration
**Problem**: Same patient registered twice with different MRNs

**Solution**:
1. Identify duplicate patients
2. Determine which is primary (target)
3. `POST /patients/:targetId/merge` with source patient ID
4. Source patient is archived, all references point to target

---

### Scenario 2: VIP Patient Privacy
**Problem**: Celebrity patient needs enhanced privacy

**Solution**:
1. `POST /patients/:id/restrict` with reason
2. Patient is marked as restricted
3. Access controls can be enhanced (future: RLS rules)

---

### Scenario 3: Data Correction
**Problem**: Patient record has incorrect information

**Solution**:
1. `PATCH /patients/:id` with corrected fields
2. Admin can update any field (demographics, clinical, restricted)
3. Version field prevents concurrent edits

---

### Scenario 4: Patient Deletion Request
**Problem**: Patient requests deletion (HIPAA right to deletion)

**Solution**:
1. `DELETE /patients/:id` (archive, not hard delete)
2. Patient is soft-deleted (archived)
3. Record remains for audit compliance
4. Patient excluded from normal queries

---

## Security Notes

### Admin Override
- Admin can bypass all field-level restrictions
- This is intentional for data management
- All admin actions are logged (domain events)
- Audit trail is complete

### RLS Still Applies
- Admin can see all patients in `findAll()`
- But RLS validation still runs (defensive check)
- Admin should have access to all patients via role

### Audit Trail
- All admin actions emit domain events
- `createdBy`, `updatedBy`, `archivedBy`, `restrictedBy` are tracked
- Full audit trail for compliance

---

## Summary

**Admin has full access to**:
- ✅ All CRUD operations
- ✅ All lifecycle operations (merge, restrict, archive)
- ✅ Override all field-level permissions
- ✅ View all patients (no RLS restrictions)

**Admin cannot**:
- ❌ Hard delete patients (only soft delete/archive)
- ❌ Modify system fields (MRN, version, audit timestamps)
- ❌ Bypass optimistic locking (version conflicts still apply)

**All admin actions are**:
- ✅ Logged (domain events)
- ✅ Audited (createdBy, updatedBy, etc.)
- ✅ Compliant (soft delete, immutable audit fields)

---

**Status**: 📋 **READY FOR TESTING**









