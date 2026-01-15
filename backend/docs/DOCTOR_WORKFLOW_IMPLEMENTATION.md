# Doctor Workflow Implementation Plan

## Overview

Based on the consultation-to-surgery workflow and aesthetic surgery center requirements, this document outlines the implementation plan for the doctor module.

---

## Core Workflow: Consultation → Surgery

### Workflow States

```
1. CONSULTATION (Enquiry)
   ↓
2. PROCEDURE PLAN + QUOTATION
   ↓
3. DEPOSIT PAYMENT (Required)
   ↓
4. THEATER BOOKING (PENDING until payment confirmed)
   ↓
5. PAYMENT CONFIRMED → Slot Allocated
   ↓
6. SURGERY SCHEDULED
```

### Key Business Rules

1. **Consultation ≠ Surgery Commitment**
   - Consultations are enquiries
   - Not all consultations lead to surgery
   - Patient can decline after consultation

2. **Deposit Required for Booking**
   - Theater booking requires deposit payment
   - Booking starts as PENDING
   - Cannot allocate slot without payment confirmation

3. **No-Show Prevention**
   - Deposit acts as commitment
   - Payment verification before slot allocation
   - Clear cancellation policy

---

## What Doctors Manage (Aesthetic Surgery Center)

### 1. Patient Consultations
- **Initial Consultations**: First-time patient enquiries
- **Follow-up Consultations**: Post-treatment check-ins
- **Pre-operative Assessments**: Before surgery evaluations
- **Virtual Consultations**: Remote consultations
- **Consultation Notes**: Clinical documentation

### 2. Procedure Planning
- **Treatment Plans**: Create comprehensive treatment plans
- **Quotations**: Generate pricing for procedures
- **Procedure Details**: Document procedure specifics
- **Timeline Planning**: Schedule procedure dates
- **Resource Planning**: Plan required resources

### 3. Surgical Case Management
- **Theater Booking**: Book operating theater slots
- **Case Scheduling**: Schedule surgical cases
- **Status Tracking**: Monitor case progress
- **Resource Allocation**: Assign staff and equipment
- **Case Documentation**: Document surgical procedures

### 4. Patient Notes & Documentation
- **Clinical Notes**: Document patient interactions
- **Consultation Summaries**: Summarize consultations
- **Procedure Documentation**: Document procedures performed
- **Post-op Notes**: Document post-operative care
- **Progress Tracking**: Track patient progress

### 5. Consent Management
- **Present Consents**: Present consent forms to patients
- **Track Signatures**: Monitor consent status
- **Manage Revisions**: Handle consent updates
- **Document Acknowledgements**: Record patient consent

### 6. Image Management
- **Before/After Photos**: Document aesthetic results
- **Treatment Planning**: Use images for planning
- **Progress Documentation**: Track treatment progress
- **Patient Sharing**: Share images with patients
- **Colleague Consultation**: Share with other doctors

### 7. Inter-Doctor Consultation
- **Second Opinions**: Request colleague input
- **Case Sharing**: Share cases for review
- **Collaborative Planning**: Plan treatments together
- **Peer Review**: Review colleague cases

### 8. Payment & Billing
- **Quotation Generation**: Create procedure quotations
- **Payment Tracking**: Monitor deposit payments
- **Payment Verification**: Verify payments before booking
- **Billing Coordination**: Coordinate with billing department

---

## Backend Endpoints Needed

### Dashboard
- ✅ `GET /api/v1/doctors/dashboard/stats` - Dashboard statistics
- ⏳ `GET /api/v1/doctors/dashboard/pending-payments` - Pending deposit payments
- ⏳ `GET /api/v1/doctors/dashboard/todays-schedule` - Today's schedule

### Consultations
- ✅ `GET /api/v1/doctors/consultations` - List consultations
- ⏳ `POST /api/v1/doctors/consultations` - Create consultation
- ⏳ `POST /api/v1/doctors/consultations/:id/complete` - Complete consultation
- ⏳ `POST /api/v1/doctors/consultations/:id/create-plan` - Create procedure plan from consultation

### Procedure Plans
- ⏳ `GET /api/v1/doctors/procedure-plans` - List procedure plans
- ⏳ `POST /api/v1/doctors/procedure-plans` - Create procedure plan
- ⏳ `GET /api/v1/doctors/procedure-plans/:id` - Get plan details
- ⏳ `GET /api/v1/doctors/procedure-plans/:id/payment-status` - Check payment status
- ⏳ `POST /api/v1/doctors/procedure-plans/:id/generate-quotation` - Generate quotation

### Theater Bookings
- ⏳ `GET /api/v1/doctors/theater-bookings` - List bookings
- ⏳ `POST /api/v1/doctors/theater-bookings` - Create booking (PENDING)
- ⏳ `POST /api/v1/doctors/theater-bookings/:id/confirm` - Confirm booking (after payment)
- ⏳ `GET /api/v1/doctors/theater-bookings/pending` - Pending bookings

### Patient Notes
- ⏳ `GET /api/v1/doctors/patients/:id/notes` - Get patient notes
- ⏳ `POST /api/v1/doctors/patients/:id/notes` - Create note
- ⏳ `PUT /api/v1/doctors/notes/:id` - Update note

### Consents
- ⏳ `GET /api/v1/doctors/consents` - List consents
- ⏳ `POST /api/v1/doctors/consents/:id/present` - Present consent to patient

### Images
- ⏳ `GET /api/v1/doctors/patients/:id/images` - Get patient images
- ⏳ `POST /api/v1/doctors/patients/:id/images` - Upload image
- ⏳ `POST /api/v1/doctors/images/:id/share` - Share image

### Inter-Doctor Consultation
- ⏳ `POST /api/v1/doctors/consultations/request` - Request consultation
- ⏳ `GET /api/v1/doctors/consultations/requests` - List consultation requests

---

## Frontend Pages Needed

### Dashboard
- ✅ `/doctor` - Main dashboard (created)
- ⏳ `/doctor/patients` - Patient list
- ⏳ `/doctor/consultations` - Consultations list
- ⏳ `/doctor/procedure-plans` - Procedure plans
- ⏳ `/doctor/theater-bookings` - Theater bookings
- ⏳ `/doctor/surgeries` - Surgical cases
- ⏳ `/doctor/consents` - Consents management
- ⏳ `/doctor/images` - Image gallery

### Detail Pages
- ⏳ `/doctor/consultations/:id` - Consultation details
- ⏳ `/doctor/procedure-plans/:id` - Plan details
- ⏳ `/doctor/theater-bookings/:id` - Booking details
- ⏳ `/doctor/patients/:id/notes` - Patient notes

---

## Payment Verification Logic

### Theater Booking Flow

```typescript
async bookTheater(planId: string, bookingData: TheaterBookingDto) {
  // 1. Get procedure plan
  const plan = await getProcedurePlan(planId);
  
  // 2. Check payment status
  const paymentStatus = await checkPaymentStatus(planId);
  
  // 3. If payment not confirmed, create PENDING booking
  if (paymentStatus !== 'CONFIRMED') {
    return await createPendingBooking(planId, bookingData);
  }
  
  // 4. If payment confirmed, create CONFIRMED booking
  return await createConfirmedBooking(planId, bookingData);
}
```

### Payment Status Check

```typescript
async checkPaymentStatus(planId: string): Promise<'PENDING' | 'PARTIAL' | 'PAID' | 'CONFIRMED'> {
  // Check if deposit payment exists and is confirmed
  const payments = await getPaymentsForPlan(planId);
  const depositAmount = await getDepositAmount(planId);
  
  const totalPaid = payments
    .filter(p => p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + p.amount, 0);
  
  if (totalPaid >= depositAmount) {
    return 'CONFIRMED';
  } else if (totalPaid > 0) {
    return 'PARTIAL';
  }
  
  return 'PENDING';
}
```

---

## Next Implementation Steps

1. ✅ Create doctor dashboard UI (in progress)
2. ⏳ Enhance backend endpoints for workflow
3. ⏳ Implement payment verification logic
4. ⏳ Create procedure plan management UI
5. ⏳ Build theater booking workflow UI
6. ⏳ Implement patient notes interface
7. ⏳ Create consent management UI
8. ⏳ Build image sharing functionality

---

## UI Design Principles

1. **Workflow Visibility**: Clear progression indicators
2. **Payment Awareness**: Payment status always visible
3. **Action Context**: Actions available based on workflow state
4. **No-Show Prevention**: Clear messaging about requirements
5. **Quick Access**: Common actions easily accessible
6. **Status Indicators**: Color-coded status badges
7. **Responsive Design**: Tablet-friendly for clinic use






