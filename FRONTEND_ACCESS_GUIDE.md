# Frontend Access Guide

## Quick Start

### 1. Start Frontend Service

```bash
# Start frontend (will start backend if not running)
docker-compose --profile frontend up -d frontend

# Or start everything including frontend
docker-compose --profile frontend up -d
```

### 2. Access Frontend

**Open in browser**: **http://localhost:3000**

### 3. Check Status

```bash
docker-compose ps
```

---

## Current Setup

### Service Ports

| Service | Container Port | Host Port | Access URL |
|---------|---------------|-----------|------------|
| **Frontend** | 3000 | 3000 | http://localhost:3000 |
| **Backend** | 3001 | 3002 | http://localhost:3002/api/v1 |
| **PostgreSQL** | 5432 | 5432 | localhost:5432 |
| **Redis** | 6379 | 6379 | localhost:6379 |

### Frontend Connection

The frontend connects to the backend in two ways:

1. **Server-Side (SSR)**: `http://backend:3001/api/v1` (Docker internal network)
2. **Client-Side (Browser)**: `http://localhost:3002/api/v1` (from your browser)

The `env.ts` file automatically selects the correct URL based on context.

---

## Testing the Frontend

### 1. Check Frontend is Running

```bash
docker-compose ps frontend
```

Should show: `Up` status

### 2. Access Login Page

Open: **http://localhost:3000/login**

You should see the login form.

### 3. Test API Connection

Open browser DevTools → Network tab, then:
- Try to login (will show API calls)
- Check for CORS errors in Console
- Verify API calls go to `http://localhost:3002/api/v1/*`

### 4. Test Protected Routes

After login, test:
- `/dashboard` - Dashboard page
- `/patients` - Patients list (requires `patients:*:read`)
- `/medical-records` - Medical records (requires `medical_records:*:read`)
- `/theater/cases` - Surgical cases (requires `theater:*:read`)

---

## Troubleshooting

### Frontend Won't Start

**Error**: `Container is unhealthy`

**Solution**: Frontend depends on backend. If backend is unhealthy, frontend won't start.

```bash
# Check backend status
docker-compose ps backend

# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend

# Then start frontend
docker-compose --profile frontend up -d frontend
```

### Can't Access Frontend

**Error**: Connection refused or timeout

**Check**:
1. Frontend is running: `docker-compose ps frontend`
2. Port 3000 is available: `lsof -i :3000`
3. Frontend logs: `docker-compose logs frontend`

### CORS Errors

**Error**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Fix**: Update backend CORS settings:

```bash
# In .env file
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Restart backend
docker-compose restart backend
```

### API Calls Fail

**Error**: `Network Error` or `404 Not Found`

**Check**:
1. Backend is running: `docker-compose ps backend`
2. Backend API works: `curl http://localhost:3002/api/v1/auth/me`
3. Environment variables: Check `NEXT_PUBLIC_API_URL_BROWSER` in frontend

---

## Development Workflow

### Option 1: Docker (Recommended for Testing)

```bash
# Start all services
docker-compose --profile frontend up -d

# View logs
docker-compose logs -f frontend

# Rebuild after changes
docker-compose build frontend
docker-compose restart frontend
```

### Option 2: Local Development (Faster Iteration)

```bash
# Terminal 1: Start backend (Docker)
make dev

# Terminal 2: Start frontend (Local)
cd client
npm install
npm run dev
```

Frontend will run on `http://localhost:3000` and connect to backend at `http://localhost:3002/api/v1`.

---

## Environment Variables

### Frontend Environment

Set in `docker-compose.yml` or `.env`:

```bash
NEXT_PUBLIC_API_URL=http://backend:3001/api/v1
NEXT_PUBLIC_API_URL_BROWSER=http://localhost:3002/api/v1
NEXT_PUBLIC_APP_NAME=Nairobi Sculpt EHR
NEXT_PUBLIC_APP_ENV=development
```

### Backend Environment

Set in `.env`:

```bash
BACKEND_PORT=3002
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
JWT_SECRET=your-secret-key
```

---

## Quick Commands

```bash
# Start frontend
docker-compose --profile frontend up -d frontend

# Stop frontend
docker-compose stop frontend

# View frontend logs
docker-compose logs -f frontend

# Rebuild frontend
docker-compose build frontend

# Restart frontend
docker-compose restart frontend

# Access frontend shell
docker-compose exec frontend sh
```

---

## Next Steps

1. ✅ Start frontend: `docker-compose --profile frontend up -d frontend`
2. ✅ Access: http://localhost:3000
3. ✅ Test login with test credentials
4. ✅ Navigate through protected routes
5. ✅ Test role-based access (try different user roles)
6. ✅ Test permission-based UI (check sidebar visibility)

---

**Frontend URL**: http://localhost:3000  
**Backend API**: http://localhost:3002/api/v1












