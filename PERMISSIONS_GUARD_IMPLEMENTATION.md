# PermissionsGuard Implementation Guide

## ✅ Implementation Complete

### PermissionsGuard Updated ✅

**File**: `backend/src/modules/auth/guards/permissions.guard.ts`

**Key Features**:
- ✅ Async implementation for audit logging
- ✅ Checks if user has **ALL** required permissions (not just ANY)
- ✅ Integrates with `DataAccessLogService` for audit logging
- ✅ Throws `ForbiddenException` with detailed error messages
- ✅ Logs all permission checks (success and failure)
- ✅ Shows missing permissions in error message

**Changes**:
- Changed from `hasAnyPermission()` to `hasAllPermissions()` - user must have ALL specified permissions
- Added async audit logging
- Added detailed error messages showing missing permissions
- Integrated with existing audit logging system

### All Controllers Updated ✅

All 6 controllers now use the `domain:*:action` permission format:

1. **PatientController**
   - `patients:*:read` - Read patient data
   - `patients:*:write` - Create/update patients
   - `patients:*:delete` - Delete patients (ADMIN only)

2. **TheaterController**
   - `theater:*:read` - Read surgical cases
   - `theater:*:write` - Create/update cases and status

3. **MedicalRecordsController**
   - `medical_records:*:read` - Read medical records
   - `medical_records:*:write` - Create/update records
   - `medical_records:*:manage` - Merge records (ADMIN/DOCTOR only)

4. **ConsentController**
   - `consent:*:read` - Read consent instances
   - `consent:*:write` - Create/update/revoke consent

5. **BillingController**
   - `billing:*:read` - Read bills
   - `billing:*:write` - Create/update bills

6. **InventoryController**
   - `inventory:*:read` - Read inventory items
   - `inventory:*:write` - Create/update items

## Permission Format

### Standard Format: `domain:*:action`

- **domain**: Resource domain (e.g., `patients`, `medical_records`, `theater`)
- **`*`**: Wildcard for all resources in domain (can be replaced with specific resource ID for future fine-grained control)
- **action**: Action type (`read`, `write`, `delete`, `manage`)

### Examples

```typescript
// Read access to all patients
@Permissions('patients:*:read')

// Write access to all patients
@Permissions('patients:*:write')

// Delete access to all patients (ADMIN only)
@Permissions('patients:*:delete')

// Read access to all medical records
@Permissions('medical_records:*:read')

// Write access to all medical records
@Permissions('medical_records:*:write')

// Manage access (merge, special operations)
@Permissions('medical_records:*:manage')
```

## Three-Layer Security Model

### Layer 1: RolesGuard
- **Purpose**: Coarse-grained access control
- **Checks**: User has at least ONE required role
- **Example**: `@Roles('ADMIN', 'DOCTOR', 'NURSE')`
- **Logic**: `hasAnyRole(requiredRoles)`

### Layer 2: PermissionsGuard
- **Purpose**: Fine-grained access control
- **Checks**: User has ALL required permissions
- **Example**: `@Permissions('patients:*:write')`
- **Logic**: `hasAllPermissions(requiredPermissions)`

### Layer 3: RlsGuard
- **Purpose**: Row-level security
- **Checks**: User has access to specific resource
- **Example**: Validates patient relationship, case assignment
- **Logic**: Resource ownership/relationship validation

### Integration

All three guards work together:

```typescript
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@Get(':id')
@Roles('ADMIN', 'DOCTOR', 'NURSE')
@Permissions('patients:*:read')
findOne(@Param('id') id: string) {
  // 1. RolesGuard: User must have ADMIN, DOCTOR, or NURSE role
  // 2. PermissionsGuard: User must have patients:*:read permission
  // 3. RlsGuard: User must have access to this specific patient
  return this.patientService.findOne(id);
}
```

## Permission Check Logic

### Current Implementation

```typescript
// PermissionsGuard checks ALL permissions
const hasAllPermissions = this.identityContext.hasAllPermissions(requiredPermissions);

// If user has permissions: ['patients:*:read', 'patients:*:write', 'medical_records:*:read']
// And route requires: ['patients:*:read']
// Result: ✅ Access granted (user has all required)

// If route requires: ['patients:*:read', 'patients:*:delete']
// Result: ❌ Access denied (user missing patients:*:delete)
```

### Multi-Permission Requirements

If multiple permissions are specified, user must have ALL:

```typescript
@Permissions('patients:*:read', 'patients:*:write')
// User must have BOTH permissions
```

## Audit Logging

### Permission Check Logging

Every permission check is logged to `DataAccessLog`:

```typescript
{
  userId: string,
  resourceType: 'Route',
  resourceId: 'GET /api/v1/patients/:id',
  action: 'PERMISSION_CHECK',
  reason: 'Permission check: Required [patients:*:read]',
  accessedPHI: false,
  success: boolean,
  errorMessage?: string,
  ipAddress: string,
  userAgent: string,
  sessionId: string,
  accessedAt: Date
}
```

### Logging Details

- **Success**: Logged when user has all required permissions
- **Failure**: Logged when user lacks required permissions
- **Missing Permissions**: Included in error message and log
- **User Permissions**: Included in error message for debugging

## Example Controller Usage

### PatientController Example

```typescript
@Controller('patients')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class PatientController {
  @Post()
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('patients:*:write')
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: UserIdentity) {
    // RolesGuard: Checks user has ADMIN, NURSE, or DOCTOR
    // PermissionsGuard: Checks user has patients:*:write
    // Both must pass
    return this.patientService.create(dto, user.id);
  }

  @Get(':id')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('patients:*:read')
  findOne(@Param('id') id: string) {
    // RolesGuard: Checks role
    // PermissionsGuard: Checks permission
    // RlsGuard: Checks resource access
    return this.patientService.findOne(id);
  }
}
```

## Permission Mapping

### Role to Permission Mapping (Backend)

Permissions are assigned to roles via `RolePermission` table. Example mappings:

**ADMIN Role**:
- `patients:*:*` (all patient permissions)
- `medical_records:*:*` (all medical record permissions)
- `theater:*:*` (all theater permissions)
- `billing:*:*` (all billing permissions)
- `inventory:*:*` (all inventory permissions)
- `consent:*:*` (all consent permissions)

**DOCTOR Role**:
- `patients:*:read`
- `patients:*:write`
- `medical_records:*:read`
- `medical_records:*:write`
- `theater:*:read`
- `billing:*:read`

**NURSE Role**:
- `patients:*:read`
- `patients:*:write`
- `medical_records:*:read`
- `theater:*:read`
- `theater:*:write`
- `consent:*:read`
- `consent:*:write`

**BILLING Role**:
- `billing:*:read`
- `billing:*:write`
- `patients:*:read` (to view patient info for billing)

**INVENTORY_MANAGER Role**:
- `inventory:*:read`
- `inventory:*:write`

## Error Messages

### Permission Denied

```json
{
  "statusCode": 403,
  "message": "Insufficient permissions. Required: patients:*:write, patients:*:delete. Missing: patients:*:delete. Your permissions: patients:*:read, patients:*:write, medical_records:*:read",
  "error": "Forbidden"
}
```

### Role Denied

```json
{
  "statusCode": 403,
  "message": "Insufficient roles. Required: ADMIN, DOCTOR. Your roles: NURSE",
  "error": "Forbidden"
}
```

## Multi-Role User Support

### How It Works

Users with multiple roles get **combined permissions** from all their roles:

```typescript
// User has roles: ['DOCTOR', 'NURSE']
// DOCTOR role has: ['patients:*:read', 'patients:*:write', 'medical_records:*:read']
// NURSE role has: ['patients:*:read', 'theater:*:read', 'consent:*:write']

// Combined permissions: [
//   'patients:*:read',
//   'patients:*:write',
//   'medical_records:*:read',
//   'theater:*:read',
//   'consent:*:write'
// ]

// User can access:
// ✅ @Permissions('patients:*:read') - has from both roles
// ✅ @Permissions('theater:*:read') - has from NURSE role
// ❌ @Permissions('patients:*:delete') - missing from both roles
```

### Ownership Still Enforced

Multi-role users still cannot bypass ownership checks:
- Having `patients:*:read` doesn't grant access to all patients
- RlsGuard still validates resource relationships
- User must have relationship with patient via case assignment, etc.

## Testing

### Unit Test Example

```typescript
describe('PermissionsGuard', () => {
  it('should allow access when user has all required permissions', async () => {
    const user = {
      id: 'user-1',
      permissions: ['patients:*:read', 'patients:*:write'],
    };
    
    // Mock IdentityContextService
    jest.spyOn(identityContext, 'hasAllPermissions').mockReturnValue(true);
    
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should deny access when user lacks required permissions', async () => {
    const user = {
      id: 'user-1',
      permissions: ['patients:*:read'], // Missing patients:*:write
    };
    
    jest.spyOn(identityContext, 'hasAllPermissions').mockReturnValue(false);
    
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
```

### Integration Test Example

```typescript
it('should enforce permission checks', async () => {
  // User with limited permissions
  const limitedUserToken = await loginAsLimitedUser();

  // Try to access endpoint requiring permission user doesn't have
  return request(app.getHttpServer())
    .post('/api/v1/patients')
    .set('Authorization', `Bearer ${limitedUserToken}`)
    .send({ firstName: 'John', lastName: 'Doe' })
    .expect(403)
    .expect((res) => {
      expect(res.body.message).toContain('Insufficient permissions');
      expect(res.body.message).toContain('patients:*:write');
    });
});
```

## Files Modified

1. ✅ `backend/src/modules/auth/guards/permissions.guard.ts` - Updated with audit logging and ALL permissions check
2. ✅ `backend/src/modules/patient/controllers/patient.controller.ts` - Updated permission format
3. ✅ `backend/src/modules/theater/controllers/theater.controller.ts` - Updated permission format
4. ✅ `backend/src/modules/medical-records/controllers/medicalRecords.controller.ts` - Updated permission format
5. ✅ `backend/src/modules/consent/controllers/consent.controller.ts` - Updated permission format
6. ✅ `backend/src/modules/billing/controllers/billing.controller.ts` - Updated permission format
7. ✅ `backend/src/modules/inventory/controllers/inventory.controller.ts` - Updated permission format

## Permission Naming Convention

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
- `delete` - Delete resources
- `manage` - Special operations (merge, approve, etc.)

## Integration with Frontend

### Frontend Permission Checks

The frontend can use the same permission format:

```typescript
// Frontend hook
const { hasPermission } = usePermissions();

// Check permission
if (hasPermission('patients:*:write')) {
  // Show create button
}

// Check multiple permissions
if (hasPermission('patients:*:read') && hasPermission('patients:*:write')) {
  // Show edit button
}
```

### Permission Format Consistency

Both backend and frontend use the same format:
- Backend: `@Permissions('patients:*:read')`
- Frontend: `hasPermission('patients:*:read')`

This ensures consistency across the stack.

## Security Benefits

### 1. Defense in Depth
- Three layers of security (Roles, Permissions, RLS)
- Each layer validates independently
- Failure at any layer denies access

### 2. Fine-Grained Control
- Permissions allow granular access control
- Can restrict specific actions per domain
- More flexible than role-only access

### 3. Audit Trail
- All permission checks logged
- Shows which permissions were required
- Shows which permissions user had
- Shows missing permissions

### 4. Multi-Role Support
- Users with multiple roles get combined permissions
- Ownership checks still enforced
- No privilege escalation via multiple roles

## Next Steps

1. **Backend Permission Seeding**: Ensure permissions are created in database
2. **Role-Permission Mapping**: Assign permissions to roles via `RolePermission` table
3. **Frontend Integration**: Update frontend to use permission format
4. **Testing**: Verify permission checks work correctly
5. **Documentation**: Update API documentation with permission requirements

---

**Status**: ✅ PermissionsGuard fully implemented with audit logging. All controllers updated with `domain:*:action` format.












