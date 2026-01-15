# PDF Consent Frontend Integration - Analysis

## 1. Current State Analysis

### Patient Detail Page
**Location:** `app/(protected)/admin/patients/[id]/page.tsx`

**Structure:**
- Uses Card components for sections
- Has sections for: Demographics, Contact, Medical Records, Consent History (placeholder)
- Uses StatusBadge for status display
- Has Quick Actions sidebar
- Currently shows placeholder for "Consent History"

**Where Consents Should Appear:**
- ✅ Replace "Consent History" placeholder with actual Consents tab
- Add tab navigation: Overview | Consents | Medical Records | Billing
- Consents tab should be the primary location

### Authentication & Role Guards
**Location:** `components/layout/AuthGuard.tsx`, `components/layout/PermissionsGuard.tsx`

**Pattern:**
- `AuthGuard` - Route-level protection with role/permission checks
- `PermissionsGuard` - Component-level conditional rendering
- Uses `usePermissions()` hook
- Checks roles: `hasAnyRole(roles, requiredRoles)`
- Checks permissions: `hasAllPermissions(permissions, requiredPermissions)`

**RBAC Implementation:**
- Frontend guards are UI-only - backend enforces actual access
- Must respect backend 403 responses
- Should show disabled states with tooltips for forbidden actions

### Modal & Drawer Patterns
**Location:** `components/modals/Modal.tsx`

**Pattern:**
- Portal-based modal with backdrop
- Size options: sm, md, lg, xl
- Title and close button
- Scrollable content area

**Usage:**
- Use for consent viewer (PDF display)
- Use for signature panel
- Use for action confirmations

### File Viewer Patterns
**Current State:** No PDF viewer found
**Need:** PDF.js integration or iframe for PDF display

### Existing API Services

**Consent Service:** `services/consent.service.ts`
- Has methods for structured consents
- Missing PDF consent methods:
  - `getPDFConsentsByPatient(patientId)`
  - `getPDFConsentById(id)`
  - `generatePDFConsent(data)`
  - `signPDFConsent(data)`
  - `revokePDFConsent(id, reason)`
  - `archivePDFConsent(id, reason)`
  - `sendForSignature(id, version)`
  - `downloadPDFConsent(id)`

**Patient Service:** `services/patient.service.ts`
- Has basic patient CRUD
- Missing:
  - `getPatientConsents(patientId, includeArchived)`
  - `getActiveConsents(patientId)`
  - `getRevokedConsents(patientId)`

## 2. UX Flow Definition

### Patient Profile → Consents Tab

**Tab Structure:**
```
[Overview] [Consents] [Medical Records] [Billing]
```

**Consents Tab Sections:**

1. **Active Consents**
   - List view with:
     - Consent title (template name)
     - Linked consultation (if any)
     - Status badge (DRAFT, READY_FOR_SIGNATURE, PARTIALLY_SIGNED, SIGNED)
     - Last updated timestamp
     - Signer progress indicator (e.g., "2/3 signed")
   - Actions per row:
     - View (opens PDF viewer)
     - Sign (if user can sign)
     - Send for signature (if doctor/nurse)
     - Revoke (if doctor/admin, pre-surgery)
     - Archive (admin only, if SIGNED/REVOKED)

2. **Revoked Consents**
   - Read-only list
   - Shows revocation reason
   - Shows revoked date/time
   - No actions except View

3. **Archived Consents**
   - Read-only list
   - Shows archive reason
   - Shows archived date/time
   - No actions except View

### Consent Viewer Flow

**When clicking a consent:**

1. Load metadata: `GET /api/v1/consents/:id`
2. Display:
   - PDF preview (iframe or PDF.js)
   - Signer timeline (who signed when)
   - Audit history (status changes)
   - Status badge
3. Show actions based on role:
   - Generate (Doctor/Nurse/Admin)
   - Send for signature (Doctor/Nurse/Admin)
   - Sign (Patient/Doctor/Nurse/Admin with override)
   - Revoke (Doctor/Admin, pre-surgery)
   - Archive (Admin only, SIGNED/REVOKED)
   - Download (if authorized)

**Disabled Actions:**
- Show tooltip with reason:
  - "Doctor cannot sign until patient has signed"
  - "Cannot revoke consent when surgery is scheduled"
  - "Only ADMIN can archive consents"
  - "Consent is already signed and locked"

### Signature Experience

**Signature Panel:**
- Modal/drawer with signature options:
  - Draw (canvas)
  - Upload (image file)
  - Type (text signature)
- Captures:
  - IP address (from request)
  - Device info (user agent)
  - Timestamp
  - User identity
- On submit:
  - Calls `POST /api/v1/consents/:id/sign`
  - Shows loading state
  - On success: Lock UI, show success message
  - On error: Show structured error message

## 3. RBAC-Aware Visibility

### FRONT_DESK
**Can See:**
- Status only (no PDF, no signers, no content)
- List of consents with status badges

**Cannot:**
- Open PDF viewer
- View signer names
- Initiate consent
- See any consent details beyond status

**UI:**
- Consent list shows only: Title, Status, Date
- No "View" button, or disabled with tooltip
- No action buttons

### NURSE
**Can See:**
- Consent details (no signer names)
- Status and progress
- Can generate consent draft
- Can monitor signature progress

**Cannot:**
- Sign on behalf of anyone
- View signer names (only signer types)
- Revoke or archive

**UI:**
- Consent list shows: Title, Status, Progress, Date
- "View" button enabled
- "Generate" button enabled
- "Sign" button disabled with tooltip
- No "Revoke" or "Archive" buttons

### DOCTOR
**Can:**
- Generate consent
- Open PDF viewer
- Sign (after patient)
- Revoke (before surgery scheduled)

**Cannot:**
- Modify templates
- Archive (admin only)
- Sign before patient (unless override)

**UI:**
- Full consent details
- All actions enabled (with state-based disabling)
- "Sign" disabled until patient signs (with tooltip)
- "Revoke" disabled if surgery scheduled (with tooltip)

### ADMIN
**Full Access:**
- All doctor capabilities
- Archive consents
- Override signing order (with explicit reason required)

**UI:**
- All actions enabled
- "Override" checkbox in signature panel
- Reason field required for override

### PATIENT (Future Patient Portal)
**Can:**
- Only see their own consents
- Sign their own consents
- View their own signed PDFs

**UI:**
- Filtered consent list (own only)
- "Sign" button for their consents
- "View" button for signed PDFs

## 4. Error Handling

### Backend Error Codes → UI Messages

| Error Code | UI Message |
|------------|------------|
| `CONSENT_SIGNATURE_ORDER_VIOLATION` | "Patient or Guardian must sign before Doctor. Please wait for patient signature." |
| `CONSENT_ALREADY_SIGNED` | "This consent is already fully signed and locked. No further signatures allowed." |
| `CONSENT_REVOKED` | "This consent has been revoked and is no longer valid." |
| `CONSENT_ARCHIVED` | "This consent has been archived and is read-only." |
| `CONSENT_ACCESS_FORBIDDEN` | "You do not have permission to access this consent." |
| `CONSENT_CANNOT_REVOKE_SURGERY_SCHEDULED` | "Cannot revoke consent when surgery is already scheduled. Cancel surgery first or create a new consent." |
| `CONSENT_CANNOT_ARCHIVE_INVALID_STATE` | "Only SIGNED or REVOKED consents can be archived." |
| `CONSENT_FORBIDDEN_ACTION` | "This action is not allowed. {details.message}" |

### Error Display Pattern
- Toast notification for action errors
- Inline error message in forms
- Disabled button with tooltip for predictable errors

## 5. API Calls

### Existing (Need to Add)
- `GET /api/v1/patients/:id/consents` - Get all consents for patient
- `GET /api/v1/patients/:id/consents/active` - Get active consents
- `GET /api/v1/patients/:id/consents/revoked` - Get revoked consents
- `GET /api/v1/consents/:id` - Get PDF consent by ID
- `POST /api/v1/consents` - Generate PDF consent
- `POST /api/v1/consents/:id/sign` - Sign PDF consent
- `POST /api/v1/consents/:id/send-for-signature` - Send for signature
- `POST /api/v1/consents/:id/revoke` - Revoke consent
- `POST /api/v1/consents/:id/archive` - Archive consent
- `GET /api/v1/consents/:id/download` - Download PDF

### Backend Already Implements
✅ All endpoints exist (from backend integration)

## 6. Component Structure

### Pages
- `app/(protected)/admin/patients/[id]/consents/page.tsx` - Consents tab page

### Components
- `components/consents/ConsentList.tsx` - List of consents with filtering
- `components/consents/ConsentViewer.tsx` - PDF viewer with metadata
- `components/consents/SignaturePanel.tsx` - Signature input (draw/upload/type)
- `components/consents/ConsentActions.tsx` - Action buttons with RBAC
- `components/consents/ConsentStatusBadge.tsx` - Status badge component
- `components/consents/SignerTimeline.tsx` - Timeline of signatures
- `components/consents/ConsentCard.tsx` - Individual consent card in list

## 7. Implementation Plan

1. ✅ Analysis (this document)
2. Update types for PDF consents
3. Add API service methods
4. Create consent components
5. Integrate into patient detail page
6. Add error handling
7. Add tests
8. Document usage

## 8. Notes

- **No UI-only guards** - Always respect backend 403 responses
- **No duplicate validation** - Backend is source of truth
- **No local state for signatures** - Always save immediately
- **No PDF embedding** - Use file URLs from backend
- **No breaking changes** - Existing consent functionality remains









