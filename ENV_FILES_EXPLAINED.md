# Environment Files Explanation

## Two Different `.env` Files

You have **two separate `.env` files** that serve different purposes:

### 1. Root `.env` (`/home/bkg/ns/.env`)
**Purpose**: Used by **Docker Compose** to configure container environment variables

**Used by**: 
- `docker-compose.yml` (reads variables and passes them to containers)
- Docker containers (as environment variables)

**Location**: `/home/bkg/ns/.env`

**Variables needed**:
```env
# Docker Compose variables
POSTGRES_USER=ehr_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=surgical_ehr
POSTGRES_PORT=5432
REDIS_PASSWORD=your_redis_password
BACKEND_PORT=3001
```

### 2. Backend `.env` (`/home/bkg/ns/backend/.env`)
**Purpose**: Used by **NestJS application** when running **locally** (outside Docker)

**Used by**:
- NestJS `ConfigModule` when running `npm run dev` locally
- Prisma Client when running migrations locally
- Direct backend execution (not in container)

**Location**: `/home/bkg/ns/backend/.env`

**Variables needed**:
```env
# NestJS application variables
DATABASE_URL=postgresql://ehr_user:password@localhost:5432/surgical_ehr?schema=public
PORT=3001
NODE_ENV=development
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=*
```

---

## How They Work Together

### Scenario 1: Running in Docker (Recommended)

```
Root .env → docker-compose.yml → Container Environment → NestJS reads from process.env
```

1. Docker Compose reads `/home/bkg/ns/.env`
2. Passes variables to containers via `environment:` section
3. NestJS reads from `process.env` (which comes from container environment)
4. **Backend `.env` is NOT used** (container doesn't mount it)

### Scenario 2: Running Locally (npm run dev)

```
Backend .env → NestJS ConfigModule → Application
```

1. You run `npm run dev` in `/home/bkg/ns/backend/`
2. NestJS `ConfigModule.forRoot()` reads `/home/bkg/ns/backend/.env`
3. Application uses these values
4. **Root `.env` is NOT used** (Docker Compose not involved)

---

## Recommended Setup

### Option A: Docker Development (Recommended)

**Use**: Root `.env` only

```bash
# Create root .env
cd /home/bkg/ns
cat > .env << 'EOF'
NODE_ENV=development
BACKEND_PORT=3001
POSTGRES_USER=ehr_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=surgical_ehr
POSTGRES_PORT=5432
REDIS_PASSWORD=your_redis_password
JWT_SECRET=your_jwt_secret_min_32_chars
CORS_ORIGIN=*
EOF

# Start with Docker
docker-compose up -d
```

**Note**: Docker Compose automatically passes these to the backend container, so NestJS reads them from `process.env`.

### Option B: Local Development (No Docker)

**Use**: Backend `.env` only

```bash
# Create backend .env
cd /home/bkg/ns/backend
cat > .env << 'EOF'
DATABASE_URL=postgresql://ehr_user:password@localhost:5432/surgical_ehr?schema=public
PORT=3001
NODE_ENV=development
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=*
API_PREFIX=api/v1
EOF

# Run locally
npm run dev
```

### Option C: Both (Hybrid)

**Use**: Both files with same values

- Root `.env` for Docker Compose
- Backend `.env` for local development

**Keep them in sync** for consistency.

---

## Current Docker Compose Configuration

Looking at `docker-compose.yml`, the backend container gets environment variables like this:

```yaml
backend:
  environment:
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
    PORT: ${BACKEND_PORT:-3001}
    NODE_ENV: ${NODE_ENV:-development}
    JWT_SECRET: ${JWT_SECRET:-change-me-in-production}
```

These `${VARIABLE}` references come from the **root `.env`** file.

---

## Best Practice Recommendation

### For Docker Development:

1. **Create root `.env`** with all Docker Compose variables
2. **Delete or ignore** `backend/.env` when using Docker
3. Docker Compose passes variables → NestJS reads from `process.env`

### For Local Development:

1. **Create `backend/.env`** with full connection strings
2. NestJS reads directly from `backend/.env`

### To Avoid Confusion:

You can create a script that syncs them, or use a single source of truth:

```bash
# Sync root .env to backend .env (for local dev)
cat > sync-env.sh << 'EOF'
#!/bin/bash
source .env
cat > backend/.env << EOL
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}?schema=public
PORT=${BACKEND_PORT}
NODE_ENV=${NODE_ENV}
JWT_SECRET=${JWT_SECRET}
CORS_ORIGIN=${CORS_ORIGIN}
EOL
EOF
chmod +x sync-env.sh
```

---

## Summary

| File | Purpose | Used By | When |
|------|---------|---------|------|
| `/home/bkg/ns/.env` | Docker Compose config | Docker Compose | Running with `docker-compose up` |
| `/home/bkg/ns/backend/.env` | NestJS app config | NestJS ConfigModule | Running with `npm run dev` locally |

**Recommendation**: Use root `.env` for Docker, and either sync it to `backend/.env` or delete `backend/.env` if you only use Docker.












