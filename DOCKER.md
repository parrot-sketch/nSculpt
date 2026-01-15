# Docker Containerization Guide
## Enterprise Surgical EHR System

This guide explains how to set up and run the EHR system using Docker and Docker Compose.

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Services Overview](#services-overview)
- [Environment Variables](#environment-variables)
- [Common Operations](#common-operations)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ RAM available
- 10GB+ disk space

### Verify Installation

```bash
docker --version
docker-compose --version
```

---

## Quick Start

### 1. Clone and Navigate

```bash
cd /path/to/ns
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start Development Environment

```bash
# Using helper script
chmod +x scripts/docker-dev.sh
./scripts/docker-dev.sh start

# Or directly with docker-compose
docker-compose up -d
```

### 4. Verify Services

```bash
docker-compose ps
```

You should see:
- ✅ `ehr-postgres` - Database
- ✅ `ehr-redis` - Cache/Queue
- ✅ `ehr-backend` - NestJS API
- ⚙️ `ehr-pgadmin` - DB Admin (optional)

### 5. Access Services

- **Backend API**: http://localhost:3001/api/v1
- **pgAdmin**: http://localhost:5050 (if enabled)
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## Development Setup

### Starting Development Environment

```bash
# Start all services
./scripts/docker-dev.sh start

# Or with docker-compose
docker-compose up -d
```

### Viewing Logs

```bash
# All services
./scripts/docker-dev.sh logs

# Specific service
./scripts/docker-dev.sh logs backend
docker-compose logs -f backend
```

### Database Migrations

```bash
# Run migrations
./scripts/docker-dev.sh migrate

# Or manually
docker-compose exec backend npm run schema:migrate
```

### Accessing Containers

```bash
# Backend shell
./scripts/docker-dev.sh shell backend
docker-compose exec backend sh

# PostgreSQL shell
./scripts/docker-dev.sh db
docker-compose exec postgres psql -U ehr_user -d surgical_ehr
```

### Rebuilding After Code Changes

```bash
# Rebuild and restart
./scripts/docker-dev.sh rebuild

# Or manually
docker-compose up -d --build backend
```

### Stopping Services

```bash
./scripts/docker-dev.sh stop
# Or
docker-compose down
```

---

## Production Deployment

### 1. Create Production Environment File

```bash
cp .env.example .env.production
# Edit .env.production with production values
# IMPORTANT: Change all passwords and secrets!
```

### 2. Deploy

```bash
# Using helper script
chmod +x scripts/docker-prod.sh
./scripts/docker-prod.sh deploy

# Or manually
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 3. Enable Nginx (Optional)

Uncomment nginx configuration in `docker-compose.yml` and configure SSL certificates.

### 4. Database Backup

```bash
./scripts/docker-prod.sh backup-db
```

---

## Services Overview

### Backend (NestJS)

- **Container**: `ehr-backend`
- **Port**: 3001
- **Health Check**: `/api/v1/patients`
- **Volumes**: 
  - Code mounted for hot reload (dev)
  - Logs persisted

### PostgreSQL Database

- **Container**: `ehr-postgres`
- **Port**: 5432
- **Data**: Persisted in `postgres_data` volume
- **Health Check**: `pg_isready`

### Redis

- **Container**: `ehr-redis`
- **Port**: 6379
- **Data**: Persisted in `redis_data` volume
- **Use**: BullMQ queues, caching

### pgAdmin (Optional)

- **Container**: `ehr-pgadmin`
- **Port**: 5050
- **Profile**: `tools`
- **Enable**: `docker-compose --profile tools up pgadmin`

### Nginx (Production)

- **Container**: `ehr-nginx`
- **Ports**: 80, 443
- **Profile**: `production`
- **Use**: Reverse proxy, SSL termination

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Database password | `StrongPassword123!` |
| `JWT_SECRET` | JWT signing secret | `min-32-characters-long-secret` |
| `REDIS_PASSWORD` | Redis password | `RedisPassword123!` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_PORT` | `3001` | Backend API port |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `REDIS_PORT` | `6379` | Redis port |
| `CORS_ORIGIN` | `*` | CORS allowed origins |
| `NODE_ENV` | `development` | Environment mode |

See `.env.example` for complete list.

---

## Common Operations

### View Service Status

```bash
docker-compose ps
```

### View Resource Usage

```bash
docker stats
```

### Execute Commands in Containers

```bash
# Backend
docker-compose exec backend npm run schema:generate

# Database
docker-compose exec postgres psql -U ehr_user -d surgical_ehr

# Redis
docker-compose exec redis redis-cli
```

### Clean Up

```bash
# Stop and remove containers
docker-compose down

# Remove containers, networks, and volumes
./scripts/docker-dev.sh clean
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

### Database Operations

```bash
# Create backup
docker-compose exec postgres pg_dump -U ehr_user surgical_ehr > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U ehr_user surgical_ehr < backup.sql

# Access database
docker-compose exec postgres psql -U ehr_user -d surgical_ehr
```

---

## Troubleshooting

### Services Won't Start

1. **Check logs**:
   ```bash
   docker-compose logs
   ```

2. **Verify ports aren't in use**:
   ```bash
   netstat -tulpn | grep -E "3001|5432|6379"
   ```

3. **Check disk space**:
   ```bash
   df -h
   ```

### Database Connection Issues

1. **Wait for database to be ready**:
   ```bash
   docker-compose exec postgres pg_isready -U ehr_user
   ```

2. **Check database logs**:
   ```bash
   docker-compose logs postgres
   ```

3. **Verify connection string**:
   ```bash
   docker-compose exec backend printenv DATABASE_URL
   ```

### Backend Won't Start

1. **Check if dependencies are installed**:
   ```bash
   docker-compose exec backend npm list
   ```

2. **Rebuild container**:
   ```bash
   docker-compose up -d --build backend
   ```

3. **Check application logs**:
   ```bash
   docker-compose logs -f backend
   ```

### Permission Issues

If you encounter permission issues:

```bash
# Fix ownership
sudo chown -R $USER:$USER .

# Or run with sudo (not recommended)
sudo docker-compose up -d
```

### Volume Issues

If volumes aren't mounting correctly:

```bash
# Remove and recreate volumes
docker-compose down -v
docker-compose up -d
```

---

## Development vs Production

### Development

- Uses `Dockerfile.dev` with hot reload
- Code mounted as volumes
- All services exposed on localhost
- Debug logging enabled
- No resource limits

### Production

- Uses `Dockerfile` (multi-stage build)
- Code baked into image
- Only necessary ports exposed
- Resource limits configured
- Optimized PostgreSQL settings
- Nginx reverse proxy (optional)

---

## Security Considerations

1. **Never commit `.env` files**
2. **Use strong passwords in production**
3. **Rotate secrets regularly**
4. **Use SSL/TLS in production**
5. **Limit container resources**
6. **Run containers as non-root users**
7. **Keep images updated**

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NestJS Deployment](https://docs.nestjs.com/recipes/docker)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)
- [Redis Docker](https://hub.docker.com/_/redis)

---

## Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Review this documentation
3. Check service health: `docker-compose ps`
4. Verify environment variables

---

**Last Updated**: 2025-12-30












