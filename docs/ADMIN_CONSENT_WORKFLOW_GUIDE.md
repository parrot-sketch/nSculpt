# Admin Consent Workflow Guide

## Complete Admin Workflow - Step by Step

### Overview
The frontend **fully supports** the integrated consent workflow. The admin can:
1. ✅ Navigate to patient consents
2. ✅ Generate consent with auto-prefilled data
3. ✅ View consent inline (no routing needed)
4. ✅ Sign as different parties (Patient, Doctor, Witness) for testing
5. ✅ Complete multi-signer workflow

---

## Step-by-Step Workflow

### 1. Navigate to Patient Consents

**Path A: Via Patient List**
```
Admin Dashboard
  ↓
Patients List (/admin/patients)
  ↓
Click patient row → Dropdown → "View Consents"
  ↓
OR
  ↓
Click patient row → "View Profile" → Patient Profile → Click "Consents" tab
  ↓
Patient Consents Page (/admin/patients/[id]/consents)
```

**Path B: Via Patient Profile**
```
Admin Dashboard
  ↓
Patients List (/admin/patients)
  ↓
Click patient row → "View Profile"
  ↓
Patient Profile (/admin/patients/[id])
  ↓
Click "Manage Consents" or "Go to Consents" button
  ↓
Patient Consents Page (/admin/patients/[id]/consents)
```

**Consents Page Features:**
- Header with patient name and MRN
- "Generate Consent" button (top right)
- Tabs: Active Consents | Revoked | Archived
- Consent list (when no consent selected)
- Consent viewer (when consent selected)

---

### 2. Generate Consent

**Step 2.1: Open Generate Modal**
- Click **"Generate Consent"** button (top right)
- `GenerateConsentModal` opens

**Step 2.2: Select Template**
- Template dropdown appears
- Select a consent template
- Template placeholders are loaded

**Step 2.3: Auto-Prefill (Automatic)**
When template is selected, placeholders are **automatically filled** with:
- **Patient Data**: Name, DOB, MRN, Email, Phone
- **User Data**: Doctor Name, Surgeon Name, Nurse Name, Provider Name
- **Date**: Current date

**Visual Indicators:**
- Auto-filled fields have **green background** (`bg-green-50`)
- Auto-filled fields show **(auto-filled)** label
- Fields are editable (admin can override)

**Step 2.4: Review/Edit (Optional)**
- Review auto-filled values
- Edit any fields as needed
- User input overrides auto-filled values

**Step 2.5: Generate**
- Click **"Generate Consent"** button
- Consent is generated on backend
- Backend auto-fills placeholders (same logic as frontend)
- PDF is created with merged placeholders
- Consent record is created

**Step 2.6: View Consent (Automatic)**
- Modal closes
- `onSuccess` callback is called with `consentId`
- `setSelectedConsentId(consentId)` is called
- View switches from `ConsentList` to `ConsentViewer` **inline** (same page, no routing)
- Active tab switches to "Active Consents"

**Result:**
- Consent viewer displays inline
- PDF is shown in iframe
- Consent status shows (DRAFT)
- Actions panel shows available actions

---

### 3. View Consent

**ConsentViewer displays:**
- Header: Template name, status badge, consent number
- Metadata: Consultation link, created date, updated date
- PDF Preview: PDF displayed in iframe
- Signatures Timeline: List of existing signatures
- Actions Panel: Sign, Send for Signature, Revoke, Archive, Download

**Navigation:**
- Click **"Back"** arrow (top left) → Returns to consent list
- Click **"Close"** (X button) → Returns to consent list (if onClose provided)
- Click consent in list → Opens viewer

**Note:** ConsentViewer is **inline** on the same page - no routing needed!

---

### 4. Sign Consent (Admin Testing Mode)

**Step 4.1: Initiate Signature**
- Click **"Sign"** button in Actions panel
- `SignaturePanel` modal opens

**Step 4.2: Select Signer Type (Admin Only)**
- **Signer Type Dropdown** appears (yellow background - "Admin testing mode")
- Options:
  - Patient
  - Guardian
  - Doctor/Surgeon
  - Nurse Witness
  - Admin (Override)
- Select the party you want to sign as (e.g., "Patient")

**Step 4.3: Signer Name (Auto-Filled)**
- Signer name field is auto-filled with current user's name
- Admin can edit if needed

**Step 4.4: Choose Signature Method**
- **Draw**: Draw signature on canvas
- **Upload**: Upload signature image
- **Type**: Type signature text

**Step 4.5: Create Signature**
- Draw/upload/type signature
- Review signature

**Step 4.6: Admin Override (Optional)**
- If signing out of order, check "Override signature order"
- Provide reason (required if checked)

**Step 4.7: Submit Signature**
- Click **"Sign Consent"** button
- Signature is submitted to backend
- Backend validates:
  - Signature order (unless override)
  - Consent status
  - Duplicate signatures
- Signature is recorded
- Consent status updates:
  - First signature → `PARTIALLY_SIGNED`
  - All required signatures → `SIGNED`

**Step 4.8: View Result**
- Signature panel closes
- Consent viewer refreshes
- New signature appears in Signatures Timeline
- Status badge updates
- Actions update (e.g., "Sign" button may disable if fully signed)

---

### 5. Sign as Additional Parties

**To test multi-signer workflow:**

**Sign as Patient:**
1. Click "Sign" button
2. Select "Patient" from dropdown
3. Create signature
4. Submit

**Sign as Doctor:**
1. Click "Sign" button
2. Select "Doctor/Surgeon" from dropdown
3. Create signature
4. Submit

**Sign as Witness:**
1. Click "Sign" button
2. Select "Nurse Witness" from dropdown
3. Create signature
4. Submit

**Note:**
- Backend enforces signature order (Patient → Doctor → Witness)
- If signing out of order, use "Override signature order" checkbox
- Once all required parties sign, consent becomes `SIGNED` (immutable)

---

### 6. Complete Workflow Summary

```
1. Navigate to Consents Page
   └─ /admin/patients/[id]/consents

2. Generate Consent
   ├─ Click "Generate Consent" button
   ├─ Select template
   ├─ Review auto-filled placeholders
   ├─ Click "Generate Consent"
   └─ Consent viewer opens inline

3. Sign as Patient (Testing)
   ├─ Click "Sign" button
   ├─ Select "Patient" from dropdown
   ├─ Create signature
   └─ Submit

4. Sign as Doctor (Testing)
   ├─ Click "Sign" button
   ├─ Select "Doctor/Surgeon" from dropdown
   ├─ Create signature
   └─ Submit

5. Sign as Witness (Testing)
   ├─ Click "Sign" button
   ├─ Select "Nurse Witness" from dropdown
   ├─ Create signature
   └─ Submit

6. Consent Fully Signed
   ├─ Status → SIGNED
   ├─ PDF locked (immutable)
   ├─ Signatures embedded in PDF
   └─ Can download final PDF
```

---

## Key Features

### ✅ Auto-Prefill
- **Patient Data**: Automatically fetched and filled
- **User Data**: Current user's name auto-filled
- **Date**: Current date auto-filled
- **Editable**: All fields can be edited

### ✅ Admin Role Switching
- **Visible**: Only to admins (yellow indicator)
- **Flexible**: Can sign as any party
- **Testing Mode**: Clear visual indicator
- **Override**: Can override signature order

### ✅ Inline Viewer
- **No Routing**: Consent viewer opens inline on same page
- **Smooth UX**: No page navigation
- **Easy Navigation**: Back button returns to list

### ✅ Status Updates
- **Real-time**: Status updates after each signature
- **Visual**: Status badge shows current state
- **Actions**: Available actions update based on status

---

## Component Flow

```
PatientConsentsPage (page.tsx)
  ├─ State: selectedConsentId
  ├─ State: showGenerateModal
  │
  ├─ GenerateConsentModal
  │   ├─ onSuccess: setSelectedConsentId(consentId)
  │   └─ Auto-prefills placeholders
  │
  ├─ Conditional Render:
  │   ├─ If selectedConsentId:
  │   │   └─ ConsentViewer (inline)
  │   │       ├─ PDF Display
  │   │       ├─ SignaturePanel
  │   │       │   ├─ Admin signer type dropdown
  │   │       │   └─ Signature methods
  │   │       └─ Actions
  │   │
  │   └─ Else:
  │       └─ ConsentList
  │           └─ ConsentCard (clickable)
  │               └─ onView: setSelectedConsentId(id)
```

---

## Status Flow

```
DRAFT
  ↓
READY_FOR_SIGNATURE (after "Send for Signature")
  ↓
PARTIALLY_SIGNED (after first signature)
  ↓
SIGNED (after all required signatures)
  ↓
REVOKED/ARCHIVED (admin actions)
```

---

## Testing Tips

1. **Quick Test**: Generate consent → Sign as Patient → Sign as Doctor → Done
2. **Full Test**: Generate consent → Sign as all parties → Download final PDF
3. **Override Test**: Sign as Doctor first (with override) → Sign as Patient
4. **Status Test**: Watch status badge update after each signature
5. **Navigation Test**: Use back button to return to list, click consent to view again

---

## Notes

- **Routing**: Consent viewer is inline (no route changes)
- **State Management**: Uses React state for selectedConsentId
- **Auto-Prefill**: Both frontend (UI) and backend (PDF generation) auto-fill
- **Admin Testing**: Role switching only visible to admins
- **Signature Order**: Backend enforces order, but admin can override
- **Immutable**: Once SIGNED, consent cannot be edited

---

## Summary

The frontend **fully supports** the integrated consent workflow:
- ✅ Navigation works
- ✅ Generation with auto-prefill works
- ✅ Inline viewer works
- ✅ Admin role switching works
- ✅ Multi-signer workflow works
- ✅ Status updates work

**The workflow is complete and ready for testing!**








