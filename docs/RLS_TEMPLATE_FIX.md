# RLS Template Endpoint Fix

## Issue
Template endpoints (`/api/v1/consents/templates`) were being blocked by RLS guard with 403 Forbidden error.

## Root Cause
RLS guard was trying to validate access to template endpoints, but templates are public system resources that don't have patient associations. They should only be protected by RolesGuard and PermissionsGuard.

## Solution
Added `shouldSkipRLS()` method to `RlsGuard` that:
1. Checks if the route is a template endpoint
2. Returns `true` to skip RLS validation for template routes
3. Includes both `/consents/templates` and `/api/v1/consents/templates` paths

## Changes Made
- **File**: `backend/src/common/guards/rls.guard.ts`
- **Method**: `shouldSkipRLS(route: string): boolean`
- **Skip paths**: 
  - `/consents/templates`
  - `/consent/templates`
  - `/templates`
  - `/api/v1/consents/templates`
  - `/api/v1/consent/templates`

## Testing
After restarting the backend, test:
1. Open GenerateConsentModal
2. Templates should load in dropdown
3. No 403 errors in console

## Restart Required
The backend needs to be restarted for changes to take effect:
```bash
cd backend
npm run start:dev
```

Or if running in watch mode, it should auto-reload, but if issues persist, restart manually.








