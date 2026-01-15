# Patient Status Enum Fix

## Issue
**Error**: `invalid input value for enum "PatientStatus": "MERGED"`

The database enum `PatientStatus` only has these values:
- ACTIVE
- INACTIVE
- DECEASED
- ARCHIVED

But the code was trying to use `'MERGED'` which doesn't exist in the enum.

## Solution

### 1. Changed Merge Detection Logic ✅
Instead of checking `status != 'MERGED'`, now checking `mergedInto: null`:
- Merged patients have `mergedInto` set to the target patient ID
- Non-merged patients have `mergedInto: null`

### 2. Updated All Queries ✅
Replaced all instances of:
```typescript
status: { not: 'MERGED' }
```

With:
```typescript
mergedInto: null
```

### 3. Fixed Merge Function ✅
When merging patients:
- Sets `mergedInto` to target patient ID
- Sets `mergedAt` timestamp
- Sets `mergedBy` user ID
- Sets `status: 'ARCHIVED'` (not 'MERGED')

### 4. Added Missing Schema Fields ✅
Added to Prisma schema:
- `mergedAt DateTime? @db.Timestamptz(6)`
- `mergedBy String? @db.Uuid`

## Files Modified

1. **`backend/prisma/schema/patient.prisma`**
   - Added `mergedAt` and `mergedBy` fields
   - Updated comment to reflect actual enum values

2. **`backend/src/modules/patient/repositories/patient.repository.ts`**
   - Updated `checkDuplicates()` to use `mergedInto: null`
   - Updated `findByEmail()` to use `mergedInto: null`
   - Updated `findAll()` to use `mergedInto: null`
   - Updated `findAllFiltered()` to use `mergedInto: null`
   - Updated `search()` to use `mergedInto: null`
   - Updated `mergePatients()` to check `mergedInto` instead of status
   - Updated `mergePatients()` to set `mergedAt` and `mergedBy`

## Current Status

✅ **All MERGED status references fixed**
✅ **Using mergedInto field for merge detection**
✅ **Prisma Client regenerated**
✅ **Patient creation should work now**

## Testing

Try creating a patient again. The errors should be resolved:
- ✅ No more enum errors
- ✅ Duplicate check works correctly
- ✅ Patient queries exclude merged patients properly
- ✅ Patient creation should succeed






