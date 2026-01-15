# Login 401 Error Fix

## Problem

The frontend was getting a 401 Unauthorized error when attempting to log in, even though the backend login endpoint was working correctly.

## Root Cause

The default API URL in `client/lib/env.ts` was set to `http://localhost:3001/api/v1`, but the backend is actually running on port **3002** (mapped from container port 3001).

The docker-compose.yml correctly sets:
- `NEXT_PUBLIC_API_URL_BROWSER: http://localhost:3002/api/v1` (for browser requests)

However, the fallback default in `env.ts` was using port 3001, which would be used if the environment variable wasn't set or during server-side rendering.

## Solution

Updated the default API URL in `client/lib/env.ts` from:
```typescript
process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
```

To:
```typescript
process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'
```

## Verification

1. **Backend login endpoint works** (verified with curl):
   ```bash
   curl -X POST http://localhost:3002/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@nairobi-sculpt.com","password":"Admin123!"}'
   ```
   ✅ Returns successful login response

2. **Frontend configuration**:
   - ✅ `NEXT_PUBLIC_API_URL_BROWSER` is set to `http://localhost:3002/api/v1` in docker-compose
   - ✅ Default fallback now uses port 3002
   - ✅ Frontend restarted to pick up changes

## Test Credentials

- **Admin**: `admin@nairobi-sculpt.com` / `Admin123!`
- **Doctor**: `doctor@nairobi-sculpt.com` / `User123!`
- **Front Desk**: `frontdesk@nairobi-sculpt.com` / `User123!`

## Next Steps

1. Try logging in again from the frontend
2. If still getting 401, check:
   - Browser console for exact error message
   - Network tab to see the actual request/response
   - Backend logs for authentication errors

## Files Changed

- `client/lib/env.ts` - Updated default API URL port from 3001 to 3002
