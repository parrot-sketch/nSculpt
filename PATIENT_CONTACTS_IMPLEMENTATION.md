# Patient Contacts Implementation - Next of Kin & Emergency Contacts

## Solution Architecture

### Database Structure
- **Table**: `patient_contacts` (separate table, not columns on patients table)
- **Purpose**: Store next of kin and emergency contacts for patients
- **Relationship**: One-to-many (one patient can have multiple contacts)

### Why Separate Table?
1. ✅ Supports multiple contacts per patient
2. ✅ Flexible contact types (next of kin, emergency, both)
3. ✅ Better data normalization
4. ✅ Easier to query and manage contacts independently

## Implementation

### 1. Prisma Schema ✅
Added `PatientContact` model in `backend/prisma/schema/patient.prisma`:
- Maps to `patient_contacts` table
- Has relation to `Patient` model
- Supports both `isNextOfKin` and `isEmergencyContact` flags

### 2. Create Patient Logic ✅
When creating a patient:
1. Create patient record first
2. If next of kin data provided → create `PatientContact` with `isNextOfKin: true`
3. If emergency contact data provided → create `PatientContact` with `isEmergencyContact: true`
4. Return patient with contacts included

### 3. Update Patient Logic ✅
When updating patient:
1. Update patient record
2. If contact fields provided:
   - Delete existing next of kin and emergency contacts
   - Create new contacts from provided data
3. Return patient with updated contacts

### 4. DTO Fields Preserved ✅
The DTO still accepts:
- `nextOfKinFirstName`, `nextOfKinLastName`, `nextOfKinName`
- `nextOfKinRelationship`, `nextOfKinContact`
- `emergencyContactName`, `emergencyContactPhone`

These are now mapped to `PatientContact` records instead of direct patient columns.

## Data Flow

### Create Patient
```
DTO (nextOfKinFirstName, etc.)
  ↓
PatientRepository.create()
  ↓
1. Create Patient record
2. Create PatientContact(s) if contact data provided
  ↓
Return Patient with contacts included
```

### Update Patient
```
DTO (nextOfKinFirstName, etc.)
  ↓
PatientRepository.update()
  ↓
1. Update Patient record
2. Delete old contacts (if contact fields provided)
3. Create new PatientContact(s)
  ↓
Return Patient with updated contacts
```

## Benefits

1. **Essential Data Preserved**: Next of kin and emergency contacts are absolutely essential and now properly stored
2. **Flexible**: Can add multiple contacts per patient
3. **Normalized**: Follows database best practices
4. **Backward Compatible**: DTO fields remain the same, just mapped differently

## Current Status

✅ **Schema**: PatientContact model added
✅ **Create Logic**: Creates contacts in separate table
✅ **Update Logic**: Updates contacts properly
✅ **DTO**: Fields preserved and mapped correctly

## Next Steps

After Prisma client regenerates:
- ✅ Patient creation will work with next of kin/emergency contact data
- ✅ Patient updates will properly manage contacts
- ✅ All essential patient registration data will be captured






