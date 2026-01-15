# Admin Patient Creation vs Patient Self-Registration

## Key Differences

### Admin Patient Creation (`POST /api/v1/patients`)
**Who**: Admin, Nurse, or Doctor (authenticated staff)
**Endpoint**: `/api/v1/patients`
**Authentication**: Required (Bearer token)
**Permissions**: `patients:*:write`
**Process**:
1. Staff member creates patient record
2. Patient number (MRN) is auto-generated
3. Patient record is created immediately
4. No user account is created
5. Patient cannot access portal yet

**Use Case**: 
- Front desk registration
- Staff entering patient data on behalf of patient
- Quick patient record creation

**Data Required**:
- firstName (required)
- lastName (required)
- dateOfBirth (required)
- Other fields optional

---

### Patient Self-Registration (`POST /api/v1/public/patients/register`)
**Who**: Patient themselves (public, no authentication)
**Endpoint**: `/api/v1/public/patients/register`
**Authentication**: None (public endpoint)
**Permissions**: N/A (public)
**Process**:
1. Patient enters their own information
2. Patient record is created
3. **User account is automatically created** (for portal access)
4. Confirmation email is sent
5. Patient receives credentials to access portal

**Use Case**:
- Patient self-registration portal
- Privacy-first workflow
- Patient controls their own data entry
- HIPAA compliance (front desk doesn't see sensitive info)

**Data Required**:
- All patient demographic data
- Account credentials (email/password for portal)

---

## Comparison Table

| Feature | Admin Creation | Self-Registration |
|---------|---------------|-------------------|
| **Endpoint** | `/api/v1/patients` | `/api/v1/public/patients/register` |
| **Authentication** | Required | None (public) |
| **User Account** | Not created | Automatically created |
| **Portal Access** | No | Yes (after registration) |
| **Who Creates** | Staff member | Patient themselves |
| **Privacy** | Staff sees all data | Patient controls entry |
| **Use Case** | Front desk registration | Online portal registration |

---

## Current Implementation

### Admin Creation Flow
1. Admin clicks "Create Patient" button
2. Fills out form (firstName, lastName, dateOfBirth required)
3. Submits to `POST /api/v1/patients`
4. Backend:
   - Validates data
   - Checks for duplicates
   - Generates patient number (MRN-YYYY-XXXXX)
   - Creates patient record
   - Returns patient data
5. Frontend redirects to patient detail page

### Self-Registration Flow (Future)
1. Patient visits public registration page
2. Fills out form with all required data
3. Submits to `POST /api/v1/public/patients/register`
4. Backend:
   - Validates data
   - Checks for duplicates
   - Creates patient record
   - Creates user account
   - Sends confirmation email
   - Returns patient data and credentials
5. Patient receives email with login credentials

---

## Notes

- Both use the same `CreatePatientDto` for patient data
- Self-registration uses `SelfRegisterPatientDto` which extends `CreatePatientDto` with account credentials
- Patient number (MRN) is auto-generated in both cases
- Duplicate checking is performed in both flows
- Admin creation is faster (no account creation, no email)
- Self-registration is more complete (includes portal access)






