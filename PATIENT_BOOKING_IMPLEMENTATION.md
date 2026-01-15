# Patient Appointment Booking Flow - Implementation Plan

## 1. ARCHITECTURE FIT EXPLANATION

### Existing Hooks Integration
- **Pattern**: Query key factories (`patientSelfKeys`, `consultationKeys`)
- **Integration**: Create `bookingKeys` factory following same pattern
- **Dependency Chain**: 
  - `usePatientProfile()` → Get patient ID
  - `useDoctors()` → Get available doctors
  - `useDoctorAvailability()` → Get slots (depends on doctor + date)
  - `useCreateAppointment()` → Create booking (depends on profile)

### Existing Services Integration
- **Pattern**: Service abstraction (`patientService`, `appointmentService`, `doctorService`)
- **Integration**:
  - Extend `doctorService` with `getAllDoctors()` for patient booking
  - Extend `appointmentService` with `createAppointment()` 
  - Create `bookingService` for consultation booking endpoints
- **Consistency**: Uses same `apiClient` with cookie-based auth

### Existing Cache Strategy
- **Query Keys**: Hierarchical keys for invalidation
- **Invalidation**: On booking success, invalidate:
  - `patientSelfKeys.appointments()` - Patient's appointments list
  - `patientSelfKeys.profile()` - Profile (if needed)
- **Optimistic Updates**: Update cache immediately after booking

### Existing Layouts
- **No changes needed**: Patient layout already enforces isolation
- **Routing**: `/patient/book` fits existing `/patient/*` pattern
- **Protection**: Layout-level guards remain intact

---

## 2. HOOK DESIGN

### Hooks to Create

#### `useDoctors()`
- **Query Key**: `['doctors', 'all']`
- **Endpoint**: `GET /api/v1/doctors`
- **Stale Time**: 5 minutes (doctors don't change frequently)
- **Purpose**: Get list of available doctors for selection

#### `useDoctorAvailability(doctorId, date)`
- **Query Key**: `['doctors', doctorId, 'availability', date]`
- **Endpoint**: `GET /api/v1/public/consultations/available-slots?doctorId=...&date=...`
- **Stale Time**: 1 minute (availability changes frequently)
- **Enabled**: Only when `doctorId` and `date` are provided
- **Purpose**: Get available time slots for a doctor on a specific date

#### `useCreateAppointment()`
- **Mutation**: Creates appointment via consultation booking
- **Endpoint**: `POST /api/v1/public/consultations/book`
- **Invalidation**: 
  - Invalidates `patientSelfKeys.appointments()`
  - Invalidates `['doctors', doctorId, 'availability']` (all dates)
- **Optimistic Update**: Adds appointment to cache immediately
- **Purpose**: Book appointment for current patient

### Cache Keys
```typescript
bookingKeys = {
  all: ['booking'],
  doctors: () => ['doctors', 'all'],
  availability: (doctorId: string, date: string) => 
    ['doctors', doctorId, 'availability', date],
}
```

---

## 3. FILE-LEVEL PLAN

### New Files to Create

1. **`client/services/booking.service.ts`**
   - `getAvailableSlots(doctorId, date, durationMinutes?)`
   - `bookConsultation(bookDto)`

2. **`client/hooks/useBooking.ts`**
   - `useDoctors()`
   - `useDoctorAvailability(doctorId, date)`
   - `useCreateAppointment()`

3. **`client/app/(protected)/patient/book/page.tsx`**
   - Main booking page with multi-step flow
   - State management for booking steps
   - Navigation between steps

4. **`client/app/(protected)/patient/book/components/DoctorSelect.tsx`**
   - Step 1: Doctor selection component
   - Shows list of doctors
   - Option for "No preference"

5. **`client/app/(protected)/patient/book/components/SlotPicker.tsx`**
   - Step 2: Date and time slot selection
   - Calendar for date selection
   - Grid of available time slots
   - Disabled state for unavailable slots

6. **`client/app/(protected)/patient/book/components/BookingConfirm.tsx`**
   - Step 3: Confirmation and submission
   - Summary of booking details
   - Reason for visit input
   - Submit button

### Files to Modify

1. **`client/services/doctor.service.ts`**
   - Add `getAllDoctors()` method

2. **`client/services/appointment.service.ts`**
   - Add `createAppointment()` method (if needed, or use booking service)

3. **`client/app/(protected)/patient/dashboard/page.tsx`**
   - Update "Book Appointment" link to `/patient/book`

4. **`client/app/(protected)/patient/appointments/page.tsx`**
   - Update "Book Appointment" button to `/patient/book`

---

## 4. UX EXPECTATIONS

### Booking UI Design Principles
- **Calm**: Soft colors, clear spacing, no overwhelming options
- **Clear**: Step-by-step progression, obvious next actions
- **Healthcare Appropriate**: Professional, trustworthy aesthetic
- **Non-Technical**: Simple language, no jargon
- **Reassuring**: Clear confirmation, success feedback

### Loading States
- **Step 1 (Doctors)**: Spinner with "Loading available doctors..."
- **Step 2 (Slots)**: Spinner with "Checking availability..." when date/doctor changes
- **Step 3 (Confirm)**: Disabled submit button with "Booking..." text during submission

### Slot Availability States
- **Available**: Green/blue button, clickable, clear time display
- **Unavailable**: Grayed out, disabled, "Unavailable" label
- **Selected**: Highlighted border, checkmark icon
- **Past Slots**: Automatically disabled, not shown

### Error States
- **No Doctors Available**: "No doctors available at this time. Please contact reception."
- **No Slots Available**: "No available slots for this date. Please select another date."
- **Booking Failed**: Rose error banner with user-friendly message and retry option

### Confirmation Feedback
- **Success**: 
  - Success page with checkmark
  - "Your appointment has been scheduled"
  - Appointment details summary
  - "View My Appointments" button
- **Auto-redirect**: After 3 seconds, redirect to `/patient/appointments`

---

## 5. VERIFICATION STEPS

### Booking Flow Verification
1. **Navigate to Booking**
   - Click "Book Appointment" from dashboard
   - Verify route is `/patient/book`
   - Verify Step 1 (Doctor Selection) appears

2. **Select Doctor**
   - Verify doctors list loads
   - Select a doctor
   - Verify "Next" button enables
   - Click "Next"
   - Verify Step 2 (Date/Time) appears

3. **Select Date & Time**
   - Select a date
   - Verify slots load for that date
   - Verify available slots are clickable
   - Verify unavailable slots are disabled
   - Select a time slot
   - Verify slot is highlighted
   - Click "Next"
   - Verify Step 3 (Confirm) appears

4. **Confirm Booking**
   - Verify summary shows correct doctor, date, time
   - Enter reason for visit
   - Click "Confirm Booking"
   - Verify loading state appears
   - Verify success page appears
   - Verify appointment details are correct

### Cache Updates Verification
1. **After Booking**
   - Navigate to `/patient/appointments`
   - Verify new appointment appears immediately
   - Verify appointment is in "PENDING_PAYMENT" or "CONFIRMED" status
   - Verify appointment shows correct doctor, date, time

2. **Dashboard Update**
   - Navigate to `/patient/dashboard`
   - Verify new appointment appears in "Upcoming Appointments"
   - Verify it's the first item (most recent)

### FrontDesk Visibility Verification
1. **FrontDesk View**
   - Log in as FrontDesk user
   - Navigate to appointments queue
   - Verify new patient appointment appears
   - Verify appointment details are correct
   - Verify appointment is in correct status

### Patient Isolation Verification
1. **Role Boundaries**
   - As Patient, verify cannot access `/admin/*` or `/frontdesk/*`
   - Verify booking page is only accessible to Patient role
   - Verify booking creates appointment for current patient only

### Error Handling Verification
1. **Network Errors**
   - Disable network
   - Try to book appointment
   - Verify error message appears
   - Verify retry option is available

2. **Slot Conflicts**
   - Book an appointment
   - Try to book same slot again (if possible)
   - Verify error message about slot being taken

3. **Validation Errors**
   - Try to submit without selecting doctor
   - Try to submit without selecting slot
   - Try to submit without reason
   - Verify appropriate validation messages

---

## TECHNICAL DETAILS

### API Endpoints Used
- `GET /api/v1/doctors` - Get all doctors (may need PATIENT role)
- `GET /api/v1/public/consultations/available-slots?doctorId=...&date=...` - Get available slots
- `POST /api/v1/public/consultations/book` - Book consultation (creates appointment)

### Booking Flow Data
1. **Step 1**: User selects doctor (or "No preference")
2. **Step 2**: User selects date → Fetch availability → User selects time slot
3. **Step 3**: User enters reason → Submit booking → Success

### Multi-Step State Management
- Use `useState` for current step (1, 2, 3)
- Use `useState` for booking data (doctorId, date, time, reason)
- Use `useEffect` to fetch availability when doctor/date changes
- Use `useMutation` for booking submission

### Success Criteria
✅ Patient can self-book appointments
✅ Booking appears immediately in patient views
✅ FrontDesk can see new bookings
✅ Patient sees clear confirmation
✅ No architectural drift
✅ No role boundary violations
✅ Feels cohesive with rest of system
