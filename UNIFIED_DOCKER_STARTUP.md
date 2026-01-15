# Unified Docker Development Environment

## Problem Solved

The frontend service was configured with a `profiles: - frontend` setting, which meant it wouldn't start automatically with `docker-compose up`. This required manual intervention to start the frontend separately.

## Solution

Updated all startup scripts and created a unified startup command that includes the frontend profile by default.

---

## Quick Start

### Option 1: Use the Unified Startup Script (Recommended)

```bash
./start-dev.sh
```

This single command starts:
- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ Backend API
- ✅ Frontend application

### Option 2: Use Make Commands

```bash
make dev
# or
make up
```

### Option 3: Use Docker Compose Directly

```bash
docker-compose --profile frontend up -d
```

---

## Service URLs

Once started, access services at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3002/api/v1
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## Common Commands

### Start Services
```bash
./start-dev.sh          # Unified startup (recommended)
make dev                # Using Makefile
make up                 # Alias for dev
```

### Stop Services
```bash
make down
# or
docker-compose down
```

### View Logs
```bash
make logs                    # All services
make logs SERVICE=frontend   # Frontend only
make logs SERVICE=backend    # Backend only
```

### Check Status
```bash
make status
# or
docker-compose --profile frontend ps
```

### Rebuild Services
```bash
make rebuild
# or
docker-compose --profile frontend up -d --build
```

### Database Operations
```bash
make db          # Open PostgreSQL shell
make migrate     # Run database migrations
```

---

## What Changed

### 1. Updated `scripts/docker-dev.sh`
- `start` command now includes `--profile frontend`
- `rebuild` command now includes `--profile frontend`
- `status` command now includes `--profile frontend`
- Updated help text to reflect frontend inclusion

### 2. Created `start-dev.sh`
- Unified startup script for complete environment
- Shows service URLs after startup
- Displays useful commands
- Shows service status

### 3. Updated `Makefile` Help
- Clarified that `make dev` starts all services including frontend

---

## Why Use Profiles?

The frontend service still uses a profile for flexibility:

- **Development**: Start everything with `--profile frontend`
- **Backend Only**: Start without profile (faster for backend-only work)
- **Production**: Uses different profile for nginx reverse proxy

This gives you the flexibility to run only what you need, while the unified startup scripts make it easy to start everything for full-stack development.

---

## Verification

After starting, verify all services are running:

```bash
docker-compose --profile frontend ps
```

Should show:
- ✅ postgres (healthy)
- ✅ redis (healthy)
- ✅ backend (healthy or starting)
- ✅ frontend (running)

---

## Troubleshooting

### Frontend Not Starting
```bash
# Check if it's running
docker-compose --profile frontend ps frontend

# View logs
docker-compose logs frontend

# Restart frontend
docker-compose restart frontend
```

### Backend Not Healthy
```bash
# Check backend logs
docker-compose logs backend

# Verify database connection
docker-compose exec backend npm run db:check
```

### Port Conflicts
If ports are already in use:
```bash
# Check what's using the ports
sudo lsof -i :3000  # Frontend
sudo lsof -i :3002  # Backend
sudo lsof -i :5432  # PostgreSQL
```

---

## Next Steps

1. Run `./start-dev.sh` to start everything
2. Wait for services to be healthy (check with `make status`)
3. Access frontend at http://localhost:3000
4. Test patient registration with user account creation
