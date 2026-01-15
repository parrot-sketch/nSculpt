# Docker Setup Summary & Frontend Access

## Current Status

### Running Services ✅
- ✅ **PostgreSQL** - Port 5432 - Healthy
- ✅ **Redis** - Port 6379 - Healthy
- ⚠️ **Backend** - Port 3002 - **Unhealthy** (missing RlsValidationService)

### Issues Found

#### Issue 1: Backend Unhealthy
**Error**: `Cannot find module '../../../modules/audit/services/rlsValidation.service'`

**Root Cause**: The `RlsValidationService` file was not created due to file permission issues. The code was provided in documentation but needs to be created manually.

**Fix Required**: Create the file manually:
```bash
# File location
backend/src/modules/audit/services/rlsValidation.service.ts

# Code is in: SECURITY_GUARDS_IMPLEMENTATION.md (section 3)
```

#### Issue 2: Port 3000 Already in Use
**Error**: `address already in use` on port 3000

**Root Cause**: Another process (likely local Next.js dev server) is using port 3000.

**Fix Options**:
1. **Stop local dev server** (if running):
   ```bash
   # Find and kill process
   lsof -ti :3000 | xargs kill -9
   ```

2. **Use different port** for Docker frontend:
   ```yaml
   # In docker-compose.yml
   ports:
     - "3001:3000"  # Use 3001 instead
   ```

---

## Frontend Connection Architecture

### How Frontend Connects to Backend

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Browser                              │
│                  (localhost:3000)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP Request
                       │ http://localhost:3002/api/v1/*
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Docker Host (Your Machine)                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Docker Network (ehr-network)                │  │
│  │                                                       │  │
│  │  ┌──────────────┐         ┌──────────────┐         │  │
│  │  │   Frontend   │         │   Backend    │         │  │
│  │  │  Container   │────────▶│  Container   │         │  │
│  │  │   :3000      │         │   :3001      │         │  │
│  │  └──────────────┘         └──────────────┘         │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Port Mapping: 3000 → 3000 (Frontend)                      │
│  Port Mapping: 3002 → 3001 (Backend)                       │
└──────────────────────────────────────────────────────────────┘
```

### Environment Variables

**Frontend Container**:
- `NEXT_PUBLIC_API_URL`: `http://backend:3001/api/v1` (server-side, Docker network)
- `NEXT_PUBLIC_API_URL_BROWSER`: `http://localhost:3002/api/v1` (client-side, from browser)

**Why Two URLs?**
- **Server-side**: Next.js server (inside Docker) uses service name `backend`
- **Client-side**: Browser (outside Docker) uses `localhost:3002`

The `lib/env.ts` file automatically selects the correct URL:
```typescript
// Browser requests → NEXT_PUBLIC_API_URL_BROWSER
// Server requests → NEXT_PUBLIC_API_URL
```

---

## How to Access Frontend

### Option 1: Docker (Recommended for Testing)

**Step 1**: Fix backend issue (create RlsValidationService)

**Step 2**: Free port 3000 or use different port

**Step 3**: Start frontend:
```bash
docker-compose --profile frontend up -d frontend
```

**Step 4**: Access: **http://localhost:3000**

### Option 2: Local Development (Faster for Development)

**Step 1**: Start backend in Docker:
```bash
make dev
# Backend runs on http://localhost:3002/api/v1
```

**Step 2**: Start frontend locally:
```bash
cd client
npm install
npm run dev
```

**Step 3**: Access: **http://localhost:3000**

**Advantages**:
- ✅ Faster hot reload
- ✅ Better debugging
- ✅ No Docker rebuild needed

---

## Quick Fix Guide

### Fix 1: Create RlsValidationService

The backend is failing because `RlsValidationService` doesn't exist. 

**Action**: Copy code from `SECURITY_GUARDS_IMPLEMENTATION.md` section 3 to:
```
backend/src/modules/audit/services/rlsValidation.service.ts
```

**Then restart backend**:
```bash
docker-compose restart backend
```

### Fix 2: Free Port 3000

**Check what's using port 3000**:
```bash
lsof -i :3000
```

**Kill process** (if it's a local dev server):
```bash
lsof -ti :3000 | xargs kill -9
```

**Or use different port**:
```yaml
# docker-compose.yml
frontend:
  ports:
    - "3001:3000"  # Access at http://localhost:3001
```

### Fix 3: Start Frontend

After fixing above issues:
```bash
docker-compose --profile frontend up -d frontend
```

---

## Testing Checklist

Once frontend is running:

- [ ] **Frontend accessible**: http://localhost:3000
- [ ] **Login page loads**: http://localhost:3000/login
- [ ] **Backend API works**: `curl http://localhost:3002/api/v1/auth/me`
- [ ] **No CORS errors**: Check browser console
- [ ] **Login works**: Test with credentials
- [ ] **Protected routes work**: Navigate to `/dashboard`, `/patients`, etc.
- [ ] **Role-based access**: Test with different user roles
- [ ] **Permission-based UI**: Check sidebar visibility

---

## Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main application |
| **Backend API** | http://localhost:3002/api/v1 | API endpoints |
| **PostgreSQL** | localhost:5432 | Database (direct access) |
| **Redis** | localhost:6379 | Cache/Queue (direct access) |
| **pgAdmin** | http://localhost:5050 | Database management (if enabled) |

---

## Development Workflow

### Recommended: Local Frontend + Docker Backend

```bash
# Terminal 1: Start backend services
make dev

# Terminal 2: Start frontend locally
cd client
npm run dev
```

**Benefits**:
- ✅ Fast hot reload
- ✅ Easy debugging
- ✅ No Docker rebuilds
- ✅ Backend still containerized

### Alternative: All Docker

```bash
# Start everything
docker-compose --profile frontend up -d

# View logs
docker-compose logs -f frontend
```

**Benefits**:
- ✅ Consistent environment
- ✅ Production-like setup
- ✅ Easy to share

---

## Troubleshooting Commands

```bash
# Check all services
docker-compose ps

# Check frontend logs
docker-compose logs frontend

# Check backend logs
docker-compose logs backend

# Restart frontend
docker-compose restart frontend

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend

# Check port usage
lsof -i :3000
lsof -i :3002

# Test backend API
curl http://localhost:3002/api/v1/auth/me

# Test frontend
curl http://localhost:3000
```

---

## Next Steps

1. **Create RlsValidationService** - Copy from documentation
2. **Fix port 3000** - Kill process or use different port
3. **Start frontend** - `docker-compose --profile frontend up -d frontend`
4. **Access frontend** - http://localhost:3000
5. **Test features** - Login, navigate, test security

---

**Current Status**: 
- Backend: ⚠️ Unhealthy (needs RlsValidationService)
- Frontend: ❌ Not started (port conflict + backend dependency)

**After Fixes**:
- Backend: ✅ Should be healthy
- Frontend: ✅ Should be accessible at http://localhost:3000
