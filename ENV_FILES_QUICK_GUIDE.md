# Environment Files - Quick Guide

## Two `.env` Files - Different Purposes

### 1. Root `.env` (`/home/bkg/ns/.env`)
**For**: Docker Compose  
**Used when**: Running with `docker-compose up`

```env
# Docker Compose reads these
POSTGRES_USER=ehr_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=surgical_ehr
BACKEND_PORT=3001
JWT_SECRET=your_secret
```

### 2. Backend `.env` (`/home/bkg/ns/backend/.env`)
**For**: NestJS Application  
**Used when**: Running locally with `npm run dev` (outside Docker)

```env
# NestJS ConfigModule reads these
DATABASE_URL=postgresql://user:pass@localhost:5432/surgical_ehr
PORT=3001
NODE_ENV=development
JWT_SECRET=your_secret
```

---

## How It Works

### When Using Docker (Recommended)

```
Root .env → docker-compose.yml → Container Environment → NestJS (reads process.env)
```

✅ **Use**: Root `.env` only  
❌ **Ignore**: `backend/.env` (not used in Docker)

### When Running Locally (npm run dev)

```
Backend .env → NestJS ConfigModule → Application
```

✅ **Use**: `backend/.env` only  
❌ **Ignore**: Root `.env` (Docker Compose not running)

---

## Recommendation

**For Docker Development** (what we set up):

1. Create **root `.env`** with Docker variables
2. Docker Compose passes them to containers
3. NestJS reads from `process.env` (from container)
4. You can **delete or ignore** `backend/.env` when using Docker

**Example root `.env` for Docker:**

```env
NODE_ENV=development
BACKEND_PORT=3001
POSTGRES_USER=ehr_user
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=surgical_ehr
POSTGRES_PORT=5432
REDIS_PASSWORD=CHANGE_ME
JWT_SECRET=CHANGE_ME_MIN_32_CHARS
CORS_ORIGIN=*
```

Docker Compose will automatically construct `DATABASE_URL` and pass it to the backend container.

---

## Current Setup

Your `docker-compose.yml` already constructs the `DATABASE_URL` from root `.env`:

```yaml
backend:
  environment:
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
```

So you **only need the root `.env`** when using Docker! 🎉












