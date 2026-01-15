# Consultation Booking Workflow

## Overview

The consultation booking workflow supports both patient self-booking and front desk booking on behalf of patients. It integrates appointments (scheduling layer) with consultations (clinical layer) while respecting RBAC and permissions.

---

## Workflow Architecture

### Two-Layer System

1. **Appointment Layer** (Scheduling)
   - Handles time slot booking
   - Manages payment confirmation
   - Tracks appointment status

2. **Consultation Layer** (Clinical)
   - Created from appointment when checked in
   - Handles clinical workflow
   - Manages consultation status

### Workflow States

```
Patient/Front Desk Books Consultation
    ↓
Appointment Created (PENDING_PAYMENT)
    ↓
Patient Pays Consultation Fee
    ↓
Payment Confirmed → Appointment Status: CONFIRMED
    ↓
Patient Arrives → Appointment Check-In
    ↓
Consultation Created from Appointment
    ↓
Consultation Workflow Begins (SCHEDULED → CHECKED_IN → IN_TRIAGE → ...)
```

---

## Endpoints

### Front Desk Booking

**POST** `/api/v1/consultations/book`

- **Roles**: `ADMIN`, `FRONT_DESK`
- **Permissions**: `consultations:*:write`
- **Description**: Front desk staff can book consultations on behalf of patients
- **Request Body**:
  ```json
  {
    "patientId": "uuid",
    "doctorId": "uuid",
    "scheduledDate": "2026-01-15",
    "scheduledStartTime": "2026-01-15T10:00:00Z",
    "scheduledEndTime": "2026-01-15T10:30:00Z",
    "estimatedDurationMinutes": 30,
    "visitType": "INITIAL",
    "reasonForVisit": "Aesthetic consultation",
    "chiefComplaint": "Rhinoplasty consultation",
    "notes": "Optional notes"
  }
  ```

### Patient Self-Booking

**POST** `/api/v1/public/consultations/book`

- **Roles**: `PATIENT`
- **Permissions**: `consultations:*:write`
- **Description**: Patients can book consultations for themselves
- **Request Body**: Same as front desk booking
- **Security**: Patient can only book for themselves (enforced by RLS)

### Available Slots

**GET** `/api/v1/consultations/available-slots?doctorId=uuid&date=2026-01-15&durationMinutes=30`

- **Roles**: `ADMIN`, `FRONT_DESK`, `PATIENT`, `DOCTOR`, `SURGEON`
- **Permissions**: `consultations:*:read`
- **Description**: Get available consultation slots for a doctor on a specific date
- **Response**:
  ```json
  {
    "doctorId": "uuid",
    "date": "2026-01-15",
    "durationMinutes": 30,
    "availableSlots": [
      {
        "start": "2026-01-15T09:00:00Z",
        "end": "2026-01-15T09:30:00Z"
      }
    ],
    "totalSlots": 16
  }
  ```

### Create Consultation from Appointment

**POST** `/api/v1/consultations/from-appointment/:appointmentId`

- **Roles**: `ADMIN`, `FRONT_DESK`
- **Permissions**: `consultations:*:write`
- **Description**: Creates consultation record when appointment is checked in
- **Note**: Typically called automatically by appointment check-in process

---

## RBAC & Permissions

### Roles

- **ADMIN**: Full access to all consultation booking operations
- **FRONT_DESK**: Can book consultations on behalf of patients, check availability
- **PATIENT**: Can book consultations for themselves, check availability
- **DOCTOR/SURGEON**: Can view available slots, cannot book (booking is done by front desk or patient)

### Permissions

- `consultations:*:write` - Required to book consultations
- `consultations:*:read` - Required to view available slots
- `appointment:create` - Required to create appointments (used internally)

### Row-Level Security (RLS)

- Patients can only book consultations for themselves
- Front desk can book for any patient they have access to
- RLS guard validates patient access before allowing booking

---

## Integration Points

### Appointment Service

The consultation booking service uses the `AppointmentService` to:
- Create appointments in `PENDING_PAYMENT` status
- Handle payment confirmation
- Manage appointment lifecycle

### Consultation Service

The consultation booking service uses the `ConsultationService` to:
- Create consultation records from appointments
- Link consultations to appointments
- Manage consultation workflow

### Domain Events

The booking process emits domain events:
- `Consultation.Booked` - When consultation is booked
- `Consultation.Created` - When consultation is created from appointment

---

## Frontend Integration

### Patient Self-Booking

1. Patient navigates to consultation booking page
2. Selects doctor and date
3. Views available slots
4. Selects time slot
5. Provides reason for visit
6. Submits booking
7. Redirected to payment page
8. After payment, appointment is confirmed

### Front Desk Booking

1. Front desk navigates to patient list
2. Selects patient
3. Clicks "Book Consultation"
4. Selects doctor and date
5. Views available slots
6. Selects time slot
7. Provides reason for visit
8. Submits booking
9. Patient is notified to complete payment

---

## Notification System (TODO)

When a consultation is booked:
1. **Patient Notification**: Email/SMS with appointment details and payment link
2. **Doctor Notification**: Email/In-app notification about new appointment
3. **Reminder Notifications**: Sent 24 hours before appointment

---

## Error Handling

### Common Errors

- **403 Forbidden**: User lacks required role/permission
- **400 Bad Request**: Invalid time slot (past date, end before start)
- **409 Conflict**: Time slot already booked
- **404 Not Found**: Patient or doctor not found

### Validation

- Time slot must be in the future
- End time must be after start time
- Duration must be at least 15 minutes
- Patient must exist and be accessible
- Doctor must exist and be active

---

## Next Steps

1. ✅ Backend booking workflow implemented
2. ⏳ Frontend patient booking UI
3. ⏳ Frontend front desk booking from patient list
4. ⏳ Doctor availability calendar
5. ⏳ Notification system integration
6. ⏳ Payment integration
7. ⏳ Reminder system






