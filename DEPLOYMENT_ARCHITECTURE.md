# Deployment Architecture

## Overview

This application uses a **microservices architecture** with separate containers for frontend, backend, and infrastructure services. In production, all services are unified behind an Nginx reverse proxy that routes requests appropriately.

## Architecture Diagrams

### Development Mode

```
┌─────────────────────────────────────────────────────────┐
│                    Developer Machine                    │
│                                                         │
│  ┌──────────────┐         ┌──────────────┐            │
│  │   Browser    │────────▶│   Frontend   │            │
│  │ localhost:3000│         │  (Next.js)   │            │
│  │              │         │  Port: 3000  │            │
│  └──────────────┘         └──────┬───────┘            │
│                                  │                     │
│                                  │ API Calls           │
│                                  │ localhost:3002      │
│                                  ▼                     │
│                          ┌──────────────┐             │
│                          │   Backend    │             │
│                          │  (NestJS)    │             │
│                          │  Port: 3002  │             │
│                          └──────┬───────┘             │
│                                 │                     │
│                    ┌────────────┼────────────┐        │
│                    ▼            ▼            ▼        │
│            ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│            │ Postgres │  │  Redis   │  │   ...    │  │
│            │  :5432   │  │  :6379   │  │          │  │
│            └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Characteristics:**
- Frontend and backend run as separate services
- Each service exposes its own port
- Frontend makes API calls to `localhost:3002` (backend port)
- Hot-reload enabled via volume mounts
- Services started independently using Docker Compose profiles

### Production Mode

```
┌─────────────────────────────────────────────────────────┐
│                    Production Server                    │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Nginx Reverse Proxy                 │  │
│  │            Ports: 80 (HTTP), 443 (HTTPS)         │  │
│  └─────────────────┬────────────────────────────────┘  │
│                    │                                     │
│        ┌───────────┴───────────┐                        │
│        │                       │                        │
│   /api/*                  /* (other)                    │
│        │                       │                        │
│        ▼                       ▼                        │
│  ┌──────────┐          ┌──────────┐                   │
│  │ Backend  │          │ Frontend │                   │
│  │ (NestJS) │          │ (Next.js)│                   │
│  │ :3001    │          │ :3000    │                   │
│  └────┬─────┘          └────┬─────┘                   │
│       │                     │                          │
│       │          ┌──────────┴──────────┐              │
│       │          │                     │              │
│       ▼          ▼                     ▼              │
│  ┌─────────┐ ┌─────────┐        ┌─────────┐         │
│  │Postgres │ │  Redis  │        │  ...    │         │
│  │ :5432   │ │ :6379   │        │         │         │
│  └─────────┘ └─────────┘        └─────────┘         │
└─────────────────────────────────────────────────────────┘
```

**Characteristics:**
- Single entry point via Nginx (port 80/443)
- Nginx routes `/api/*` requests to backend
- Nginx routes all other requests to frontend
- Services communicate internally via Docker network
- No direct port exposure to external network
- Optimized production builds (no source code volumes)

## Request Flow

### Production Request Flow

1. **Client Request**: `https://yourdomain.com/admin/users`
   - Browser makes HTTPS request to Nginx (port 443)

2. **Nginx Routing**:
   - Request path: `/admin/users` (doesn't start with `/api/`)
   - Routes to: `http://frontend:3000` (internal Docker network)

3. **Frontend (Next.js)**:
   - Next.js serves the page
   - Client-side JavaScript makes API calls to `/api/v1/admin/users`
   - These API calls go back through Nginx

4. **API Request**: `https://yourdomain.com/api/v1/admin/users`
   - Nginx sees `/api/` prefix
   - Routes to: `http://backend:3001/api/v1/admin/users`

5. **Backend (NestJS)**:
   - Processes request
   - Returns JSON response
   - Response flows back through Nginx to browser

## Docker Compose Configuration

### Development (`docker-compose.yml`)

```yaml
services:
  backend:
    ports:
      - "3002:3001"  # Exposed for direct access
    profiles: []  # Always running
    
  frontend:
    ports:
      - "3000:3000"  # Exposed for direct access
    profiles:
      - frontend  # Started separately
```

**Usage:**
```bash
# Start backend and infrastructure
docker-compose up -d

# Start frontend separately
docker-compose --profile frontend up -d frontend
```

### Production (`docker-compose.prod.yml`)

```yaml
services:
  backend:
    build:
      dockerfile: Dockerfile
      target: production
    # No port exposure (internal only)
    
  frontend:
    build:
      dockerfile: Dockerfile
      target: runner
    # No port exposure (internal only)
    
  nginx:
    ports:
      - "80:80"
      - "443:443"  # Only exposed port
    depends_on:
      - backend
      - frontend
```

**Usage:**
```bash
# Start all services (including nginx)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Why Separate Services?

### Benefits

1. **Independent Scaling**: Scale frontend and backend independently based on load
2. **Technology Flexibility**: Use different runtime environments if needed
3. **Development Isolation**: Developers can work on frontend/backend separately
4. **Deployment Flexibility**: Deploy frontend and backend updates independently
5. **Resource Management**: Allocate resources per service (CPU/memory limits)
6. **Security**: Internal services not exposed to external network

### Trade-offs

1. **Complexity**: More services to manage and monitor
2. **Network Overhead**: Inter-service communication adds slight latency
3. **Configuration**: Need to configure routing and service discovery

## Environment Variables

### Frontend Environment Variables

```env
# Server-side API URL (used by Next.js server-side code)
NEXT_PUBLIC_API_URL=http://backend:3001/api/v1

# Browser API URL (used by client-side JavaScript)
# In production with Nginx: use relative path
NEXT_PUBLIC_API_URL_BROWSER=/api/v1
# In development: use absolute URL
NEXT_PUBLIC_API_URL_BROWSER=http://localhost:3002/api/v1
```

**Important**: 
- `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time
- Browser makes requests using `NEXT_PUBLIC_API_URL_BROWSER`
- Next.js server-side code uses `NEXT_PUBLIC_API_URL`

### Backend Environment Variables

```env
CORS_ORIGIN=https://yourdomain.com  # Production domain
# or
CORS_ORIGIN=http://localhost:3000   # Development
```

## Deployment Steps

### Production Deployment

1. **Build and start all services**:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   ```

2. **Configure SSL** (if using HTTPS):
   - Update `nginx/conf.d/default.conf`
   - Add SSL certificates to `nginx/ssl/`
   - Uncomment HTTPS server block

3. **Verify services are running**:
   ```bash
   docker-compose ps
   ```

4. **Check logs**:
   ```bash
   docker-compose logs nginx
   docker-compose logs frontend
   docker-compose logs backend
   ```

### Development Setup

1. **Start backend and infrastructure**:
   ```bash
   docker-compose up -d
   ```

2. **Start frontend** (optional, for UI development):
   ```bash
   docker-compose --profile frontend up -d frontend
   ```

## Service Communication

### Internal Docker Network

All services are on the same Docker network (`ehr-network`), allowing them to communicate using service names:

- `backend:3001` - Backend API
- `frontend:3000` - Frontend server
- `postgres:5432` - Database
- `redis:6379` - Redis cache

### External Access

- **Development**: Direct access via exposed ports
  - Frontend: `http://localhost:3000`
  - Backend: `http://localhost:3002`
  
- **Production**: Single entry point via Nginx
  - Application: `https://yourdomain.com`
  - API: `https://yourdomain.com/api/v1/...`

## Monitoring and Health Checks

### Health Check Endpoints

- **Backend**: `/api/v1/health`
- **Frontend**: Next.js built-in health checks
- **PostgreSQL**: `pg_isready`
- **Redis**: `redis-cli ping`

### Service Dependencies

Services start in order based on `depends_on`:
1. PostgreSQL & Redis (infrastructure)
2. Backend (depends on DB/Redis)
3. Frontend (depends on backend)
4. Nginx (depends on backend & frontend)

## Scaling Considerations

### Horizontal Scaling

You can scale services independently:

```bash
# Scale backend to 3 instances
docker-compose up -d --scale backend=3

# Scale frontend to 2 instances
docker-compose up -d --scale frontend=2
```

**Note**: For production scaling, consider:
- Load balancer configuration in Nginx
- Session storage (if using sessions, move to Redis)
- Database connection pooling limits
- File storage (use shared storage for uploads)

### Vertical Scaling

Adjust resource limits in `docker-compose.prod.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

## Security Considerations

1. **No Direct Service Exposure**: Only Nginx is exposed to the internet
2. **Internal Network**: Services communicate on private Docker network
3. **SSL Termination**: Nginx handles SSL/TLS encryption
4. **Security Headers**: Configured in Nginx and Next.js
5. **CORS**: Backend validates origin via `CORS_ORIGIN` environment variable

## Troubleshooting

### Services Can't Communicate

- Verify services are on the same network: `docker network inspect ehr-network`
- Check service names match in configuration
- Verify ports are correct (internal ports, not exposed ports)

### Frontend Can't Reach Backend

- Check `NEXT_PUBLIC_API_URL_BROWSER` environment variable
- Verify Nginx routing configuration
- Check browser network tab for actual request URLs
- Verify CORS configuration on backend

### Nginx Routing Issues

- Check Nginx logs: `docker-compose logs nginx`
- Verify upstream servers are defined correctly
- Test Nginx configuration: `docker-compose exec nginx nginx -t`
- Reload Nginx: `docker-compose exec nginx nginx -s reload`









