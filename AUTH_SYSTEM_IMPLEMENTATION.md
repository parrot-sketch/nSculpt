# Authentication & Session Management System

## Overview

A production-grade authentication and session management system for the Surgical EHR, built with NestJS and Prisma. The system supports JWT-based authentication, role-based and permission-based access control, request-scoped identity context, session correlation, and HIPAA-compliant audit logging.

## Architecture

### Core Components

1. **Auth Module** (`src/modules/auth/`)
   - Controllers: Login, refresh, logout, profile endpoints
   - Services: Authentication, session management, identity context, permissions
   - Repositories: User authentication, session persistence
   - Guards: JWT authentication, roles, permissions
   - Decorators: `@CurrentUser`, `@Roles`, `@Permissions`, `@Public`
   - Strategies: JWT passport strategy

2. **Session Model** (Prisma)
   - Tracks active user sessions
   - Stores token hashes for revocation
   - Records device info, IP address, user agent
   - Supports session expiration and revocation

3. **Identity Context Service**
   - Request-scoped service for accessing current user
   - Provides type-safe access to user identity
   - Methods for role/permission checking

## Features

### JWT Authentication
- Access tokens (short-lived, default 15 minutes)
- Refresh tokens (long-lived, default 7 days)
- Token validation with session verification
- Automatic token refresh flow

### Session Management
- Session creation on login
- Session revocation on logout
- Session expiration tracking
- Device and IP tracking for security
- Support for revoking all user sessions

### Role-Based Access Control (RBAC)
- Roles defined in database (`Role` model)
- User-role assignments with time-bound validity
- `@Roles()` decorator for route protection
- `RolesGuard` for role checking

### Permission-Based Access Control
- Permissions defined in database (`Permission` model)
- Role-permission mappings
- `@Permissions()` decorator for fine-grained control
- `PermissionsGuard` for permission checking

### HIPAA-Compliant Audit Logging
- All authentication events logged to `DataAccessLog`
- Domain events emitted for login/logout
- Failed login attempts tracked
- Session correlation for audit trails

### Request-Scoped Identity
- `IdentityContextService` provides current user context
- `@CurrentUser()` decorator for easy access
- Type-safe user identity interface

## API Endpoints

### Authentication

#### POST `/api/v1/auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["SURGEON", "ADMIN"],
    "permissions": ["medical_records:read", "theater:book"]
  },
  "sessionId": "uuid",
  "expiresIn": 900
}
```

#### POST `/api/v1/auth/refresh`
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** Same as login response

#### POST `/api/v1/auth/logout`
Logout and revoke current session.

**Request:**
```json
{
  "reason": "User requested logout"
}
```

**Response:** 204 No Content

#### GET `/api/v1/auth/me`
Get current user profile.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "roles": ["SURGEON"],
  "permissions": ["medical_records:read"],
  "departmentId": "uuid",
  "employeeId": "EMP001"
}
```

## Usage Examples

### Protecting Routes

#### Public Route
```typescript
@Public()
@Get('health')
health() {
  return { status: 'ok' };
}
```

#### Authenticated Route
```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: UserIdentity) {
  return user;
}
```

#### Role-Based Protection
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SURGEON')
@Get('admin-only')
adminOnly() {
  return { message: 'Admin access' };
}
```

#### Permission-Based Protection
```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('medical_records:read', 'medical_records:write')
@Get('records')
getRecords() {
  return this.recordsService.findAll();
}
```

#### Combined Guards
```typescript
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('DOCTOR')
@Permissions('medical_records:read')
@Get('patient-records')
getPatientRecords() {
  return this.recordsService.findByPatient();
}
```

### Accessing Current User

```typescript
@Get('my-data')
getMyData(@CurrentUser() user: UserIdentity) {
  return {
    userId: user.id,
    email: user.email,
    roles: user.roles,
  };
}
```

### Using Identity Context Service

```typescript
@Injectable()
export class MyService {
  constructor(private identityContext: IdentityContextService) {}

  someMethod() {
    const userId = this.identityContext.getUserId();
    const hasRole = this.identityContext.hasRole('ADMIN');
    const hasPermission = this.identityContext.hasPermission('medical_records:read');
  }
}
```

## Database Schema

### Session Model
```prisma
model Session {
  id            String   @id @default(uuid())
  userId        String
  tokenHash     String   // SHA-256 hash of access token
  refreshTokenHash String // SHA-256 hash of refresh token
  deviceInfo    String?
  ipAddress     String?
  userAgent     String?
  startedAt     DateTime @default(now())
  lastActivityAt DateTime @default(now())
  expiresAt     DateTime
  revokedAt     DateTime?
  revokedBy     String?
  revokedReason String?
  mfaVerified   Boolean  @default(false)
  mfaMethod     String?
  // ... relations
}
```

## Environment Variables

```env
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d
```

## Security Features

1. **Token Hashing**: Tokens are hashed (SHA-256) before storage
2. **Session Verification**: Every request validates session is active
3. **Automatic Revocation**: Sessions can be revoked on logout or security events
4. **Failed Login Tracking**: All failed attempts logged for security monitoring
5. **HIPAA Audit Logging**: All authentication events logged to `DataAccessLog`
6. **Domain Events**: Login/logout events emitted to `DomainEvent` table

## Integration with Existing Systems

- **DomainEvent Service**: Emits `User.LoggedIn` and `User.LoggedOut` events
- **DataAccessLog Service**: Logs all authentication attempts (success and failure)
- **Correlation Service**: Uses correlation IDs for session tracking
- **RBAC Schema**: Integrates with existing `User`, `Role`, `Permission` models

## Next Steps

1. **Install Dependencies**: Run `npm install` to install JWT and Passport packages
2. **Run Migrations**: Generate Prisma client and run migrations for Session model
3. **Update Existing Controllers**: Replace old `RolesGuard` imports with new auth module guards
4. **Test Authentication**: Test login, refresh, logout flows
5. **Configure JWT Secrets**: Set strong JWT secrets in environment variables

## Migration from Old Guards

Replace:
```typescript
import { RolesGuard } from '../../common/guards/roles.guard';
```

With:
```typescript
import { RolesGuard } from '../../auth/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
```

And ensure `JwtAuthGuard` is applied before `RolesGuard`:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
```












