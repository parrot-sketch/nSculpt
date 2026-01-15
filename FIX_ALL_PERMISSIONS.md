# Fix All Workspace Permissions

## Problem

You have many unsaved changes that require sudo to save because files are owned by Docker container user (1001:1001) instead of your user (bkg, uid=1000).

## Quick Fix

Run this single command to fix all permissions:

```bash
cd /home/bkg/ns
./fix-all-permissions.sh
```

Or run the commands manually:

```bash
# Fix backend directory
sudo chown -R bkg:bkg /home/bkg/ns/backend

# Fix client directory  
sudo chown -R bkg:bkg /home/bkg/ns/client

# Fix root workspace files
sudo chown bkg:bkg /home/bkg/ns/*.md /home/bkg/ns/*.sh /home/bkg/ns/*.yml 2>/dev/null || true
```

## What This Does

1. Changes ownership of all files in `backend/` to `bkg:bkg`
2. Changes ownership of all files in `client/` to `bkg:bkg`
3. Fixes root workspace files (markdown, shell scripts, yaml files)
4. Verifies write permissions

## After Running

After fixing permissions:
- ✅ You can save all files without sudo
- ✅ Your IDE won't prompt for sudo when saving
- ✅ All workspace changes can be saved normally

## Note

This won't affect Docker containers - they will continue to work. The files on the host will just be owned by you instead of the container user.

---

**Run**: `./fix-all-permissions.sh` (requires sudo password)












