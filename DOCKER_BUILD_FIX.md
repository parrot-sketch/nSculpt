# Docker Build Issues - Fix Guide

## Issues Encountered

### 1. Network Error During npm ci
**Error:** `npm error code ECONNRESET`  
**Cause:** Network connectivity issues during package installation

**Fix Applied:**
- Added npm retry configuration
- Added retry logic with exponential backoff
- Improved error handling

### 2. Docker Compose ContainerConfig Error
**Error:** `KeyError: 'ContainerConfig'`  
**Cause:** Docker Compose v1.29.2 compatibility issue when recreating containers

**Fix:**
- Stop containers first: `docker-compose down`
- Then rebuild: `docker-compose build`
- Or use: `docker-compose up --build --force-recreate`

---

## Solutions

### Quick Fix (Recommended)

```bash
# 1. Stop all containers
docker-compose down

# 2. Remove old containers/images if needed
docker-compose rm -f
docker system prune -f

# 3. Rebuild with no cache
docker-compose build --no-cache backend

# 4. Start services
docker-compose up -d
```

### If Network Issues Persist

**Option 1: Use npm install instead of npm ci (less strict)**
```dockerfile
RUN npm install --legacy-peer-deps
```

**Option 2: Use npm cache and retry**
```dockerfile
RUN npm config set registry https://registry.npmjs.org/ && \
    npm cache clean --force && \
    npm ci
```

**Option 3: Build with network mode**
```bash
docker-compose build --network=host backend
```

### Docker Compose Version Issue

If you continue to see `ContainerConfig` errors:

**Option 1: Use docker compose (v2) instead of docker-compose (v1)**
```bash
# Use 'docker compose' (space, not hyphen) - this is Docker Compose v2
docker compose down
docker compose build
docker compose up
```

**Option 2: Update docker-compose**
```bash
# Check version
docker-compose --version

# Update if needed (varies by OS)
# Ubuntu/Debian:
sudo apt-get update && sudo apt-get install docker-compose-plugin

# Or use pip:
pip install --upgrade docker-compose
```

---

## Current Dockerfile.dev Improvements

✅ Added npm retry configuration  
✅ Added retry logic with delays  
✅ Better error messages  

---

## Testing the Fix

```bash
# Clean rebuild
cd /home/bkg/ns
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d backend

# Check logs
docker-compose logs -f backend
```

---

## Prevention

1. **Use Docker Compose v2** (recommended)
2. **Stable network connection** during builds
3. **npm cache** for faster rebuilds
4. **Multi-stage builds** to reduce build time

---

**Last Updated:** January 2, 2025










