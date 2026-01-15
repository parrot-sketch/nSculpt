# Patient Schema Analysis - Database vs Prisma

## Database Structure (Actual)
Based on `\d patients` output:

### Core Fields
- `id` (uuid, PK)
- `mrn` (varchar(50), unique) ✅ Mapped to `patientNumber`
- `fileNumber` (varchar(50), NOT NULL, unique) ❌ **MISSING FROM SCHEMA**
- `firstName` (varchar(100), NOT NULL) ✅
- `lastName` (varchar(100), NOT NULL) ✅
- `middleName` (varchar(100)) ✅
- `dateOfBirth` (date, NOT NULL) ✅
- `gender` (varchar(20)) ✅
- `bloodType` (varchar(10)) ✅

### Contact Fields
- `email` (varchar(255)) ✅
- `phone` (varchar(50)) ✅
- `phoneSecondary` (varchar(50)) ✅ Mapped to `alternatePhone`
- `whatsapp` (varchar(50)) ✅

### Address Fields
- `addressLine1` (varchar(200)) ✅ Mapped to `address`
- `addressLine2` (varchar(200)) ❌ **MISSING FROM SCHEMA**
- `city` (varchar(100), default 'Nairobi') ✅
- `state` (varchar(50)) ✅
- `zipCode` (varchar(20)) ✅
- `country` (varchar(100), default 'Kenya') ✅

### Additional Info
- `occupation` (varchar(200)) ✅
- `age` (integer) ✅

### Status Fields
- `status` (PatientStatus enum: ACTIVE, INACTIVE, DECEASED, ARCHIVED) ✅
- `restricted` (boolean, default false) ❌ **MISSING FROM SCHEMA**
- `restrictedReason` (text) ❌ **MISSING FROM SCHEMA**
- `restrictedBy` (uuid) ❌ **MISSING FROM SCHEMA**
- `restrictedAt` (timestamptz) ❌ **MISSING FROM SCHEMA**
- `deceased` (boolean, default false) ❌ **MISSING FROM SCHEMA**
- `deceasedAt` (timestamptz) ❌ **MISSING FROM SCHEMA**
- `deceasedBy` (uuid) ❌ **MISSING FROM SCHEMA**
- `archived` (boolean, default false) ❌ **MISSING FROM SCHEMA**
- `archivedAt` (timestamptz) ❌ **MISSING FROM SCHEMA**
- `archivedBy` (uuid) ❌ **MISSING FROM SCHEMA**
- `archivedReason` (text) ❌ **MISSING FROM SCHEMA**
- `mergedInto` (uuid) ✅
- `mergedAt` (timestamptz) ✅
- `mergedBy` (uuid) ✅

### Medical Fields
- `doctorInChargeId` (uuid) ✅
- `allergies` (text) ✅
- `chronicConditions` (text) ✅

### Audit Fields
- `createdAt` (timestamptz, NOT NULL) ✅
- `updatedAt` (timestamptz, NOT NULL) ✅
- `createdBy` (uuid) ✅
- `updatedBy` (uuid) ✅
- `version` (integer, default 1) ✅

## Prisma Schema (Current)
### Fields in Schema but NOT in Database
- `maritalStatus` ❌ **DOESN'T EXIST IN DB**
- `nationality` ❌ **DOESN'T EXIST IN DB**
- `title` (commented out) ✅

### Fields in Database but NOT in Schema
- `fileNumber` ❌ **REQUIRED, UNIQUE - MUST ADD**
- `addressLine2` ❌ **SHOULD ADD**
- `restricted`, `restrictedReason`, `restrictedBy`, `restrictedAt` ❌ **SHOULD ADD**
- `deceased`, `deceasedAt`, `deceasedBy` ❌ **SHOULD ADD**
- `archived`, `archivedAt`, `archivedBy`, `archivedReason` ❌ **SHOULD ADD**

## Issues to Fix

1. **Remove non-existent fields from schema**: `maritalStatus`, `nationality`
2. **Add missing required fields**: `fileNumber` (required, unique)
3. **Add missing optional fields**: `addressLine2`, restricted fields, deceased fields, archived fields
4. **Fix queries to use `select`**: All queries should explicitly select only existing fields
5. **Fix duplicate checking**: Ensure it works correctly with actual database structure
6. **Fix update logic**: Handle all fields properly






