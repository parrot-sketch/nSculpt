# Role System Analysis

## Current Role Handling Architecture

### Data Structure

Your system uses a **three-tier RBAC (Role-Based Access Control)** model:

```
User → UserRoleAssignment → Role → RolePermission → Permission
```

#### 1. **Role Model** (`roles` table)
```prisma
model Role {
  id          String   @id @default(uuid())
  code        String   @unique  // e.g., "SURGEON", "NURSE", "ADMIN"
  name        String             // Human-readable name
  description String?
  active      Boolean  @default(true)
  
  // Relations
  permissions        RolePermission[]      // Permissions assigned to this role
  userAssignments    UserRoleAssignment[]  // Users with this role
}
```

**Key Points:**
- Roles are identified by `code` (string like "ADMIN", "SURGEON", "NURSE")
- Roles can be activated/deactivated (`active` flag)
- Roles are reusable templates that define permission sets

#### 2. **UserRoleAssignment Model** (`user_role_assignments` table)
```prisma
model UserRoleAssignment {
  id         String    @id @default(uuid())
  userId     String    @db.Uuid
  roleId     String    @db.Uuid
  active     Boolean   @default(true)
  validFrom  DateTime  @default(now())
  validUntil DateTime? // Time-bound assignments (null = permanent)
  
  // Audit & Revocation
  createdAt  DateTime  @default(now())
  createdBy  String?   @db.Uuid
  revokedAt  DateTime?
  revokedBy  String?   @db.Uuid
}
```

**Key Features:**
- **Multiple roles per user**: Users can have multiple active role assignments
- **Time-bound assignments**: `validFrom` and `validUntil` support temporary access
- **Revocation tracking**: `revokedAt` and `revokedBy` track when/why roles were removed
- **Active flag**: Can deactivate without deleting (audit trail preserved)

#### 3. **RolePermission Model** (`role_permissions` table)
```prisma
model RolePermission {
  id           String   @id @default(uuid())
  roleId       String   @db.Uuid
  permissionId String   @db.Uuid
  
  // Relations
  role         Role     @relation(...)
  permission   Permission @relation(...)
}
```

**Purpose:**
- Links roles to permissions (many-to-many)
- Defines what each role can do

### How Roles Are Loaded

#### 1. **During Authentication** (`auth.repository.ts`)

When a user logs in, `getUserRolesAndPermissions()` is called:

```typescript
async getUserRolesAndPermissions(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      roleAssignments: {
        where: {
          active: true,                    // Only active assignments
          validFrom: { lte: new Date() },  // Started
          OR: [
            { validUntil: null },          // Never expires
            { validUntil: { gte: new Date() } }, // Not yet expired
          ],
        },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Filter to only active roles
  const activeRoles = user.roleAssignments
    .filter(assignment => assignment.role && assignment.role.active)
    .map(assignment => assignment.role!);

  // Collect all permissions from all roles
  const permissions = new Set<string>();
  activeRoles.forEach(role => {
    role.permissions.forEach(rp => {
      if (rp.permission) {
        permissions.add(rp.permission.code);
      }
    });
  });

  return {
    roles: activeRoles.map(r => ({ code: r.code, id: r.id })),
    permissions: Array.from(permissions).map(code => ({ code })),
  };
}
```

**Filtering Logic:**
1. ✅ Only `active: true` role assignments
2. ✅ `validFrom <= now()` (assignment has started)
3. ✅ `validUntil >= now()` OR `validUntil IS NULL` (not expired)
4. ✅ Only roles where `role.active = true`
5. ✅ Collects all permissions from all active roles (union)

#### 2. **Embedded in JWT Token**

Roles are embedded in the JWT access token:

```typescript
// In auth.service.ts
const accessToken = await this.generateAccessToken(
  user.id,
  email,
  roles,        // Array of { code: string, id: string }
  permissions,  // Array of { code: string }
  sessionId
);
```

The JWT payload contains:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "roles": ["ADMIN", "SURGEON"],  // Role codes
  "permissions": ["patients:*:read", "theater:*:book"],
  "sessionId": "session-uuid"
}
```

#### 3. **Loaded into IdentityContext**

After JWT validation, roles are loaded into `IdentityContextService`:

```typescript
// In jwt.strategy.ts
const user = {
  id: payload.sub,
  email: payload.email,
  roles: payload.roles || [],      // String array of role codes
  permissions: payload.permissions || [],
  sessionId: payload.sessionId,
};

this.identityContext.setIdentity(user);
```

### How Roles Are Used

#### 1. **Route Protection** (`RolesGuard`)

```typescript
@Controller('patients')
@UseGuards(RolesGuard)
export class PatientController {
  @Get()
  @Roles('ADMIN', 'NURSE', 'DOCTOR')  // Requires ANY of these roles
  findAll() {
    // ...
  }
}
```

**Implementation:**
```typescript
// In roles.guard.ts
canActivate(context: ExecutionContext): boolean {
  const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
    context.getHandler(),
    context.getClass(),
  ]);

  if (!requiredRoles || requiredRoles.length === 0) {
    return true; // No roles required
  }

  // Check if user has ANY of the required roles
  const hasRole = this.identityContext.hasAnyRole(requiredRoles);

  if (!hasRole) {
    throw new ForbiddenException(
      `Insufficient roles. Required: ${requiredRoles.join(', ')}`
    );
  }

  return true;
}
```

#### 2. **Programmatic Checks**

```typescript
// Check single role
if (identityContext.hasRole('ADMIN')) {
  // Admin-only logic
}

// Check any role
if (identityContext.hasAnyRole(['ADMIN', 'SURGEON'])) {
  // Admin or Surgeon logic
}

// Check all roles
if (identityContext.hasAllRoles(['ADMIN', 'SURGEON'])) {
  // Must be both Admin AND Surgeon
}
```

### Current Role Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Login                                                │
│    POST /api/v1/auth/login                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. AuthRepository.getUserRolesAndPermissions(userId)        │
│    - Query UserRoleAssignment with filters:                  │
│      • active = true                                         │
│      • validFrom <= now()                                    │
│      • validUntil >= now() OR null                          │
│    - Filter to active roles (role.active = true)           │
│    - Collect all permissions from all roles                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Generate JWT Token                                        │
│    - Embed roles[] (array of role codes)                    │
│    - Embed permissions[] (array of permission codes)         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Client stores token                                       │
│    - Token sent in Authorization header                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. JWT Strategy validates token                              │
│    - Extract roles and permissions from payload             │
│    - Load into IdentityContextService                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. RolesGuard checks roles                                   │
│    - Reads @Roles() decorator                                │
│    - Checks IdentityContext.hasAnyRole()                    │
│    - Allows/denies access                                   │
└─────────────────────────────────────────────────────────────┘
```

### Key Characteristics

#### ✅ **Strengths**

1. **Time-Bound Roles**: Support for temporary access via `validFrom`/`validUntil`
2. **Multiple Roles**: Users can have multiple roles simultaneously
3. **Role Revocation**: Tracks when/why roles were removed (audit trail)
4. **Active/Inactive**: Can disable roles without deleting
5. **Permission Aggregation**: User gets union of all permissions from all roles
6. **JWT Caching**: Roles cached in token (no DB lookup per request)

#### ⚠️ **Considerations**

1. **Token Refresh**: Roles are cached in JWT. If roles change, user must re-login or token must be refreshed
2. **Role Changes**: Changes to role assignments don't take effect until next login/token refresh
3. **Permission-Based**: System primarily uses permissions, roles are convenience layer
4. **No Role Hierarchy**: No concept of role inheritance (e.g., "ADMIN" doesn't automatically include "DOCTOR" permissions)

### Example Role Scenarios

#### Scenario 1: Permanent Role Assignment
```sql
INSERT INTO user_role_assignments (user_id, role_id, active, valid_from, valid_until)
VALUES ('user-uuid', 'admin-role-uuid', true, NOW(), NULL);
```
- User has ADMIN role permanently
- No expiration date

#### Scenario 2: Temporary Role Assignment
```sql
INSERT INTO user_role_assignments (user_id, role_id, active, valid_from, valid_until)
VALUES ('user-uuid', 'surgeon-role-uuid', true, '2024-01-01', '2024-12-31');
```
- User has SURGEON role for 2024 only
- Automatically expires on 2024-12-31

#### Scenario 3: Revoked Role
```sql
UPDATE user_role_assignments
SET active = false, revoked_at = NOW(), revoked_by = 'admin-uuid'
WHERE id = 'assignment-uuid';
```
- Role assignment marked as inactive
- Audit trail preserved (revoked_at, revoked_by)

#### Scenario 4: Multiple Roles
```sql
-- User has both ADMIN and SURGEON roles
INSERT INTO user_role_assignments (user_id, role_id, active) VALUES
  ('user-uuid', 'admin-role-uuid', true),
  ('user-uuid', 'surgeon-role-uuid', true);
```
- User gets permissions from BOTH roles
- Can access both admin and surgeon features

### Role Codes in System

Based on code analysis, these role codes are used:

- `ADMIN` - Administrative access
- `DOCTOR` - Doctor access
- `SURGEON` - Surgeon access  
- `NURSE` - Nurse access

(Defined in controllers: `@Roles('ADMIN', 'NURSE', 'DOCTOR')`)

### Recommendations

1. **Token Refresh Strategy**: Consider refreshing user roles on token refresh to pick up changes
2. **Role Change Notifications**: Notify users when roles are added/removed
3. **Role Hierarchy** (Optional): Consider adding role inheritance if needed
4. **Role Templates**: Create common role templates (e.g., "SURGEON", "NURSE") with standard permissions

### Summary

Your role system is **well-architected** with:
- ✅ Time-bound assignments
- ✅ Multiple roles per user
- ✅ Audit trail
- ✅ Permission aggregation
- ✅ JWT caching for performance

The main trade-off is that role changes require re-authentication or token refresh to take effect, which is a reasonable design choice for security and performance.

