# Backend Restart Instructions

## Current Status
- Backend is running in watch mode (`nest start --watch`)
- Changes to TypeScript files should auto-reload
- If still getting 403 errors, restart may be needed

## Restart Backend

### Option 1: Restart Watch Mode (Recommended)
```bash
cd backend
# Stop current process (Ctrl+C or kill process)
npm run start:dev
```

### Option 2: Full Rebuild
```bash
cd backend
npm run build
npm run start:prod
```

## Verify Fix
After restart, check backend logs for:
- `RLS skipped for route: /api/v1/consents/templates` (if debug logging enabled)
- No 403 errors when accessing templates endpoint

## If Still Getting 403
1. Check backend logs to see what route path is being checked
2. Verify `shouldSkipRLS` method is being called
3. Check if route path matches skip patterns








