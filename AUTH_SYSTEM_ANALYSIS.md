# Authentication & Session Management System - Technical Analysis

## Executive Summary

This document provides a comprehensive technical analysis of the production-grade authentication and session management system implemented for the Surgical EHR platform. The system provides JWT-based authentication, role-based and permission-based access control, request-scoped identity context, session correlation, and HIPAA-compliant audit logging.

**Status**: ✅ Implemented and Integrated  
**Version**: 1.0.0  
**Date**: December 31, 2025

---

## 1. Architecture Overview

### 1.1 System Design Principles

The authentication system follows these core principles:

1. **Security First**: All authentication events are logged, sessions are tracked, and tokens are hashed before storage
2. **HIPAA Compliance**: Comprehensive audit logging for all authentication and authorization events
3. **Modularity**: Self-contained auth module that can be easily extended or replaced
4. **Type Safety**: Full TypeScript support with strict typing
5. **Request Scoping**: Identity context is request-scoped for thread safety
6. **Event-Driven**: Integration with DomainEvent architecture for audit trails

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Application                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP Requests (Bearer Token)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    NestJS Application                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Global JWT Auth Guard                      │   │
│  │  (Protects all routes by default, @Public() bypass) │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                      │
│  ┌──────────────────────▼───────────────────────────────┐   │
│  │              Auth Module                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │   │
│  │  │ Controllers  │  │  Services    │  │  Guards     │ │   │
│  │  │ - Login      │  │ - Auth       │  │ - JWT       │ │   │
│  │  │ - Refresh    │  │ - Session    │  │ - Roles     │ │   │
│  │  │ - Logout     │  │ - Identity   │  │ - Perms     │ │   │
│  │  │ - Profile    │  │ - Permission │  │             │ │   │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │   │
│  │  ┌──────────────┐  ┌──────────────┐                 │   │
│  │  │ Repositories  │  │  Strategies  │                 │   │
│  │  │ - Auth        │  │ - JWT        │                 │   │
│  │  │ - Session     │  │              │                 │   │
│  │  └──────────────┘  └──────────────┘                 │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                      │
│  ┌──────────────────────▼───────────────────────────────┐   │
│  │         Integration Services                           │   │
│  │  - DomainEventService (Audit Events)                  │   │
│  │  - CorrelationService (Request Tracking)              │   │
│  │  - DataAccessLogService (HIPAA Logging)               │   │
│  └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────┼──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Users      │  │  Sessions    │  │ DomainEvents │     │
│  │   Roles      │  │  (Active)    │  │ DataAccess  │     │
│  │ Permissions  │  │  (Revoked)   │  │   Logs      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Component Relationships

```
AuthController
    │
    ├──► AuthService
    │       ├──► AuthRepository (User lookup, roles/permissions)
    │       ├──► SessionService (Session management)
    │       ├──► JwtService (Token generation)
    │       ├──► DomainEventService (Audit events)
    │       ├──► CorrelationService (Request correlation)
    │       └──► DataAccessLogService (HIPAA logging)
    │
    ├──► JwtStrategy (Token validation)
    │       ├──► AuthService (Session verification)
    │       ├──► AuthRepository (User lookup)
    │       └──► IdentityContextService (Set user context)
    │
    └──► Guards (Authorization)
            ├──► JwtAuthGuard (Authentication)
            ├──► RolesGuard (Role checking)
            └──► PermissionsGuard (Permission checking)
```

---

## 2. Core Components

### 2.1 Authentication Service (`AuthService`)

**Responsibilities:**
- User authentication (email/password)
- JWT token generation (access & refresh tokens)
- Token refresh flow
- Session creation and management
- HIPAA-compliant audit logging
- Domain event emission

**Key Methods:**
- `login()`: Authenticate user and create session
- `refreshToken()`: Generate new access token from refresh token
- `logout()`: Revoke session and log event
- `validateToken()`: Verify JWT token and session

**Security Features:**
- Password hashing with bcrypt
- Token hashing (SHA-256) before storage
- Session expiration tracking
- Failed login attempt logging

### 2.2 Session Service (`SessionService`)

**Responsibilities:**
- Session lifecycle management
- Session validation
- Session revocation
- Active session tracking

**Key Methods:**
- `createSession()`: Create new session record
- `findById()`: Retrieve session by ID
- `revokeSession()`: Mark session as revoked
- `verifySession()`: Check if session is active

**Session Model Fields:**
- `tokenHash`: SHA-256 hash of access token
- `refreshTokenHash`: SHA-256 hash of refresh token
- `deviceInfo`, `ipAddress`, `userAgent`: Security tracking
- `expiresAt`: Session expiration timestamp
- `revokedAt`: Revocation timestamp (if revoked)

### 2.3 Identity Context Service (`IdentityContextService`)

**Responsibilities:**
- Request-scoped user identity management
- Type-safe access to current user
- Role and permission checking utilities

**Key Features:**
- Request-scoped (one instance per HTTP request)
- Automatically populated by JWT strategy
- Provides helper methods: `hasRole()`, `hasPermission()`, etc.

**Usage:**
```typescript
// In any service
constructor(private identityContext: IdentityContextService) {}

someMethod() {
  const userId = this.identityContext.getUserId();
  const hasAdmin = this.identityContext.hasRole('ADMIN');
}
```

### 2.4 Permission Service (`PermissionService`)

**Responsibilities:**
- Permission checking against database
- User permission aggregation
- Role-permission relationship resolution

**Key Methods:**
- `hasPermission()`: Check single permission
- `hasAnyPermission()`: Check if user has any of specified permissions
- `hasAllPermissions()`: Check if user has all specified permissions
- `getUserPermissions()`: Get all permissions for user

### 2.5 Guards

#### JWT Authentication Guard (`JwtAuthGuard`)
- Validates JWT token from `Authorization: Bearer <token>` header
- Respects `@Public()` decorator for public routes
- Sets user identity in request context

#### Roles Guard (`RolesGuard`)
- Checks if user has required roles
- Uses `@Roles()` decorator
- Must be used after `JwtAuthGuard`

#### Permissions Guard (`PermissionsGuard`)
- Checks if user has required permissions
- Uses `@Permissions()` decorator
- Must be used after `JwtAuthGuard`

### 2.6 Decorators

#### `@Public()`
Marks a route as public (no authentication required).

#### `@CurrentUser()`
Extracts current user from request context.

#### `@Roles(...roles)`
Specifies required roles for route access.

#### `@Permissions(...permissions)`
Specifies required permissions for route access.

---

## 3. Security Architecture

### 3.1 Token Security

**Access Tokens:**
- Short-lived (default: 15 minutes)
- Contains: user ID, email, roles, permissions, session ID
- Stored as hash in database (not plaintext)
- Validated on every request

**Refresh Tokens:**
- Long-lived (default: 7 days)
- Contains: user ID, session ID
- Stored as hash in database
- Used only for token refresh endpoint
- Can be revoked independently

**Token Hashing:**
- All tokens are hashed with SHA-256 before storage
- Prevents token theft from database
- Enables token revocation

### 3.2 Session Security

**Session Tracking:**
- Every login creates a session record
- Sessions track: device, IP, user agent
- Sessions can be revoked individually or in bulk
- Expired sessions are automatically invalidated

**Session Revocation:**
- Logout revokes current session
- Admin can revoke all user sessions
- Revoked sessions are marked but not deleted (audit trail)

### 3.3 Password Security

- Passwords hashed with bcrypt (industry standard)
- Minimum 8 characters (enforced by DTO validation)
- Password changes tracked in `passwordChangedAt` field
- Failed login attempts logged for security monitoring

### 3.4 Audit Logging (HIPAA Compliance)

**All Authentication Events Logged:**
- Successful logins
- Failed login attempts
- Token refreshes
- Logouts
- Session revocations

**Log Fields:**
- User ID
- IP Address
- User Agent
- Session ID
- Timestamp
- Success/Failure status
- Error messages (for failures)

**Domain Events:**
- `User.LoggedIn` event emitted on successful login
- `User.LoggedOut` event emitted on logout
- Events include correlation IDs for workflow tracking

---

## 4. Database Schema

### 4.1 Session Model

```prisma
model Session {
  id              String   @id @default(uuid())
  userId          String
  tokenHash       String   // SHA-256 hash of access token
  refreshTokenHash String  // SHA-256 hash of refresh token
  deviceInfo      String?
  ipAddress       String?
  userAgent       String?
  startedAt       DateTime @default(now())
  lastActivityAt  DateTime @default(now())
  expiresAt       DateTime
  revokedAt       DateTime?
  revokedBy       String?
  revokedReason   String?
  mfaVerified     Boolean  @default(false)
  mfaMethod       String?
  // Relations
  user            User
  revokedByUser   User?    @relation("SessionRevokedBy")
}
```

**Indexes:**
- `userId` (for user session queries)
- `tokenHash` (for token lookup)
- `refreshTokenHash` (for refresh token lookup)
- `expiresAt` (for cleanup of expired sessions)

### 4.2 Integration with Existing Models

**User Model:**
- `sessions`: One-to-many relationship
- `revokedSessions`: Sessions revoked by this user (admin action)

**RBAC Models:**
- `User`: User accounts
- `Role`: User roles (SURGEON, NURSE, ADMIN, etc.)
- `Permission`: Fine-grained permissions (medical_records:read, etc.)
- `UserRoleAssignment`: User-role mappings with time validity
- `RolePermission`: Role-permission mappings

---

## 5. API Endpoints

### 5.1 Authentication Endpoints

#### POST `/api/v1/auth/login`
Authenticate user and receive tokens.

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

**Status Codes:**
- `200 OK`: Successful login
- `401 Unauthorized`: Invalid credentials
- `400 Bad Request`: Validation errors

#### POST `/api/v1/auth/refresh`
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** Same as login response

**Status Codes:**
- `200 OK`: Token refreshed
- `401 Unauthorized`: Invalid or expired refresh token

#### POST `/api/v1/auth/logout`
Logout and revoke current session.

**Request:**
```json
{
  "reason": "User requested logout"
}
```

**Response:** `204 No Content`

**Status Codes:**
- `204 No Content`: Successfully logged out
- `401 Unauthorized`: Not authenticated

#### GET `/api/v1/auth/me`
Get current user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

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

**Status Codes:**
- `200 OK`: User profile retrieved
- `401 Unauthorized`: Invalid or expired token

---

## 6. Usage Examples

### 6.1 Protecting Routes

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

### 6.2 Accessing Current User

#### In Controllers
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

#### In Services
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

### 6.3 Programmatic Permission Checking

```typescript
@Injectable()
export class MyService {
  constructor(private permissionService: PermissionService) {}

  async checkAccess(userId: string) {
    const canRead = await this.permissionService.hasPermission(userId, 'medical_records:read');
    const canWrite = await this.permissionService.hasPermission(userId, 'medical_records:write');
    
    if (!canRead) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
```

---

## 7. Integration Points

### 7.1 DomainEvent Service

**Events Emitted:**
- `User.LoggedIn`: On successful login
- `User.LoggedOut`: On logout

**Event Payload:**
```typescript
{
  email: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string; // For logout
}
```

### 7.2 DataAccessLog Service

**Actions Logged:**
- `LOGIN`: Successful login
- `LOGIN_FAILED`: Failed login attempt
- `TOKEN_REFRESH`: Token refresh
- `LOGOUT`: User logout

**All logs include:**
- User ID
- IP Address
- User Agent
- Session ID
- Timestamp
- Success/Failure status

### 7.3 Correlation Service

**Usage:**
- Session IDs are used as correlation IDs
- Request correlation for audit trails
- Workflow tracking across services

---

## 8. Configuration

### 8.1 Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-strong-secret-key-change-in-production
JWT_EXPIRES_IN=15m                    # Access token expiry
JWT_REFRESH_SECRET=your-refresh-secret # Optional, defaults to JWT_SECRET
JWT_REFRESH_EXPIRES_IN=7d             # Refresh token expiry
```

### 8.2 Token Expiry Formats

Supported formats (from `ms` package):
- `15m` = 15 minutes
- `1h` = 1 hour
- `7d` = 7 days
- `900` = 900 seconds (number)

### 8.3 Global Configuration

The system uses a global JWT guard by default. Routes are protected unless marked with `@Public()`.

**Configuration in `main.ts`:**
```typescript
const reflector = app.get(Reflector);
app.useGlobalGuards(new JwtAuthGuard(reflector));
```

---

## 9. Security Considerations

### 9.1 Token Storage

**Client-Side:**
- Access tokens: Store in memory (not localStorage) for XSS protection
- Refresh tokens: Can use httpOnly cookies for CSRF protection
- Consider using secure, httpOnly cookies in production

**Server-Side:**
- Tokens are hashed before storage
- Only token hashes stored in database
- Original tokens never stored

### 9.2 Session Management

**Best Practices:**
- Sessions expire automatically
- Users can revoke their own sessions
- Admins can revoke all user sessions
- Expired sessions cleaned up periodically

### 9.3 Password Security

- Minimum 8 characters enforced
- Bcrypt hashing (cost factor 10)
- Password changes tracked
- Failed login attempts logged

### 9.4 Audit Trail

**HIPAA Requirements Met:**
- All authentication events logged
- Failed attempts tracked
- Session correlation for audit trails
- Immutable audit logs (no updates/deletes)

---

## 10. Performance Considerations

### 10.1 Database Queries

**Optimizations:**
- User roles/permissions loaded once per request
- Session validation uses indexed lookups
- Permission checks cached in JWT token (reduces DB queries)

**Query Patterns:**
- User lookup: Indexed by email
- Session lookup: Indexed by token hash
- Role/permission queries: Optimized with proper includes

### 10.2 Token Validation

- JWT validation is stateless (no DB lookup for token structure)
- Session validation requires DB lookup (for revocation check)
- Consider Redis for session caching in high-traffic scenarios

### 10.3 Scalability

**Current Design:**
- Stateless JWT tokens (horizontally scalable)
- Session storage in PostgreSQL (can be moved to Redis)
- Request-scoped services (thread-safe)

**Future Optimizations:**
- Redis for session storage
- Token blacklist in Redis
- Permission caching

---

## 11. Testing Strategy

### 11.1 Unit Tests

**Components to Test:**
- `AuthService`: Login, refresh, logout flows
- `SessionService`: Session management
- `PermissionService`: Permission checking
- `IdentityContextService`: Context management
- Guards: Authorization logic

### 11.2 Integration Tests

**Test Scenarios:**
- Complete login flow
- Token refresh flow
- Logout and session revocation
- Role-based access control
- Permission-based access control
- Failed login attempts
- Expired token handling

### 11.3 Security Tests

**Test Cases:**
- Invalid credentials
- Expired tokens
- Revoked sessions
- Invalid refresh tokens
- Missing authentication
- Insufficient roles/permissions

---

## 12. Deployment Considerations

### 12.1 Environment Setup

**Required:**
- Strong JWT secrets (use environment variables)
- Secure database connection
- HTTPS in production (for token transmission)

### 12.2 Migration Steps

1. Run Prisma migrations for Session model
2. Set environment variables
3. Generate Prisma client
4. Restart application

### 12.3 Monitoring

**Metrics to Monitor:**
- Login success/failure rates
- Token refresh frequency
- Session duration
- Failed authentication attempts
- Session revocation events

### 12.4 Backup and Recovery

**Critical Data:**
- User accounts
- Active sessions (for forced logout)
- Audit logs (immutable, must be preserved)

---

## 13. Future Enhancements

### 13.1 Multi-Factor Authentication (MFA)

**Planned Features:**
- TOTP (Time-based One-Time Password)
- SMS verification
- Email verification
- Backup codes

**Infrastructure:**
- `mfaVerified` and `mfaMethod` fields already in Session model
- Ready for MFA implementation

### 13.2 OAuth Integration

**Potential Providers:**
- Google OAuth
- Microsoft Azure AD
- SAML SSO

### 13.3 Advanced Session Management

**Features:**
- Device management (view/revoke devices)
- Concurrent session limits
- Geographic restrictions
- Suspicious activity detection

### 13.4 Performance Optimizations

**Improvements:**
- Redis session storage
- Token blacklist caching
- Permission caching
- Database query optimization

---

## 14. Troubleshooting

### 14.1 Common Issues

**Issue: "Session expired or revoked"**
- Check session expiration time
- Verify session not manually revoked
- Check database for session status

**Issue: "Invalid token"**
- Verify JWT_SECRET matches
- Check token expiration
- Ensure token format is correct

**Issue: "Insufficient permissions"**
- Verify user has required roles
- Check role-permission mappings
- Ensure role assignments are active

### 14.2 Debugging

**Enable Debug Logging:**
- Set `NODE_ENV=development`
- Check application logs for detailed errors
- Review audit logs for authentication events

**Database Queries:**
```sql
-- Check active sessions
SELECT * FROM sessions WHERE "revokedAt" IS NULL AND "expiresAt" > NOW();

-- Check user roles
SELECT u.email, r.code FROM users u
JOIN user_role_assignments ura ON u.id = ura."userId"
JOIN roles r ON ura."roleId" = r.id
WHERE u.email = 'user@example.com' AND ura.active = true;
```

---

## 15. Conclusion

The authentication and session management system provides a robust, secure, and HIPAA-compliant foundation for the Surgical EHR platform. The system is:

- ✅ **Secure**: Token hashing, session tracking, audit logging
- ✅ **Scalable**: Stateless JWT tokens, request-scoped services
- ✅ **Compliant**: HIPAA audit logging, immutable logs
- ✅ **Flexible**: Role and permission-based access control
- ✅ **Maintainable**: Modular design, clear separation of concerns

The system is production-ready and can be extended with additional features like MFA, OAuth, and advanced session management as needed.

---

## Appendix A: File Structure

```
backend/src/modules/auth/
├── auth.module.ts              # Main module definition
├── controllers/
│   └── auth.controller.ts      # API endpoints
├── services/
│   ├── auth.service.ts         # Core authentication logic
│   ├── session.service.ts      # Session management
│   ├── identityContext.service.ts  # Request-scoped identity
│   └── permission.service.ts   # Permission checking
├── repositories/
│   ├── auth.repository.ts      # User/role queries
│   └── session.repository.ts   # Session queries
├── guards/
│   ├── jwt-auth.guard.ts       # JWT authentication
│   ├── roles.guard.ts          # Role checking
│   └── permissions.guard.ts    # Permission checking
├── decorators/
│   ├── currentUser.decorator.ts
│   ├── roles.decorator.ts
│   ├── permissions.decorator.ts
│   └── public.decorator.ts
├── strategies/
│   └── jwt.strategy.ts         # Passport JWT strategy
└── dto/
    ├── login.dto.ts
    ├── refreshToken.dto.ts
    └── logout.dto.ts
```

## Appendix B: Dependencies

```json
{
  "@nestjs/jwt": "^10.x",
  "@nestjs/passport": "^10.x",
  "passport": "^0.x",
  "passport-jwt": "^4.x",
  "bcrypt": "^5.x",
  "@types/bcrypt": "^5.x",
  "@types/passport-jwt": "^4.x",
  "ms": "^2.x"
}
```

---

**Document Version**: 1.0.0  
**Last Updated**: December 31, 2025  
**Author**: Development Team  
**Review Status**: ✅ Ready for Review

