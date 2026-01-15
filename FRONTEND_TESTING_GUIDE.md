# Frontend Testing Guide

## ✅ Frontend is Running!

The frontend is now accessible at: **http://localhost:3000**

## Current Status

- **Frontend**: ✅ Running on port 3000
- **Backend**: ✅ Running on port 3002 (API at `/api/v1`)
- **Connection**: Frontend configured to connect to backend

## How Frontend Connects to Backend

### Environment Variables (from docker-compose.yml)

- **Server-side requests** (Next.js server): `NEXT_PUBLIC_API_URL=http://backend:3001/api/v1`
  - Uses Docker service name `backend` (internal Docker network)
  
- **Client-side requests** (browser): `NEXT_PUBLIC_API_URL_BROWSER=http://localhost:3002/api/v1`
  - Uses `localhost:3002` (from your browser)

### API Client Configuration

The frontend uses `/home/bkg/ns/client/lib/env.ts` to determine which URL to use:
- Browser requests → `NEXT_PUBLIC_API_URL_BROWSER` (localhost:3002)
- Server requests → `NEXT_PUBLIC_API_URL` (backend:3001)

## Testing the Frontend

### 1. Access the Frontend

Open in your browser:
```
http://localhost:3000
```

### 2. Test Authentication

The frontend should have:
- Login page at `/login`
- Protected routes requiring authentication
- Role-based navigation

### 3. Test API Connection

The frontend will make API calls to:
- **From browser**: `http://localhost:3002/api/v1/*`
- **From Next.js server**: `http://backend:3001/api/v1/*`

### 4. Check Browser Console

Open browser DevTools (F12) and check:
- Network tab: Verify API calls are going to `localhost:3002`
- Console: Check for any connection errors
- Application tab: Verify JWT tokens are stored correctly

## Common Issues & Solutions

### Frontend Can't Connect to Backend

**Symptom**: API calls fail with connection errors

**Solutions**:
1. Verify backend is running:
   ```bash
   docker-compose ps backend
   ```

2. Test backend directly:
   ```bash
   curl http://localhost:3002/api/v1/health
   ```

3. Check CORS settings in backend (should allow `http://localhost:3000`)

### Frontend Shows 403 Forbidden

**Symptom**: Authenticated but getting 403 errors

**Possible Causes**:
- Missing roles/permissions in JWT token
- Backend guards (RolesGuard, PermissionsGuard, RlsGuard) blocking access
- User doesn't have required permissions

**Check**:
- Verify user roles in database
- Check backend logs for permission denials
- Review `SECURITY_REMEDIATION_REPORT.md` for required permissions

### Frontend Not Loading

**Symptom**: Blank page or build errors

**Solutions**:
1. Check frontend logs:
   ```bash
   docker-compose logs frontend
   ```

2. Rebuild frontend:
   ```bash
   docker-compose --profile frontend up -d --build frontend
   ```

3. Check for TypeScript errors in `/home/bkg/ns/client/`

## Testing Workflow

### 1. Login Flow
1. Navigate to `http://localhost:3000/login`
2. Enter credentials (check database for test users)
3. Verify JWT token is received and stored
4. Check redirect to dashboard

### 2. Role-Based Navigation
1. After login, verify sidebar shows correct menu items
2. Check that menu items match user's roles/permissions
3. Try accessing pages directly via URL (should be protected)

### 3. API Integration
1. Open browser DevTools → Network tab
2. Navigate through the app
3. Verify API calls are:
   - Going to correct endpoint (`localhost:3002/api/v1/*`)
   - Including JWT token in headers
   - Getting proper responses (200, 401, 403, etc.)

### 4. Multi-Role Testing
1. Create a user with multiple roles (e.g., DOCTOR + NURSE)
2. Verify combined permissions work
3. Check dashboard shows widgets for all roles
4. Verify backend filtering respects all roles

## Quick Test Commands

```bash
# Check all services
docker-compose ps

# View frontend logs
docker-compose logs frontend -f

# View backend logs
docker-compose logs backend -f

# Restart frontend
docker-compose --profile frontend restart frontend

# Test backend API
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3002/api/v1/patients
```

## Next Steps

1. **Access Frontend**: Open http://localhost:3000
2. **Test Login**: Use test credentials from your database
3. **Verify Navigation**: Check role-based menu items
4. **Test Features**: Navigate through different pages
5. **Check Console**: Monitor for errors in browser DevTools

## Backend API Endpoints

The backend is available at:
- **Local**: `http://localhost:3002/api/v1`
- **Docker Network**: `http://backend:3001/api/v1`

Common endpoints:
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/patients` - List patients (requires auth + permissions)
- `GET /api/v1/theater/cases` - List surgical cases
- `GET /api/v1/medical-records` - List medical records

All endpoints require:
- Valid JWT token
- Appropriate roles (via `@Roles()`)
- Required permissions (via `@Permissions()`)
- Row-level access (via `RlsGuard`)

---

**Frontend URL**: http://localhost:3000  
**Backend API**: http://localhost:3002/api/v1  
**Status**: ✅ Both services running












