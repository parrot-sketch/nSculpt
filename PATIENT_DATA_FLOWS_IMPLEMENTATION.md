# Patient Data Flows Implementation - Complete

## 1. ARCHITECTURE FIT CHECK

### Existing Query Setup
- **Pattern**: Query key factories (`patientKeys`, `consultationKeys`)
- **Integration**: Created `patientSelfKeys` factory following same pattern
- **Location**: `client/hooks/usePatientSelf.ts`

### Existing API Layer
- **Pattern**: Service abstraction (`patientService`, `appointmentService`)
- **Integration**: 
  - Added `getMyProfile()` and `updateMyProfile()` to `patient.service.ts`
  - Added `getPatientAppointments()` to `appointment.service.ts`
- **Consistency**: Uses same `apiClient` with cookie-based auth

### Existing Layout/Routing Patterns
- **No changes needed**: Patient layout already enforces isolation
- **Routing**: Uses existing `getDashboardRouteForUser()` logic
- **Protection**: Layout-level guards remain intact

---

## 2. HOOK DESIGN

### Hooks Introduced

#### `usePatientProfile()`
- **Query Key**: `['patient', 'self', 'profile']`
- **Endpoint**: `GET /api/v1/patients/me`
- **Stale Time**: 2 minutes
- **Purpose**: Get current patient's own profile

#### `useUpdatePatientProfile()`
- **Mutation**: Updates patient profile
- **Invalidation**: Invalidates profile cache on success
- **Optimistic Update**: Updates cache immediately
- **Endpoint**: `PATCH /api/v1/patients/me`

#### `usePatientAppointments(filters?)`
- **Query Key**: `['patient', 'self', 'appointments', filters]`
- **Endpoint**: `GET /api/v1/appointments/patient/:patientId`
- **Dependency**: Requires `usePatientProfile()` to get `patientId`
- **Stale Time**: 30 seconds
- **Purpose**: Get patient's own appointments

#### `usePatientVisits()`
- **Query Key**: `['patient', 'self', 'visits']`
- **Endpoint**: `GET /api/v1/encounters/patient/:patientId`
- **Dependency**: Requires `usePatientProfile()` to get `patientId`
- **Stale Time**: 1 minute
- **Purpose**: Get patient's visit/encounter history

### Cache Keys
```typescript
patientSelfKeys = {
  all: ['patient', 'self'],
  profile: () => ['patient', 'self', 'profile'],
  appointments: (filters?) => ['patient', 'self', 'appointments', filters],
  visits: () => ['patient', 'self', 'visits'],
}
```

---

## 3. FILE-LEVEL IMPLEMENTATION

### Files Created
1. **`client/hooks/usePatientSelf.ts`**
   - All patient self-service hooks
   - Query key factory
   - Follows existing hook patterns

### Files Modified

#### `client/services/patient.service.ts`
- Added `getMyProfile()`: `GET /patients/me`
- Added `updateMyProfile()`: `PATCH /patients/me`

#### `client/services/appointment.service.ts`
- Added `getPatientAppointments()`: `GET /appointments/patient/:patientId`

#### `client/app/(protected)/patient/dashboard/page.tsx`
- Replaced placeholder queries with `usePatientProfile()`, `usePatientAppointments()`, `usePatientVisits()`
- Added loading states with spinners
- Shows next 1-3 upcoming appointments
- Shows last 3 recent visits
- Graceful empty states

#### `client/app/(protected)/patient/appointments/page.tsx`
- Replaced placeholder with `usePatientAppointments()`
- Added loading and error states
- Separates upcoming vs past appointments
- Patient-friendly UI (not admin-style tables)

#### `client/app/(protected)/patient/profile/page.tsx`
- Replaced placeholder with `usePatientProfile()` and `useUpdatePatientProfile()`
- Full form implementation with validation
- Success/error feedback
- Only allows editing allowed fields (demographics, contact, address)
- Follows existing form patterns from admin pages

#### `client/app/(protected)/patient/visits/page.tsx`
- Replaced placeholder with `usePatientVisits()`
- Timeline-style UI (not table)
- Read-only always
- Graceful empty state

---

## 4. UX EXPECTATIONS

### Loading States
- **Dashboard**: Spinner with "Loading your dashboard..." message
- **Appointments**: Spinner with "Loading your appointments..." message
- **Profile**: Spinner with "Loading your profile..." message
- **Visits**: Spinner with "Loading your visit history..." message
- **Pattern**: Consistent spinner design, centered, with descriptive text

### Empty States
- **Dashboard Appointments**: "No upcoming appointments" with "Book Appointment" CTA
- **Dashboard Visits**: "No recent visits" with helpful message
- **Appointments Page**: "No Appointments" with "Book Your First Appointment" CTA
- **Visits Page**: "No Visit History" with helpful message
- **Pattern**: Icon, heading, description, optional CTA

### Error Handling
- **All Pages**: Rose-colored error card with icon
- **Message**: User-friendly error message
- **Action**: "Return to Dashboard" link
- **Pattern**: Consistent error UI, non-technical language

### Feedback
- **Profile Update Success**: Emerald success banner with checkmark icon
- **Profile Update Error**: Rose error banner with alert icon
- **Auto-dismiss**: Success message clears after 3 seconds
- **Pattern**: Toast-like inline feedback, not blocking

---

## 5. VERIFICATION STEPS

### Dashboard Data Verification
1. **Login as Patient**
   - Navigate to `/patient/dashboard`
   - Verify welcome message shows patient's first name
   - Verify "Upcoming Appointments" section shows next 1-3 appointments
   - Verify "Recent Visits" section shows last 3 visits
   - Verify empty states if no data exists

2. **Check Loading States**
   - Hard refresh page
   - Verify spinner appears during initial load
   - Verify content appears after load completes

3. **Check Empty States**
   - If patient has no appointments, verify "No upcoming appointments" with CTA
   - If patient has no visits, verify "No recent visits" message

### Isolation Verification
1. **Patient Cannot Access Staff Routes**
   - As Patient, try `/admin/users` → Should redirect to `/patient`
   - As Patient, try `/frontdesk/patients` → Should redirect to `/patient`
   - Verify console warnings appear

2. **Staff Cannot Access Patient Routes**
   - As Admin, try `/patient/dashboard` → Should redirect to `/admin`
   - As FrontDesk, try `/patient/dashboard` → Should redirect to `/frontdesk`
   - Verify console warnings appear

### Profile Updates Verification
1. **Edit Profile**
   - Navigate to `/patient/profile`
   - Click "Edit Profile"
   - Change first name, phone, address
   - Click "Save Changes"
   - Verify success message appears
   - Verify form switches back to view mode
   - Verify updated data is displayed

2. **Validation**
   - Try to save with empty first name → Should show error
   - Try to save with invalid email → Should show error
   - Verify errors clear when field is corrected

3. **Error Handling**
   - Simulate network error (disable network)
   - Try to save → Should show error message
   - Verify error message is user-friendly

### Caching Verification
1. **Query Caching**
   - Load dashboard
   - Navigate to appointments page
   - Navigate back to dashboard
   - Verify dashboard loads instantly (from cache)
   - Verify data is still fresh

2. **Cache Invalidation**
   - Update profile
   - Navigate to dashboard
   - Verify profile data is updated (cache invalidated)

3. **Stale Time**
   - Load appointments
   - Wait 30+ seconds
   - Navigate away and back
   - Verify appointments refetch (stale time expired)

---

## TECHNICAL DETAILS

### API Endpoints Used
- `GET /api/v1/patients/me` - Get current patient profile
- `PATCH /api/v1/patients/me` - Update current patient profile
- `GET /api/v1/appointments/patient/:patientId` - Get patient's appointments
- `GET /api/v1/encounters/patient/:patientId` - Get patient's visits

### Data Flow
1. **Dashboard Load**:
   - `usePatientProfile()` → Get patient ID
   - `usePatientAppointments()` → Get appointments (depends on profile)
   - `usePatientVisits()` → Get visits (depends on profile)

2. **Profile Update**:
   - User edits form
   - `useUpdatePatientProfile().mutate()` → PATCH request
   - On success: Invalidate cache, update cache, show success message
   - On error: Show error message

3. **Appointments Load**:
   - `usePatientProfile()` → Get patient ID
   - `usePatientAppointments()` → GET request with patient ID
   - Filter and sort client-side

### Security
- All endpoints require PATIENT role
- All endpoints require `patients:self:read` or `patients:self:write` permission
- Backend enforces that patients can only access their own data
- Frontend layout enforces role isolation

---

## SUCCESS CRITERIA MET

✅ Patient can log in and see their own data
✅ Patient can edit their own profile
✅ Patient can view appointments
✅ Patient can view visit history
✅ Patient cannot see anyone else's data
✅ Patient cannot access staff routes
✅ System feels cohesive with existing architecture
✅ All loading/error/empty states are handled gracefully
✅ UX is calm, human, trustworthy, simple, non-technical

---

## KNOWN LIMITATIONS / FUTURE WORK

1. **Appointment Booking**: "Book Appointment" links need to be connected to booking flow
2. **Messages**: Messages page is still a placeholder
3. **Notifications**: Notifications page is still a placeholder
4. **Visit Details**: Visit history is read-only, but could link to detailed visit view
5. **Appointment Cancellation**: Patients cannot cancel appointments yet (future feature)

---

## ARCHITECTURAL COMPLIANCE

✅ Uses existing API client abstraction
✅ Uses TanStack Query hooks (not raw fetch)
✅ Follows existing file organization
✅ Follows established naming conventions
✅ No new libraries introduced
✅ No parallel patterns created
✅ Auth not rewritten
✅ Layouts not rewritten
✅ No Redux introduced
✅ No new fetch patterns
✅ Role isolation maintained
✅ No Admin components used in Patient area
