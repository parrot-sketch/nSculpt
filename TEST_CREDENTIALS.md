# Test Credentials & Seed Data

This document contains test credentials and instructions for seeding the database with test data.

## Running the Seed Script

To populate the database with test data, run:

```bash
# From the backend directory
cd backend
npm run db:seed

# Or from the project root
cd backend && npm run db:seed
```

**Note**: The seed script will **delete all existing users, roles, and permissions** before creating new ones. This ensures a clean state for testing.

## Test Credentials

### Admin User
- **Email**: `admin@nairobi-sculpt.com`
- **Password**: `Admin123!`
- **Role**: ADMIN
- **Permissions**: All permissions (full system access)

### Test Users (All use password: `User123!`)

1. **Doctor**
   - **Email**: `doctor@nairobi-sculpt.com`
   - **Password**: `User123!`
   - **Role**: DOCTOR
   - **Permissions**: Medical records (read/write), Theater (read), Consent (read/write/approve)

2. **Surgeon**
   - **Email**: `surgeon@nairobi-sculpt.com`
   - **Password**: `User123!`
   - **Role**: SURGEON
   - **Permissions**: Medical records (read/write), Theater (full access), Consent (read/write/approve)

3. **Nurse**
   - **Email**: `nurse@nairobi-sculpt.com`
   - **Password**: `User123!`
   - **Role**: NURSE
   - **Permissions**: Medical records (read), Theater (read), Consent (read)

## Roles Created

The seed script creates the following roles:

1. **ADMIN** - System Administrator (all permissions)
2. **DOCTOR** - Medical professional
3. **SURGEON** - Surgical specialist
4. **NURSE** - Nursing staff
5. **THEATER_MANAGER** - Theater scheduling manager
6. **INVENTORY_MANAGER** - Inventory management
7. **BILLING** - Billing staff
8. **FRONT_DESK** - Front desk staff

## Permissions Created

The seed script creates permissions across all domains:

### RBAC Domain
- `admin:*:read`, `admin:*:write`, `admin:*:delete`
- `admin:users:read`, `admin:users:write`, `admin:users:delete`
- `admin:roles:read`, `admin:roles:write`, `admin:roles:delete`
- `admin:permissions:read`

### Medical Records Domain
- `medical_records:read`, `medical_records:write`, `medical_records:delete`

### Theater Domain
- `theater:read`, `theater:write`, `theater:book`, `theater:manage`

### Consent Domain
- `consent:read`, `consent:write`, `consent:approve`

### Inventory Domain
- `inventory:read`, `inventory:write`, `inventory:manage`

### Billing Domain
- `billing:read`, `billing:write`, `billing:approve`

### Audit Domain
- `audit:read`

## Testing Admin Workflows

### 1. Login as Admin
1. Navigate to `/login`
2. Use credentials: `admin@nairobi-sculpt.com` / `Admin123!`
3. You should be redirected to `/admin` dashboard

### 2. User Management
- **View Users**: `/admin/users`
- **Create User**: POST `/api/v1/admin/users`
- **Update User**: PATCH `/api/v1/admin/users/:id`
- **Deactivate User**: DELETE `/api/v1/admin/users/:id`
- **Assign Role**: POST `/api/v1/admin/users/:id/roles`

### 3. Role Management
- **View Roles**: `/admin/roles`
- **Create Role**: POST `/api/v1/admin/roles`
- **Update Role**: PATCH `/api/v1/admin/roles/:id`
- **Deactivate Role**: DELETE `/api/v1/admin/roles/:id`
- **Assign Permission**: POST `/api/v1/admin/roles/:id/permissions`

### 4. Permission Management
- **View Permissions**: `/admin/permissions`
- **Filter by Domain**: `/admin/permissions/by-domain/:domain`
- **View Roles with Permission**: `/admin/permissions/:id/roles`

### 5. Dashboard
- **Admin Dashboard**: `/admin`
- Shows statistics for users, roles, permissions, and system activity

## Security Notes

⚠️ **Important**: These are test credentials only. **Never use these passwords in production!**

- All passwords are hashed using bcrypt with cost factor 12
- Admin user has full system access
- Test users have role-appropriate permissions
- All actions are logged for audit purposes

## Resetting Seed Data

To reset the database and re-seed:

```bash
# Option 1: Reset migrations and re-seed
cd backend
npm run schema:migrate
npm run db:seed

# Option 2: If you want to keep migrations, just run seed
npm run db:seed
```

## Troubleshooting

If you encounter issues:

1. **Database connection**: Ensure PostgreSQL is running and `DATABASE_URL` is set correctly
2. **Prisma client**: Run `npm run schema:generate` if you see Prisma client errors
3. **Permissions**: Ensure the database user has CREATE, UPDATE, DELETE permissions
4. **Foreign key constraints**: The seed script handles dependencies in the correct order

## Next Steps

After seeding:
1. Log in as admin
2. Explore the admin dashboard
3. Create additional users as needed
4. Test role and permission assignments
5. Verify audit logs are being created










