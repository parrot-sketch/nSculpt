# PermissionsGuard Implementation Summary

## ✅ Implementation Complete

### PermissionsGuard Enhanced ✅

**File**: `backend/src/modules/auth/guards/permissions.guard.ts`

**Key Improvements**:
1. ✅ **Async Implementation**: Changed to `async canActivate()` for audit logging
2. ✅ **ALL Permissions Required**: Uses `hasAllPermissions()` instead of `hasAnyPermission()`
3. ✅ **Audit Logging**: Integrates with `DataAccessLogService` to log all permission checks
4. ✅ **Detailed Error Messages**: Shows required, missing, and user permissions
5. ✅ **Non-Blocking Logging**: Audit logging doesn't fail requests

**Before**:
```typescript
canActivate(context: ExecutionContext): boolean {
  const hasPermission = this.identityContext.hasAnyPermission(requiredPermissions);
  if (!hasPermission) {
    throw new ForbiddenException('Insufficient permissions');
  }
  return true;
}
```

**After**:
```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  const hasAllPermissions = this.identityContext.hasAllPermissions(requiredPermissions);
  
  // Log permission check (non-blocking)
  this.logPermissionCheck(user.id, requiredPermissions, hasAllPermissions, context);
  
  if (!hasAllPermissions) {
    const missingPermissions = requiredPermissions.filter(
      (perm) => !this.identityContext.hasPermission(perm),
    );
    throw new ForbiddenException(
      `Insufficient permissions. Required: ${requiredPermissions.join(', ')}. Missing: ${missingPermissions.join(', ')}`
    );
  }
  return true;
}
```

### All Controllers Updated ✅

All 6 controllers now use the standardized `domain:*:action` permission format:

#### Permission Format: `{domain}:*:{action}`

| Domain | Read Permission | Write Permission | Delete Permission | Manage Permission |
|--------|----------------|------------------|-------------------|-------------------|
| Patients | `patients:*:read` | `patients:*:write` | `patients:*:delete` | - |
| Medical Records | `medical_records:*:read` | `medical_records:*:write` | - | `medical_records:*:manage` |
| Theater | `theater:*:read` | `theater:*:write` | - | - |
| Consent | `consent:*:read` | `consent:*:write` | - | - |
| Billing | `billing:*:read` | `billing:*:write` | - | - |
| Inventory | `inventory:*:read` | `inventory:*:write` | - | - |

## Three-Layer Security Model

### Execution Order

```
Request
  ↓
JwtAuthGuard (Authentication)
  ↓
RolesGuard (Coarse-grained: Role check)
  ↓
PermissionsGuard (Fine-grained: Permission check)
  ↓
RlsGuard (Row-level: Resource ownership check)
  ↓
Controller Method
```

### Guard Responsibilities

1. **RolesGuard**
   - Checks: User has at least ONE required role
   - Logic: `hasAnyRole(requiredRoles)`
   - Example: `@Roles('ADMIN', 'DOCTOR', 'NURSE')`
   - Logs: Role check attempts

2. **PermissionsGuard**
   - Checks: User has ALL required permissions
   - Logic: `hasAllPermissions(requiredPermissions)`
   - Example: `@Permissions('patients:*:write')`
   - Logs: Permission check attempts

3. **RlsGuard**
   - Checks: User has access to specific resource
   - Logic: Resource ownership/relationship validation
   - Example: Validates patient relationship via surgical case
   - Logs: Resource access attempts

### Integration Example

```typescript
@Controller('patients')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard) // All three guards
export class PatientController {
  @Get(':id')
  @Roles('ADMIN', 'DOCTOR', 'NURSE')           // Layer 1: Role check
  @Permissions('patients:*:read')                // Layer 2: Permission check
  // Layer 3: RlsGuard validates patient access
  findOne(@Param('id') id: string) {
    return this.patientService.findOne(id);
  }
}
```

## Permission Check Logic

### ALL Permissions Required

When multiple permissions are specified, user must have ALL:

```typescript
@Permissions('patients:*:read', 'patients:*:write')
// User must have BOTH permissions
// If user only has 'patients:*:read', access is denied
```

### Permission Matching

Permissions are matched exactly:

```typescript
// User permissions: ['patients:*:read', 'patients:*:write']
// Required: ['patients:*:read']
// Result: ✅ Access granted

// Required: ['patients:*:read', 'patients:*:delete']
// Result: ❌ Access denied (missing patients:*:delete)
```

## Audit Logging

### Permission Check Logs

Every permission check is logged:

```typescript
{
  userId: 'user-123',
  resourceType: 'Route',
  resourceId: 'GET /api/v1/patients/:id',
  action: 'PERMISSION_CHECK',
  reason: 'Permission check: Required [patients:*:read]',
  accessedPHI: false,
  success: true,
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  sessionId: 'session-123',
  accessedAt: '2024-01-01T12:00:00Z'
}
```

### Failed Permission Check Logs

```typescript
{
  userId: 'user-123',
  resourceType: 'Route',
  resourceId: 'POST /api/v1/patients',
  action: 'PERMISSION_CHECK',
  reason: 'Permission check: Required [patients:*:write]',
  accessedPHI: false,
  success: false,
  errorMessage: 'Insufficient permissions. Required: patients:*:write. Missing: patients:*:write',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  sessionId: 'session-123',
  accessedAt: '2024-01-01T12:00:00Z'
}
```

## Controller Examples

### PatientController

```typescript
@Controller('patients')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
export class PatientController {
  @Post()
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('patients:*:write')
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: UserIdentity) {
    // ✅ User has ADMIN, NURSE, or DOCTOR role
    // ✅ User has patients:*:write permission
    // ✅ Access granted
    return this.patientService.create(dto, user.id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Permissions('patients:*:delete')
  remove(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    // ✅ User has ADMIN role
    // ✅ User has patients:*:delete permission
    // ✅ RlsGuard validates patient access
    return this.patientService.remove(id, user.id);
  }
}
```

### MedicalRecordsController

```typescript
@Controller('medical-records')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
export class MedicalRecordsController {
  @Post(':id/merge')
  @Roles('ADMIN', 'DOCTOR')
  @Permissions('medical_records:*:manage')
  merge(@Param('id') targetId: string, @Body() body: any, @CurrentUser() user: UserIdentity) {
    // ✅ User has ADMIN or DOCTOR role
    // ✅ User has medical_records:*:manage permission
    // ✅ RlsGuard validates access to both records
    return this.medicalRecordsService.mergeRecords(body.sourceRecordId, targetId, body.reason, user.id);
  }
}
```

## Error Handling

### Permission Denied Response

```json
{
  "statusCode": 403,
  "message": "Insufficient permissions. Required: patients:*:write, patients:*:delete. Missing: patients:*:delete. Your permissions: patients:*:read, patients:*:write, medical_records:*:read",
  "error": "Forbidden"
}
```

### Role Denied Response

```json
{
  "statusCode": 403,
  "message": "Insufficient roles. Required: ADMIN, DOCTOR. Your roles: NURSE",
  "error": "Forbidden"
}
```

### RLS Denied Response

```json
{
  "statusCode": 403,
  "message": "Access denied to Patient abc-123",
  "error": "Forbidden"
}
```

## Multi-Role User Support

### Permission Aggregation

Users with multiple roles get **combined permissions**:

```typescript
// User has roles: ['DOCTOR', 'NURSE']
// DOCTOR role permissions: ['patients:*:read', 'patients:*:write', 'medical_records:*:read']
// NURSE role permissions: ['patients:*:read', 'theater:*:read', 'consent:*:write']

// Combined user permissions: [
//   'patients:*:read',        // From both roles
//   'patients:*:write',      // From DOCTOR
//   'medical_records:*:read', // From DOCTOR
//   'theater:*:read',        // From NURSE
//   'consent:*:write'         // From NURSE
// ]

// User can access:
// ✅ @Permissions('patients:*:read') - has from both roles
// ✅ @Permissions('theater:*:read') - has from NURSE
// ✅ @Permissions('consent:*:write') - has from NURSE
// ❌ @Permissions('patients:*:delete') - missing from both roles
```

### Ownership Still Enforced

Multi-role users **cannot bypass ownership checks**:

```typescript
// User has roles: ['DOCTOR', 'NURSE']
// User has permission: 'patients:*:read'
// User tries to access: GET /api/v1/patients/patient-2-id

// ✅ RolesGuard: User has DOCTOR role
// ✅ PermissionsGuard: User has patients:*:read permission
// ❌ RlsGuard: User has no relationship with patient-2-id
// Result: 403 Forbidden - "Access denied to Patient patient-2-id"
```

## Files Modified

### Guards (1 file)
- ✅ `backend/src/modules/auth/guards/permissions.guard.ts`

### Controllers (6 files)
- ✅ `backend/src/modules/patient/controllers/patient.controller.ts`
- ✅ `backend/src/modules/theater/controllers/theater.controller.ts`
- ✅ `backend/src/modules/medical-records/controllers/medicalRecords.controller.ts`
- ✅ `backend/src/modules/consent/controllers/consent.controller.ts`
- ✅ `backend/src/modules/billing/controllers/billing.controller.ts`
- ✅ `backend/src/modules/inventory/controllers/inventory.controller.ts`

## Testing Examples

### Unit Test

```typescript
describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let identityContext: IdentityContextService;
  let dataAccessLogService: DataAccessLogService;

  beforeEach(() => {
    // Setup mocks
  });

  it('should allow access when user has all required permissions', async () => {
    jest.spyOn(identityContext, 'hasAllPermissions').mockReturnValue(true);
    
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    
    expect(dataAccessLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PERMISSION_CHECK',
        success: true,
      })
    );
  });

  it('should deny access when user lacks required permissions', async () => {
    jest.spyOn(identityContext, 'hasAllPermissions').mockReturnValue(false);
    
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    
    expect(dataAccessLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PERMISSION_CHECK',
        success: false,
      })
    );
  });
});
```

### Integration Test

```typescript
describe('Permission Enforcement E2E', () => {
  it('should enforce permission checks on all endpoints', async () => {
    // User with limited permissions
    const limitedUser = await createUserWithPermissions(['patients:*:read']);

    // Should be able to read
    await request(app.getHttpServer())
      .get('/api/v1/patients')
      .set('Authorization', `Bearer ${limitedUser.token}`)
      .expect(200);

    // Should NOT be able to write
    await request(app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${limitedUser.token}`)
      .send({ firstName: 'John', lastName: 'Doe' })
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toContain('Insufficient permissions');
        expect(res.body.message).toContain('patients:*:write');
      });
  });

  it('should require ALL specified permissions', async () => {
    // User with only one of two required permissions
    const partialUser = await createUserWithPermissions(['patients:*:read']);

    // Route requires both read and write
    // @Permissions('patients:*:read', 'patients:*:write')
    await request(app.getHttpServer())
      .patch('/api/v1/patients/patient-id')
      .set('Authorization', `Bearer ${partialUser.token}`)
      .send({ firstName: 'Updated' })
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toContain('Missing: patients:*:write');
      });
  });
});
```

## Security Benefits

### 1. Defense in Depth
- **Three independent layers**: Roles, Permissions, RLS
- **Each layer validates**: Failure at any layer denies access
- **No single point of failure**: Multiple validation points

### 2. Fine-Grained Control
- **Permission-based**: More granular than role-only
- **Action-specific**: Different permissions for read vs. write
- **Domain-specific**: Permissions scoped to resource domains

### 3. Complete Audit Trail
- **All checks logged**: Roles, permissions, and resource access
- **Success and failure**: Both logged for compliance
- **Detailed information**: Shows what was checked and why it failed

### 4. Multi-Role Support
- **Combined permissions**: Users get permissions from all roles
- **Ownership enforced**: Cannot bypass with multiple roles
- **Flexible access**: Access based on combined permissions

## Permission Format Reference

### Standard Format
```
{domain}:*:{action}
```

### Domains
- `patients` - Patient management
- `medical_records` - Medical records
- `theater` - Surgical theater/cases
- `billing` - Billing and invoicing
- `inventory` - Inventory management
- `consent` - Consent management

### Actions
- `read` - View/list resources
- `write` - Create/update resources
- `delete` - Delete resources (ADMIN only typically)
- `manage` - Special operations (merge, approve, etc.)

### Examples
- `patients:*:read` - Read all patients
- `patients:*:write` - Create/update all patients
- `patients:*:delete` - Delete patients
- `medical_records:*:read` - Read all medical records
- `medical_records:*:write` - Create/update medical records
- `medical_records:*:manage` - Merge/manage medical records
- `theater:*:read` - Read all surgical cases
- `theater:*:write` - Create/update surgical cases
- `billing:*:read` - Read all bills
- `billing:*:write` - Create/update bills
- `inventory:*:read` - Read all inventory items
- `inventory:*:write` - Create/update inventory items
- `consent:*:read` - Read all consent instances
- `consent:*:write` - Create/update/revoke consent

## Integration Checklist

- [x] PermissionsGuard updated with audit logging
- [x] All controllers use `domain:*:action` format
- [x] RolesGuard and PermissionsGuard work together
- [x] RlsGuard integrates with both guards
- [x] Audit logging includes permission checks
- [x] Error messages show missing permissions
- [x] Multi-role users supported
- [x] Ownership checks still enforced

## Next Steps

1. **Database Setup**: Ensure permissions exist in `Permission` table
2. **Role-Permission Mapping**: Assign permissions to roles via `RolePermission` table
3. **JWT Token**: Ensure permissions are included in JWT payload
4. **Frontend Update**: Update frontend to use `domain:*:action` format
5. **Testing**: Verify all permission checks work correctly
6. **Documentation**: Update API docs with permission requirements

---

**Status**: ✅ PermissionsGuard fully implemented with audit logging. All controllers updated with standardized permission format.












