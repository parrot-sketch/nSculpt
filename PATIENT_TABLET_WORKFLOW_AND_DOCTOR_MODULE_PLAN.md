# Patient Tablet Workflow & Doctor Module Implementation Plan
## Aesthetic Surgery Center - Comprehensive Workflow Design

---

## Executive Summary

This document outlines the implementation plan for:
1. **Patient Self-Registration Tablet Workflow** - Privacy-first, tablet-optimized patient intake
2. **Doctor Module** - Complete doctor workflow integration for aesthetic surgery center

---

## PART 1: PATIENT SELF-REGISTRATION TABLET WORKFLOW

### 1.1 Workflow Design

```
┌─────────────────────────────────────────────────────────────┐
│ TABLET HANDOFF WORKFLOW                                    │
└─────────────────────────────────────────────────────────────┘

1. Front Desk Staff Action:
   - Opens tablet/kiosk
   - Switches to "Patient Registration Mode"
   - Hands tablet to patient
   
2. Patient Self-Registration:
   - Patient sees clean, tablet-optimized form
   - Enters personal information
   - Enters contact information
   - Enters emergency contact/next of kin
   - Creates account password
   - Reviews and submits
   
3. System Processing:
   - Validates data
   - Checks for duplicates
   - Creates patient record
   - Creates patient user account (PATIENT role)
   - Sends confirmation email
   
4. Tablet Return:
   - Patient returns tablet to front desk
   - System automatically switches back to "Front Desk Mode"
   - Front desk can see patient was registered
   - Front desk can proceed with appointment scheduling
```

### 1.2 Technical Requirements

#### Frontend Components Needed:
1. **Tablet Mode Toggle Component**
   - Switch between "Patient Mode" and "Front Desk Mode"
   - Session-based mode tracking
   - Auto-return to front desk mode after timeout

2. **Patient Self-Registration Form**
   - Tablet-responsive design (large touch targets, clear typography)
   - Multi-step form (Personal Info → Contact → Medical → Review)
   - Real-time validation
   - Progress indicator
   - Accessible (WCAG 2.1 AA compliant)

3. **Form Mode State Management**
   - Global state for current mode (patient/frontdesk)
   - Persist mode in session storage
   - Auto-reset after patient registration

#### Backend Requirements:
1. **Complete Self-Registration Service**
   - Create patient record
   - Create user account with PATIENT role
   - Hash password (bcrypt)
   - Send confirmation email
   - Return credentials

2. **PATIENT Role Creation**
   - Add PATIENT role to seed
   - Define PATIENT permissions
   - Patient portal access permissions

3. **Session Management**
   - Track tablet mode in session
   - Auto-reset after registration

### 1.3 UI/UX Design Principles

#### Tablet Optimization:
- **Touch Targets**: Minimum 44x44px (Apple HIG) / 48x48px (Material Design)
- **Typography**: Minimum 16px font size, high contrast
- **Spacing**: Generous padding (16px+ between elements)
- **Form Fields**: Large inputs, clear labels, inline validation
- **Buttons**: Prominent, full-width on mobile/tablet
- **Progress**: Visual progress indicator for multi-step forms
- **Error Handling**: Clear, actionable error messages
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

#### Responsive Breakpoints:
- **Mobile**: < 640px (phone)
- **Tablet**: 640px - 1024px (iPad, tablets)
- **Desktop**: > 1024px (desktop, large tablets)

---

## PART 2: DOCTOR MODULE ARCHITECTURE

### 2.1 Doctor as User Model

**Current State:**
- ✅ User model exists with professional fields (specialization, licenseNumber, npiNumber)
- ✅ DOCTOR and SURGEON roles exist
- ❌ No dedicated doctor module
- ❌ No doctor-specific workflows

**Doctor User Profile:**
```typescript
{
  // From User model
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  title: string; // "Dr.", "MD", etc.
  specialization: string; // "Aesthetic Surgery", "Plastic Surgery", etc.
  licenseNumber: string;
  npiNumber: string;
  departmentId: string;
  
  // Doctor-specific (to be added)
  bio?: string;
  qualifications?: string[];
  certifications?: string[];
  languages?: string[];
  consultationFee?: number;
  availableForConsultation?: boolean;
}
```

### 2.2 Doctor Workflow Integration Points

#### A. Patient Module Integration
1. **Doctor-Patient Assignment**
   - Assign patients to doctors
   - Doctor sees assigned patients
   - Filter patients by assigned doctor

2. **Patient Notes**
   - Doctors can create/view/edit patient notes
   - Notes linked to consultations
   - Immutable note history
   - Rich text support (markdown/HTML)

3. **Patient Visits (Consultations)**
   - Doctor creates consultations
   - Doctor manages consultation workflow
   - Consultation notes and documentation

#### B. Surgical Cases Integration
1. **Procedure Planning**
   - Doctor creates procedure plans
   - Doctor approves procedure plans
   - Doctor manages surgical cases

2. **Surgery Management**
   - Doctor schedules surgeries
   - Doctor manages surgical cases
   - Post-op follow-up

#### C. Consent Module Integration
1. **Consent Management**
   - Doctor requests consent from patient
   - Doctor presents consent to patient
   - Doctor tracks consent status
   - Doctor can revoke consent (with reason)

2. **Consent Workflow**
   - Doctor creates consent instance
   - Doctor presents consent (via tablet/portal)
   - Patient signs consent
   - Doctor receives notification when signed

#### D. Image Management
1. **Image Upload/Sharing**
   - Doctor uploads patient images (before/after photos)
   - Doctor shares images with other doctors
   - Doctor receives images from other doctors
   - Image privacy controls (patient consent required)

2. **Image Storage**
   - Secure cloud storage (S3/Azure Blob)
   - Image metadata (patient, date, type, doctor)
   - Image access logging (HIPAA compliance)

#### E. Doctor-to-Doctor Consultation
1. **Consultation Requests**
   - Doctor requests consultation from another doctor
   - Consultation request includes patient context
   - Second doctor can accept/decline

2. **Consultation Sessions**
   - Real-time or async consultation
   - Shared patient context
   - Consultation notes
   - Image sharing during consultation

### 2.3 Doctor Module Structure

```
backend/src/modules/doctor/
├── controllers/
│   ├── doctor.controller.ts          # Doctor CRUD, profile management
│   ├── doctor-patient.controller.ts   # Doctor-patient relationships
│   ├── doctor-notes.controller.ts     # Patient notes management
│   ├── doctor-consultation.controller.ts # Consultation management
│   ├── doctor-consent.controller.ts  # Consent request/management
│   ├── doctor-images.controller.ts   # Image upload/sharing
│   └── doctor-consultation-request.controller.ts # Doctor-to-doctor consultation
├── services/
│   ├── doctor.service.ts              # Core doctor service
│   ├── doctor-patient.service.ts      # Patient assignment
│   ├── doctor-notes.service.ts        # Notes management
│   ├── doctor-consultation.service.ts # Consultation workflow
│   ├── doctor-consent.service.ts      # Consent workflow
│   ├── doctor-images.service.ts       # Image management
│   └── doctor-consultation-request.service.ts # Inter-doctor consultation
├── repositories/
│   ├── doctor.repository.ts
│   ├── doctor-patient.repository.ts
│   └── doctor-notes.repository.ts
├── dto/
│   ├── create-doctor.dto.ts
│   ├── update-doctor.dto.ts
│   ├── assign-patient.dto.ts
│   ├── create-note.dto.ts
│   ├── request-consent.dto.ts
│   ├── upload-image.dto.ts
│   └── request-consultation.dto.ts
└── doctor.module.ts
```

---

## PART 3: IMPLEMENTATION PHASES

### Phase 1: Patient Tablet Registration (Week 1)

#### Backend:
1. ✅ Complete `selfRegister()` method in PatientService
2. ✅ Create PATIENT role in seed
3. ✅ Add PATIENT permissions
4. ✅ Implement user account creation service
5. ✅ Email service integration

#### Frontend:
1. ✅ Create tablet mode toggle component
2. ✅ Create responsive patient registration form
3. ✅ Multi-step form with progress indicator
4. ✅ Form validation and error handling
5. ✅ Auto-return to front desk mode

### Phase 2: Doctor Module Foundation (Week 2)

#### Backend:
1. ✅ Create doctor module structure
2. ✅ Doctor service and repository
3. ✅ Doctor-patient assignment
4. ✅ Doctor profile management
5. ✅ Doctor dashboard data aggregation

#### Frontend:
1. ✅ Doctor dashboard page
2. ✅ Doctor profile page
3. ✅ Assigned patients list
4. ✅ Patient assignment interface

### Phase 3: Doctor Workflows (Week 3-4)

#### Patient Notes:
1. ✅ Notes service and repository
2. ✅ Notes CRUD operations
3. ✅ Notes linked to consultations
4. ✅ Rich text editor integration
5. ✅ Notes history/versioning

#### Consultations:
1. ✅ Doctor consultation workflow
2. ✅ Consultation creation/management
3. ✅ Consultation notes
4. ✅ Consultation status workflow

#### Consent Management:
1. ✅ Consent request workflow
2. ✅ Consent presentation interface
3. ✅ Consent status tracking
4. ✅ Consent notifications

### Phase 4: Advanced Features (Week 5-6)

#### Image Management:
1. ✅ Image upload service
2. ✅ Image storage integration (S3/Azure)
3. ✅ Image sharing between doctors
4. ✅ Image privacy controls
5. ✅ Image gallery UI

#### Doctor-to-Doctor Consultation:
1. ✅ Consultation request system
2. ✅ Real-time consultation interface
3. ✅ Shared patient context
4. ✅ Consultation notes

---

## PART 4: DATABASE SCHEMA ADDITIONS

### 4.1 Doctor-Specific Tables

```prisma
// Doctor Profile Extensions (optional - can use User model)
model DoctorProfile {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @unique @db.Uuid
  
  // Professional
  bio         String?  @db.Text
  qualifications String[] // Array of qualifications
  certifications String[] // Array of certifications
  languages   String[] // Languages spoken
  
  // Practice
  consultationFee Decimal? @db.Decimal(10, 2)
  availableForConsultation Boolean @default(true)
  
  // Relations
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("doctor_profiles")
}

// Doctor-Patient Assignment
model DoctorPatientAssignment {
  id          String   @id @default(uuid()) @db.Uuid
  doctorId    String   @db.Uuid
  patientId   String   @db.Uuid
  
  // Assignment details
  assignedAt  DateTime @default(now()) @db.Timestamptz(6)
  assignedBy  String?  @db.Uuid
  reason      String?  @db.Text
  
  // Status
  isActive    Boolean  @default(true)
  endedAt     DateTime? @db.Timestamptz(6)
  
  // Relations
  doctor      User     @relation(fields: [doctorId], references: [id])
  patient     Patient  @relation(fields: [patientId], references: [id])
  
  @@unique([doctorId, patientId, isActive])
  @@index([doctorId])
  @@index([patientId])
  @@map("doctor_patient_assignments")
}

// Patient Notes (linked to consultations)
model PatientNote {
  id          String   @id @default(uuid()) @db.Uuid
  patientId   String   @db.Uuid
  consultationId String? @db.Uuid
  doctorId    String   @db.Uuid
  
  // Note content
  title       String?  @db.VarChar(200)
  content     String   @db.Text // Rich text (markdown/HTML)
  noteType    String   @db.VarChar(50) // CONSULTATION, FOLLOW_UP, PROCEDURE, GENERAL
  
  // Privacy
  isPrivate   Boolean  @default(false) // Only doctor can see
  
  // Audit
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)
  createdBy   String   @db.Uuid
  version     Int      @default(1)
  
  // Relations
  patient     Patient  @relation(fields: [patientId], references: [id])
  consultation Consultation? @relation(fields: [consultationId], references: [id])
  doctor      User     @relation(fields: [doctorId], references: [id])
  
  @@index([patientId])
  @@index([consultationId])
  @@index([doctorId])
  @@index([createdAt])
  @@map("patient_notes")
}

// Doctor-to-Doctor Consultation Requests
model DoctorConsultationRequest {
  id          String   @id @default(uuid()) @db.Uuid
  requestingDoctorId String @db.Uuid
  requestedDoctorId  String @db.Uuid
  patientId   String   @db.Uuid
  
  // Request details
  subject     String   @db.VarChar(200)
  message     String   @db.Text
  urgency     String   @db.VarChar(50) // LOW, MEDIUM, HIGH, URGENT
  
  // Status
  status      String   @default("PENDING") @db.VarChar(50) // PENDING, ACCEPTED, DECLINED, COMPLETED
  respondedAt DateTime? @db.Timestamptz(6)
  response    String?  @db.Text
  
  // Consultation session
  consultationDate DateTime? @db.Timestamptz(6)
  consultationNotes String?  @db.Text
  
  // Audit
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)
  
  // Relations
  requestingDoctor User @relation("RequestingDoctor", fields: [requestingDoctorId], references: [id])
  requestedDoctor  User @relation("RequestedDoctor", fields: [requestedDoctorId], references: [id])
  patient     Patient  @relation(fields: [patientId], references: [id])
  
  @@index([requestingDoctorId])
  @@index([requestedDoctorId])
  @@index([patientId])
  @@index([status])
  @@map("doctor_consultation_requests")
}

// Patient Images (Before/After Photos, etc.)
model PatientImage {
  id          String   @id @default(uuid()) @db.Uuid
  patientId   String   @db.Uuid
  uploadedBy  String   @db.Uuid
  
  // Image metadata
  fileName    String   @db.VarChar(500)
  filePath    String   @db.VarChar(1000) // S3/Azure path
  fileSize    BigInt   @db.BigInt
  mimeType    String   @db.VarChar(100)
  
  // Image details
  imageType   String   @db.VarChar(50) // BEFORE, AFTER, PROCEDURE, XRAY, SCAN
  description String?  @db.Text
  tags        String[] // For categorization
  
  // Privacy & Consent
  requiresConsent Boolean @default(true)
  consentObtained Boolean @default(false)
  sharedWithDoctors String[] // Array of doctor IDs
  
  // Audit
  uploadedAt  DateTime @default(now()) @db.Timestamptz(6)
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  
  // Relations
  patient     Patient  @relation(fields: [patientId], references: [id])
  uploader    User     @relation(fields: [uploadedBy], references: [id])
  
  @@index([patientId])
  @@index([uploadedBy])
  @@index([imageType])
  @@index([uploadedAt])
  @@map("patient_images")
}
```

---

## PART 5: UI/UX DESIGN SPECIFICATIONS

### 5.1 Tablet Registration Form Design

#### Layout:
- **Single Column**: Full width on tablet
- **Large Inputs**: Minimum 48px height
- **Clear Labels**: Above inputs, not inline
- **Progress Bar**: Top of form, shows current step
- **Navigation**: Previous/Next buttons, large and clear
- **Submit**: Prominent, full-width button

#### Form Steps:
1. **Personal Information**
   - First Name, Last Name, Middle Name
   - Date of Birth (date picker)
   - Gender (radio buttons or dropdown)

2. **Contact Information**
   - Email (required for account)
   - Phone
   - WhatsApp (optional)
   - Address, City, State, Zip, Country

3. **Emergency Contact**
   - Next of Kin Name
   - Relationship
   - Contact Phone
   - Emergency Contact (if different)

4. **Account Creation**
   - Password (with strength indicator)
   - Confirm Password
   - Terms & Conditions checkbox

5. **Review & Submit**
   - Summary of all information
   - Edit buttons for each section
   - Submit button

### 5.2 Doctor Dashboard Design

#### Layout:
- **Header**: Doctor name, specialization, quick actions
- **Stats Cards**: 
  - Total Patients
  - Pending Consultations
  - Upcoming Surgeries
  - Pending Consent Requests
- **Quick Actions**:
  - New Consultation
  - Request Consent
  - Upload Image
  - Request Doctor Consultation
- **Recent Activity**: Latest consultations, notes, consents

#### Patient List:
- **Filters**: By status, by consultation date, by surgery
- **Search**: By name, MRN, email, phone
- **Columns**: Name, MRN, Last Visit, Next Appointment, Status
- **Actions**: View, Add Note, Request Consent, Upload Image

---

## PART 6: API ENDPOINTS DESIGN

### 6.1 Patient Self-Registration

```
POST /api/v1/public/patients/register
Body: SelfRegisterPatientDto
Response: {
  patient: Patient,
  account: {
    email: string,
    message: string
  }
}
```

### 6.2 Doctor Module Endpoints

```
# Doctor Profile
GET    /api/v1/doctors/profile
PATCH  /api/v1/doctors/profile

# Doctor Patients
GET    /api/v1/doctors/patients
GET    /api/v1/doctors/patients/:id
POST   /api/v1/doctors/patients/:id/assign
DELETE /api/v1/doctors/patients/:id/unassign

# Patient Notes
GET    /api/v1/doctors/patients/:id/notes
POST   /api/v1/doctors/patients/:id/notes
PATCH  /api/v1/doctors/notes/:id
DELETE /api/v1/doctors/notes/:id

# Consultations
GET    /api/v1/doctors/consultations
POST   /api/v1/doctors/consultations
GET    /api/v1/doctors/consultations/:id
PATCH  /api/v1/doctors/consultations/:id

# Consent Management
GET    /api/v1/doctors/patients/:id/consents
POST   /api/v1/doctors/patients/:id/consents/request
GET    /api/v1/doctors/consents/:id
PATCH  /api/v1/doctors/consents/:id/revoke

# Image Management
GET    /api/v1/doctors/patients/:id/images
POST   /api/v1/doctors/patients/:id/images
GET    /api/v1/doctors/images/:id
DELETE /api/v1/doctors/images/:id
POST   /api/v1/doctors/images/:id/share

# Doctor-to-Doctor Consultation
GET    /api/v1/doctors/consultation-requests
POST   /api/v1/doctors/consultation-requests
PATCH  /api/v1/doctors/consultation-requests/:id/respond
GET    /api/v1/doctors/consultation-requests/:id
```

---

## PART 7: RESPONSIVE DESIGN IMPLEMENTATION

### 7.1 Tailwind CSS Breakpoints

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',   // Tablet portrait
      'md': '768px',   // Tablet landscape
      'lg': '1024px',  // Desktop
      'xl': '1280px',  // Large desktop
    },
  },
}
```

### 7.2 Component Patterns

#### Responsive Form Component:
```tsx
<div className="
  w-full
  max-w-2xl mx-auto
  px-4 sm:px-6 lg:px-8
  py-6 sm:py-8
">
  {/* Form content */}
</div>
```

#### Touch-Optimized Input:
```tsx
<input
  className="
    w-full
    h-12 sm:h-14  // Larger on mobile/tablet
    px-4 sm:px-6
    text-base sm:text-lg  // Larger text
    border-2
    rounded-lg
    focus:ring-4 focus:ring-primary/20
  "
/>
```

---

## PART 8: IMPLEMENTATION PRIORITY

### Immediate (This Week):
1. ✅ Patient self-registration backend
2. ✅ Tablet-responsive registration form
3. ✅ Mode toggle (patient/frontdesk)
4. ✅ PATIENT role creation

### Next (Week 2):
1. ✅ Doctor module structure
2. ✅ Doctor dashboard
3. ✅ Doctor-patient assignment
4. ✅ Patient notes functionality

### Following (Week 3-4):
1. ✅ Consent request workflow
2. ✅ Image upload/sharing
3. ✅ Doctor-to-doctor consultation
4. ✅ Advanced doctor workflows

---

## Conclusion

This plan provides a comprehensive roadmap for:
- ✅ Privacy-first patient intake via tablet
- ✅ Complete doctor module with all workflows
- ✅ Responsive, accessible UI design
- ✅ Enterprise-grade architecture

Ready to begin implementation!






