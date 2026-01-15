# Workspace Permissions Fix Summary

## Problem Identified

**Issue**: Cannot write files in `/home/bkg/ns/backend/` directory

**Root Cause**: 
- Backend directory owned by user/group `1001:1001` (likely from Docker container)
- Current user is `bkg` (uid=1000, gid=1000)
- Docker volume mounts prevent Docker from changing host file ownership

**Affected Directories**:
- `/home/bkg/ns/backend/src/` - All source files
- `/home/bkg/ns/backend/src/modules/audit/services/` - Cannot create `rlsValidation.service.ts`

## Solution

### Option 1: Run Fix Script (Recommended)

A script has been created to fix permissions:

```bash
# Run the fix script
./fix-permissions.sh
```

This will:
1. Use sudo to change ownership to your user
2. Fix all source directories
3. Verify write permissions

### Option 2: Manual Fix with Sudo

```bash
# Fix source directories
sudo chown -R bkg:bkg /home/bkg/ns/backend/src
sudo chown -R bkg:bkg /home/bkg/ns/backend/prisma
sudo chown -R bkg:bkg /home/bkg/ns/backend/package.json
sudo chown -R bkg:bkg /home/bkg/ns/backend/tsconfig.json
sudo chown -R bkg:bkg /home/bkg/ns/backend/nest-cli.json
```

### Option 3: Fix Using Docker (Limited Success)

Docker volume mounts prevent changing ownership from inside container. However, you can:

1. Stop containers
2. Fix permissions on host
3. Restart containers

```bash
docker-compose down
sudo chown -R bkg:bkg /home/bkg/ns/backend/src
docker-compose up -d
```

## Verification

After fixing, verify:

```bash
# Check ownership
ls -la /home/bkg/ns/backend/src/modules/audit/services/

# Test write
touch /home/bkg/ns/backend/src/modules/audit/services/test.tmp
rm /home/bkg/ns/backend/src/modules/audit/services/test.tmp
echo "✅ Permissions fixed!"
```

## Why This Happened

1. **Docker Container User**: Backend container runs as user 1001
2. **Volume Mounts**: Files created in container are owned by container user
3. **Host Ownership**: Host filesystem retains container user ownership
4. **Permission Mismatch**: Your user (1000) ≠ Container user (1001)

## Prevention

### Option 1: Set Docker User ID

Update `docker-compose.yml`:

```yaml
backend:
  user: "${UID:-1000}:${GID:-1000}"
```

Set in `.env`:
```bash
UID=1000
GID=1000
```

### Option 2: Post-Start Script

Add to Makefile or startup script:
```bash
# After docker-compose up, fix permissions
sudo chown -R $(id -u):$(id -g) backend/src backend/prisma || true
```

### Option 3: Use Named Volumes

Instead of bind mounts, use named volumes (but this prevents live editing).

## Current Status

- **Backend Source**: Owned by `1001:1001` (needs to be `bkg:bkg`)
- **Write Access**: ❌ Denied
- **Action Required**: Run `./fix-permissions.sh` or manual sudo chown

## Next Steps After Fix

1. ✅ Fix permissions: `./fix-permissions.sh`
2. ✅ Create `rlsValidation.service.ts` (code in `SECURITY_GUARDS_IMPLEMENTATION.md`)
3. ✅ Restart backend: `docker-compose restart backend`
4. ✅ Verify backend health: `docker-compose ps backend`
5. ✅ Start frontend: `docker-compose --profile frontend up -d frontend`

---

**Script Created**: `fix-permissions.sh`  
**Run**: `./fix-permissions.sh` (requires sudo access)












