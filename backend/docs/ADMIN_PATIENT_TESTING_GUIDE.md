# Admin Patient Testing Guide - Quick Reference

**Date**: 2026-01-03  
**Purpose**: Step-by-step testing guide for admin patient workflows

---

## Prerequisites

1. ✅ Admin user account with `ADMIN` role
2. ✅ Valid JWT token
3. ✅ API client (Postman, curl, or frontend)

---

## Quick Test Scenarios

### Test 1: Create Patient ✅

**Request**:
```bash
POST /api/v1/patients
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "firstName": "Test",
  "lastName": "Patient",
  "email": "test@example.com",
  "phone": "555-1234",
  "dateOfBirth": "1990-01-01",
  "gender": "MALE",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001"
}
```

**Expected**:
- ✅ Status: `201 Created`
- ✅ Response includes `mrn` (format: `MRN-2026-XXXXX`)
- ✅ Response includes `id` (UUID)
- ✅ `createdBy` matches admin user ID
- ✅ `status` is `ACTIVE`

**Verify in Database**:
```sql
SELECT id, mrn, "firstName", "lastName", "createdBy", status 
FROM patients 
WHERE email = 'test@example.com';
```

---

### Test 2: List All Patients ✅

**Request**:
```bash
GET /api/v1/patients?skip=0&take=10
Authorization: Bearer <admin-token>
```

**Expected**:
- ✅ Status: `200 OK`
- ✅ Response format: `{ data: Patient[], total: number }`
- ✅ Admin sees ALL patients (no filtering)
- ✅ Includes archived patients if filter allows

**Verify**: Total count matches database count

---

### Test 3: View Single Patient ✅

**Request**:
```bash
GET /api/v1/patients/:patientId
Authorization: Bearer <admin-token>
```

**Expected**:
- ✅ Status: `200 OK`
- ✅ Full patient object returned
- ✅ Includes related data:
  - `contacts` (emergency contacts)
  - `allergies` (active allergies)
  - `riskFlags` (active risk flags)
  - `surgicalCases` (summary)
  - `medicalRecords` (summary)
  - `consentInstances` (summary)
  - `bills` (summary)
  - `insurancePolicies` (summary)

---

### Test 4: Update Patient (Admin Override) ✅

**Request**:
```bash
PATCH /api/v1/patients/:patientId
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "firstName": "Updated",
  "bloodType": "O+",
  "restricted": true,
  "version": 1
}
```

**Expected**:
- ✅ Status: `200 OK`
- ✅ Patient updated successfully
- ✅ Admin can update demographics, clinical, AND restricted fields in one request
- ✅ `updatedBy` matches admin user ID
- ✅ `version` incremented

**Verify Field-Level Override**:
- Admin can update `bloodType` (normally Nurses/Doctors only) ✅
- Admin can update `restricted` (normally blocked) ✅
- Admin can update `firstName` (normally Front Desk only) ✅

---

### Test 5: Archive Patient ✅

**Request**:
```bash
DELETE /api/v1/patients/:patientId
Authorization: Bearer <admin-token>
```

**Expected**:
- ✅ Status: `204 No Content`
- ✅ Patient NOT deleted from database
- ✅ Patient marked as `archived = true`
- ✅ `archivedAt` and `archivedBy` set

**Verify in Database**:
```sql
SELECT id, archived, "archivedAt", "archivedBy", status 
FROM patients 
WHERE id = ':patientId';
-- Should show: archived = true, status = 'ARCHIVED'
```

**Verify Exclusion**:
```bash
GET /api/v1/patients?skip=0&take=100
-- Archived patient should NOT appear in list
```

---

### Test 6: Merge Patients ✅

**Prerequisites**: Two patient records (source and target)

**Request**:
```bash
POST /api/v1/patients/:targetId/merge
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "sourcePatientId": "uuid-of-source-patient",
  "reason": "Duplicate patient record - same person registered twice"
}
```

**Expected**:
- ✅ Status: `204 No Content`
- ✅ Source patient archived
- ✅ Source patient `mergedInto` points to target
- ✅ Merge history record created

**Verify in Database**:
```sql
-- Source patient
SELECT id, archived, "mergedInto", status 
FROM patients 
WHERE id = ':sourceId';
-- Should show: archived = true, mergedInto = targetId, status = 'ARCHIVED'

-- Merge history
SELECT * FROM patient_merge_history 
WHERE "sourcePatientId" = ':sourceId' 
  AND "targetPatientId" = ':targetId';
-- Should exist
```

---

### Test 7: Restrict Patient ✅

**Request**:
```bash
POST /api/v1/patients/:patientId/restrict
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reason": "Patient is a public figure requiring enhanced privacy controls"
}
```

**Expected**:
- ✅ Status: `200 OK`
- ✅ Patient `restricted = true`
- ✅ `restrictedReason` recorded
- ✅ `restrictedBy` and `restrictedAt` set

**Verify in Database**:
```sql
SELECT id, restricted, "restrictedReason", "restrictedBy", "restrictedAt" 
FROM patients 
WHERE id = ':patientId';
-- Should show: restricted = true, reason recorded, audit fields set
```

---

### Test 8: Unrestrict Patient ✅

**Request**:
```bash
POST /api/v1/patients/:patientId/unrestrict
Authorization: Bearer <admin-token>
```

**Expected**:
- ✅ Status: `200 OK`
- ✅ Patient `restricted = false`
- ✅ `restrictedReason`, `restrictedBy`, `restrictedAt` cleared

**Verify in Database**:
```sql
SELECT id, restricted, "restrictedReason", "restrictedBy", "restrictedAt" 
FROM patients 
WHERE id = ':patientId';
-- Should show: restricted = false, audit fields null
```

---

## Error Scenarios to Test

### ❌ Test 9: Non-Admin Cannot Merge

**Request** (as Nurse/Doctor):
```bash
POST /api/v1/patients/:targetId/merge
Authorization: Bearer <nurse-token>
```

**Expected**:
- ❌ Status: `403 Forbidden`
- ❌ Error: "Only ADMIN can merge patients..."

---

### ❌ Test 10: Non-Admin Cannot Restrict

**Request** (as Nurse/Doctor):
```bash
POST /api/v1/patients/:patientId/restrict
Authorization: Bearer <nurse-token>
```

**Expected**:
- ❌ Status: `403 Forbidden`
- ❌ Error: "Only ADMIN can restrict patients..."

---

### ❌ Test 11: Version Conflict

**Request**:
```bash
PATCH /api/v1/patients/:patientId
{
  "firstName": "Updated",
  "version": 1  // Wrong version (patient was updated by another user)
}
```

**Expected**:
- ❌ Status: `409 Conflict`
- ❌ Error: "Patient record was modified by another user..."

---

### ❌ Test 12: Merge Already Merged Patient

**Request**:
```bash
POST /api/v1/patients/:targetId/merge
{
  "sourcePatientId": "already-merged-patient-id"
}
```

**Expected**:
- ❌ Status: `409 Conflict`
- ❌ Error: "One or both patients are already merged"

---

## Domain Events Verification

All operations should emit domain events. Verify in `domain_events` table:

```sql
SELECT "eventType", "aggregateId", "createdBy", "createdAt"
FROM domain_events
WHERE "aggregateType" = 'Patient'
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Expected Events**:
- `Patient.Created`
- `Patient.Updated`
- `Patient.Archived`
- `Patient.Merged`
- `Patient.Restricted`
- `Patient.Unrestricted`

---

## Quick Verification Queries

### Check Patient Status
```sql
SELECT 
  id, 
  mrn, 
  "firstName", 
  "lastName", 
  status, 
  restricted, 
  archived,
  "createdBy",
  "updatedBy"
FROM patients
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Check Merge History
```sql
SELECT 
  pmh.*,
  ps."firstName" as source_first_name,
  ps."lastName" as source_last_name,
  pt."firstName" as target_first_name,
  pt."lastName" as target_last_name
FROM patient_merge_history pmh
JOIN patients ps ON ps.id = pmh."sourcePatientId"
JOIN patients pt ON pt.id = pmh."targetPatientId"
ORDER BY pmh."mergedAt" DESC;
```

### Check Domain Events
```sql
SELECT 
  "eventType",
  "aggregateId",
  "createdBy",
  "createdAt",
  payload
FROM domain_events
WHERE "aggregateType" = 'Patient'
  AND "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC;
```

---

## Testing Checklist

### Core Operations
- [ ] Create patient
- [ ] List all patients (admin sees all)
- [ ] View single patient
- [ ] Update patient (admin override)
- [ ] Archive patient

### Lifecycle Operations
- [ ] Merge patients
- [ ] Restrict patient
- [ ] Unrestrict patient

### Error Handling
- [ ] Non-admin cannot merge (403)
- [ ] Non-admin cannot restrict (403)
- [ ] Version conflict (409)
- [ ] Merge already merged (409)

### Audit Trail
- [ ] Domain events emitted
- [ ] Audit fields set correctly
- [ ] Merge history created

---

## Summary

**Admin can**:
- ✅ Create, read, update, archive patients
- ✅ Merge duplicate patients
- ✅ Restrict/unrestrict patients
- ✅ Override all field-level permissions
- ✅ View all patients (no RLS restrictions)

**All operations**:
- ✅ Emit domain events
- ✅ Set audit fields
- ✅ Enforce optimistic locking
- ✅ Maintain compliance

---

**Status**: 📋 **READY FOR TESTING**









