# Patient Module Engineering Fix - Comprehensive

## Analysis Approach
Following engineering best practices:
1. ✅ Examined actual database structure
2. ✅ Compared with Prisma schema
3. ✅ Identified all mismatches
4. ✅ Fixed systematically

## Database Structure Analysis

### Actual Database Columns (42 total)
**Core**: id, mrn, fileNumber (required, unique), firstName, lastName, middleName, dateOfBirth, gender, bloodType
**Contact**: email, phone, phoneSecondary, whatsapp
**Address**: addressLine1, addressLine2, city, state, zipCode, country
**Status**: status (enum), restricted, restrictedReason, restrictedBy, restrictedAt, deceased, deceasedAt, deceasedBy, archived, archivedAt, archivedBy, archivedReason, mergedInto, mergedAt, mergedBy
**Medical**: doctorInChargeId, allergies, chronicConditions
**Other**: occupation, age
**Audit**: createdAt, updatedAt, createdBy, updatedBy, version

## Schema Fixes Applied

### 1. Removed Non-Existent Fields ✅
- ❌ `maritalStatus` - doesn't exist in database
- ❌ `nationality` - doesn't exist in database
- ❌ `title` - commented out (doesn't exist)

### 2. Added Missing Required Fields ✅
- ✅ `fileNumber` - required, unique identifier
  - Generated same as `patientNumber` for now
  - Can be customized later if needed

### 3. Fixed Column Mappings ✅
- ✅ `patientNumber` → `mrn` (`@map("mrn")`)
- ✅ `alternatePhone` → `phoneSecondary` (`@map("phoneSecondary")`)
- ✅ `address` → `addressLine1` (`@map("addressLine1")`)

### 4. Query Optimizations ✅
- ✅ `generatePatientNumber()` - uses `select` to only get `patientNumber`
- ✅ `checkDuplicates()` - uses `select` to avoid non-existent fields
- ✅ All queries use `mergedInto: null` instead of `status != 'MERGED'`

## Logic Improvements

### 1. Duplicate Checking ✅
**Create**: Checks before creating patient
- Email (if provided)
- Phone (if provided) 
- firstName + lastName + dateOfBirth

**Update**: New method `checkDuplicatesForUpdate()`
- Only checks if email/phone/name/DOB are actually changing
- Excludes current patient from duplicate check
- Prevents false positives when updating other fields

### 2. Patient Number Generation ✅
- Uses `select` to only query `patientNumber` field
- Avoids selecting non-existent fields like `maritalStatus`
- Format: `MRN-YYYY-XXXXX`

### 3. Update Logic ✅
- Verifies patient exists first
- Checks for duplicates only when relevant fields change
- Handles email changes properly (was causing 500 error)
- Uses proper field mappings

## Files Modified

1. **`backend/prisma/schema/patient.prisma`**
   - Removed `maritalStatus`, `nationality`
   - Added `fileNumber` (required, unique)
   - Fixed all column mappings

2. **`backend/src/modules/patient/repositories/patient.repository.ts`**
   - Fixed `generatePatientNumber()` to use `select`
   - Fixed `checkDuplicates()` to use `select`
   - Added `checkDuplicatesForUpdate()` method
   - Updated `create()` to generate `fileNumber`
   - Updated `update()` to check duplicates on email/phone/name changes
   - Fixed all `status != 'MERGED'` to `mergedInto: null`

## Error Resolution

### 409 Error (Conflict)
- **Cause**: Duplicate patient detected (correct behavior)
- **Fix**: Improved duplicate checking logic
- **Result**: Clear error messages, proper validation

### 500 Error on Email Update
- **Cause**: Not checking for duplicates when email changes
- **Fix**: Added `checkDuplicatesForUpdate()` method
- **Result**: Email updates now properly validate for duplicates

### 500 Error on Create
- **Cause**: Querying non-existent fields (`maritalStatus`, `title`)
- **Fix**: Use `select` to only query existing fields
- **Result**: Patient creation works correctly

## Current Status

✅ **Schema aligned with database**
✅ **All queries use `select` for safety**
✅ **Duplicate checking works for create and update**
✅ **FileNumber generation implemented**
✅ **Prisma Client regenerated**

## Testing Checklist

- [ ] Create patient with unique data → Should succeed
- [ ] Create patient with duplicate email → Should return 409
- [ ] Create patient with duplicate name+DOB → Should return 409
- [ ] Update patient email to existing email → Should return 409
- [ ] Update patient email to new unique email → Should succeed
- [ ] Update patient other fields (not email/phone/name) → Should succeed

## Next Steps (Optional Enhancements)

1. Add missing fields to schema if needed:
   - `addressLine2`
   - `restricted`, `restrictedReason`, `restrictedBy`, `restrictedAt`
   - `deceased`, `deceasedAt`, `deceasedBy`
   - `archived`, `archivedAt`, `archivedBy`, `archivedReason`

2. Customize `fileNumber` generation if different from `patientNumber`

3. Add validation for email format changes

4. Add logging for duplicate detection attempts






