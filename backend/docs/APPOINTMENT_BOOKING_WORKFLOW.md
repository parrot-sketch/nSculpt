# Appointment Booking Workflow - Payment-First System

## Overview

This document describes the **payment-first appointment booking system** that solves the critical issue of patients cancelling appointments after time slots have been blocked, wasting doctor's time.

## Problem Statement

**Previous Issue:**
- Patient calls to book consultation
- Front desk schedules appointment immediately
- Patient can cancel without penalty
- Doctor's time is blocked but patient doesn't show
- No payment confirmation before booking

**Solution:**
- Patient requests appointment → **PENDING_PAYMENT** status
- Patient pays consultation fee → Payment confirmation required
- Payment confirmed → Appointment status changes to **CONFIRMED**
- Doctor's time slot is blocked only after payment confirmation
- Cancellation policies differ based on payment status

---

## Workflow States

### Appointment Status Enum

```typescript
enum AppointmentStatus {
  PENDING_PAYMENT          // Patient requested, waiting for payment
  PAYMENT_PENDING          // Payment initiated but not confirmed
  CONFIRMED                // Payment confirmed, appointment booked
  CHECKED_IN               // Patient arrived, appointment started
  COMPLETED                // Appointment completed (becomes Consultation)
  CANCELLED                // Cancelled before payment
  CANCELLED_AFTER_PAYMENT  // Cancelled after payment (refund policy applies)
  NO_SHOW                  // Patient didn't show up
  RESCHEDULED              // Appointment rescheduled to new time
}
```

---

## Workflow Steps

### 1. Appointment Request (PENDING_PAYMENT)

**Actor:** Front Desk Staff or Patient (self-registration)

**Process:**
1. Patient requests appointment with specific doctor and time slot
2. System creates appointment in `PENDING_PAYMENT` status
3. System calculates consultation fee based on appointment type
4. Appointment does NOT block doctor's time slot yet
5. Patient receives payment instructions

**API:** `POST /appointments`

**Request:**
```json
{
  "patientId": "uuid",
  "doctorId": "uuid",
  "scheduledDate": "2026-01-15",
  "scheduledStartTime": "2026-01-15T10:00:00Z",
  "scheduledEndTime": "2026-01-15T10:30:00Z",
  "appointmentType": "CONSULTATION",
  "reason": "Butt lift consultation",
  "estimatedDurationMinutes": 30
}
```

**Response:**
```json
{
  "id": "uuid",
  "appointmentNumber": "APT-2026-00001",
  "status": "PENDING_PAYMENT",
  "consultationFee": 5000.00,
  "patient": { ... },
  "doctor": { ... }
}
```

**Domain Event:** `Appointment.Requested`

---

### 2. Payment Processing

**Actor:** Patient (via payment gateway) or Front Desk Staff

**Process:**
1. Patient makes payment for consultation fee
2. Payment is recorded in system (status: `PENDING` or `COMPLETED`)
3. Payment amount must match or exceed consultation fee

**Note:** Payment processing is handled by the billing module. This workflow assumes payment is already recorded.

---

### 3. Payment Confirmation (CONFIRMED)

**Actor:** Front Desk Staff or Billing Staff

**Process:**
1. Staff confirms payment has been received
2. System validates:
   - Payment exists and is `COMPLETED`
   - Payment amount >= consultation fee
   - Appointment is in `PENDING_PAYMENT` or `PAYMENT_PENDING` status
3. System checks for time slot conflicts (doctor's availability)
4. If no conflict, appointment status changes to `CONFIRMED`
5. Doctor's time slot is now BLOCKED
6. Patient receives confirmation notification

**API:** `POST /appointments/:id/confirm-payment`

**Request:**
```json
{
  "appointmentId": "uuid",
  "paymentId": "uuid",
  "notes": "Payment confirmed via M-Pesa"
}
```

**Response:**
```json
{
  "id": "uuid",
  "appointmentNumber": "APT-2026-00001",
  "status": "CONFIRMED",
  "paymentId": "uuid",
  "paymentConfirmedAt": "2026-01-10T14:30:00Z",
  "payment": { ... }
}
```

**Domain Event:** `Appointment.Confirmed`

**Critical Validation:**
- Time slot conflict check: Prevents double-booking
- Payment amount validation: Ensures full payment received
- Status validation: Only `PENDING_PAYMENT` or `PAYMENT_PENDING` can be confirmed

---

### 4. Patient Check-In (CHECKED_IN)

**Actor:** Front Desk Staff

**Process:**
1. Patient arrives at clinic
2. Front desk staff checks in patient
3. Appointment status changes to `CHECKED_IN`
4. Consultation can now begin

**API:** `POST /appointments/:id/check-in`

**Domain Event:** `Appointment.CheckedIn`

---

### 5. Consultation Creation (COMPLETED)

**Actor:** Doctor or System (automatic)

**Process:**
1. Appointment is completed
2. System creates `Consultation` record from appointment
3. Appointment status changes to `COMPLETED`
4. Consultation is linked to appointment via `appointmentId`

**API:** `POST /appointments/:id/complete` (internal)

**Note:** Consultation creation is typically handled by the consultation module when the doctor starts the clinical encounter.

**Domain Event:** `Appointment.Completed`

---

## Cancellation Workflow

### Cancellation Before Payment (CANCELLED)

**Process:**
1. Patient or staff cancels appointment
2. Appointment status changes to `CANCELLED`
3. No refund needed (no payment was made)
4. Time slot remains available

**API:** `POST /appointments/:id/cancel`

**Request:**
```json
{
  "cancellationReason": "PATIENT_REQUEST",
  "cancellationNotes": "Patient changed mind"
}
```

---

### Cancellation After Payment (CANCELLED_AFTER_PAYMENT)

**Process:**
1. Patient or staff cancels appointment
2. Appointment status changes to `CANCELLED_AFTER_PAYMENT`
3. Refund policy applies:
   - **24+ hours before appointment:** Full refund
   - **Less than 24 hours:** Partial refund or no refund (configurable)
4. Refund payment record is created
5. Doctor's time slot is freed

**Request:**
```json
{
  "cancellationReason": "PATIENT_REQUEST",
  "cancellationNotes": "Emergency came up",
  "refundRequested": true
}
```

**Domain Event:** `Appointment.Cancelled`

---

## Database Schema

### Appointment Model

```prisma
model Appointment {
  id                    String   @id @default(uuid())
  appointmentNumber     String   @unique
  patientId             String   @db.Uuid
  doctorId              String   @db.Uuid
  scheduledDate         DateTime @db.Date
  scheduledStartTime    DateTime @db.Timestamptz(6)
  scheduledEndTime      DateTime @db.Timestamptz(6)
  appointmentType       String   @db.VarChar(50)
  status                AppointmentStatus @default(PENDING_PAYMENT)
  
  // Payment confirmation
  consultationFee       Decimal  @db.Decimal(10, 2)
  paymentId             String?  @unique @db.Uuid
  paymentConfirmedAt    DateTime? @db.Timestamptz(6)
  
  // Consultation link
  consultationId        String?  @unique @db.Uuid
  
  // Cancellation
  cancelledAt           DateTime? @db.Timestamptz(6)
  cancellationReason    CancellationReason?
  refundIssued          Boolean  @default(false)
  refundPaymentId       String?  @unique @db.Uuid
  
  // Relations
  patient               Patient  @relation(...)
  doctor                User     @relation(...)
  payment               Payment? @relation(...)
  consultation          Consultation? @relation(...)
}
```

### Consultation Model (Updated)

```prisma
model Consultation {
  id              String   @id @default(uuid())
  appointmentId   String   @unique @db.Uuid // REQUIRED: Consultation from appointment
  patientId       String   @db.Uuid
  doctorId        String   @db.Uuid
  // ... other fields
  
  appointment     Appointment @relation(...)
}
```

**Critical Change:** `appointmentId` is now **REQUIRED** and **UNIQUE** in Consultation. Every consultation must be created from a confirmed appointment.

---

## Integration Points

### 1. Payment Module

- Payment records are created by billing module
- Appointment service validates payment before confirmation
- Refund payments are created when appointments are cancelled after payment

### 2. Consultation Module

- Consultation is created from completed appointment
- Consultation inherits patient, doctor, and appointment details
- Consultation cannot exist without an appointment

### 3. Notification System (Future)

- Send payment reminder when appointment is in `PENDING_PAYMENT`
- Send confirmation when payment is confirmed
- Send reminder 24 hours before appointment
- Send cancellation confirmation

---

## Business Rules

### 1. Time Slot Blocking

- **PENDING_PAYMENT:** Time slot is NOT blocked (available for other appointments)
- **CONFIRMED:** Time slot IS blocked (prevents double-booking)
- **CANCELLED:** Time slot is freed (available again)

### 2. Payment Requirements

- Consultation fee must be paid before appointment confirmation
- Payment amount must match or exceed consultation fee
- Partial payments are not accepted for appointments

### 3. Cancellation Policies

- **Before Payment:** No penalty, immediate cancellation
- **After Payment (24+ hours before):** Full refund
- **After Payment (< 24 hours):** Partial or no refund (configurable)
- **No Show:** No refund, appointment marked as `NO_SHOW`

### 4. Consultation Fee

Default fees (configurable via FeeSchedule):
- **CONSULTATION:** KES 5,000
- **FOLLOW_UP:** KES 3,000
- **PRE_OP:** KES 2,000
- **POST_OP:** KES 2,000
- **EMERGENCY:** KES 10,000

---

## API Endpoints

### Appointment Management

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/appointments` | Create appointment request | FRONT_DESK, ADMIN, DOCTOR |
| GET | `/appointments/:id` | Get appointment details | FRONT_DESK, DOCTOR, ADMIN, PATIENT |
| POST | `/appointments/:id/confirm-payment` | Confirm payment | FRONT_DESK, BILLING, ADMIN |
| POST | `/appointments/:id/cancel` | Cancel appointment | FRONT_DESK, ADMIN, PATIENT |
| POST | `/appointments/:id/check-in` | Check in patient | FRONT_DESK, ADMIN |
| GET | `/appointments/doctor/:doctorId` | Get doctor's appointments | DOCTOR, FRONT_DESK, ADMIN |
| GET | `/appointments/patient/:patientId` | Get patient's appointments | PATIENT, FRONT_DESK, DOCTOR, ADMIN |
| GET | `/appointments/available-slots/:doctorId` | Get available time slots | FRONT_DESK, ADMIN, PATIENT |

---

## Example Workflow: Butt Lift Consultation

### Step 1: Patient Calls Clinic
- Patient: "I want to book a consultation for a butt lift"
- Front Desk: "I'll set that up. The consultation fee is KES 5,000. Once you pay, we'll confirm your appointment."

### Step 2: Appointment Request Created
```json
POST /appointments
{
  "patientId": "patient-uuid",
  "doctorId": "doctor-uuid",
  "scheduledDate": "2026-01-20",
  "scheduledStartTime": "2026-01-20T10:00:00Z",
  "scheduledEndTime": "2026-01-20T10:30:00Z",
  "appointmentType": "CONSULTATION",
  "reason": "Butt lift consultation"
}
```

**Result:** Appointment created with status `PENDING_PAYMENT`

### Step 3: Patient Makes Payment
- Patient pays KES 5,000 via M-Pesa
- Payment record created: `Payment { id: "payment-uuid", amount: 5000, status: "COMPLETED" }`

### Step 4: Payment Confirmation
```json
POST /appointments/apt-uuid/confirm-payment
{
  "appointmentId": "apt-uuid",
  "paymentId": "payment-uuid"
}
```

**Result:** 
- Appointment status → `CONFIRMED`
- Doctor's time slot (10:00-10:30 on Jan 20) is now BLOCKED
- Patient receives confirmation SMS/email

### Step 5: Appointment Day - Patient Arrives
```json
POST /appointments/apt-uuid/check-in
```

**Result:** Appointment status → `CHECKED_IN`

### Step 6: Consultation Begins
- Doctor starts consultation
- System creates `Consultation` record from appointment
- Appointment status → `COMPLETED`

---

## Benefits

1. **No Wasted Time Slots:** Doctor's time is only blocked after payment confirmation
2. **Reduced No-Shows:** Payment commitment increases patient accountability
3. **Clear Cancellation Policy:** Different rules for paid vs. unpaid appointments
4. **Financial Security:** Payment received before service delivery
5. **Audit Trail:** Complete history of appointment lifecycle with payment tracking

---

## Future Enhancements

1. **Automated Payment Confirmation:** Integrate with payment gateway webhooks
2. **Refund Automation:** Automatic refund processing based on cancellation policy
3. **Reminder System:** SMS/email reminders for pending payments and upcoming appointments
4. **Waitlist:** Queue patients when time slots are full
5. **Rescheduling:** Allow patients to reschedule with payment transfer
6. **Partial Payments:** Support deposit + balance payment model
7. **Insurance Integration:** Handle insurance-covered consultations differently

---

## Migration Notes

### Existing Consultations

For existing consultations created before this system:
- They will not have an `appointmentId`
- Consider creating retrospective appointments or marking as legacy
- New consultations MUST have an appointment

### Data Migration

```sql
-- Example: Create appointments for existing consultations
INSERT INTO appointments (
  id, appointment_number, patient_id, doctor_id, 
  scheduled_date, scheduled_start_time, scheduled_end_time,
  appointment_type, status, consultation_fee, consultation_id,
  created_at, updated_at, version
)
SELECT 
  gen_random_uuid(),
  'APT-LEGACY-' || consultation_number,
  patient_id,
  doctor_id,
  consultation_date::date,
  consultation_date,
  consultation_date + interval '30 minutes',
  consultation_type,
  'COMPLETED',
  0,
  id,
  created_at,
  updated_at,
  1
FROM consultations
WHERE appointment_id IS NULL;
```

---

## Conclusion

The payment-first appointment booking system ensures that:
- Doctor's time is only blocked after payment confirmation
- Patients are committed to their appointments
- Cancellation policies are clear and enforceable
- Financial transactions are properly tracked
- The system maintains a complete audit trail

This solves the critical business problem of wasted time slots and improves operational efficiency for the aesthetic surgery center.






