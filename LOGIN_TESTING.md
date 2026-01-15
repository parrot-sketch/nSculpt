# Login Endpoint Testing Guide

## Endpoint Configuration

- **Backend URL**: `http://localhost:3002/api/v1/auth/login`
- **Method**: POST
- **Content-Type**: `application/json`

## Test Credentials

### Admin User
```json
{
  "email": "admin@nairobi-sculpt.com",
  "password": "Admin123!"
}
```

### Test Users (all use password: `User123!`)
- `doctor@nairobi-sculpt.com`
- `surgeon@nairobi-sculpt.com`
- `nurse@nairobi-sculpt.com`

## Expected Response

### Success Response (200 OK)
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@nairobi-sculpt.com",
    "firstName": "System",
    "lastName": "Administrator",
    "roles": ["ADMIN"],
    "permissions": ["admin:*:read", "admin:*:write", ...]
  },
  "sessionId": "uuid",
  "expiresIn": 86400
}
```

### Error Responses

#### 401 Unauthorized - Invalid Credentials
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

#### 400 Bad Request - Validation Error
```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be longer than or equal to 8 characters"],
  "error": "Bad Request"
}
```

## Testing with cURL

```bash
# Test login from host machine
curl -X POST http://localhost:3002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@nairobi-sculpt.com",
    "password": "Admin123!"
  }'
```

## Testing from Frontend

The frontend login form at `http://localhost:3000/login` should:
1. Submit credentials to `/api/v1/auth/login`
2. Store tokens in `sessionStorage`
3. Redirect to `/admin` for admin users
4. Redirect to `/dashboard` for other users

## CORS Configuration

The backend is configured to accept requests from:
- `CORS_ORIGIN` environment variable (default: `*`)
- Frontend origin: `http://localhost:3000`

## Troubleshooting

### Connection Issues

1. **Check backend is running**:
   ```bash
   docker compose ps
   ```

2. **Check backend logs**:
   ```bash
   docker compose logs backend --tail 50
   ```

3. **Verify port mapping**:
   - Backend container: port 3001
   - Host mapping: port 3002
   - Frontend should use: `http://localhost:3002/api/v1`

### Authentication Issues

1. **Verify user exists**:
   ```bash
   docker compose exec backend npm run db:seed
   ```

2. **Check password hash**:
   - Passwords are hashed with bcrypt (cost factor 12)
   - Test password: `Admin123!` for admin user

3. **Check user is active**:
   - User must have `active: true`
   - User must have at least one active role assignment

### CORS Issues

If you see CORS errors in the browser console:

1. **Check CORS_ORIGIN environment variable**:
   ```bash
   docker compose exec backend env | grep CORS
   ```

2. **Update docker-compose.yml**:
   ```yaml
   environment:
     CORS_ORIGIN: http://localhost:3000
   ```

3. **Restart backend**:
   ```bash
   docker compose restart backend
   ```

### Validation Errors

The login endpoint validates:
- `email`: Must be a valid email address
- `password`: Must be at least 8 characters

## Security Features

1. **Failed Login Attempts**: Logged for audit (HIPAA requirement)
2. **Session Management**: Each login creates a new session
3. **Token Expiry**: Access tokens expire (default: 24h)
4. **Refresh Tokens**: Used to obtain new access tokens
5. **Audit Logging**: All login attempts are logged

## Next Steps After Login

1. **Store tokens**: Frontend stores `accessToken` and `refreshToken` in `sessionStorage`
2. **Set Authorization header**: `Authorization: Bearer <accessToken>`
3. **Redirect**: Based on user roles:
   - `ADMIN` → `/admin`
   - Others → `/dashboard`

## API Client Configuration

The frontend uses `apiClient` which:
- Automatically adds `Authorization` header from `sessionStorage`
- Handles token refresh on 401 errors
- Redirects to login on authentication failure










