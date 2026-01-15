# Frontend Permission Issue Fix

## Problem
- Next.js was running as `root` user (PID 2599)
- `.next` directory owned by `root`
- User `bkg` cannot modify root-owned files
- Frontend inaccessible due to permission errors

## Solution Applied
1. Fixed ownership: `sudo chown -R bkg:bkg .next`
2. Stopped root process: `sudo pkill -f "next dev"`
3. Removed `.next` directory: `sudo rm -rf .next`
4. Restarted Next.js as user `bkg`: `npm run dev`

## Current Status
- Frontend should now be running on port 3000 as user `bkg`
- Check logs: `tail -f /tmp/nextjs.log`
- Access: http://localhost:3000

## If Issues Persist
1. Check if port 3000 is free: `lsof -i :3000`
2. Check Next.js process: `ps aux | grep "next dev"`
3. Restart: `cd client && npm run dev`








