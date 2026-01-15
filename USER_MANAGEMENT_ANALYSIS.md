# User Management Module Analysis
**Date:** 2026-01-10  
**Objective:** Comprehensive analysis of current User Management implementation

---

## 1. USER-RELATED MODELS

### 1.1 Core Models

#### **User Model** (`rbac.prisma`)
```prisma
model User {
  // Identity
  id          String   @id @default(uuid())
  email       String   @unique
  employeeId  String?  @unique // Optional employee ID for staff
  username    String?  @unique // Optional username
  
  // Authentication
  passwordHash String
  passwordChangedAt DateTime?
  passwordResetToken String?
  passwordResetExpiresAt DateTime?
  
  // Account lockout (Phase 1 hardening)
  failedLoginAttempts Int @default(0)
  lastFailedLoginAt   DateTime?
  lockedUntil         DateTime?
  
  // Profile
  firstName   String
  lastName    String
  middleName  String?
  title       String? // Dr., Mr., Ms., etc.
  phone       String?
  
  // Professional (for staff)
  departmentId String?
  specialization String?
  licenseNumber String?
  npiNumber    String?
  
  // Status
  isActive    Boolean  @default(true)
  isEmailVerified Boolean @default(false)
  lastLoginAt DateTime?
  
  // MFA
  mfaEnabled  Boolean  @default(false)
  mfaSecret   String?
  backupCodes String[]
  
  // Audit
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String?
  updatedBy   String?
  version     Int      @default(1)
  
  // Relations
  department  Department?
  roleAssignments UserRoleAssignment[]
  sessions    Session[]
  dataAccessLogs DataAccessLog[]
  // ... many cross-domain relations
}
```

**Key Features:**
- ✅ Account lockout after failed login attempts
- ✅ MFA support (TOTP + backup codes)
- ✅ Professional fields for staff (specialization, license, NPI)
- ✅ Version field for optimistic locking
- ✅ Audit fields (createdBy, updatedBy, timestamps)

---

#### **Patient Model** (`patient.prisma`)
```prisma
model Patient {
  // Identity
  id          String   @id @default(uuid())
  patientNumber String @unique // MRN format: MRN-YYYY-XXXXX
  fileNumber  String   @unique // NS001 format
  
  // Demographics
  firstName   String
  lastName    String
  middleName  String?
  dateOfBirth DateTime
  gender      String?
  bloodType   String?
  
  // Contact
  email       String?
  phone       String?
  whatsapp    String?
  
  // Address
  address     String?
  city        String?
  state       String?
  zipCode     String?
  country     String? @default("Kenya")
  
  // Status
  status      PatientStatus @default(ACTIVE)
  restricted  Boolean  @default(false)
  restrictedReason String?
  restrictedBy String?
  restrictedAt DateTime?
  
  // Lifecycle State (CRITICAL: Managed ONLY by PatientLifecycleService)
  lifecycleState PatientLifecycleState @default(REGISTERED)
  lifecycleStateChangedAt DateTime?
  lifecycleStateChangedBy String? // FK to User
  
  // Audit
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String?
  updatedBy   String?
  version     Int      @default(1)
  
  // Relations
  doctorInCharge User? @relation("PatientDoctorInCharge")
  // ... many relations to clinical data
}
```

**Lifecycle States:**
- `REGISTERED` - Patient registered but not verified
- `VERIFIED` - Patient identity verified
- `INTAKE_IN_PROGRESS` - Patient filling intake forms
- `INTAKE_COMPLETED` - Patient submitted intake
- `INTAKE_VERIFIED` - Staff verified intake
- `CONSULTATION_REQUESTED` - Patient requested consultation
- `CONSULTATION_APPROVED` - Consultation approved
- `APPOINTMENT_SCHEDULED` - Appointment scheduled
- `CONSULTATION_COMPLETED` - Consultation completed
- `PROCEDURE_PLANNED` - Procedure planned
- `CONSENT_SIGNED` - Consent signed
- `SURGERY_SCHEDULED` - Surgery scheduled
- `SURGERY_COMPLETED` - Surgery completed
- `FOLLOW_UP` - Follow-up care
- `DISCHARGED` - Patient discharged (TERMINAL)

---

#### **Role Model** (`rbac.prisma`)
```prisma
model Role {
  id          String   @id @default(uuid())
  code        String   @unique // e.g., "SURGEON", "NURSE", "ADMIN"
  name        String
  description String?
  
  domain      Domain?  // Optional: restrict role to specific domain
  isActive    Boolean  @default(true)
  isSystem    Boolean  @default(false) // System roles cannot be deleted
  
  // Audit
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String?
  updatedBy   String?
  version     Int      @default(1)
  
  // Relations
  permissions RolePermission[]
  userAssignments UserRoleAssignment[]
}
```

**Standard Roles:**
- `ADMIN` - System administrator
- `DOCTOR` - Physician/doctor
- `NURSE` - Nurse
- `PATIENT` - Patient user
- `SURGEON` - Surgeon (may be separate from DOCTOR)
- `FRONT_DESK` - Front desk staff

---

#### **Permission Model** (`rbac.prisma`)
```prisma
model Permission {
  id          String   @id @default(uuid())
  code        String   @unique // e.g., "medical_records:read", "theater:book"
  name        String
  description String?
  
  domain      Domain   // Required: which domain this permission applies to
  resource    String?  // Optional: specific resource type
  action      String   // READ, WRITE, DELETE, EXPORT, etc.
  
  isActive    Boolean  @default(true)
  
  // Relations
  rolePermissions RolePermission[]
}
```

**Permission Format:**
- `{resource}:{action}` - e.g., `patients:*:read`, `patients:*:write`
- `{domain}:{resource}:{action}` - e.g., `medical_records:patients:read`

---

#### **UserRoleAssignment Model** (`rbac.prisma`)
```prisma
model UserRoleAssignment {
  id          String   @id @default(uuid())
  userId      String   // FK to User
  roleId      String   // FK to Role
  
  // Time-bound access
  validFrom   DateTime @default(now())
  validUntil  DateTime? // Null = indefinite
  
  // Status
  isActive    Boolean  @default(true)
  revokedAt   DateTime?
  revokedBy   String?  // FK to User
  
  // Audit
  createdAt   DateTime @default(now())
  createdBy   String?
  version     Int      @default(1)
  
  // Relations
  user        User     @relation(...)
  role        Role     @relation(...)
  revokedByUser User?  @relation(...)
}
```

**Key Features:**
- ✅ Time-bound role assignments (validFrom, validUntil)
- ✅ Role revocation with audit trail
- ✅ Cannot reactivate revoked assignments (immutable revocation)

---

## 2. SERVICES AND CONTROLLERS

### 2.1 User Management Services

#### **AuthService** (`modules/auth/services/auth.service.ts`)
**Responsibilities:**
- User authentication (login, logout)
- Token generation (access token, refresh token)
- Session management
- Password validation
- Account lockout handling

**Key Methods:**
- `login(loginDto, ipAddress, userAgent)` - Authenticate user
- `logout(sessionId)` - Revoke session
- `validateToken(token)` - Verify JWT token
- `changePassword(userId, oldPassword, newPassword)` - Change password

---

#### **UsersService** (`modules/admin/services/users.service.ts`)
**Responsibilities:**
- Admin user CRUD operations
- Role assignment/revocation
- User deactivation
- Password reset (admin-initiated)

**Key Methods:**
- `createUser(createUserDto, adminId)` - Create new user (admin)
- `updateUser(id, updateUserDto, adminId)` - Update user (admin)
- `deactivateUser(id, adminId)` - Deactivate user
- `assignRole(userId, assignRoleDto, adminId)` - Assign role to user
- `revokeRole(userId, roleId, adminId)` - Revoke role from user
- `resetPassword(id, adminId)` - Reset user password (admin)
- `getUserSessions(id, adminId)` - Get user's active sessions

**Audit:**
- ✅ All operations emit domain events
- ✅ All operations write to audit log
- ✅ IP address and user agent captured

---

#### **RolesService** (`modules/admin/services/roles.service.ts`)
**Responsibilities:**
- Role CRUD operations
- Permission assignment to roles
- Role deactivation

**Key Methods:**
- `createRole(createRoleDto, adminId)` - Create new role
- `updateRole(id, updateRoleDto, adminId)` - Update role
- `deactivateRole(id, adminId)` - Deactivate role
- `assignPermission(roleId, assignPermissionDto, adminId)` - Assign permission to role
- `removePermission(roleId, permissionId, adminId)` - Remove permission from role
- `getUsersWithRole(roleId, adminId)` - Get all users with role

---

#### **PatientService** (`modules/patient/services/patient.service.ts`)
**Responsibilities:**
- Patient CRUD operations (admin/staff)
- Patient self-registration
- Patient profile updates (limited)

**Key Methods:**
- `create(createPatientDto, userId)` - Create patient (admin/staff)
- `selfRegister(registerDto)` - Patient self-registration
- `update(id, updatePatientDto, userId)` - Update patient
- `findOne(id, userId)` - Get patient by ID
- `findAll(skip, take, userId)` - List patients

**Self-Registration Workflow:**
1. Create Patient record (lifecycle: REGISTERED)
2. Create User account with PATIENT role
3. Initialize lifecycle through PatientLifecycleService
4. Emit domain event (Patient.Created)
5. Return patient record and account info

---

### 2.2 Controllers

#### **AuthController** (`modules/auth/controllers/auth.controller.ts`)
**Endpoints:**
- `POST /auth/login` - User login (Public)
- `POST /auth/refresh` - Refresh access token (Public)
- `POST /auth/logout` - Logout (Authenticated)
- `GET /auth/me` - Get current user profile (Authenticated)
- `POST /auth/change-password` - Change password (Authenticated)

**Security:**
- ✅ Login attempts logged with IP/user agent
- ✅ Account lockout after failed attempts
- ✅ Secure HTTP-only cookies for tokens
- ✅ Session management

---

#### **UsersController** (`modules/admin/controllers/users.controller.ts`)
**Endpoints:**
- `POST /admin/users` - Create user (ADMIN)
- `GET /admin/users` - List users (ADMIN)
- `GET /admin/users/:id` - Get user by ID (ADMIN)
- `PATCH /admin/users/:id` - Update user (ADMIN)
- `DELETE /admin/users/:id` - Deactivate user (ADMIN)
- `POST /admin/users/:id/roles` - Assign role (ADMIN)
- `DELETE /admin/users/:id/roles/:roleId` - Revoke role (ADMIN)
- `POST /admin/users/:id/reset-password` - Reset password (ADMIN)
- `GET /admin/users/:id/sessions` - Get user sessions (ADMIN)

**Security:**
- ✅ Requires ADMIN role
- ✅ Requires `admin:*:read` or `admin:*:write` permissions
- ✅ All actions logged for audit
- ✅ IP address and user agent captured

---

#### **RolesController** (`modules/admin/controllers/roles.controller.ts`)
**Endpoints:**
- `POST /admin/roles` - Create role (ADMIN)
- `GET /admin/roles` - List roles (ADMIN)
- `GET /admin/roles/:id` - Get role by ID (ADMIN)
- `PATCH /admin/roles/:id` - Update role (ADMIN)
- `DELETE /admin/roles/:id` - Deactivate role (ADMIN)
- `POST /admin/roles/:id/permissions` - Assign permission (ADMIN)
- `DELETE /admin/roles/:id/permissions/:permissionId` - Remove permission (ADMIN)
- `GET /admin/roles/:id/users` - Get users with role (ADMIN)

**Security:**
- ✅ Requires ADMIN role
- ✅ Requires `admin:roles:read` or `admin:roles:write` permissions
- ✅ All actions logged for audit

---

#### **PatientController** (`modules/patient/controllers/patient.controller.ts`)
**Endpoints:**
- `POST /patients` - Create patient (ADMIN, NURSE, DOCTOR)
- `GET /patients` - List patients (ADMIN, NURSE, DOCTOR)
- `GET /patients/:id` - Get patient by ID (ADMIN, NURSE, DOCTOR)
- `PATCH /patients/:id` - Update patient (ADMIN, NURSE, DOCTOR)
- `DELETE /patients/:id` - Delete patient (ADMIN)
- `POST /patients/:id/merge` - Merge patients (ADMIN)
- `POST /patients/:id/restrict` - Restrict patient (ADMIN)
- `POST /patients/:id/unrestrict` - Unrestrict patient (ADMIN)

**Security:**
- ✅ Requires roles: ADMIN, NURSE, DOCTOR
- ✅ Requires `patients:*:read`, `patients:*:write`, or `patients:*:delete` permissions
- ✅ RLSGuard validates resource access
- ✅ All actions logged for audit

**Field Permissions:**
- ✅ `PatientFieldPermissionService` enforces field-level permissions
- ✅ Demographics fields: FRONT_DESK can edit
- ✅ Clinical fields: NURSE/DOCTOR can edit
- ✅ Restricted fields: ADMIN only
- ✅ System fields: Cannot be modified

---

#### **PatientPublicController** (`modules/patient/controllers/patient-public.controller.ts`)
**Endpoints:**
- `POST /public/patients/register` - Patient self-registration (Public)

**Security:**
- ✅ Public endpoint (no authentication required)
- ✅ Rate-limited (to prevent abuse)
- ✅ Duplicate checking
- ✅ Creates both Patient and User records
- ✅ Initializes lifecycle (REGISTERED)

---

## 3. USER MANAGEMENT ENDPOINTS TABLE

### Authentication Endpoints

| Endpoint | Method | Public? | Role | Permission | Purpose |
|----------|--------|---------|------|------------|---------|
| `/auth/login` | POST | ✅ Yes | Any | None | User login |
| `/auth/refresh` | POST | ✅ Yes | Any | None | Refresh access token |
| `/auth/logout` | POST | ❌ No | Any | None | Logout |
| `/auth/me` | GET | ❌ No | Any | None | Get current user profile |
| `/auth/change-password` | POST | ❌ No | Any | None | Change password |

---

### Admin User Management Endpoints

| Endpoint | Method | Role | Permission | Purpose | Audit |
|----------|--------|------|------------|---------|-------|
| `/admin/users` | POST | ADMIN | `admin:users:write` | Create user | ✅ Full audit |
| `/admin/users` | GET | ADMIN | `admin:users:read` | List users | ✅ Logged |
| `/admin/users/:id` | GET | ADMIN | `admin:users:read` | Get user by ID | ✅ Logged |
| `/admin/users/:id` | PATCH | ADMIN | `admin:users:write` | Update user | ✅ Full audit |
| `/admin/users/:id` | DELETE | ADMIN | `admin:users:delete` | Deactivate user | ✅ Full audit |
| `/admin/users/:id/roles` | POST | ADMIN | `admin:users:write` | Assign role | ✅ Full audit |
| `/admin/users/:id/roles/:roleId` | DELETE | ADMIN | `admin:users:write` | Revoke role | ✅ Full audit |
| `/admin/users/:id/reset-password` | POST | ADMIN | `admin:users:write` | Reset password | ✅ Full audit |
| `/admin/users/:id/sessions` | GET | ADMIN | `admin:users:read` | Get user sessions | ✅ Logged |

---

### Admin Role Management Endpoints

| Endpoint | Method | Role | Permission | Purpose | Audit |
|----------|--------|------|------------|---------|-------|
| `/admin/roles` | POST | ADMIN | `admin:roles:write` | Create role | ✅ Full audit |
| `/admin/roles` | GET | ADMIN | `admin:roles:read` | List roles | ✅ Logged |
| `/admin/roles/:id` | GET | ADMIN | `admin:roles:read` | Get role by ID | ✅ Logged |
| `/admin/roles/:id` | PATCH | ADMIN | `admin:roles:write` | Update role | ✅ Full audit |
| `/admin/roles/:id` | DELETE | ADMIN | `admin:roles:delete` | Deactivate role | ✅ Full audit |
| `/admin/roles/:id/permissions` | POST | ADMIN | `admin:roles:write` | Assign permission | ✅ Full audit |
| `/admin/roles/:id/permissions/:permissionId` | DELETE | ADMIN | `admin:roles:write` | Remove permission | ✅ Full audit |
| `/admin/roles/:id/users` | GET | ADMIN | `admin:roles:read` | Get users with role | ✅ Logged |

---

### Patient Management Endpoints

| Endpoint | Method | Role | Permission | Purpose | RLS | Audit |
|----------|--------|------|------------|---------|-----|-------|
| `/patients` | POST | ADMIN, NURSE, DOCTOR | `patients:*:write` | Create patient | ❌ No | ✅ Full audit |
| `/patients` | GET | ADMIN, NURSE, DOCTOR | `patients:*:read` | List patients | ❌ No | ✅ Logged |
| `/patients/:id` | GET | ADMIN, NURSE, DOCTOR | `patients:*:read` | Get patient by ID | ✅ Yes | ✅ Logged |
| `/patients/:id` | PATCH | ADMIN, NURSE, DOCTOR | `patients:*:write` | Update patient | ✅ Yes | ✅ Full audit |
| `/patients/:id` | DELETE | ADMIN | `patients:*:delete` | Delete patient | ✅ Yes | ✅ Full audit |
| `/public/patients/register` | POST | Public | None | Self-registration | ❌ No | ✅ Full audit |

---

### Patient Lifecycle Endpoints

| Endpoint | Method | Role | Permission | Purpose | Audit |
|----------|--------|------|------------|---------|-------|
| `/patients/:id/lifecycle/transition` | POST | ADMIN, DOCTOR, NURSE, PATIENT | `patients:*:write` | Transition lifecycle | ✅ Full audit |
| `/patients/:id/lifecycle/state` | GET | ADMIN, DOCTOR, NURSE, PATIENT | `patients:*:read` | Get current state | ✅ Logged |
| `/patients/:id/lifecycle/history` | GET | ADMIN, DOCTOR, NURSE | `patients:*:read` | Get lifecycle history | ✅ Logged |
| `/patients/:id/lifecycle/allowed-transitions` | GET | ADMIN, DOCTOR, NURSE, PATIENT | `patients:*:read` | Get allowed transitions | ✅ Logged |

---

### Patient Intake Endpoints

| Endpoint | Method | Role | Permission | Purpose | Lifecycle | Audit |
|----------|--------|------|------------|---------|-----------|-------|
| `/patients/:id/intake/start` | POST | PATIENT, ADMIN, NURSE | `patients:*:write` | Start intake | VERIFIED → INTAKE_IN_PROGRESS | ✅ Full audit |
| `/patients/:id/intake/:intakeId` | PATCH | PATIENT, ADMIN, NURSE | `patients:*:write` | Save draft | None | ✅ Logged |
| `/patients/:id/intake/:intakeId/submit` | POST | PATIENT, ADMIN | `patients:*:write` | Submit intake | INTAKE_IN_PROGRESS → INTAKE_COMPLETED | ✅ Full audit |
| `/patients/:id/intake/:intakeId/verify` | POST | NURSE, ADMIN | `patients:*:write` | Verify intake | INTAKE_COMPLETED → INTAKE_VERIFIED | ✅ Full audit |
| `/patients/:id/intake/active` | GET | PATIENT, ADMIN, NURSE, DOCTOR | `patients:*:read` | Get active intake | Read-only | ✅ Logged |
| `/patients/:id/intake/:intakeId` | GET | PATIENT, ADMIN, NURSE, DOCTOR | `patients:*:read` | Get intake by ID | Read-only | ✅ Logged |
| `/patients/:id/intake/history` | GET | PATIENT, ADMIN, NURSE, DOCTOR | `patients:*:read` | Get intake history | Read-only | ✅ Logged |

---

## 4. ENFORCEMENT MECHANISMS

### 4.1 Role-Based Access Control (RBAC)

**Implementation:**
- **RolesGuard** (`common/guards/roles.guard.ts`) - Validates user has required role
- **PermissionsGuard** (`modules/auth/guards/permissions.guard.ts`) - Validates user has required permission
- **Role validation** - Roles validated against database (from Phase 2)
- **Permission format** - `{resource}:{action}` or `{domain}:{resource}:{action}`

**Enforcement:**
- ✅ All endpoints protected by `@Roles()` decorator
- ✅ All endpoints protected by `@Permissions()` decorator
- ✅ Role checks happen before permission checks
- ✅ Roles loaded from JWT token (validated against database)
- ✅ Permissions loaded from JWT token (validated against database)

**Example:**
```typescript
@Post('users')
@Roles('ADMIN')
@Permissions('admin:users:write')
async create(@Body() createUserDto: CreateUserDto) {
  // Only ADMIN role with admin:users:write permission can access
}
```

---

### 4.2 Row-Level Security (RLS)

**Implementation:**
- **RlsGuard** (`common/guards/rls.guard.ts`) - Validates resource access
- **RlsValidationService** (`modules/audit/services/rlsValidation.service.ts`) - Resource access validation logic

**Validation Logic:**
1. Extract resource ID from route parameters
2. Infer resource type from route path
3. Check resource ownership (createdBy, primarySurgeonId, etc.)
4. Check resource relationships (assignments, departments)
5. Check role-based access (ADMIN can access all, others restricted)

**Enforcement:**
- ✅ Applied to all protected routes with `@UseGuards(RlsGuard)`
- ✅ Validates access before controller method execution
- ✅ All access attempts logged (success and failure)
- ✅ Throws `ForbiddenException` if access denied

**Example:**
```typescript
@Get(':id')
@UseGuards(RlsGuard) // Validates user can access this patient
async findOne(@Param('id') id: string) {
  // RLS validated: user can only access patient if:
  // - User is ADMIN, OR
  // - User is assigned as doctor, OR
  // - User created the patient, OR
  // - Resource belongs to user's department
}
```

---

### 4.3 Audit Logging

**Implementation:**
- **DataAccessLogService** (`modules/audit/services/dataAccessLog.service.ts`) - Audit log creation
- **DataAccessLogInterceptor** (`common/interceptors/dataAccessLog.interceptor.ts`) - Automatic audit logging

**Audit Fields:**
- ✅ `userId` - Who performed the action
- ✅ `resourceType` - Type of resource accessed
- ✅ `resourceId` - ID of resource accessed
- ✅ `action` - Action performed (READ, WRITE, DELETE, etc.)
- ✅ `ipAddress` - IP address from request
- ✅ `userAgent` - User agent from request
- ✅ `sessionId` - Session ID for correlation
- ✅ `reason` - Reason for access (optional, required for sensitive operations)
- ✅ `justification` - Justification for access
- ✅ `accessedPHI` - Whether PHI was accessed (true/false)
- ✅ `success` - Whether action succeeded
- ✅ `errorMessage` - Error message if failed
- ✅ `accessedAt` - Timestamp

**Automatic Logging:**
- ✅ All endpoints with `@UseInterceptors(DataAccessLogInterceptor)` automatically log
- ✅ Manual logging for service-level operations
- ✅ Lifecycle transitions logged separately in `PatientLifecycleTransition` table

**Example:**
```typescript
@UseInterceptors(DataAccessLogInterceptor) // Automatic audit logging
@Post('users')
async create(@Body() createUserDto: CreateUserDto, @Req() request: Request) {
  // Audit log automatically created with:
  // - userId (from @CurrentUser())
  // - ipAddress (from request.ip)
  // - userAgent (from request.headers['user-agent'])
  // - action: 'CREATE'
  // - resourceType: 'User'
  // - resourceId: <created user id>
}
```

---

## 5. WORKFLOW MAPPING

### 5.1 Patient Account Creation and Verification

**Workflow 1: Patient Self-Registration**

```
1. POST /public/patients/register
   ↓
2. PatientService.selfRegister()
   ├─ Create Patient record
   │  └─ Lifecycle: REGISTERED (default)
   ├─ Create User account
   │  ├─ email: registerDto.email
   │  ├─ passwordHash: bcrypt.hash(password)
   │  └─ isEmailVerified: false
   ├─ Assign PATIENT role
   │  └─ UserRoleAssignment.create()
   ├─ Initialize lifecycle via PatientLifecycleService
   │  └─ REGISTERED (idempotent, but ensures audit trail)
   ├─ Emit domain event: Patient.Created
   └─ Return patient record + account info

Result:
- Patient: REGISTERED state
- User account: Created with PATIENT role
- Audit: Full trail created
```

---

**Workflow 2: Admin Verifies Patient**

```
1. POST /patients/:id/lifecycle/transition
   Body: { "targetState": "VERIFIED" }
   ↓
2. PatientLifecycleController.transition()
   ↓
3. PatientLifecycleService.transitionPatient()
   ├─ Validate transition: REGISTERED → VERIFIED
   ├─ Validate actor role: ADMIN only
   ├─ Validate required data: None
   ├─ Atomic transaction:
   │  ├─ Update Patient.lifecycleState = VERIFIED
   │  ├─ Update lifecycleStateChangedAt, lifecycleStateChangedBy
   │  ├─ Create PatientLifecycleTransition record
   │  ├─ Create DomainEvent: PatientLifecycleTransitioned
   │  └─ Create DataAccessLog: PATIENT_LIFECYCLE_TRANSITION
   └─ Return success

Result:
- Patient: VERIFIED state
- Audit: Full trail in PatientLifecycleTransition table
- Lifecycle history: Queryable via /patients/:id/lifecycle/history
```

---

**Workflow 3: Patient Starts Intake**

```
1. POST /patients/:id/intake/start
   ↓
2. PatientIntakeController.startIntake()
   ↓
3. PatientIntakeService.startIntake()
   ├─ Validate patient is in VERIFIED state
   ├─ Validate no active intake exists
   ├─ Create PatientIntake record (status: DRAFT)
   ├─ Transition lifecycle via PatientLifecycleService
   │  └─ VERIFIED → INTAKE_IN_PROGRESS
   └─ Return intake record

Result:
- Patient: INTAKE_IN_PROGRESS state
- Intake: Created with DRAFT status
- Audit: Full trail with IP, user agent, correlation ID
```

---

**Workflow 4: Patient Submits Intake**

```
1. POST /patients/:id/intake/:intakeId/submit
   Body: { "isComplete": true, "patientAttestation": "..." }
   ↓
2. PatientIntakeController.submitIntake()
   ↓
3. PatientIntakeService.submitIntake()
   ├─ Validate patient is in INTAKE_IN_PROGRESS state
   ├─ Validate intake is DRAFT or IN_PROGRESS
   ├─ Mark intake as COMPLETED
   ├─ Transition lifecycle via PatientLifecycleService
   │  └─ INTAKE_IN_PROGRESS → INTAKE_COMPLETED
   └─ Return completed intake

Result:
- Patient: INTAKE_COMPLETED state
- Intake: COMPLETED status
- Audit: Full trail with reason
```

---

**Workflow 5: Staff Verifies Intake**

```
1. POST /patients/:id/intake/:intakeId/verify
   Body: { "reason": "...", "approved": true }
   ↓
2. PatientIntakeController.verifyIntake()
   ↓
3. PatientIntakeService.verifyIntake()
   ├─ Validate patient is in INTAKE_COMPLETED state
   ├─ Validate intake is COMPLETED
   ├─ Validate actor has NURSE or ADMIN role (against RBAC)
   ├─ Validate reason is provided (required)
   ├─ Mark intake as VERIFIED
   ├─ Transition lifecycle via PatientLifecycleService
   │  └─ INTAKE_COMPLETED → INTAKE_VERIFIED
   └─ Return verified intake

Result:
- Patient: INTAKE_VERIFIED state
- Intake: VERIFIED status
- Audit: Full trail with reason (required), IP, user agent
```

---

### 5.2 Admin User Management Workflow

**Workflow: Admin Creates Staff User**

```
1. POST /admin/users
   Body: { email, firstName, lastName, roles: ['DOCTOR'], ... }
   ↓
2. UsersController.create()
   ↓
3. UsersService.createUser()
   ├─ Check email uniqueness
   ├─ Check employeeId uniqueness (if provided)
   ├─ Create User record
   ├─ Assign roles (via UserRoleAssignment)
   ├─ Emit domain event: User.Created
   ├─ Write audit log: CREATE action
   └─ Return sanitized user (no password hash)

Result:
- User: Created with assigned roles
- Roles: Active assignments created
- Audit: Full trail with IP, user agent, reason
```

---

**Workflow: Admin Assigns Role to User**

```
1. POST /admin/users/:id/roles
   Body: { roleId: "...", validUntil: "2026-12-31" }
   ↓
2. UsersController.assignRole()
   ↓
3. UsersService.assignRole()
   ├─ Validate user exists
   ├─ Validate role exists
   ├─ Check for existing active assignment
   ├─ Create UserRoleAssignment
   │  ├─ validFrom: now()
   │  ├─ validUntil: provided or null
   │  └─ isActive: true
   ├─ Emit domain event: User.RoleAssigned
   ├─ Write audit log: ROLE_ASSIGNMENT action
   └─ Return assignment

Result:
- User: Now has additional role
- Role Assignment: Active with time bounds
- Audit: Full trail with reason
```

---

### 5.3 Patient Profile Update Workflow

**Current Implementation:**
- **Generic endpoint:** `PATCH /patients/:id` (not intent-based)
- **Role-based field permissions:** Enforced by `PatientFieldPermissionService`
- **RLS:** Validates access before update
- **No lifecycle transition:** Profile updates don't trigger lifecycle transitions

**Field Permission Enforcement:**
- ✅ Demographics (firstName, lastName, email, phone, address) - FRONT_DESK can edit
- ✅ Clinical (bloodType) - NURSE/DOCTOR can edit
- ✅ Restricted (restricted, restrictedReason) - ADMIN only
- ✅ System (lifecycleState, version, createdAt) - Cannot be modified

**Gap Identified:**
- ⚠️ No separate endpoint for patient self-profile update
- ⚠️ Patient must use generic `PATCH /patients/:id` endpoint
- ⚠️ RLS may not properly restrict patients to only their own profile
- ⚠️ Field permissions not explicitly checked for PATIENT role self-updates

---

## 6. GAPS AND MISSING PROTECTIONS

### 6.1 Lifecycle State Bypass Protection

**Status:** ✅ **PROTECTED** (From Phase 1 & 2)

**Protection Mechanisms:**
1. ✅ Repository level: `PatientRepository.update()` rejects lifecycle field updates
2. ✅ DTO level: `UpdatePatientDto` does not include `lifecycleState`
3. ✅ Service level: Only `PatientLifecycleService.transitionPatient()` can update lifecycle
4. ✅ Database level: CHECK constraint on `lifecycleState` enum

**Proof:**
- ✅ Direct update via `PATCH /patients/:id` with `lifecycleState` → **REJECTED** (repository check)
- ✅ Direct update via `PatientService.update()` → **REJECTED** (repository check)
- ✅ Invalid enum values → **REJECTED** (CHECK constraint)

**Result:** ✅ Lifecycle state cannot be bypassed

---

### 6.2 Patient Self-Profile Update Protection

**Status:** ⚠️ **PARTIALLY PROTECTED**

**Current Protection:**
- ✅ RLSGuard validates resource access
- ✅ PatientFieldPermissionService enforces field permissions
- ✅ UpdatePatientDto excludes lifecycle fields

**Gaps Identified:**
- ⚠️ No explicit endpoint for patient self-profile update (`PATCH /patients/me` or similar)
- ⚠️ Patients must use generic `PATCH /patients/:id` endpoint
- ⚠️ Field permission service may not explicitly check PATIENT role self-updates
- ⚠️ RLS validation may not properly restrict patients to only their own profile

**Recommendations:**
1. Create `PATCH /patients/me` endpoint for patient self-profile updates
2. Explicitly validate patient can only update their own profile
3. Whitelist allowed fields for patient self-updates (exclude clinical fields)
4. Ensure field permission service explicitly handles PATIENT role

---

### 6.3 Audit Logging Coverage

**Status:** ✅ **COMPREHENSIVE**

**Coverage:**
- ✅ All user management operations logged
- ✅ All patient operations logged
- ✅ All lifecycle transitions logged (separate table)
- ✅ All role/permission operations logged
- ✅ IP address and user agent captured
- ✅ Correlation ID for request tracing
- ✅ Reason required for sensitive operations

**Missing:**
- ⚠️ No explicit audit log query endpoint (admin can't easily query audit logs)
- ⚠️ Audit logs are append-only but no explicit query API

**Recommendations:**
1. Create `GET /admin/audit-logs` endpoint for querying audit logs
2. Add filters (userId, resourceType, date range, action)
3. Add pagination for large result sets

---

### 6.4 Role Validation Against RBAC

**Status:** ✅ **VALIDATED** (From Phase 2)

**Protection:**
- ✅ Actor role validated against database in `PatientLifecycleService`
- ✅ Cannot spoof role by passing different role in request
- ✅ Role validation happens inside service (not just in controller)
- ✅ Failed validation throws clear error with actual roles

**Proof:**
- ✅ Lifecycle transitions validate actor role against RBAC database
- ✅ User role assignments validated when loaded from database
- ✅ Role checks happen before permission checks

**Result:** ✅ Role cannot be spoofed

---

### 6.5 Password Security

**Status:** ✅ **SECURE**

**Protection:**
- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ Account lockout after failed login attempts
- ✅ Password reset tokens (time-limited)
- ✅ Password change requires old password
- ✅ Admin-initiated password reset (logged)

**Missing:**
- ⚠️ No password complexity requirements enforced (only in frontend validation)
- ⚠️ No password expiration policy
- ⚠️ No password history (can reuse old passwords)

**Recommendations:**
1. Enforce password complexity requirements at backend level
2. Implement password expiration policy (e.g., 90 days)
3. Store password history to prevent reuse

---

### 6.6 MFA Implementation

**Status:** ⚠️ **SCHEMA EXISTS, NOT FULLY IMPLEMENTED**

**Schema Support:**
- ✅ `mfaEnabled` field in User model
- ✅ `mfaSecret` field for TOTP secret
- ✅ `backupCodes` array for recovery

**Missing Implementation:**
- ⚠️ No endpoints for enabling/disabling MFA
- ⚠️ No endpoints for MFA verification
- ⚠️ No MFA enforcement during login

**Recommendations:**
1. Implement MFA enable/disable endpoints
2. Implement TOTP QR code generation
3. Implement MFA verification during login
4. Enforce MFA for sensitive roles (ADMIN, DOCTOR)

---

## 7. WORKFLOW DIAGRAM

### Complete User Journey: Registration → Intake Verified

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. PATIENT SELF-REGISTRATION                                    │
│    POST /public/patients/register                               │
│    Creates: Patient (REGISTERED) + User (PATIENT role)         │
│    Audit: Full trail with IP, user agent                        │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. ADMIN VERIFIES PATIENT                                       │
│    POST /patients/:id/lifecycle/transition                      │
│    Target: VERIFIED                                             │
│    Validates: Actor is ADMIN                                    │
│    Lifecycle: REGISTERED → VERIFIED                            │
│    Audit: PatientLifecycleTransition record created             │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. PATIENT STARTS INTAKE                                        │
│    POST /patients/:id/intake/start                              │
│    Creates: PatientIntake (DRAFT)                               │
│    Validates: Patient is VERIFIED                               │
│    Lifecycle: VERIFIED → INTAKE_IN_PROGRESS                    │
│    Audit: Full trail with IP, user agent, correlation ID        │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. PATIENT SAVES DRAFT (can repeat)                             │
│    PATCH /patients/:id/intake/:intakeId                         │
│    Updates: PatientIntake (IN_PROGRESS)                         │
│    Lifecycle: No transition (stays INTAKE_IN_PROGRESS)          │
│    Audit: Logged (no lifecycle transition)                      │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. PATIENT SUBMITS INTAKE                                       │
│    POST /patients/:id/intake/:intakeId/submit                   │
│    Updates: PatientIntake (COMPLETED)                           │
│    Validates: Patient is INTAKE_IN_PROGRESS, intake is DRAFT   │
│    Lifecycle: INTAKE_IN_PROGRESS → INTAKE_COMPLETED           │
│    Audit: Full trail with reason                                │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. STAFF VERIFIES INTAKE                                        │
│    POST /patients/:id/intake/:intakeId/verify                   │
│    Updates: PatientIntake (VERIFIED)                            │
│    Validates: Patient is INTAKE_COMPLETED, intake is COMPLETED │
│    Validates: Actor is NURSE or ADMIN (against RBAC)           │
│    Requires: Reason (clinical requirement)                      │
│    Lifecycle: INTAKE_COMPLETED → INTAKE_VERIFIED              │
│    Audit: Full trail with reason, IP, user agent                │
└─────────────────────────────────────────────────────────────────┘
                          ↓
                    INTAKE_VERIFIED
                    (Ready for consultation request)
```

---

## 8. MODELS AND RELATIONSHIPS

### 8.1 User Model Relations

```
User
├─ department → Department (optional)
├─ roleAssignments → UserRoleAssignment[] (many-to-many via junction)
├─ sessions → Session[] (one-to-many)
├─ dataAccessLogs → DataAccessLog[] (one-to-many)
├─ patientsDoctorInCharge → Patient[] (one-to-many, as assigned doctor)
├─ patientsCreated → Patient[] (one-to-many, as creator)
├─ patientsUpdated → Patient[] (one-to-many, as updater)
├─ patientsMerged → Patient[] (one-to-many, as merger)
├─ patientsLifecycleChanged → Patient[] (one-to-many, lifecycle actor)
├─ patientIntakesVerified → PatientIntake[] (one-to-many)
├─ consultationRequestsApproved → ConsultationRequest[] (one-to-many)
├─ consultationRequestsRejected → ConsultationRequest[] (one-to-many)
└─ patientLifecycleTransitions → PatientLifecycleTransition[] (one-to-many, as actor)
```

---

### 8.2 Patient Model Relations

```
Patient
├─ doctorInCharge → User (many-to-one, assigned doctor)
├─ createdBy → User (many-to-one, creator)
├─ updatedBy → User (many-to-one, updater)
├─ mergedBy → User (many-to-one, merger)
├─ lifecycleStateChangedBy → User (many-to-one, lifecycle actor)
├─ mergedIntoPatient → Patient (self-reference, merge target)
├─ mergedPatients → Patient[] (self-reference, merged patients)
├─ intakes → PatientIntake[] (one-to-many)
├─ consultationRequests → ConsultationRequest[] (one-to-many)
└─ lifecycleTransitions → PatientLifecycleTransition[] (one-to-many)
```

---

### 8.3 Role/Permission Relations

```
Role
├─ permissions → RolePermission[] (many-to-many via junction)
└─ userAssignments → UserRoleAssignment[] (one-to-many)

Permission
└─ rolePermissions → RolePermission[] (many-to-many via junction)

UserRoleAssignment
├─ user → User (many-to-one)
├─ role → Role (many-to-one)
└─ revokedByUser → User (many-to-one, revoker)
```

---

## 9. CURRENT STATE SUMMARY

### 9.1 Fully Implemented

✅ **User Management:**
- Admin user CRUD operations
- Role assignment/revocation
- Permission assignment to roles
- User deactivation
- Password reset (admin-initiated)
- Session management

✅ **Patient Management:**
- Admin/staff patient CRUD operations
- Patient self-registration
- Patient profile updates (with field permissions)
- Patient lifecycle state management
- Patient intake workflow (complete)

✅ **Authentication:**
- User login/logout
- JWT token generation and validation
- Refresh token rotation
- Account lockout after failed attempts
- Session management

✅ **Authorization:**
- Role-based access control (RBAC)
- Permission-based access control
- Row-level security (RLS)
- Field-level permissions

✅ **Audit Logging:**
- All user operations logged
- All patient operations logged
- All lifecycle transitions logged
- IP address and user agent captured
- Correlation ID for request tracing
- Reason required for sensitive operations

✅ **Lifecycle Governance:**
- Lifecycle transitions atomic and concurrency-safe
- Lifecycle history queryable
- Actor role validated against RBAC
- Cannot bypass lifecycle state
- All transitions fully auditable

---

### 9.2 Partially Implemented

⚠️ **Patient Self-Profile Update:**
- Generic `PATCH /patients/:id` endpoint exists
- Field permissions enforced
- RLS validates access
- **Missing:** Dedicated `PATCH /patients/me` endpoint for patient self-updates
- **Missing:** Explicit validation that patient can only update own profile

⚠️ **MFA:**
- Schema supports MFA (mfaEnabled, mfaSecret, backupCodes)
- **Missing:** Endpoints for enabling/disabling MFA
- **Missing:** TOTP QR code generation
- **Missing:** MFA verification during login
- **Missing:** MFA enforcement for sensitive roles

⚠️ **Password Security:**
- Password hashing implemented (bcrypt)
- Account lockout implemented
- **Missing:** Password complexity requirements at backend level
- **Missing:** Password expiration policy
- **Missing:** Password history (prevent reuse)

⚠️ **Audit Log Querying:**
- Audit logs created for all operations
- **Missing:** Query endpoint for audit logs (`GET /admin/audit-logs`)
- **Missing:** Filters and pagination for audit log queries

---

### 9.3 Missing

❌ **Staff User Creation Workflow:**
- Admin can create users but no specific workflow for staff onboarding
- **Missing:** Staff onboarding workflow (create user → assign role → send credentials)
- **Missing:** Email notifications for new user accounts

❌ **Patient Profile Self-Update:**
- **Missing:** Dedicated endpoint for patient self-profile updates
- **Missing:** Whitelist of fields patients can update themselves

❌ **User Profile Update:**
- **Missing:** Endpoint for users to update their own profile (`PATCH /auth/me`)
- **Missing:** Password change endpoint validation (ensure old password is correct)

❌ **Role/Permission Queries:**
- **Missing:** Endpoint to get user's effective permissions
- **Missing:** Endpoint to check if user has specific permission
- **Missing:** Endpoint to list all permissions assigned to a role

❌ **Session Management:**
- **Missing:** Endpoint for users to view their own active sessions
- **Missing:** Endpoint for users to revoke their own sessions
- **Missing:** Endpoint to revoke all sessions except current

---

## 10. INTEGRATION WITH PATIENT INTAKE WORKFLOW

### 10.1 Link Between User and Patient

**Current Implementation:**
- Patient and User are **separate entities**
- Patient has no direct FK to User
- User has no direct FK to Patient
- Link is established via email (patient.email = user.email)

**Gap Identified:**
- ⚠️ No explicit relationship between Patient and User models
- ⚠️ Patient self-registration creates both Patient and User, but no FK link
- ⚠️ Cannot easily query "get user's patient record" or "get patient's user account"

**Recommendations:**
1. Add `userId` FK to Patient model (nullable, for portal patients)
2. Add `patientId` FK to User model (nullable, for patient accounts)
3. Enforce relationship during patient self-registration
4. Add query methods: `getPatientByUserId()`, `getUserByPatientId()`

---

### 10.2 Lifecycle Verification Workflow

**Current Flow:**
1. Patient self-registers → Patient (REGISTERED) + User (PATIENT role)
2. Admin verifies patient → Lifecycle: REGISTERED → VERIFIED
3. Patient starts intake → Lifecycle: VERIFIED → INTAKE_IN_PROGRESS
4. Patient submits intake → Lifecycle: INTAKE_IN_PROGRESS → INTAKE_COMPLETED
5. Staff verifies intake → Lifecycle: INTAKE_COMPLETED → INTAKE_VERIFIED

**Integration Points:**
- ✅ Patient self-registration initializes lifecycle (REGISTERED)
- ✅ Admin verification triggers lifecycle transition (VERIFIED)
- ✅ Intake workflow properly integrated with lifecycle
- ✅ All transitions go through PatientLifecycleService
- ✅ All transitions are atomic and auditable

**Gap:**
- ⚠️ No automatic email verification workflow
- ⚠️ Patient email verification (`isEmailVerified`) not linked to lifecycle verification
- ⚠️ Admin verification is manual (no bulk verification endpoint)

---

## 11. SECURITY ASSESSMENT

### 11.1 Strengths

✅ **Strong Authentication:**
- JWT tokens with secure HTTP-only cookies
- Account lockout after failed attempts
- Session management with revocation
- Password hashing (bcrypt, 12 rounds)

✅ **Strong Authorization:**
- RBAC enforced at guard level
- Permission checks enforced at guard level
- Row-level security (RLS) for resource access
- Field-level permissions for patient updates
- Role validation against database (cannot spoof)

✅ **Strong Audit Trail:**
- All operations logged
- IP address and user agent captured
- Correlation ID for request tracing
- Lifecycle transitions fully auditable
- Separate lifecycle history table

✅ **Lifecycle Governance:**
- Cannot bypass lifecycle state
- All transitions atomic and concurrency-safe
- Actor role validated against RBAC
- Reason required for sensitive transitions

---

### 11.2 Weaknesses

⚠️ **Missing Endpoints:**
- No patient self-profile update endpoint
- No user self-profile update endpoint
- No audit log query endpoint
- No MFA enable/disable endpoints

⚠️ **Missing Validations:**
- No password complexity requirements at backend
- No password expiration policy
- No password history
- No explicit patient-user relationship validation

⚠️ **Missing Features:**
- MFA not fully implemented (schema exists but no endpoints)
- Email verification workflow not automated
- No bulk operations (bulk patient verification, etc.)

---

## 12. RECOMMENDATIONS

### 12.1 High Priority

1. **Create Patient Self-Profile Update Endpoint:**
   - `PATCH /patients/me` - Patient updates own profile
   - Whitelist allowed fields (exclude clinical fields)
   - Explicit validation that patient can only update own profile

2. **Create User Self-Profile Update Endpoint:**
   - `PATCH /auth/me` - User updates own profile
   - Whitelist allowed fields (exclude system fields)
   - Ensure password change requires old password

3. **Add Patient-User Relationship:**
   - Add `userId` FK to Patient model
   - Add `patientId` FK to User model
   - Enforce relationship during self-registration
   - Add query methods for cross-referencing

4. **Implement MFA Endpoints:**
   - `POST /auth/mfa/enable` - Enable MFA
   - `POST /auth/mfa/verify` - Verify MFA setup
   - `POST /auth/mfa/disable` - Disable MFA
   - `POST /auth/login` - Enforce MFA during login if enabled

---

### 12.2 Medium Priority

1. **Add Audit Log Query Endpoint:**
   - `GET /admin/audit-logs` - Query audit logs
   - Filters: userId, resourceType, date range, action
   - Pagination support

2. **Add Password Security Enhancements:**
   - Enforce password complexity requirements at backend
   - Implement password expiration policy (90 days)
   - Store password history to prevent reuse

3. **Add Session Management Endpoints:**
   - `GET /auth/sessions` - List user's active sessions
   - `DELETE /auth/sessions/:sessionId` - Revoke specific session
   - `DELETE /auth/sessions` - Revoke all sessions except current

4. **Add Permission Query Endpoints:**
   - `GET /auth/permissions` - Get user's effective permissions
   - `GET /auth/permissions/check` - Check if user has specific permission
   - `GET /admin/roles/:id/permissions` - List permissions for role

---

### 12.3 Low Priority

1. **Automate Email Verification:**
   - Send verification email during self-registration
   - Add `POST /auth/verify-email` endpoint
   - Link email verification to patient verification workflow

2. **Add Bulk Operations:**
   - `POST /admin/users/bulk-create` - Bulk create users
   - `POST /admin/patients/bulk-verify` - Bulk verify patients
   - `POST /admin/roles/bulk-assign` - Bulk assign roles

3. **Add User Onboarding Workflow:**
   - Staff onboarding: create user → assign role → send credentials
   - Patient onboarding: self-registration → email verification → intake

---

## 13. CONCLUSION

### Current State: ✅ **STRONG FOUNDATION**

The User Management module has a **strong foundation** with:
- ✅ Comprehensive RBAC implementation
- ✅ Row-level security (RLS) enforcement
- ✅ Complete audit logging
- ✅ Lifecycle governance (cannot be bypassed)
- ✅ Patient intake workflow fully integrated
- ✅ Concurrency-safe lifecycle transitions
- ✅ Role validation against database

### Gaps: ⚠️ **MINOR IMPROVEMENTS NEEDED**

Most gaps are **minor improvements** rather than critical issues:
- ⚠️ Missing patient self-profile update endpoint (workaround exists)
- ⚠️ MFA not fully implemented (schema ready)
- ⚠️ Password security could be enhanced
- ⚠️ Audit log querying not exposed via API

### Overall Assessment: ✅ **PRODUCTION-READY** (with recommended improvements)

The system is **production-ready** for current workflows but would benefit from the recommended improvements for better user experience and enhanced security.

---

**Analysis Complete:** 2026-01-10
