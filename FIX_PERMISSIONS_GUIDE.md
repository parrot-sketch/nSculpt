# Fix Permission Issues Once and For All

## Problem
Docker containers run as user ID 1001, but your host user is 1000. When containers create/modify files in bind-mounted volumes, those files end up owned by 1001, preventing you from saving changes.

## Permanent Solution

### Step 1: Fix Current Permissions
Run this command to fix all existing files:
```bash
cd /home/bkg/ns
sudo ./fix-permissions-permanent.sh
```

Or manually:
```bash
sudo chown -R bkg:bkg /home/bkg/ns/backend
sudo chown -R bkg:bkg /home/bkg/ns/client
```

### Step 2: Configure Docker to Use Your User ID
Run the configuration script:
```bash
cd /home/bkg/ns
./configure-docker-user.sh
```

This creates/updates `.env` with your user ID and group ID.

### Step 3: Rebuild Containers
Rebuild the containers with the new user configuration:
```bash
cd /home/bkg/ns
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Step 4: Verify
Check that files created by containers are now owned by you:
```bash
touch /home/bkg/ns/backend/test.txt
docker-compose exec backend touch /app/test2.txt
ls -la /home/bkg/ns/backend/test*.txt
```

Both files should be owned by `bkg:bkg`.

## What Changed

1. **Dockerfiles Updated**: Now accept `HOST_UID` and `HOST_GID` build arguments
2. **docker-compose.yml Updated**: Passes your user ID/GID to containers during build
3. **Containers Run as Your User**: Files created by containers will have correct ownership

## Quick Fix (If Issues Persist)

If you still get permission errors, run:
```bash
cd /home/bkg/ns
sudo ./fix-permissions-permanent.sh
```

## Prevention

After completing Step 3, new files created by containers will automatically have the correct ownership. You should no longer need to fix permissions manually.











