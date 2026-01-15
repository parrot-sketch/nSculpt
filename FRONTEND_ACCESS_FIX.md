# Frontend Access Fix

## Issue
Frontend was not accessible on port 3000 because it wasn't running.

## Root Cause
The frontend service in `docker-compose.yml` is configured with a **profile**:
```yaml
profiles:
  - frontend
```

Services with profiles don't start by default with `docker-compose up`. They need to be explicitly started with the profile.

## Solution

### Start Frontend Service
```bash
# Start frontend with profile
docker-compose --profile frontend up -d frontend

# Or start all services including frontend
docker-compose --profile frontend up -d
```

### Update Makefile (Optional)
You can update the Makefile to include the frontend profile by default:

```makefile
dev up:
	@docker-compose --profile frontend up -d
```

## Current Status

✅ **Frontend is now running**
- Container: `ehr-frontend`
- Port: `3000` (mapped to host)
- Status: Up and ready
- Access: http://localhost:3000

## Service Configuration

The frontend service:
- **Depends on**: `backend` (must be started first)
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: `http://backend:3001/api/v1` (server-side)
  - `NEXT_PUBLIC_API_URL_BROWSER`: `http://localhost:3002/api/v1` (browser)
- **Volumes**: Live code reloading enabled
- **Network**: `ehr-network` (can communicate with backend)

## Verification

```bash
# Check frontend is running
docker-compose ps frontend

# View frontend logs
docker-compose logs -f frontend

# Test frontend access
curl http://localhost:3000
```

## Why Use Profiles?

Profiles allow you to:
- **Development**: Start only backend, postgres, redis
- **Full Stack**: Start everything including frontend
- **Production**: Start with nginx reverse proxy

This gives flexibility to run only what you need for development.

## Quick Commands

```bash
# Start everything including frontend
docker-compose --profile frontend up -d

# Stop frontend
docker-compose stop frontend

# Restart frontend
docker-compose restart frontend

# Rebuild frontend
docker-compose build frontend
docker-compose --profile frontend up -d frontend
```






