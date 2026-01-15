# Docker Health Check Fix

## Issues Fixed

### 1. Health Check Endpoint
- **Problem**: Health check was using `/api/v1/patients` which requires authentication
- **Solution**: Created a public `/api/v1/health` endpoint that doesn't require authentication
- **Location**: `backend/src/health/health.controller.ts`

### 2. Health Check Command
- **Problem**: Health check was using `wget` which isn't installed in the container
- **Solution**: Changed to use Node.js HTTP module (already available)
- **New Command**: Uses `node -e` with native HTTP module

### 3. CORS Configuration
- **Problem**: CORS was set to `*` which doesn't work with `credentials: true`
- **Solution**: 
  - Set default CORS origin to `http://localhost:3000`
  - Updated CORS configuration to handle multiple origins
  - Added proper CORS headers (methods, allowed headers)

## Health Check Endpoint

### Public Endpoints
- `GET /api/v1/health` - Basic health check
- `GET /api/v1/health/ready` - Readiness check

Both endpoints are public (no authentication required) and return:
```json
{
  "status": "ok",
  "timestamp": "2026-01-02T09:09:16.489Z",
  "service": "surgical-ehr-backend"
}
```

## Docker Health Check Configuration

```yaml
healthcheck:
  test: ["CMD-SHELL", "node -e \"require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))\" || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## CORS Configuration

### Backend
- **Default Origin**: `http://localhost:3000`
- **Credentials**: Enabled
- **Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization

### Frontend
- **Browser API URL**: `http://localhost:3002/api/v1`
- **Server API URL**: `http://backend:3001/api/v1`

## Testing

### Test Health Endpoint
```bash
curl http://localhost:3002/api/v1/health
```

### Test CORS
```bash
curl -v -X OPTIONS http://localhost:3002/api/v1/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST"
```

Expected response should include:
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
```

## Status

✅ Health check endpoint created and working
✅ Health check command updated to use Node.js
✅ CORS configuration fixed
✅ Backend should now show as healthy after health check completes










