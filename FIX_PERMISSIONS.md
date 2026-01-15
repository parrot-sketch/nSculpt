# Fix Workspace Permissions

## Problem Identified

The `backend` directory and its subdirectories are owned by user/group `1001:1001`, but your current user is `bkg` (uid=1000, gid=1000). This prevents you from creating or modifying files in the backend directory.

**Root Cause**: Files were created by Docker container (running as user 1001) or another process, and ownership wasn't set correctly.

## Solution Options

### Option 1: Fix Using Docker (Recommended)

Since the Docker container runs as root, you can use it to fix permissions:

```bash
# Stop containers first
docker-compose down

# Fix ownership using Docker (if container is running)
docker-compose exec backend chown -R 1000:1000 /app

# Or if container is stopped, start it temporarily
docker-compose run --rm backend chown -R 1000:1000 /app
```

### Option 2: Fix Using Sudo (If you have sudo access)

```bash
sudo chown -R bkg:bkg /home/bkg/ns/backend
```

### Option 3: Fix Specific Directories

If you only need to fix specific directories:

```bash
# Fix audit services directory
sudo chown -R bkg:bkg /home/bkg/ns/backend/src/modules/audit/services

# Fix all source directories
sudo chown -R bkg:bkg /home/bkg/ns/backend/src
```

## Verification

After fixing permissions, verify:

```bash
# Check ownership
ls -la /home/bkg/ns/backend/src/modules/audit/services/

# Test write permission
touch /home/bkg/ns/backend/src/modules/audit/services/test.tmp
rm /home/bkg/ns/backend/src/modules/audit/services/test.tmp
echo "✅ Permissions fixed!"
```

## Prevent Future Issues

### Option 1: Set Docker User ID

Update `docker-compose.yml` to use your user ID:

```yaml
backend:
  user: "${UID:-1000}:${GID:-1000}"
  # ... rest of config
```

Then set in `.env`:
```bash
UID=1000
GID=1000
```

### Option 2: Fix Ownership After Docker Operations

Add to your workflow:
```bash
# After docker-compose operations, fix ownership
docker-compose exec backend chown -R 1000:1000 /app || true
```

### Option 3: Use Docker Volume Permissions

Ensure volumes are mounted with correct permissions in `docker-compose.yml`.

## Current Status

**Backend Directory Ownership**: `1001:1001` (needs to be `bkg:bkg` or `1000:1000`)  
**Current User**: `bkg` (uid=1000, gid=1000)  
**Action Required**: Change ownership to match current user

## Quick Fix Command

Run this command (requires sudo or Docker access):

```bash
# Using Docker (if container is running)
docker-compose exec backend chown -R 1000:1000 /app

# Or using sudo
sudo chown -R bkg:bkg /home/bkg/ns/backend
```












