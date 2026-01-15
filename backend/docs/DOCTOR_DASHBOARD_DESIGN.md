# Doctor Dashboard Design - Aesthetic Surgery Center

## Overview

The doctor dashboard is the central hub for aesthetic surgeons to manage their patients, consultations, procedures, and surgical cases. It's designed around the **consultation-to-surgery workflow** with payment verification to prevent no-shows.

---

## Core Workflows

### 1. Consultation Workflow (Enquiry → Surgery)

```
Patient Books Consultation
    ↓
Doctor Conducts Consultation (Enquiry)
    ↓
Doctor Creates Procedure Plan + Quotation
    ↓
Patient Reviews & Pays Deposit
    ↓
Payment Confirmed → Doctor Can Book Theater
    ↓
Theater Booking: PENDING (until payment confirmed)
    ↓
Payment Confirmed → Slot Allocated
    ↓
Surgery Scheduled
```

**Key Points:**
- Consultation ≠ Surgery commitment
- Deposit payment required before theater booking
- Theater booking starts as PENDING
- Only confirmed payments allow slot allocation

### 2. No-Show Prevention

**Mechanisms:**
1. **Deposit Requirement**: No theater booking without deposit
2. **Payment Verification**: System checks payment status before confirming
3. **Pending State**: Bookings remain PENDING until payment confirmed
4. **Reminder System**: Automated reminders for pending payments
5. **Cancellation Policy**: Clear cancellation terms tied to deposit

---

## What Doctors Manage in Aesthetic Surgery Centers

Based on industry research and clinical workflows:

### 1. **Patient Consultations**
- Initial consultations (enquiries)
- Follow-up consultations
- Pre-operative assessments
- Post-operative check-ups
- Virtual consultations

### 2. **Procedure Planning**
- Create treatment plans
- Generate quotations
- Estimate procedure duration
- Plan surgical approach
- Document patient goals

### 3. **Surgical Case Management**
- Book theater slots
- Schedule surgeries
- Manage surgical cases
- Track case status
- Monitor resource allocation

### 4. **Patient Notes & Documentation**
- Clinical notes
- Consultation summaries
- Procedure documentation
- Post-op notes
- Progress tracking

### 5. **Consent Management**
- Present consent forms
- Track consent status
- Manage consent revisions
- Document patient acknowledgements

### 6. **Image Management**
- Before/after photos
- Treatment planning images
- Progress documentation
- Share images with patients
- Consult with other doctors

### 7. **Inter-Doctor Consultation**
- Request second opinions
- Share cases with colleagues
- Collaborative treatment planning
- Peer review

### 8. **Post-Operative Care**
- Follow-up scheduling
- Recovery monitoring
- Complication management
- Aftercare instructions

---

## Dashboard Sections

### 1. **Overview/Dashboard**
- **Stats Cards:**
  - Total Patients
  - Pending Consultations
  - Upcoming Surgeries
  - Pending Consents
  - Pending Payments (deposits)
  - Today's Schedule

- **Quick Actions:**
  - New Consultation
  - Book Theater
  - View Pending Payments
  - Create Procedure Plan

- **Recent Activity:**
  - Latest consultations
  - Recent patient updates
  - Payment confirmations
  - Theater bookings

### 2. **My Patients**
- **Patient List:**
  - Assigned patients
  - Search & filter
  - Status indicators
  - Last consultation date
  - Next appointment

- **Patient Cards:**
  - Patient info
  - Consultation history
  - Procedure plans
  - Payment status
  - Upcoming surgeries

### 3. **Consultations**
- **Consultation List:**
  - Scheduled consultations
  - Completed consultations
  - Pending follow-ups
  - No-shows

- **Consultation Details:**
  - Patient info
  - Consultation notes
  - Procedure recommendations
  - Quotation status
  - Next steps

- **Workflow Actions:**
  - Complete consultation
  - Create procedure plan
  - Generate quotation
  - Schedule follow-up

### 4. **Procedure Plans**
- **Plans List:**
  - Active plans
  - Pending approval
  - Approved plans
  - Quotations sent

- **Plan Details:**
  - Procedures
  - Pricing
  - Payment status
  - Theater booking status
  - Timeline

- **Actions:**
  - Edit plan
  - Send quotation
  - Check payment status
  - Book theater (if paid)

### 5. **Theater Bookings**
- **Bookings List:**
  - Pending bookings (awaiting payment)
  - Confirmed bookings
  - Upcoming surgeries
  - Past surgeries

- **Booking Status:**
  - PENDING: Awaiting deposit payment
  - CONFIRMED: Payment received, slot allocated
  - SCHEDULED: Surgery scheduled
  - COMPLETED: Surgery completed

- **Actions:**
  - Create booking (sets to PENDING)
  - Check payment status
  - Confirm booking (after payment)
  - View theater schedule

### 6. **Surgical Cases**
- **Cases List:**
  - Upcoming cases
  - In progress
  - Completed
  - Cancelled

- **Case Details:**
  - Patient info
  - Procedure details
  - Theater assignment
  - Resource allocation
  - Timeline

### 7. **Patient Notes**
- **Notes List:**
  - All patient notes
  - Filter by patient
  - Filter by date
  - Search notes

- **Note Editor:**
  - Rich text editor
  - Attach images
  - Link to consultations
  - Link to procedures

### 8. **Consents**
- **Consents List:**
  - Pending consents
  - Signed consents
  - Revoked consents
  - Expired consents

- **Consent Actions:**
  - Present consent
  - Track signatures
  - Manage revisions
  - View consent history

### 9. **Images**
- **Image Gallery:**
  - Before/after photos
  - Treatment planning
  - Progress documentation
  - Patient photos

- **Image Actions:**
  - Upload images
  - Share with patient
  - Share with colleagues
  - Annotate images

### 10. **Inter-Doctor Consultation**
- **Consultation Requests:**
  - Sent requests
  - Received requests
  - Active consultations
  - Consultation history

- **Collaboration:**
  - Share cases
  - Request opinions
  - Discuss treatment plans
  - Review images

---

## UI/UX Design Principles

### 1. **Workflow-Driven Design**
- Clear progression: Consultation → Plan → Payment → Booking → Surgery
- Visual indicators for workflow stages
- Action buttons contextually available

### 2. **Payment-Aware Interface**
- Payment status prominently displayed
- Pending payments highlighted
- Actions disabled until payment confirmed
- Clear messaging about payment requirements

### 3. **No-Show Prevention**
- Deposit requirement clearly stated
- Payment verification before booking
- Reminder notifications
- Cancellation policy visible

### 4. **Quick Access**
- Most common actions easily accessible
- Keyboard shortcuts for power users
- Recent items quick access
- Search functionality

### 5. **Status Visibility**
- Color-coded status indicators
- Progress bars for multi-step processes
- Badge notifications for pending items
- Real-time updates

### 6. **Mobile Responsive**
- Tablet-friendly for clinic use
- Touch-optimized interactions
- Responsive layouts
- Offline capability where possible

---

## Key Features

### Payment Integration
- **Payment Status Tracking:**
  - PENDING: Deposit not paid
  - PARTIAL: Partial payment received
  - PAID: Full deposit paid
  - CONFIRMED: Payment verified, booking can proceed

### Theater Booking Flow
1. Doctor creates procedure plan
2. Quotation generated
3. Patient pays deposit
4. Doctor attempts to book theater
5. System checks payment status
6. If paid: Booking confirmed, slot allocated
7. If not paid: Booking set to PENDING, notification sent

### Workflow States
- **Consultation:**
  - SCHEDULED → CHECKED_IN → IN_PROGRESS → COMPLETED
  - Can be CANCELLED or NO_SHOW

- **Procedure Plan:**
  - DRAFT → PENDING_APPROVAL → APPROVED → QUOTATION_SENT
  - After payment: READY_FOR_BOOKING

- **Theater Booking:**
  - PENDING (awaiting payment) → CONFIRMED (payment received) → SCHEDULED → COMPLETED

---

## Technical Implementation

### Backend Endpoints Needed

1. **Dashboard Stats:**
   - `GET /api/v1/doctors/dashboard/stats` ✅ (exists)
   - `GET /api/v1/doctors/dashboard/pending-payments`
   - `GET /api/v1/doctors/dashboard/todays-schedule`

2. **Consultations:**
   - `GET /api/v1/doctors/consultations` ✅ (exists)
   - `POST /api/v1/doctors/consultations/:id/complete`
   - `POST /api/v1/doctors/consultations/:id/create-plan`

3. **Procedure Plans:**
   - `GET /api/v1/doctors/procedure-plans`
   - `POST /api/v1/doctors/procedure-plans`
   - `GET /api/v1/doctors/procedure-plans/:id/payment-status`
   - `POST /api/v1/doctors/procedure-plans/:id/book-theater`

4. **Theater Bookings:**
   - `GET /api/v1/doctors/theater-bookings`
   - `POST /api/v1/doctors/theater-bookings` (creates PENDING)
   - `POST /api/v1/doctors/theater-bookings/:id/confirm` (after payment)

5. **Patient Notes:**
   - `GET /api/v1/doctors/patients/:id/notes`
   - `POST /api/v1/doctors/patients/:id/notes`

6. **Consents:**
   - `GET /api/v1/doctors/consents`
   - `POST /api/v1/doctors/consents/:id/present`

---

## Next Steps

1. ✅ Design document created
2. ⏳ Implement backend endpoints for workflow
3. ⏳ Create frontend dashboard UI
4. ⏳ Implement payment verification logic
5. ⏳ Add theater booking workflow
6. ⏳ Create patient notes interface
7. ⏳ Build consent management UI
8. ⏳ Implement image sharing






