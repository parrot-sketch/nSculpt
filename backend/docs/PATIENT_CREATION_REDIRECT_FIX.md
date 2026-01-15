# Patient Creation Redirect Fix

## Issue

After successfully creating a patient, the frontend redirects to `/admin/patients/undefined`, causing a 500 error when trying to fetch the patient details.

## Root Cause

The `apiClient` (axios instance) returns an AxiosResponse object with structure:
```typescript
{
  data: Patient,  // The actual patient data
  status: 201,
  headers: {...},
  ...
}
```

But the `patientService.createPatient()` method was treating the entire response as the patient data, causing `data.id` to be undefined.

## Fix

Updated `patientService.createPatient()` to correctly extract `response.data`:

```typescript
async createPatient(patient: Partial<Patient>): Promise<Patient> {
  const response = await apiClient.post<Patient>('/patients', patient);
  // Axios returns { data, status, headers, ... }, we need response.data
  const patientData = (response as any).data || response;
  // Ensure we have a valid ID
  if (!patientData?.id) {
    console.error('Patient created but no ID in response:', patientData);
    throw new Error('Invalid response from patient creation API: missing patient ID');
  }
  return patientData as Patient;
}
```

Also updated:
- `getPatient()` - Extract `response.data`
- `updatePatient()` - Extract `response.data`
- `getPatients()` - Extract `response.data`

## Verification

After fix:
1. Patient creation returns patient object with `id` field
2. Frontend redirects to `/admin/patients/{id}` (not undefined)
3. Patient detail page loads successfully






