# Integrated Consent Workflow - Implementation Plan

## Requirements Summary

1. **Admin Role Switching**: Admin can sign as different parties (Patient, Surgeon, Witness) for testing workflows
2. **Streamlined Flow**: Patient List → Select Template → Interactive Viewer (with prefilled info)
3. **Auto-Prefill**: Patient info + User info automatically filled
4. **Minimal Manual Entry**: Most work is just read and sign

## Implementation Steps

### 1. Enhanced SignaturePanel - Role Switching for Admin

**File**: `client/components/consents/SignaturePanel.tsx`

**Changes**:
- Add signer type dropdown for admins
- Allow admin to select which party they're signing as (PATIENT, DOCTOR, NURSE_WITNESS)
- Auto-prefill signer name based on selected role
- Show clear indication when admin is signing as different party

### 2. Enhanced GenerateConsentModal - Auto-Prefill & Route to Viewer

**File**: `client/components/consents/GenerateConsentModal.tsx`

**Changes**:
- Fetch patient data when modal opens
- Auto-prefill placeholder values with:
  - Patient name, DOB, MRN, etc.
  - Current user name, title, etc.
- Add option to open in interactive viewer after generation
- Route to consent viewer page after successful generation

### 3. Backend Enhancement - Auto-Prefill Placeholders

**File**: `backend/src/modules/consent/services/pdf-consent.service.ts`

**Changes**:
- Enhance `generateConsent()` to:
  - Fetch patient data
  - Fetch user data (current user)
  - Auto-populate common placeholders:
    - PATIENT_NAME, PATIENT_DOB, PATIENT_MRN
    - DOCTOR_NAME, NURSE_NAME, DATE, etc.
  - Merge with any provided placeholderValues (override auto-filled values)

### 4. Consent Viewer Integration

**File**: `client/components/consents/ConsentViewer.tsx`

**Changes**:
- Replace iframe with InteractivePDFViewer (when available)
- Keep iframe as fallback
- Integrate AnnotationContext for state management

## Key Features

### Admin Role Switching

```typescript
// In SignaturePanel
const isAdmin = roles.includes('ADMIN');
if (isAdmin) {
  // Show signer type dropdown
  // Allow switching between PATIENT, DOCTOR, NURSE_WITNESS
  // Auto-fill name based on role
}
```

### Auto-Prefill Placeholders

```typescript
// Backend auto-prefills:
{
  PATIENT_NAME: `${patient.firstName} ${patient.lastName}`,
  PATIENT_DOB: patient.dateOfBirth,
  PATIENT_MRN: patient.mrn,
  DOCTOR_NAME: user.name,
  DATE: new Date().toLocaleDateString(),
  // ... etc
}
```

### Streamlined Flow

```
Patient List
  ↓ Click "Generate Consent"
GenerateConsentModal (templates + auto-prefill)
  ↓ Select template → Generate
Consent Generated
  ↓ Auto-route
Consent Viewer (Interactive PDF Viewer)
  ↓ Read & Sign
Admin signs as different parties (PATIENT → DOCTOR → WITNESS)
```








