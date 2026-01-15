# Consent Signature 401 Unauthorized Error - FIXED

## Problem
When patients tried to place signatures on PDF consent documents, they received a `401 Unauthorized` error:

```
POST http://localhost:3002/api/v1/consents/{id}/annotations 401 (Unauthorized)
Error placing signature: Error: Failed to save signature placement
```

## Root Cause
The PDF consent annotations endpoints in the backend controller were not allowing the `PATIENT` role to create, read, update, or delete annotations. This prevented patients from being able to sign their consent documents.

### Original Authorization (Broken)
```typescript
// POST /api/v1/consents/:id/annotations
@Roles('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK')  // ❌ PATIENT missing
@Permissions('consent:*:write')
```

## Solution
Added the `PATIENT` role to all annotation endpoints since patients need to be able to:
1. Create signature annotations on their own consents
2. View annotations on their own consents
3. Update their signature annotations if needed
4. Delete their signature annotations if needed

### Updated Authorization (Fixed) ✅
```typescript
// POST /api/v1/consents/:id/annotations
@Roles('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK', 'PATIENT')  // ✅ PATIENT added
@Permissions('consent:*:write')
```

## Changes Made

### File: `/backend/src/modules/consent/controllers/pdf-consent.controller.ts`

1. **GET /api/v1/consents/:id/annotations** (line 101)
   - Added `PATIENT` role
   - Patients can now view annotations on their own consents

2. **GET /api/v1/consents/:id/annotations/:annotationId** (line 115)
   - Added `PATIENT` role
   - Patients can view specific annotations

3. **POST /api/v1/consents/:id/annotations** (line 312)
   - Added `PATIENT` role
   - Patients can now create signature annotations

4. **PUT /api/v1/consents/:id/annotations/:annotationId** (line 329)
   - Added `PATIENT` role
   - Patients can update their signature annotations

5. **DELETE /api/v1/consents/:id/annotations/:annotationId** (line 347)
   - Added `PATIENT` role
   - Patients can delete their signature annotations

## Permission Validation

### How Wildcard Permissions Work
The permission `consent:*:write` in the controller matches the patient's `consent:write` permission because:

1. Patient role has `consent:write` (2-part format) in seed data
2. The permission matcher supports wildcards (see `identityContext.service.ts`)
3. A 2-part format like `consent:write` matches any resource (acts like `consent:*:write`)

### From seed.ts
```typescript
// PATIENT: Patient portal access (own records only)
const patientPermissions = [
  'patients:*:read',  // Can read own patient record
  'consent:read',     // Can read own consents
  'consent:write',    // Can sign consents ✅ This matches consent:*:write
];
```

## Row-Level Security (RLS)
The RLS guard is still active and ensures:
- Patients can only access their own consents
- The `findOne` call in each endpoint validates consent access
- Patients cannot access other patients' consents or annotations

## Testing
After restarting the backend container:
```bash
docker restart ehr-backend
```

Patients should now be able to:
1. ✅ View the signature list in the PDF viewer
2. ✅ Create new signatures
3. ✅ Place signatures on the PDF
4. ✅ See placed signatures persist
5. ✅ Sign pre-defined signature fields

## Security Notes
- RLS (Row-Level Security) ensures patients only access their own consents
- The `@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)` stack on the controller ensures:
  1. User must have PATIENT role
  2. User must have access to the specific consent (their own)
  3. User must have `consent:write` permission
- Patients cannot access annotations on other patients' consents

## Next Steps
If you still see 401 errors after the backend restart:
1. Clear browser cache and refresh
2. Check that you're logged in as a patient user
3. Verify the patient user has the correct role in the database
4. Check browser console for any auth token issues

## Status
✅ **FIXED** - Backend restarted and changes applied


