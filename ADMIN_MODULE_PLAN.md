# Admin Module - Implementation Plan

**Goal:** Secure, type-safe admin module following engineering best practices

---

## 🎯 Admin User Stories

### Story 1: Admin Authentication & Dashboard
**As an Admin, I want to:**
- Login securely with email/password
- See a dashboard with system overview
- Access admin-only features
- View my profile and manage my account

**Acceptance Criteria:**
- ✅ Login uses existing auth system
- ✅ Dashboard shows key metrics (users, active sessions, recent activity)
- ✅ Admin routes protected with ADMIN role + permissions
- ✅ Profile management works

---

### Story 2: User Management
**As an Admin, I want to:**
- View all users with pagination and filters
- Create new users with email, name, department
- Assign roles to users
- Activate/deactivate users
- Reset user passwords
- View user activity logs

**Acceptance Criteria:**
- ✅ List users with search/filter (email, name, role, active status)
- ✅ Create user with validation (unique email, required fields)
- ✅ Assign/revoke roles with time-bound support
- ✅ Soft delete (deactivate) users
- ✅ Password reset generates secure temporary password
- ✅ All actions logged for audit

**Security Requirements:**
- ✅ Only ADMIN role can access
- ✅ All actions emit domain events
- ✅ Password hashing with bcrypt
- ✅ Input validation on all endpoints
- ✅ Rate limiting on sensitive operations

---

### Story 3: Role Management
**As an Admin, I want to:**
- View all roles
- Create new roles
- Edit role details (name, description)
- Assign permissions to roles
- Activate/deactivate roles
- View which users have each role

**Acceptance Criteria:**
- ✅ List roles with permissions
- ✅ Create role with unique code
- ✅ Update role (name, description, active status)
- ✅ Assign/remove permissions from roles
- ✅ View role assignments (which users have role)
- ✅ Cannot delete roles with active assignments

**Security Requirements:**
- ✅ Only ADMIN role can access
- ✅ Role code must be unique
- ✅ Cannot modify system roles (ADMIN, etc.) - or special handling
- ✅ All changes logged

---

### Story 4: Permission Management
**As an Admin, I want to:**
- View all permissions
- View permissions by domain
- See which roles have each permission
- Create custom permissions (if needed)

**Acceptance Criteria:**
- ✅ List all permissions
- ✅ Filter by domain
- ✅ View permission → roles mapping
- ✅ Create custom permissions (optional)

**Security Requirements:**
- ✅ Only ADMIN role can access
- ✅ Permission codes must be unique
- ✅ Domain validation

---

### Story 5: System Monitoring
**As an Admin, I want to:**
- View active sessions
- Revoke user sessions
- View audit logs
- View system health

**Acceptance Criteria:**
- ✅ List active sessions with user info
- ✅ Revoke sessions (individual or all for user)
- ✅ View access logs with filters
- ✅ View domain events
- ✅ System health endpoint

**Security Requirements:**
- ✅ Only ADMIN role can access
- ✅ Session revocation logged
- ✅ Audit logs read-only (immutable)

---

## 🏗️ Architecture

### Backend Structure
```
backend/src/modules/admin/
  ├── admin.module.ts
  ├── controllers/
  │   ├── admin.controller.ts          # Main admin endpoints
  │   ├── users.controller.ts         # User management
  │   ├── roles.controller.ts         # Role management
  │   └── permissions.controller.ts  # Permission management
  ├── services/
  │   ├── admin.service.ts            # Dashboard, system info
  │   ├── users.service.ts            # User CRUD operations
  │   ├── roles.service.ts            # Role CRUD operations
  │   └── permissions.service.ts     # Permission operations
  ├── repositories/
  │   ├── users.repository.ts        # User data access
  │   ├── roles.repository.ts        # Role data access
  │   └── permissions.repository.ts  # Permission data access
  └── dto/
      ├── create-user.dto.ts
      ├── update-user.dto.ts
      ├── assign-role.dto.ts
      ├── create-role.dto.ts
      ├── update-role.dto.ts
      └── ...
```

### Frontend Structure
```
client/app/(protected)/admin/
  ├── layout.tsx                     # Admin layout with nav
  ├── dashboard/
  │   └── page.tsx                   # Admin dashboard
  ├── users/
  │   ├── page.tsx                   # User list
  │   ├── [id]/
  │   │   └── page.tsx               # User detail/edit
  │   └── new/
  │       └── page.tsx               # Create user
  ├── roles/
  │   ├── page.tsx                   # Role list
  │   └── [id]/
  │       └── page.tsx               # Role detail/edit
  └── permissions/
      └── page.tsx                   # Permission list
```

---

## 🔒 Security Requirements

### Authentication & Authorization
- ✅ All endpoints require JWT authentication
- ✅ All endpoints require ADMIN role
- ✅ Fine-grained permissions: `admin:*:read`, `admin:*:write`, `admin:*:delete`
- ✅ RLS bypass for admin (admin sees all data)

### Input Validation
- ✅ All DTOs use class-validator
- ✅ Prisma types for type safety
- ✅ Sanitize inputs (prevent injection)
- ✅ Validate UUIDs, emails, etc.

### Audit & Logging
- ✅ All admin actions emit domain events
- ✅ All actions logged to DataAccessLog
- ✅ Failed attempts logged
- ✅ Session management tracked

### Data Protection
- ✅ Passwords never returned in responses
- ✅ Sensitive fields excluded from responses
- ✅ Rate limiting on sensitive operations
- ✅ CSRF protection (if applicable)

---

## 📋 API Endpoints

### Admin Dashboard
```
GET  /api/v1/admin/dashboard          # System overview
GET  /api/v1/admin/stats              # Key metrics
```

### User Management
```
GET    /api/v1/admin/users             # List users (paginated, filtered)
GET    /api/v1/admin/users/:id         # Get user details
POST   /api/v1/admin/users             # Create user
PATCH  /api/v1/admin/users/:id         # Update user
DELETE /api/v1/admin/users/:id         # Deactivate user
POST   /api/v1/admin/users/:id/roles   # Assign role to user
DELETE /api/v1/admin/users/:id/roles/:roleId  # Revoke role
POST   /api/v1/admin/users/:id/reset-password  # Reset password
GET    /api/v1/admin/users/:id/sessions  # Get user sessions
DELETE /api/v1/admin/users/:id/sessions/:sessionId  # Revoke session
```

### Role Management
```
GET    /api/v1/admin/roles             # List roles
GET    /api/v1/admin/roles/:id         # Get role details
POST   /api/v1/admin/roles             # Create role
PATCH  /api/v1/admin/roles/:id         # Update role
DELETE /api/v1/admin/roles/:id         # Deactivate role
POST   /api/v1/admin/roles/:id/permissions  # Assign permission
DELETE /api/v1/admin/roles/:id/permissions/:permissionId  # Remove permission
GET    /api/v1/admin/roles/:id/users  # Get users with this role
```

### Permission Management
```
GET    /api/v1/admin/permissions       # List permissions
GET    /api/v1/admin/permissions/:id   # Get permission details
GET    /api/v1/admin/permissions/by-domain/:domain  # Filter by domain
```

### System Monitoring
```
GET    /api/v1/admin/sessions          # List active sessions
DELETE /api/v1/admin/sessions/:id      # Revoke session
GET    /api/v1/admin/audit-logs        # View audit logs
GET    /api/v1/admin/health            # System health
```

---

## 🎨 Type Safety Strategy

### Backend
1. **DTOs derive from Prisma types**
   ```typescript
   import { Prisma } from '@prisma/client';
   export class CreateUserDto implements Pick<Prisma.UserCreateInput, 'email' | 'firstName' | ...> {
     // Validation decorators
   }
   ```

2. **Repository uses Prisma types**
   ```typescript
   async create(data: CreateUserDto): Promise<Prisma.UserGetPayload<{...}>> {
     // Type-safe Prisma operations
   }
   ```

3. **Service layer type-safe**
   ```typescript
   async createUser(dto: CreateUserDto, adminId: string): Promise<UserResponse> {
     // Type-safe operations
   }
   ```

### Frontend
1. **Shared types package** (future)
2. **API client with types**
3. **Form validation with Zod** (optional)

---

## ✅ Implementation Checklist

### Phase 1: Foundation
- [ ] Create admin module structure
- [ ] Set up admin routes with guards
- [ ] Create Prisma-driven DTOs
- [ ] Implement repositories with type safety

### Phase 2: User Management
- [ ] User CRUD endpoints
- [ ] Role assignment endpoints
- [ ] Password reset
- [ ] Session management

### Phase 3: Role & Permission Management
- [ ] Role CRUD endpoints
- [ ] Permission assignment
- [ ] Permission listing

### Phase 4: Dashboard & Monitoring
- [ ] Dashboard stats endpoint
- [ ] Audit log viewing
- [ ] Session management UI

### Phase 5: Frontend
- [ ] Admin layout
- [ ] Dashboard page
- [ ] User management pages
- [ ] Role management pages

---

## 🚀 Next Steps

1. **Create admin module structure**
2. **Implement user management (most critical)**
3. **Add role/permission management**
4. **Build admin dashboard**
5. **Test end-to-end security**

---

**Ready to implement?** Starting with user management as it's the most foundational.










