# Docker Setup Review & Frontend Access Guide

## Current Docker Setup

### Running Services

Based on `docker-compose ps`:
- ✅ **PostgreSQL** (`ehr-postgres`) - Port 5432 - Status: Healthy
- ✅ **Redis** (`ehr-redis`) - Port 6379 - Status: Healthy  
- ⚠️ **Backend** (`ehr-backend`) - Port 3002 - Status: Unhealthy
- ❌ **Frontend** (`ehr-frontend`) - Port 3000 - **Not Running** (has profile)

### Service Configuration

#### Backend Service
- **Container Port**: 3001
- **Host Port**: 3002 (mapped)
- **Access URL**: `http://localhost:3002`
- **API Base**: `http://localhost:3002/api/v1`
- **Health Check**: `http://localhost:3001/api/v1/patients` (inside container)

#### Frontend Service
- **Container Port**: 3000
- **Host Port**: 3000 (mapped)
- **Access URL**: `http://localhost:3000`
- **Profile**: `frontend` (not started by default)

---

## Frontend Connection Architecture

### Environment Variables

The frontend uses two API URLs:

1. **`NEXT_PUBLIC_API_URL`** (Server-side/SSR):
   - Value: `http://backend:3001/api/v1`
   - Used for: Server-side rendering, API routes
   - Note: Uses Docker service name `backend` (internal network)

2. **`NEXT_PUBLIC_API_URL_BROWSER`** (Client-side):
   - Value: `http://localhost:3002/api/v1`
   - Used for: Browser API calls (from client components)
   - Note: Uses `localhost` because browser runs outside Docker network

### Connection Flow

```
Browser (localhost:3000)
  ↓
Frontend Next.js App (client-side)
  ↓
API Call to: http://localhost:3002/api/v1/*
  ↓
Docker Port Mapping: 3002 → 3001
  ↓
Backend Container (ehr-backend:3001)
  ↓
NestJS API Handler
```

### Why Two URLs?

- **Server-side**: Next.js server (inside Docker) can use service name `backend`
- **Client-side**: Browser (outside Docker) must use `localhost:3002`

The `env.ts` file automatically selects the correct URL:
```typescript
// Browser requests use NEXT_PUBLIC_API_URL_BROWSER
// Server requests use NEXT_PUBLIC_API_URL
```

---

## How to Start Frontend

### Option 1: Start with Profile (Recommended)

```bash
# Start frontend service with profile
docker-compose --profile frontend up -d frontend

# Or start all services including frontend
docker-compose --profile frontend up -d
```

### Option 2: Remove Profile (Always Start)

Edit `docker-compose.yml` and remove the `profiles` section from frontend service:

```yaml
frontend:
  # ... other config ...
  # Remove or comment out:
  # profiles:
  #   - frontend
```

Then start normally:
```bash
make dev
# or
docker-compose up -d
```

### Option 3: Run Frontend Locally (Development)

For faster development with hot reload:

```bash
cd client
npm install
npm run dev
```

This runs Next.js on `http://localhost:3000` and connects to backend at `http://localhost:3002/api/v1`.

---

## Accessing the Frontend

### Once Frontend is Running

1. **Open Browser**: Navigate to `http://localhost:3000`
2. **Login Page**: Should see login form
3. **Backend API**: Must be accessible at `http://localhost:3002/api/v1`

### Testing Flow

1. **Check Backend Health**:
   ```bash
   curl http://localhost:3002/api/v1/auth/me
   # Should return 401 (not authenticated) or user data
   ```

2. **Check Frontend**:
   ```bash
   curl http://localhost:3000
   # Should return HTML
   ```

3. **Test Login**:
   - Open `http://localhost:3000/login`
   - Enter credentials
   - Should redirect to `/dashboard`

---

## Current Issues & Fixes

### Issue 1: Backend is Unhealthy

**Status**: Backend container shows "unhealthy"

**Check logs**:
```bash
docker-compose logs backend --tail 100
```

**Common causes**:
- Backend not fully started
- Database connection issues
- Health check endpoint not responding

**Fix**:
```bash
# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend

# Check health
docker-compose ps backend
```

### Issue 2: Frontend Not Running

**Status**: Frontend service not started (has profile)

**Fix**:
```bash
# Start frontend with profile
docker-compose --profile frontend up -d frontend

# Or update Makefile to include frontend
```

### Issue 3: CORS Issues

**If you see CORS errors in browser**:

Check backend `CORS_ORIGIN` environment variable:
```yaml
# docker-compose.yml
backend:
  environment:
    CORS_ORIGIN: ${CORS_ORIGIN:-*}  # Should include http://localhost:3000
```

Update `.env`:
```bash
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

---

## Updated Makefile Commands

### Add Frontend Support

Update `Makefile` to include frontend commands:

```makefile
# Development commands
dev up:
	@./scripts/docker-dev.sh start
	@echo "Starting frontend..."
	@docker-compose --profile frontend up -d frontend

dev-frontend:
	@echo "Starting frontend service..."
	@docker-compose --profile frontend up -d frontend

dev-all:
	@echo "Starting all services including frontend..."
	@docker-compose --profile frontend up -d
```

---

## Quick Start Guide

### 1. Start All Services (Including Frontend)

```bash
# Start backend services
make dev

# Start frontend
docker-compose --profile frontend up -d frontend

# Or start everything at once
docker-compose --profile frontend up -d
```

### 2. Check Service Status

```bash
docker-compose ps
```

Should show:
- ✅ postgres (healthy)
- ✅ redis (healthy)
- ✅ backend (healthy)
- ✅ frontend (running)

### 3. Access Frontend

Open browser: **http://localhost:3000**

### 4. View Logs

```bash
# All services
docker-compose logs -f

# Frontend only
docker-compose logs -f frontend

# Backend only
docker-compose logs -f backend
```

### 5. Stop Services

```bash
make down
# or
docker-compose down
```

---

## Environment Variables Reference

### Backend (.env)

```bash
# Database
POSTGRES_USER=ehr_user
POSTGRES_PASSWORD=ehr_password
POSTGRES_DB=surgical_ehr
POSTGRES_PORT=5432

# Backend
BACKEND_PORT=3002
NODE_ENV=development
JWT_SECRET=your-secret-key

# CORS (important for frontend)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
```

### Frontend (docker-compose.yml or .env)

```bash
# API URLs
NEXT_PUBLIC_API_URL=http://backend:3001/api/v1
NEXT_PUBLIC_API_URL_BROWSER=http://localhost:3002/api/v1

# App Config
NEXT_PUBLIC_APP_NAME=Nairobi Sculpt EHR
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_SESSION_TIMEOUT=3600000
```

---

## Network Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│                  (ehr-network)                          │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐         │
│  │ Postgres │    │  Redis   │    │ Backend  │         │
│  │ :5432    │    │ :6379    │    │ :3001    │         │
│  └──────────┘    └──────────┘    └──────────┘         │
│                                                          │
│  ┌──────────┐                                         │
│  │ Frontend │                                         │
│  │ :3000    │                                         │
│  └──────────┘                                         │
└─────────────────────────────────────────────────────────┘
         │                    │
         │                    │
    Port 5432            Port 3002
    (Postgres)          (Backend)
         │                    │
         └────────────────────┘
                    │
              ┌─────┴─────┐
              │  Browser  │
              │ localhost │
              └───────────┘
```

---

## Testing Checklist

- [ ] Backend is healthy: `docker-compose ps backend`
- [ ] Backend API accessible: `curl http://localhost:3002/api/v1/auth/me`
- [ ] Frontend is running: `docker-compose ps frontend`
- [ ] Frontend accessible: `curl http://localhost:3000`
- [ ] Login page loads: Open `http://localhost:3000/login`
- [ ] API calls work: Check browser Network tab
- [ ] No CORS errors: Check browser Console
- [ ] Token refresh works: Test login and token expiration

---

## Troubleshooting

### Frontend Can't Connect to Backend

1. **Check backend is running**:
   ```bash
   docker-compose ps backend
   ```

2. **Check backend logs**:
   ```bash
   docker-compose logs backend
   ```

3. **Test backend API**:
   ```bash
   curl http://localhost:3002/api/v1/auth/me
   ```

4. **Check CORS settings**:
   - Backend `CORS_ORIGIN` should include `http://localhost:3000`
   - Restart backend after changing CORS

### Frontend Shows 404

1. **Check frontend is running**:
   ```bash
   docker-compose ps frontend
   ```

2. **Check frontend logs**:
   ```bash
   docker-compose logs frontend
   ```

3. **Rebuild frontend**:
   ```bash
   docker-compose build frontend
   docker-compose up -d frontend
   ```

### Port Already in Use

If port 3000 or 3002 is already in use:

1. **Find process using port**:
   ```bash
   lsof -i :3000
   lsof -i :3002
   ```

2. **Kill process or change port**:
   ```bash
   # Change in docker-compose.yml
   ports:
     - "3001:3000"  # Use different host port
   ```

---

## Next Steps

1. **Start Frontend**: `docker-compose --profile frontend up -d frontend`
2. **Fix Backend Health**: Check logs and restart if needed
3. **Test Access**: Open `http://localhost:3000`
4. **Test Login**: Use test credentials
5. **Test Features**: Navigate through protected routes

---

**Last Updated**: 2024-01-XX












