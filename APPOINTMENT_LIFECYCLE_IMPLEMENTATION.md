# Appointment Lifecycle Management - Implementation Plan

## 1. ARCHITECTURE FIT EXPLANATION

### Existing Service Layer Integration
- **Pattern**: Service abstraction (`appointmentService`, `patientService`, etc.)
- **Integration**: Extend `appointmentService` with lifecycle methods
- **Consistency**: Uses same `apiClient` with cookie-based auth
- **Location**: `client/services/appointment.service.ts`

### Existing Hook Patterns
- **Pattern**: Mutation hooks with cache invalidation (`useAdminUserMutations`, `useCreateAppointment`)
- **Integration**: Create `useAppointmentMutations()` hook following same pattern
- **Cache Strategy**: Invalidate all appointment-related queries on status change
- **Location**: `client/hooks/useAppointments.ts` (new or extend existing)

### Existing UI Patterns
- **Pattern**: Conditional actions based on role + status (`ConsentActions.tsx`)
- **Integration**: Create `AppointmentActions` component following same pattern
- **Permission Checks**: Use `usePermissions()` hook
- **Location**: `client/components/appointments/AppointmentActions.tsx`

### Cache Invalidation Strategy
- **On Status Change**: Invalidate:
  - `patientSelfKeys.appointments()` - Patient's appointments
  - `['appointments']` - All appointments (FrontDesk/Admin)
  - `['appointments', 'doctor', doctorId]` - Doctor's appointments
  - `['appointments', 'patient', patientId]` - Patient's appointments
- **Optimistic Updates**: Update cache immediately, rollback on error

---

## 2. HOOK AND SERVICE DESIGN

### Service Methods to Add

#### `cancelAppointment(id, cancelDto)`
- **Endpoint**: `POST /api/v1/appointments/:id/cancel`
- **Body**: `{ cancellationReason, cancellationNotes?, refundRequested? }`
- **Returns**: Updated `Appointment`

#### `confirmAppointment(id, paymentId)`
- **Endpoint**: `POST /api/v1/appointments/:id/confirm-payment`
- **Body**: `{ paymentId }`
- **Returns**: Updated `Appointment`

#### `checkInAppointment(id)`
- **Endpoint**: `POST /api/v1/appointments/:id/check-in`
- **Returns**: Updated `Appointment`

#### `rescheduleAppointment(id, rescheduleDto)`
- **Endpoint**: `PATCH /api/v1/appointments/:id` (or new endpoint if needed)
- **Body**: `{ scheduledStartTime, scheduledEndTime, scheduledDate }`
- **Returns**: Updated `Appointment`

#### `markNoShow(id)`
- **Endpoint**: `PATCH /api/v1/appointments/:id/status` (or new endpoint)
- **Body**: `{ status: 'NO_SHOW' }`
- **Returns**: Updated `Appointment`

#### `markInProgress(id)`
- **Endpoint**: `PATCH /api/v1/appointments/:id/status` (or new endpoint)
- **Body**: `{ status: 'IN_PROGRESS' }`
- **Returns**: Updated `Appointment`

#### `completeAppointment(id, consultationId)`
- **Endpoint**: `POST /api/v1/appointments/:id/complete` (if exists)
- **Body**: `{ consultationId }`
- **Returns**: Updated `Appointment`

### Hooks to Create

#### `useAppointmentMutations()`
Returns object with:
- `cancelAppointment` - Mutation for canceling
- `confirmAppointment` - Mutation for confirming payment
- `checkInAppointment` - Mutation for check-in
- `rescheduleAppointment` - Mutation for rescheduling
- `markNoShow` - Mutation for marking no-show
- `markInProgress` - Mutation for marking in-progress
- `completeAppointment` - Mutation for completing

All mutations:
- Invalidate appointment caches
- Handle errors gracefully
- Provide loading states

---

## 3. FILE-LEVEL CHANGES

### Files to Create

1. **`client/components/appointments/AppointmentActions.tsx`**
   - Role-based action buttons
   - Status-based visibility
   - Permission checks
   - Follows `ConsentActions.tsx` pattern

2. **`client/components/appointments/AppointmentStatusBadge.tsx`**
   - Status badge with color coding
   - Follows `EncounterStatusBadge.tsx` pattern

3. **`client/hooks/useAppointments.ts`** (if doesn't exist)
   - `useAppointmentMutations()` hook
   - Query keys for appointments

### Files to Modify

1. **`client/services/appointment.service.ts`**
   - Add lifecycle methods (cancel, confirm, checkIn, reschedule, markNoShow, markInProgress, complete)

2. **`client/app/(protected)/patient/appointments/page.tsx`**
   - Add `AppointmentActions` component
   - Show cancel action for patient's own appointments

3. **`client/app/(protected)/patient/dashboard/page.tsx`**
   - Add `AppointmentStatusBadge` to appointments list

4. **`client/app/(protected)/frontdesk/page.tsx`**
   - Add `AppointmentActions` to appointment table
   - Show confirm, check-in, reschedule, mark no-show actions

5. **`client/app/(protected)/doctor/page.tsx`** (if exists)
   - Add `AppointmentActions` to doctor's appointments
   - Show mark in-progress, complete actions

---

## 4. UI BEHAVIOR PER ROLE

### Patient Actions
- **Cancel**: 
  - Visible: Own appointments, status in [PENDING_PAYMENT, CONFIRMED], future date
  - Hidden: Past appointments, COMPLETED, CANCELLED, CHECKED_IN, IN_PROGRESS
  - Action: Opens cancel confirmation modal with reason input

### FrontDesk Actions
- **Confirm Payment**:
  - Visible: Status = PENDING_PAYMENT
  - Hidden: Other statuses
  - Action: Opens payment confirmation modal

- **Check In**:
  - Visible: Status = CONFIRMED, appointment date is today or past
  - Hidden: Other statuses, future dates
  - Action: Immediate check-in (no modal needed)

- **Reschedule**:
  - Visible: Status in [PENDING_PAYMENT, CONFIRMED], future date
  - Hidden: Past appointments, COMPLETED, CANCELLED, CHECKED_IN, IN_PROGRESS
  - Action: Opens reschedule modal with date/time picker

- **Mark No-Show**:
  - Visible: Status = CONFIRMED, appointment date is past, not checked in
  - Hidden: Other statuses, already checked in
  - Action: Immediate (with confirmation)

### Clinician Actions
- **Mark In-Progress**:
  - Visible: Status = CHECKED_IN, assigned to current doctor
  - Hidden: Other statuses, not assigned
  - Action: Immediate

- **Complete**:
  - Visible: Status = IN_PROGRESS, assigned to current doctor
  - Hidden: Other statuses, not assigned
  - Action: Opens completion modal (may require consultation ID)

### Admin Actions
- **View All**: Can see all actions but backend enforces permissions
- **No Special Actions**: Uses same actions as other roles based on context

---

## 5. STATE TRANSITION RULES

### Valid Transitions

```
PENDING_PAYMENT → CONFIRMED (FrontDesk: confirm payment)
PENDING_PAYMENT → CANCELLED (Patient/FrontDesk: cancel)

CONFIRMED → CHECKED_IN (FrontDesk: check in)
CONFIRMED → CANCELLED (Patient/FrontDesk: cancel)
CONFIRMED → NO_SHOW (FrontDesk: mark no-show)

CHECKED_IN → IN_PROGRESS (Clinician: mark in-progress)
CHECKED_IN → CANCELLED (FrontDesk: cancel - rare)

IN_PROGRESS → COMPLETED (Clinician: complete)

COMPLETED → (terminal, no transitions)
CANCELLED → (terminal, no transitions)
NO_SHOW → (terminal, no transitions)
```

### Invalid Transitions (Prevented by UI + Backend)
- Cannot cancel COMPLETED appointments
- Cannot check in CANCELLED appointments
- Cannot complete non-IN_PROGRESS appointments
- Cannot mark in-progress non-CHECKED_IN appointments
- Patient cannot modify time once booked
- Patient cannot cancel past appointments

---

## 6. VERIFICATION STEPS

### Patient Cancellation
1. Patient views own appointment
2. Cancel button visible for future CONFIRMED appointment
3. Click cancel → Modal opens → Enter reason → Confirm
4. Appointment status changes to CANCELLED
5. FrontDesk sees cancellation immediately
6. Patient's appointment list updates

### FrontDesk Check-In
1. FrontDesk views CONFIRMED appointment for today
2. Check In button visible
3. Click Check In → Status changes to CHECKED_IN
4. Patient dashboard updates (if viewing)
5. Doctor's queue updates

### Clinician Complete
1. Clinician views IN_PROGRESS appointment
2. Complete button visible
3. Click Complete → Status changes to COMPLETED
4. All views update (Patient, FrontDesk, Doctor)

### Cache Invalidation
1. Patient cancels appointment
2. Navigate to FrontDesk appointments
3. Verify appointment shows CANCELLED status
4. Navigate to Patient appointments
5. Verify appointment shows CANCELLED status
6. No stale data visible

---

## 7. CACHE INVALIDATION STRATEGY

### Query Keys to Invalidate
```typescript
// On any appointment status change:
[
  'appointments',                    // All appointments
  ['appointments', 'patient', patientId],  // Patient's appointments
  ['appointments', 'doctor', doctorId],   // Doctor's appointments
  ['patient', 'self', 'appointments'],    // Patient self-service
  ['appointments', 'today'],              // Today's appointments
]
```

### Invalidation Pattern
```typescript
onSuccess: (data) => {
  // Invalidate all appointment-related queries
  queryClient.invalidateQueries({ queryKey: ['appointments'] });
  
  // Invalidate specific patient/doctor queries
  if (data.patientId) {
    queryClient.invalidateQueries({ 
      queryKey: ['appointments', 'patient', data.patientId] 
    });
  }
  if (data.doctorId) {
    queryClient.invalidateQueries({ 
      queryKey: ['appointments', 'doctor', data.doctorId] 
    });
  }
  
  // Optimistically update cache
  queryClient.setQueryData(
    ['appointments', data.id],
    data
  );
}
```

---

## SUCCESS CRITERIA

✅ Patient can cancel own future appointments
✅ FrontDesk can confirm, check-in, reschedule, mark no-show
✅ Clinician can mark in-progress and complete
✅ Status changes reflect immediately across all views
✅ No invalid transitions possible (UI + backend)
✅ UI reflects permissions accurately
✅ Cache invalidation updates all dashboards
✅ No architecture drift
