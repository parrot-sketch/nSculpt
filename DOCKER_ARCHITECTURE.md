# Docker Architecture & Service Interaction

## Overview
The system uses Docker Compose to orchestrate multiple services that work together to provide a complete EHR (Electronic Health Record) system.

## Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network (ehr-network)              │
│                    172.28.0.0/16                            │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │───▶│    Nginx     │───▶│   Backend    │  │
│  │  (Next.js)   │    │  (Reverse    │    │  (NestJS)    │  │
│  │  Port 3000   │    │   Proxy)     │    │  Port 3001   │  │
│  │              │    │  Port 80/443  │    │              │  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘  │
│                                                   │          │
│  ┌──────────────┐    ┌──────────────┐            │          │
│  │  PostgreSQL  │◀───┼──────────────┼────────────┘          │
│  │   Port 5432  │    │    Redis     │                       │
│  │              │    │   Port 6379   │                       │
│  └──────────────┘    └──────────────┘                       │
│                                                              │
│  ┌──────────────┐                                           │
│  │   pgAdmin    │  (Optional - Tools Profile)                │
│  │  Port 5050   │                                           │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

## Services

### 1. PostgreSQL Database (`postgres`)
- **Image**: `postgres:16-alpine`
- **Container**: `ehr-postgres`
- **Port**: `5432` (mapped to host)
- **Purpose**: Primary database for all EHR data
- **Network**: `ehr-network`
- **Health Check**: `pg_isready` command
- **Volumes**: 
  - `postgres_data`: Persistent database storage
  - `./backend/database/migrations`: Initial migration scripts

**Configuration**:
- Database: `surgical_ehr`
- User: `ehr_user`
- Password: From environment variable
- Extensions: `pg_stat_statements` for query monitoring
- Max connections: 200
- Shared buffers: 256MB

### 2. Redis (`redis`)
- **Image**: `redis:7-alpine`
- **Container**: `ehr-redis`
- **Port**: `6379` (mapped to host)
- **Purpose**: 
  - BullMQ job queue backend
  - Session caching
  - General caching layer
- **Network**: `ehr-network`
- **Health Check**: `redis-cli ping`
- **Volumes**: `redis_data` for persistence
- **Security**: Password-protected (from env)

### 3. Backend API (`backend`)
- **Image**: Built from `./backend/Dockerfile.dev`
- **Container**: `ehr-backend`
- **Port**: `3001` (internal) → `3002` (host)
- **Purpose**: NestJS REST API server
- **Network**: `ehr-network`
- **Depends On**: 
  - `postgres` (must be healthy)
  - `redis` (must be healthy)

**Environment Variables**:
- `DATABASE_URL`: Constructed dynamically with URL-encoded password
- `POSTGRES_HOST`: `postgres` (service name)
- `REDIS_HOST`: `redis` (service name)
- `CORS_ORIGIN`: `http://localhost:3000`

**Volumes**:
- `./backend:/app`: Live code reloading
- `/app/node_modules`: Isolated dependencies
- `/app/dist`: Build output
- `backend_logs`: Application logs

**Startup Process**:
1. Entrypoint script (`docker-entrypoint.sh`) runs:
   - Constructs `DATABASE_URL` with proper URL encoding
   - Waits for PostgreSQL to be ready
   - Generates Prisma Client
   - Validates database connection
   - Fixes file permissions
2. Runs `npm run dev` (development mode with watch)

### 4. Frontend (`frontend`)
- **Image**: Built from `./client/Dockerfile.dev`
- **Container**: `ehr-frontend`
- **Port**: `3000` (mapped to host)
- **Purpose**: Next.js React application
- **Network**: `ehr-network`
- **Depends On**: `backend` (service_started)

**Environment Variables**:
- `NEXT_PUBLIC_API_URL`: `http://backend:3001/api/v1` (server-side requests)
- `NEXT_PUBLIC_API_URL_BROWSER`: `http://localhost:3002/api/v1` (browser requests)

**Why Two API URLs?**
- **Server-side** (Next.js SSR/API routes): Uses Docker service name `backend:3001` because requests come from within the Docker network
- **Browser-side** (client components): Uses `localhost:3002` because browser requests come from the host machine, not the container

**Volumes**:
- `./client:/app`: Live code reloading
- `/app/node_modules`: Isolated dependencies

**Profile**: `frontend` (optional - only starts with profile)

### 5. Nginx Reverse Proxy (`nginx`)
- **Image**: `nginx:alpine`
- **Container**: `ehr-nginx`
- **Ports**: `80` (HTTP), `443` (HTTPS)
- **Purpose**: 
  - Routes `/api/*` requests to backend
  - Routes all other requests to frontend
  - SSL termination (production)
  - Load balancing (future)
- **Network**: `ehr-network`
- **Depends On**: `backend`, `frontend`
- **Profile**: `production` (only starts in production mode)

**Routing Rules**:
```
/api/*     → http://backend:3001
/*         → http://frontend:3000
```

### 6. pgAdmin (Optional)
- **Image**: `dpage/pgadmin4:latest`
- **Container**: `ehr-pgadmin`
- **Port**: `5050` (mapped to host)
- **Purpose**: Database administration GUI
- **Profile**: `tools` (only starts with profile)
- **Access**: http://localhost:5050

## Service Interaction Flow

### 1. User Request Flow (Production with Nginx)
```
Browser → Nginx:80 → /api/* → Backend:3001
                  → /* → Frontend:3000
```

### 2. Development Flow (No Nginx)
```
Browser → Frontend:3000 (Next.js)
         → API calls → Backend:3002 (via localhost)
```

### 3. Backend → Database
```
Backend → postgres:5432 (using service name in Docker network)
```

### 4. Backend → Redis
```
Backend → redis:6379 (using service name in Docker network)
```

### 5. Frontend → Backend (Server-side)
```
Frontend (SSR/API routes) → backend:3001 (Docker service name)
```

### 6. Frontend → Backend (Browser)
```
Browser → localhost:3002 (host port mapping)
```

## Network Communication

### Docker Network: `ehr-network`
- **Type**: Bridge network
- **Subnet**: `172.28.0.0/16`
- **DNS**: Service names resolve to container IPs
  - `postgres` → PostgreSQL container IP
  - `redis` → Redis container IP
  - `backend` → Backend container IP
  - `frontend` → Frontend container IP

### Service Discovery
Services communicate using Docker service names:
- `postgres:5432` (not `localhost:5432`)
- `redis:6379` (not `localhost:6379`)
- `backend:3001` (not `localhost:3001`)

This works because Docker's built-in DNS resolves service names to container IPs within the network.

## Health Checks

### PostgreSQL
```bash
pg_isready -U ehr_user -d surgical_ehr
```
- Interval: 10s
- Timeout: 5s
- Retries: 5

### Redis
```bash
redis-cli ping
```
- Interval: 10s
- Timeout: 3s
- Retries: 5

### Backend
```bash
GET http://localhost:3001/api/v1/health/ready
```
- Interval: 30s
- Timeout: 10s
- Retries: 3
- Start period: 40s (gives time for app to start)

## Startup Dependencies

```
postgres (healthy) ──┐
                     ├──> backend (waits for both)
redis (healthy) ────┘

backend (started) ──> frontend (waits for backend to start)

backend ──┐
          ├──> nginx (waits for both)
frontend ─┘
```

## Volume Management

### Named Volumes (Persistent)
- `postgres_data`: Database files
- `redis_data`: Redis persistence
- `pgadmin_data`: pgAdmin settings
- `backend_logs`: Application logs
- `nginx_logs`: Nginx access/error logs

### Bind Mounts (Development)
- `./backend:/app`: Backend source code (live reload)
- `./client:/app`: Frontend source code (live reload)
- `./nginx/nginx.conf`: Nginx configuration
- `./nginx/conf.d`: Nginx server configs

## Environment Variables

Key environment variables are set in `docker-compose.yml`:
- Database credentials
- Redis password
- JWT secret
- CORS origin
- Port mappings

These can be overridden via `.env` file or environment variables.

## Development vs Production

### Development Mode
- Services run with `docker-compose up`
- Hot reload enabled (volume mounts)
- Debug ports exposed
- No Nginx (direct access to services)
- Frontend profile optional

### Production Mode
- Services run with `docker-compose.prod.yml`
- Nginx reverse proxy enabled
- SSL/TLS configured
- Optimized builds
- Health checks more strict

## Common Commands

```bash
# Start all services
make dev
# or
docker-compose up -d

# Rebuild and restart
make rebuild
# or
docker-compose up -d --build

# View logs
make logs
# or
docker-compose logs -f backend

# Access backend shell
make shell
# or
docker-compose exec backend sh

# Access database
make db
# or
docker-compose exec postgres psql -U ehr_user -d surgical_ehr

# Stop services
make down
# or
docker-compose down
```

## Troubleshooting

### Backend can't connect to database
- Check `postgres` service is healthy: `docker-compose ps`
- Verify `DATABASE_URL` in backend logs
- Check network: `docker network inspect ehr-network`

### Frontend can't reach backend
- Verify backend is running: `curl http://localhost:3002/api/v1/health`
- Check `NEXT_PUBLIC_API_URL_BROWSER` environment variable
- Ensure CORS is configured correctly

### Services not starting
- Check logs: `docker-compose logs [service-name]`
- Verify health checks: `docker-compose ps`
- Check dependencies: Ensure parent services are healthy






