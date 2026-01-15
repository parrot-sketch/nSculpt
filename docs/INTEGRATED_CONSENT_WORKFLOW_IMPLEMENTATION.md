# Integrated Consent Workflow - Implementation Summary

## Overview

This document summarizes the implementation of the integrated consent workflow that allows admins to:
1. Sign as different parties (Patient, Surgeon, Witness) for testing
2. Streamlined flow: Patient List → Template Selection → Interactive Viewer
3. Auto-prefill patient and user information
4. Minimize manual entry - most work is read and sign

## Changes Made

### 1. Enhanced SignaturePanel - Admin Role Switching

**File**: `client/components/consents/SignaturePanel.tsx`

**Changes**:
- Added signer type dropdown for admins (visible only when `isAdmin === true`)
- Allows admin to select: PATIENT, GUARDIAN, DOCTOR, NURSE_WITNESS, ADMIN
- Auto-updates signer name based on selected role
- Visual indicator (yellow background) showing "Admin testing mode"
- Helpful text: "You can sign as any party to test the workflow"

**Key Features**:
- Admin can switch between different signer types
- Auto-fills signer name based on current user
- Clear visual indication this is testing mode
- Maintains existing override functionality

### 2. Enhanced GenerateConsentModal - Auto-Prefill & Routing

**File**: `client/components/consents/GenerateConsentModal.tsx`

**Changes**:
- Added `patientService` import and patient data fetching
- Added `useAuth` hook to get current user data
- Added `useRouter` for navigation
- Added `redirectToViewer` prop (default: true)
- Auto-prefill logic:
  - Fetches patient data when modal opens
  - Auto-fills placeholders with patient info (name, DOB, MRN, email, phone)
  - Auto-fills placeholders with user info (doctor name, surgeon name, etc.)
  - Auto-fills date/today placeholders
  - Visual indicator (green) for auto-filled fields
  - User can still edit auto-filled values (user input takes precedence)
- Routing:
  - After successful generation, routes to consent viewer
  - Path: `/patients/{patientId}/consents/{consentId}` (adjust based on your routes)

**Auto-Prefilled Placeholders**:
- `PATIENT_NAME`: Full name
- `PATIENT_FIRST_NAME`: First name
- `PATIENT_LAST_NAME`: Last name
- `PATIENT_DOB`: Date of birth
- `PATIENT_MRN`: Medical Record Number
- `PATIENT_EMAIL`: Email
- `PATIENT_PHONE`: Phone
- `DOCTOR_NAME`: Current user name
- `SURGEON_NAME`: Current user name
- `NURSE_NAME`: Current user name
- `PROVIDER_NAME`: Current user name
- `DATE`: Current date
- `TODAY`: Current date

### 3. Backend Enhancement - Auto-Prefill in generateConsent()

**File**: `backend/src/modules/consent/services/pdf-consent.service.ts`

**Changes**:
- Enhanced `generateConsent()` method to:
  - Fetch patient data from database (using Prisma)
  - Fetch current user data from database
  - Auto-populate placeholder values with:
    - Patient information (name, DOB, MRN, email, phone)
    - User/Provider information (name)
    - Date information
  - Merge with provided `placeholderValues` (user input overrides auto-filled)

**Logic Flow**:
1. Validate patient access
2. Get template
3. **Fetch patient data** (NEW)
4. **Fetch current user data** (NEW)
5. **Auto-fill placeholders** (NEW)
6. Merge with provided values (user input overrides)
7. Load template PDF
8. Merge placeholders into PDF
9. Save generated PDF
10. Create consent record
11. Emit event

## Workflow

### Admin Flow

```
1. Patient List
   ↓
2. Click "Generate Consent" button
   ↓
3. GenerateConsentModal opens
   ↓
4. Admin selects template from dropdown
   ↓
5. Placeholders auto-filled with:
   - Patient info (from database)
   - User info (from current user)
   - Date (current date)
   ↓
6. Admin reviews/edits placeholders (optional)
   ↓
7. Click "Generate Consent"
   ↓
8. Backend:
   - Loads template PDF
   - Merges placeholders (auto-filled + manual)
   - Creates patient-specific PDF
   - Creates consent record
   ↓
9. Frontend:
   - Modal closes
   - Routes to: /patients/{patientId}/consents/{consentId}
   ↓
10. ConsentViewer/InteractivePDFViewer opens
    ↓
11. Admin reads consent
    ↓
12. Admin clicks "Sign"
    ↓
13. SignaturePanel opens
    ↓
14. Admin selects signer type:
    - "Patient" (to test patient signature)
    - "Doctor" (to test doctor signature)
    - "Nurse Witness" (to test witness signature)
    ↓
15. Admin signs as selected party
    ↓
16. Process repeats for other parties
    ↓
17. All parties signed → Consent fully signed
```

## Testing Workflow

### Admin Testing All Parties

1. **Sign as Patient**:
   - Select "Patient" from signer type dropdown
   - Enter patient name (or use auto-filled)
   - Sign consent

2. **Sign as Doctor**:
   - Select "Doctor/Surgeon" from signer type dropdown
   - Enter doctor name (or use auto-filled)
   - Sign consent

3. **Sign as Witness**:
   - Select "Nurse Witness" from signer type dropdown
   - Enter witness name (or use auto-filled)
   - Sign consent

**Note**: The backend still enforces signature order validation. If you want to test out of order, use the "Override signature order" checkbox (admin only).

## Key Features

### Auto-Prefill
- **Patient Data**: Automatically fetched from database
- **User Data**: Automatically fetched from current user
- **Date**: Automatically set to current date
- **Override**: User can edit any auto-filled value

### Role Switching
- **Admin Only**: Signer type dropdown only visible to admins
- **Visual Indicator**: Yellow background shows "testing mode"
- **Flexible**: Can sign as any party

### Streamlined Flow
- **One-Click Generation**: Select template → Generate → View
- **Auto-Routing**: Automatically routes to viewer after generation
- **Minimal Manual Entry**: Most fields pre-filled

## Next Steps

1. **Route Configuration**: Ensure consent viewer route exists:
   - `/patients/[patientId]/consents/[consentId]` or
   - `/consents/[consentId]` (adjust based on your routing)

2. **Interactive Viewer Integration**: 
   - Replace iframe in ConsentViewer with InteractivePDFViewer
   - Integrate AnnotationContext
   - Enable annotation tools

3. **Testing**:
   - Test auto-prefill with different templates
   - Test role switching with different signer types
   - Test workflow end-to-end

## Notes

- **Patient MRN**: Auto-filled if available in database
- **User Name**: Uses `firstName` + `lastName` from user record
- **Date Format**: Uses `toLocaleDateString()` - adjust format if needed
- **Override Values**: User-provided placeholder values override auto-filled values
- **Routing**: Adjust route path in GenerateConsentModal based on your Next.js routing structure








