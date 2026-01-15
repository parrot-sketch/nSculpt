# Frontend Restart Instructions - Auto-Submit Fix

## Quick Fix (Try This First)

### 1. Hard Refresh Browser
- **Chrome/Edge**: `Ctrl+Shift+R` (Linux/Windows) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Linux/Windows) or `Cmd+Shift+R` (Mac)
- This clears the browser cache and forces reload of JavaScript

### 2. Restart Frontend Container Only
```bash
# Restart just the frontend container (fastest)
docker-compose restart frontend

# Or if using profile
docker-compose --profile frontend restart frontend
```

### 3. Clear Next.js Cache and Restart
```bash
# Stop frontend
docker-compose stop frontend

# Remove Next.js cache
docker-compose exec frontend rm -rf .next

# Or from host
rm -rf client/.next

# Restart
docker-compose --profile frontend up -d frontend
```

## Full Rebuild (If Quick Fix Doesn't Work)

### Option 1: Rebuild Frontend Container
```bash
# Stop and remove frontend container
docker-compose stop frontend
docker-compose rm -f frontend

# Rebuild and start
docker-compose --profile frontend up -d --build frontend
```

### Option 2: Full Docker Compose Restart
```bash
# Stop all services
docker-compose down

# Rebuild and start
docker-compose --profile frontend up -d --build
```

## Verify Changes Are Applied

After restarting, check the browser console:
1. Open DevTools (F12)
2. Go to Network tab
3. Hard refresh the page
4. Check that the JavaScript files are reloaded (not cached)

Or check the container logs:
```bash
docker-compose logs -f frontend
```

Look for:
- "compiled successfully" message
- No errors about missing files
- HMR (Hot Module Replacement) working

## Troubleshooting

### If changes still don't appear:

1. **Check file is actually updated:**
   ```bash
   grep -n "handleKeyDown" client/app/\(protected\)/patients/new/page.tsx
   ```
   Should show the function definition.

2. **Check Docker volumes are mounted correctly:**
   ```bash
   docker-compose exec frontend ls -la /app/app/\(protected\)/patients/new/
   ```
   Should show `page.tsx` file.

3. **Clear browser cache completely:**
   - Open DevTools (F12)
   - Right-click refresh button
   - Select "Empty Cache and Hard Reload"

4. **Check Next.js is in dev mode:**
   ```bash
   docker-compose exec frontend env | grep NODE_ENV
   ```
   Should show `NODE_ENV=development`

## Expected Behavior After Fix

- ✅ Pressing Enter in address fields (step 3) does NOT submit form
- ✅ Pressing Enter in any field before step 4 does NOT submit form
- ✅ Form only submits when clicking "Complete Registration" button on step 4
- ✅ Form only submits when pressing Enter while submit button is focused on step 4
