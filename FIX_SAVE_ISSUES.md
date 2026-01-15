# Fix File Save Issues

## Problem

Even after running `fix-all-permissions.sh`, you're still getting "failed to save" notifications because some files are being modified by running Docker containers, which changes their ownership back to the container user (1001:1001).

## Solution

Run this command to fix source files specifically (this targets only your code files, not build artifacts):

```bash
cd /home/bkg/ns
./fix-permissions-while-running.sh
```

Or run these commands manually:

```bash
# Fix all backend source files
sudo find backend/src -type f -exec chown bkg:bkg {} \;
sudo find backend/src -type d -exec chown bkg:bkg {} \;

# Fix all client source files (excluding node_modules and .next)
sudo find client -type f ! -path "*/node_modules/*" ! -path "*/.next/*" -exec chown bkg:bkg {} \;
sudo find client -type d ! -path "*/node_modules/*" ! -path "*/.next/*" -exec chown bkg:bkg {} \;

# Fix specific problematic file
sudo chown bkg:bkg backend/src/modules/audit/services/rlsValidation.service.ts
```

## Why This Happens

Docker containers running as user `1001` (frontend/backend) can modify files in the bind-mounted directories. When they create or modify files, those files become owned by user `1001`, which prevents you (user `bkg`, uid `1000`) from saving them.

## Prevention

### Option 1: Fix Permissions Periodically
Run the fix script whenever you notice save issues:
```bash
./fix-permissions-while-running.sh
```

### Option 2: Stop Containers Before Major Edits
If you're making many changes:
```bash
docker-compose stop
# Make your changes
docker-compose start
```

### Option 3: Fix Specific Files On-Demand
If a specific file won't save:
```bash
sudo chown bkg:bkg <path-to-file>
```

## Quick Fix for Currently Open Files

If you have files open in your IDE that won't save:

1. **Note the file path** from the error message
2. **Run**: `sudo chown bkg:bkg <file-path>`
3. **Try saving again** in your IDE

## Files That Are Safe to Ignore

These directories are managed by containers and will be recreated:
- `client/.next/` - Next.js build cache
- `backend/dist/` - Compiled backend code
- `*/node_modules/` - Dependencies

You don't need to fix permissions on these - they're build artifacts.

---

**Run now**: `./fix-permissions-while-running.sh`












