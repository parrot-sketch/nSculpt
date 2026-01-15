# Admin Workflows - User Stories & Requirements

**Document Purpose:** Comprehensive overview of admin-related workflows to guide admin dashboard design and implementation.

**Last Updated:** January 2025

---

## Table of Contents

1. [Overview](#overview)
2. [User Management Workflows](#user-management-workflows)
3. [Role & Permission Management Workflows](#role--permission-management-workflows)
4. [System Configuration Workflows](#system-configuration-workflows)
5. [Audit & Compliance Workflows](#audit--compliance-workflows)
6. [Cross-Domain Admin Workflows](#cross-domain-admin-workflows)
7. [Dashboard & Reporting Workflows](#dashboard--reporting-workflows)
8. [Workflow Priority Matrix](#workflow-priority-matrix)

---

## Overview

### Admin Role Scope

The **ADMIN** role has full system access with all permissions across all domains:
- **RBAC Domain**: User, Role, Permission management
- **Medical Records Domain**: Record management, merge operations
- **Theater Domain**: Department, Theater, Case oversight
- **Inventory Domain**: Item, Vendor, Category management
- **Billing Domain**: Insurance, Fee Schedule, Billing Code management
- **Audit Domain**: Access logs, Domain events, Session management
- **Consent Domain**: Consent form and instance oversight

### Key Principles

1. **Audit Trail**: All admin actions must be logged and traceable
2. **Event-Driven**: Critical operations must be event-anchored
3. **Immutability**: Historical records cannot be modified (append-only)
4. **Security**: Multi-layer authorization (Role + Permission + RLS)
5. **Compliance**: HIPAA-compliant logging and access tracking

---

## User Management Workflows

### US-001: Create New User Account

**As an** admin  
**I want to** create a new user account  
**So that** new staff members can access the system

**Acceptance Criteria:**
- Admin can create user with required fields: email, firstName, lastName, password
- Optional fields: phone, title, employeeId, departmentId
- System validates email uniqueness
- System validates employeeId uniqueness (if provided)
- Password is hashed with bcrypt before storage
- User is created with `active: true` by default
- `createdBy` and `updatedBy` are set to admin user ID
- Domain event `User.Created` is emitted
- Data access log entry is created
- Response excludes password hash

**Workflow Steps:**
1. Admin navigates to Users → Create User
2. Admin fills in user form (email, name, title, employee ID, department)
3. System generates temporary password or admin sets password
4. System validates email and employeeId uniqueness
5. System creates user record
6. System emits domain event
7. System logs access
8. Admin receives confirmation with user details (password excluded)

**Related Entities:**
- `User` (rbac.prisma)
- `UserRoleAssignment` (optional - can assign roles separately)

---

### US-002: Update User Information

**As an** admin  
**I want to** update user information  
**So that** user details remain current and accurate

**Acceptance Criteria:**
- Admin can update: firstName, lastName, title, phone, departmentId, employeeId
- Email cannot be changed (requires separate workflow)
- System validates employeeId uniqueness if changed
- `updatedBy` is set to admin user ID
- `version` is incremented
- Domain event `User.Updated` is emitted
- Data access log entry is created
- Password cannot be updated via this endpoint (use reset password)

**Workflow Steps:**
1. Admin navigates to Users → Select User → Edit
2. Admin modifies user fields
3. System validates changes (uniqueness, format)
4. System updates user record
5. System emits domain event
6. System logs access
7. Admin receives updated user details

**Related Entities:**
- `User` (rbac.prisma)

---

### US-003: Deactivate User Account

**As an** admin  
**I want to** deactivate a user account  
**So that** former staff members cannot access the system

**Acceptance Criteria:**
- Admin can deactivate user by setting `active: false`
- All active sessions for the user are revoked
- User's role assignments remain but become inactive
- `updatedBy` is set to admin user ID
- Domain event `User.Deactivated` is emitted
- Data access log entry is created
- User cannot log in after deactivation
- Historical records remain intact (no deletion)

**Workflow Steps:**
1. Admin navigates to Users → Select User → Deactivate
2. System confirms action (shows warning if user has active sessions)
3. Admin confirms deactivation
4. System sets `active: false`
5. System revokes all active sessions
6. System emits domain event
7. System logs access
8. Admin receives confirmation

**Related Entities:**
- `User` (rbac.prisma)
- `Session` (audit.prisma) - sessions revoked
- `UserRoleAssignment` (rbac.prisma) - assignments remain but inactive

---

### US-004: Assign Role to User

**As an** admin  
**I want to** assign a role to a user  
**So that** the user has appropriate system permissions

**Acceptance Criteria:**
- Admin can assign any active role to a user
- System creates `UserRoleAssignment` record
- Time-bound assignments supported (`validFrom`, `validUntil`)
- `createdBy` is set to admin user ID
- Domain event `UserRoleAssignment.Created` is emitted
- Data access log entry is created
- User immediately receives role permissions (if active)

**Workflow Steps:**
1. Admin navigates to Users → Select User → Assign Role
2. Admin selects role from dropdown (only active roles shown)
3. Admin optionally sets validFrom and validUntil dates
4. System validates role is active
5. System creates UserRoleAssignment
6. System emits domain event
7. System logs access
8. Admin receives confirmation

**Related Entities:**
- `UserRoleAssignment` (rbac.prisma)
- `Role` (rbac.prisma)
- `User` (rbac.prisma)

---

### US-005: Revoke Role from User

**As an** admin  
**I want to** revoke a role from a user  
**So that** the user no longer has those permissions

**Acceptance Criteria:**
- Admin can revoke any role assignment
- System sets `active: false` on UserRoleAssignment
- System sets `revokedAt` timestamp
- System sets `revokedBy` to admin user ID
- Domain event `UserRoleAssignment.Revoked` is emitted
- Data access log entry is created
- User immediately loses role permissions
- Historical assignment record remains (immutable)

**Workflow Steps:**
1. Admin navigates to Users → Select User → View Roles
2. Admin selects role to revoke
3. System confirms action
4. Admin confirms revocation
5. System deactivates UserRoleAssignment
6. System sets revocation metadata
7. System emits domain event
8. System logs access
9. Admin receives confirmation

**Related Entities:**
- `UserRoleAssignment` (rbac.prisma)

---

### US-006: Reset User Password

**As an** admin  
**I want to** reset a user's password  
**So that** users who forgot their password can regain access

**Acceptance Criteria:**
- Admin can reset password for any user
- System generates secure temporary password
- System hashes new password with bcrypt
- System updates `passwordHash` and `passwordChangedAt`
- All active sessions for the user are revoked
- Domain event `User.PasswordReset` is emitted
- Data access log entry is created
- Temporary password is returned to admin (one-time display)
- User must change password on next login (if enforced)

**Workflow Steps:**
1. Admin navigates to Users → Select User → Reset Password
2. System confirms action (shows warning about session revocation)
3. Admin confirms password reset
4. System generates temporary password
5. System hashes and stores new password
6. System revokes all active sessions
7. System emits domain event
8. System logs access
9. Admin receives temporary password (displayed once)
10. Admin communicates password to user securely

**Related Entities:**
- `User` (rbac.prisma)
- `Session` (audit.prisma) - sessions revoked

---

### US-007: View User Sessions

**As an** admin  
**I want to** view a user's active sessions  
**So that** I can monitor user activity and security

**Acceptance Criteria:**
- Admin can view all sessions for a user
- Session details include: device info, IP address, user agent, start time, last activity, expiration
- Revoked sessions are clearly marked
- MFA status is shown if applicable
- Data access log entry is created
- Admin can see session history (not just active)

**Workflow Steps:**
1. Admin navigates to Users → Select User → View Sessions
2. System displays list of sessions (active and historical)
3. System shows session details (device, IP, timestamps, status)
4. System logs access
5. Admin can optionally revoke sessions (separate workflow)

**Related Entities:**
- `Session` (audit.prisma)
- `User` (rbac.prisma)

---

### US-008: Search and Filter Users

**As an** admin  
**I want to** search and filter users  
**So that** I can quickly find specific users

**Acceptance Criteria:**
- Admin can search by: email, firstName, lastName, employeeId
- Admin can filter by: active status, department, role
- Results are paginated
- Sort options: name, email, createdAt, lastLoginAt
- Data access log entry is created

**Workflow Steps:**
1. Admin navigates to Users → List
2. Admin enters search criteria or applies filters
3. System queries users with filters
4. System returns paginated results
5. System logs access
6. Admin views results and can navigate pages

**Related Entities:**
- `User` (rbac.prisma)
- `UserRoleAssignment` (rbac.prisma) - for role filtering
- `Department` (theater.prisma) - for department filtering

---

## Role & Permission Management Workflows

### RP-001: Create New Role

**As an** admin  
**I want to** create a new role  
**So that** I can define custom access levels for different staff types

**Acceptance Criteria:**
- Admin can create role with: code (unique), name, description
- Role code must be unique and uppercase (e.g., "PHYSICIAN_ASSISTANT")
- Role is created with `active: true` by default
- `createdBy` and `updatedBy` are set to admin user ID
- Domain event `Role.Created` is emitted
- Data access log entry is created
- Permissions can be assigned separately (not during creation)

**Workflow Steps:**
1. Admin navigates to Roles → Create Role
2. Admin enters role code, name, description
3. System validates code uniqueness and format
4. System creates role record
5. System emits domain event
6. System logs access
7. Admin receives confirmation
8. Admin can then assign permissions (separate workflow)

**Related Entities:**
- `Role` (rbac.prisma)

---

### RP-002: Update Role Information

**As an** admin  
**I want to** update role information  
**So that** role names and descriptions remain accurate

**Acceptance Criteria:**
- Admin can update: name, description
- Role code cannot be changed (immutable identifier)
- `updatedBy` is set to admin user ID
- `version` is incremented
- Domain event `Role.Updated` is emitted
- Data access log entry is created
- Active status can be changed (separate workflow)

**Workflow Steps:**
1. Admin navigates to Roles → Select Role → Edit
2. Admin modifies name or description
3. System validates changes
4. System updates role record
5. System emits domain event
6. System logs access
7. Admin receives confirmation

**Related Entities:**
- `Role` (rbac.prisma)

---

### RP-003: Deactivate Role

**As an** admin  
**I want to** deactivate a role  
**So that** the role is no longer assignable to users

**Acceptance Criteria:**
- Admin can deactivate role by setting `active: false`
- Existing user role assignments remain but role cannot be newly assigned
- System warns if role is assigned to active users
- `updatedBy` is set to admin user ID
- Domain event `Role.Deactivated` is emitted
- Data access log entry is created
- Historical assignments remain intact

**Workflow Steps:**
1. Admin navigates to Roles → Select Role → Deactivate
2. System shows warning if role has active user assignments
3. Admin confirms deactivation
4. System sets `active: false`
5. System emits domain event
6. System logs access
7. Admin receives confirmation

**Related Entities:**
- `Role` (rbac.prisma)
- `UserRoleAssignment` (rbac.prisma) - existing assignments remain

---

### RP-004: Assign Permission to Role

**As an** admin  
**I want to** assign a permission to a role  
**So that** users with that role have the permission

**Acceptance Criteria:**
- Admin can assign any permission to a role
- System creates `RolePermission` record
- `createdBy` is set to admin user ID
- Domain event `RolePermission.Created` is emitted
- Data access log entry is created
- Users with the role immediately receive the permission
- Duplicate assignments are prevented (unique constraint)

**Workflow Steps:**
1. Admin navigates to Roles → Select Role → Permissions → Assign
2. Admin selects permission from list (can filter by domain)
3. System validates permission not already assigned
4. System creates RolePermission
5. System emits domain event
6. System logs access
7. Admin receives confirmation

**Related Entities:**
- `RolePermission` (rbac.prisma)
- `Role` (rbac.prisma)
- `Permission` (rbac.prisma)

---

### RP-005: Remove Permission from Role

**As an** admin  
**I want to** remove a permission from a role  
**So that** users with that role no longer have the permission

**Acceptance Criteria:**
- Admin can remove any permission from a role
- System deletes `RolePermission` record
- Domain event `RolePermission.Removed` is emitted
- Data access log entry is created
- Users with the role immediately lose the permission
- System warns if removing critical permissions (e.g., admin:*)

**Workflow Steps:**
1. Admin navigates to Roles → Select Role → Permissions
2. Admin selects permission to remove
3. System shows warning if permission is critical
4. Admin confirms removal
5. System deletes RolePermission
6. System emits domain event
7. System logs access
8. Admin receives confirmation

**Related Entities:**
- `RolePermission` (rbac.prisma)

---

### RP-006: View Users with Role

**As an** admin  
**I want to** view all users assigned to a role  
**So that** I can understand role usage and impact

**Acceptance Criteria:**
- Admin can view all users with a specific role
- Shows both active and inactive assignments
- Displays user details: name, email, employeeId, assignment dates
- Shows assignment validity period (validFrom, validUntil)
- Data access log entry is created
- Results can be filtered by active status

**Workflow Steps:**
1. Admin navigates to Roles → Select Role → View Users
2. System queries UserRoleAssignments for the role
3. System includes user details in response
4. System logs access
5. Admin views list of users with the role

**Related Entities:**
- `UserRoleAssignment` (rbac.prisma)
- `User` (rbac.prisma)
- `Role` (rbac.prisma)

---

### RP-007: Browse Permissions

**As an** admin  
**I want to** browse all permissions  
**So that** I can understand available permissions and assign them to roles

**Acceptance Criteria:**
- Admin can view all permissions
- Can filter by domain (RBAC, MEDICAL_RECORDS, THEATER, etc.)
- Can filter by resource type
- Can filter by action (read, write, delete, etc.)
- Shows permission code, name, description, domain
- Shows which roles have each permission
- Data access log entry is created

**Workflow Steps:**
1. Admin navigates to Permissions → List
2. Admin optionally applies filters (domain, resource, action)
3. System queries permissions with filters
4. System includes role assignments in response
5. System logs access
6. Admin views permission list

**Related Entities:**
- `Permission` (rbac.prisma)
- `RolePermission` (rbac.prisma) - for role assignments

---

### RP-008: View Permission Details

**As an** admin  
**I want to** view detailed information about a permission  
**So that** I can understand its purpose and usage

**Acceptance Criteria:**
- Admin can view permission details: code, name, description, domain, resource, action
- Shows all roles that have this permission
- Shows count of users with this permission (via roles)
- Data access log entry is created

**Workflow Steps:**
1. Admin navigates to Permissions → Select Permission
2. System queries permission details
3. System includes role assignments
4. System calculates user count
5. System logs access
6. Admin views permission details

**Related Entities:**
- `Permission` (rbac.prisma)
- `RolePermission` (rbac.prisma)
- `UserRoleAssignment` (rbac.prisma) - for user count

---

## System Configuration Workflows

### SC-001: Manage Departments

**As an** admin  
**I want to** create and manage departments  
**So that** I can organize users and theaters by department

**Acceptance Criteria:**
- Admin can create department with: code (unique), name, description
- Admin can update department name and description
- Admin can deactivate department (sets `active: false`)
- System validates code uniqueness
- `createdBy` and `updatedBy` are tracked
- Domain events are emitted for create/update
- Data access log entries are created
- Cannot delete department if it has users or theaters

**Workflow Steps:**
1. Admin navigates to System → Departments
2. Admin creates/updates/deactivates departments
3. System validates and saves changes
4. System emits domain events
5. System logs access
6. Admin receives confirmation

**Related Entities:**
- `Department` (theater.prisma)
- `User` (rbac.prisma) - references department
- `OperatingTheater` (theater.prisma) - references department

---

### SC-002: Manage Operating Theaters

**As an** admin  
**I want to** create and manage operating theaters  
**So that** I can configure available surgical facilities

**Acceptance Criteria:**
- Admin can create theater with: code (unique), name, description, departmentId, capacity
- Admin can update theater details
- Admin can deactivate theater (sets `active: false`)
- System validates code uniqueness
- System validates department exists
- `createdBy` and `updatedBy` are tracked
- Domain events are emitted
- Data access log entries are created
- Cannot delete theater if it has reservations

**Workflow Steps:**
1. Admin navigates to System → Theaters
2. Admin creates/updates/deactivates theaters
3. System validates department and code uniqueness
4. System saves changes
5. System emits domain events
6. System logs access
7. Admin receives confirmation

**Related Entities:**
- `OperatingTheater` (theater.prisma)
- `Department` (theater.prisma)
- `TheaterReservation` (theater.prisma) - references theater

---

### SC-003: Manage Inventory Categories

**As an** admin  
**I want to** create and manage inventory categories  
**So that** I can organize inventory items hierarchically

**Acceptance Criteria:**
- Admin can create category with: code (unique), name, description, parentId (optional)
- Admin can update category details
- Admin can deactivate category (sets `active: false`)
- System validates code uniqueness
- System validates parent category exists (if provided)
- System prevents circular parent references
- `createdBy` and `updatedBy` are tracked
- Domain events are emitted
- Data access log entries are created
- Cannot delete category if it has items or children

**Workflow Steps:**
1. Admin navigates to System → Inventory → Categories
2. Admin creates/updates/deactivates categories
3. System validates hierarchy and code uniqueness
4. System saves changes
5. System emits domain events
6. System logs access
7. Admin receives confirmation

**Related Entities:**
- `InventoryCategory` (inventory.prisma)
- `InventoryItem` (inventory.prisma) - references category

---

### SC-004: Manage Vendors

**As an** admin  
**I want to** create and manage vendors  
**So that** I can track inventory suppliers

**Acceptance Criteria:**
- Admin can create vendor with: code (unique), name, taxId, contact info, address
- Admin can update vendor details
- Admin can deactivate vendor (sets `active: false`)
- System validates code uniqueness
- `createdBy` and `updatedBy` are tracked
- Domain events are emitted
- Data access log entries are created
- Cannot delete vendor if it has inventory items

**Workflow Steps:**
1. Admin navigates to System → Inventory → Vendors
2. Admin creates/updates/deactivates vendors
3. System validates code uniqueness
4. System saves changes
5. System emits domain events
6. System logs access
7. Admin receives confirmation

**Related Entities:**
- `Vendor` (inventory.prisma)
- `InventoryItem` (inventory.prisma) - references vendor

---

### SC-005: Manage Billing Codes

**As an** admin  
**I want to** create and manage billing codes (CPT, ICD-10, HCPCS)  
**So that** I can configure billable procedures and diagnoses

**Acceptance Criteria:**
- Admin can create billing code with: code (unique), codeType, description, category, defaultCharge
- Admin can update billing code details
- Admin can deactivate billing code (sets `active: false`)
- System validates code uniqueness
- System validates codeType (CPT, ICD10, HCPCS)
- `createdBy` and `updatedBy` are tracked
- Domain events are emitted
- Data access log entries are created
- Cannot delete billing code if it has bill line items

**Workflow Steps:**
1. Admin navigates to System → Billing → Codes
2. Admin creates/updates/deactivates billing codes
3. System validates code and codeType
4. System saves changes
5. System emits domain events
6. System logs access
7. Admin receives confirmation

**Related Entities:**
- `BillingCode` (billing.prisma)
- `BillLineItem` (billing.prisma) - references billing code

---

### SC-006: Manage Insurance Providers

**As an** admin  
**I want to** create and manage insurance providers  
**So that** I can configure insurance billing

**Acceptance Criteria:**
- Admin can create provider with: code (unique), name, payerId (unique), taxId, contact info
- Admin can update provider details
- Admin can deactivate provider (sets `active: false`)
- System validates code and payerId uniqueness
- `createdBy` and `updatedBy` are tracked
- Domain events are emitted
- Data access log entries are created
- Cannot delete provider if it has policies or fee schedules

**Workflow Steps:**
1. Admin navigates to System → Billing → Insurance Providers
2. Admin creates/updates/deactivates providers
3. System validates code and payerId uniqueness
4. System saves changes
5. System emits domain events
6. System logs access
7. Admin receives confirmation

**Related Entities:**
- `InsuranceProvider` (billing.prisma)
- `InsurancePolicy` (billing.prisma) - references provider
- `FeeSchedule` (billing.prisma) - references provider

---

### SC-007: Manage Fee Schedules

**As an** admin  
**I want to** create and manage fee schedules  
**So that** I can configure pricing for different payers and payment types

**Acceptance Criteria:**
- Admin can create fee schedule with: name, description, scheduleType, insuranceProviderId (optional), effectiveDate, expirationDate
- Admin can add/update/remove fee schedule items (billing code + amount)
- Admin can deactivate fee schedule (sets `active: false`)
- System validates effective dates
- System validates billing codes exist
- `createdBy` and `updatedBy` are tracked
- Domain events are emitted
- Data access log entries are created
- Fee schedule items have effective dates for versioning

**Workflow Steps:**
1. Admin navigates to System → Billing → Fee Schedules
2. Admin creates/updates fee schedule
3. Admin adds/updates fee schedule items
4. System validates dates and billing codes
5. System saves changes
6. System emits domain events
7. System logs access
8. Admin receives confirmation

**Related Entities:**
- `FeeSchedule` (billing.prisma)
- `FeeScheduleItem` (billing.prisma)
- `BillingCode` (billing.prisma)
- `InsuranceProvider` (billing.prisma)

---

## Audit & Compliance Workflows

### AC-001: View Data Access Logs

**As an** admin  
**I want to** view data access logs  
**So that** I can audit who accessed what data and when

**Acceptance Criteria:**
- Admin can view all data access logs
- Can filter by: userId, resourceType, resourceId, action, date range, accessedPHI flag
- Shows: user, resource type/id, action, IP address, user agent, timestamp, success status
- PHI access is clearly marked
- Results are paginated
- Data access log entry is created (meta-audit)
- Can export logs for compliance reporting

**Workflow Steps:**
1. Admin navigates to Audit → Access Logs
2. Admin applies filters (user, resource, date range, PHI flag)
3. System queries DataAccessLog with filters
4. System returns paginated results
5. System logs access (meta-audit)
6. Admin views access log entries
7. Admin can export logs if needed

**Related Entities:**
- `DataAccessLog` (audit.prisma)
- `User` (rbac.prisma)

---

### AC-002: View Domain Events

**As an** admin  
**I want to** view domain events  
**So that** I can trace system changes and event chains

**Acceptance Criteria:**
- Admin can view all domain events
- Can filter by: eventType, domain, aggregateId, aggregateType, createdBy, date range, correlationId
- Shows: event type, domain, aggregate info, payload, metadata, correlation/causation IDs, creator, timestamp
- Can view event payload (JSON)
- Results are paginated
- Data access log entry is created
- Can trace event chains via correlationId and causationId

**Workflow Steps:**
1. Admin navigates to Audit → Domain Events
2. Admin applies filters (event type, domain, date range, correlation ID)
3. System queries DomainEvent with filters
4. System returns paginated results
5. System logs access
6. Admin views event list
7. Admin can drill into event details and payload
8. Admin can trace event chains

**Related Entities:**
- `DomainEvent` (audit.prisma)
- `User` (rbac.prisma)

---

### AC-003: View User Sessions

**As an** admin  
**I want to** view all user sessions  
**So that** I can monitor active sessions and security

**Acceptance Criteria:**
- Admin can view all sessions (active and historical)
- Can filter by: userId, active status, date range, revoked status
- Shows: user, device info, IP address, user agent, start time, last activity, expiration, MFA status, revoked status
- Results are paginated
- Data access log entry is created
- Can see session history per user

**Workflow Steps:**
1. Admin navigates to Audit → Sessions
2. Admin applies filters (user, active status, date range)
3. System queries Session with filters
4. System returns paginated results
5. System logs access
6. Admin views session list
7. Admin can see session details

**Related Entities:**
- `Session` (audit.prisma)
- `User` (rbac.prisma)

---

### AC-004: Revoke User Session

**As an** admin  
**I want to** revoke a user session  
**So that** I can terminate suspicious or unauthorized access

**Acceptance Criteria:**
- Admin can revoke any session (active or expired)
- System sets `revokedAt` timestamp
- System sets `revokedBy` to admin user ID
- System sets `revokedReason` (optional)
- Domain event `Session.Revoked` is emitted
- Data access log entry is created
- User is immediately logged out if session was active
- Cannot revoke already-revoked sessions

**Workflow Steps:**
1. Admin navigates to Audit → Sessions → Select Session
2. Admin clicks "Revoke Session"
3. Admin optionally enters revocation reason
4. System confirms action
5. Admin confirms revocation
6. System revokes session
7. System emits domain event
8. System logs access
9. Admin receives confirmation

**Related Entities:**
- `Session` (audit.prisma)
- `User` (rbac.prisma)

---

### AC-005: Generate HIPAA Access Report

**As an** admin  
**I want to** generate a HIPAA access report  
**So that** I can demonstrate compliance with access logging requirements

**Acceptance Criteria:**
- Admin can generate report for date range
- Report includes all PHI access events (`accessedPHI: true`)
- Report includes: user, resource type/id, action, timestamp, justification
- Report can be exported as CSV or PDF
- Report includes summary statistics
- Data access log entry is created for report generation

**Workflow Steps:**
1. Admin navigates to Audit → Reports → HIPAA Access Report
2. Admin selects date range
3. Admin optionally filters by user or resource type
4. System generates report
5. System logs report generation
6. Admin views report
7. Admin can export report

**Related Entities:**
- `DataAccessLog` (audit.prisma) - filtered by `accessedPHI: true`

---

## Cross-Domain Admin Workflows

### CD-001: Merge Medical Records

**As an** admin  
**I want to** merge duplicate medical records  
**So that** patient data is consolidated correctly

**Acceptance Criteria:**
- Admin can merge two medical records (source → target)
- System validates both records exist and are active
- System creates `RecordMergeHistory` record
- System sets `mergedInto` on source record
- System sets `status: MERGED` on source record
- System creates domain event `MedicalRecord.Merged` (required for merge)
- System links merge to triggering event
- `mergedBy` is set to admin user ID
- Reason for merge is required
- Data access log entry is created
- Merge is reversible (via reversal event)

**Workflow Steps:**
1. Admin navigates to Medical Records → Select Source Record → Merge
2. Admin selects target record (record to merge into)
3. Admin enters reason for merge
4. System validates records can be merged
5. System creates domain event
6. System creates RecordMergeHistory
7. System updates source record status
8. System logs access
9. Admin receives confirmation

**Related Entities:**
- `MedicalRecord` (medical_records.prisma)
- `RecordMergeHistory` (medical_records.prisma)
- `DomainEvent` (audit.prisma) - required for merge

---

### CD-002: Reverse Medical Record Merge

**As an** admin  
**I want to** reverse a medical record merge  
**So that** I can undo incorrect merges

**Acceptance Criteria:**
- Admin can reverse a merge operation
- System validates merge exists and hasn't been reversed
- System creates reversal domain event
- System updates `RecordMergeHistory` with reversal info
- System restores source record status
- System clears `mergedInto` on source record
- `reversedBy` is set to admin user ID
- Reason for reversal is required
- Data access log entry is created

**Workflow Steps:**
1. Admin navigates to Medical Records → Merge History → Select Merge
2. Admin clicks "Reverse Merge"
3. Admin enters reason for reversal
4. System validates merge can be reversed
5. System creates reversal domain event
6. System updates RecordMergeHistory
7. System restores source record
8. System logs access
9. Admin receives confirmation

**Related Entities:**
- `RecordMergeHistory` (medical_records.prisma)
- `MedicalRecord` (medical_records.prisma)
- `DomainEvent` (audit.prisma)

---

### CD-003: View System Health

**As an** admin  
**I want to** view system health metrics  
**So that** I can monitor system performance and availability

**Acceptance Criteria:**
- Admin can view: database connection status, API response times, active user count, recent error count
- Shows system uptime
- Shows recent critical errors
- Data access log entry is created
- Metrics update in real-time (if dashboard)

**Workflow Steps:**
1. Admin navigates to Dashboard → System Health
2. System queries health metrics
3. System logs access
4. Admin views health dashboard

**Related Entities:**
- Various system metrics (not schema-specific)

---

## Dashboard & Reporting Workflows

### DR-001: View Admin Dashboard

**As an** admin  
**I want to** view an admin dashboard  
**So that** I can see system overview and key metrics

**Acceptance Criteria:**
- Dashboard shows: total users (active/inactive), total roles, total permissions
- Shows recent user activity (logins, creations)
- Shows recent admin actions
- Shows system alerts or warnings
- Shows quick links to common admin tasks
- Data access log entry is created
- Dashboard is customizable (widgets can be shown/hidden)

**Workflow Steps:**
1. Admin navigates to Dashboard
2. System queries dashboard statistics
3. System logs access
4. Admin views dashboard with metrics and quick actions

**Related Entities:**
- `User` (rbac.prisma) - for user counts
- `Role` (rbac.prisma) - for role counts
- `Permission` (rbac.prisma) - for permission counts
- `Session` (audit.prisma) - for recent activity
- `DataAccessLog` (audit.prisma) - for recent actions

---

### DR-002: View User Activity Report

**As an** admin  
**I want to** view user activity reports  
**So that** I can understand system usage patterns

**Acceptance Criteria:**
- Admin can generate report for date range
- Report shows: user logins, user creations, role assignments, permission changes
- Can filter by user or date range
- Report can be exported
- Data access log entry is created

**Workflow Steps:**
1. Admin navigates to Reports → User Activity
2. Admin selects date range and optional filters
3. System queries activity data
4. System generates report
5. System logs access
6. Admin views report
7. Admin can export report

**Related Entities:**
- `User` (rbac.prisma)
- `Session` (audit.prisma)
- `UserRoleAssignment` (rbac.prisma)
- `DomainEvent` (audit.prisma)

---

### DR-003: View Permission Usage Report

**As an** admin  
**I want to** view permission usage reports  
**So that** I can understand which permissions are used and by whom

**Acceptance Criteria:**
- Admin can generate report showing: permission → roles → users mapping
- Shows permission usage statistics
- Can filter by domain or permission
- Report can be exported
- Data access log entry is created

**Workflow Steps:**
1. Admin navigates to Reports → Permission Usage
2. Admin optionally filters by domain or permission
3. System queries permission-role-user relationships
4. System generates report
5. System logs access
6. Admin views report
7. Admin can export report

**Related Entities:**
- `Permission` (rbac.prisma)
- `RolePermission` (rbac.prisma)
- `Role` (rbac.prisma)
- `UserRoleAssignment` (rbac.prisma)
- `User` (rbac.prisma)

---

## Workflow Priority Matrix

### High Priority (MVP - Must Have)

1. **User Management**
   - US-001: Create New User Account
   - US-002: Update User Information
   - US-003: Deactivate User Account
   - US-004: Assign Role to User
   - US-005: Revoke Role from User
   - US-006: Reset User Password
   - US-008: Search and Filter Users

2. **Role & Permission Management**
   - RP-001: Create New Role
   - RP-002: Update Role Information
   - RP-003: Deactivate Role
   - RP-004: Assign Permission to Role
   - RP-005: Remove Permission from Role
   - RP-007: Browse Permissions

3. **Audit & Compliance**
   - AC-001: View Data Access Logs
   - AC-002: View Domain Events
   - AC-003: View User Sessions

4. **Dashboard**
   - DR-001: View Admin Dashboard

### Medium Priority (Phase 2)

1. **User Management**
   - US-007: View User Sessions

2. **Role & Permission Management**
   - RP-006: View Users with Role
   - RP-008: View Permission Details

3. **System Configuration**
   - SC-001: Manage Departments
   - SC-002: Manage Operating Theaters
   - SC-003: Manage Inventory Categories
   - SC-004: Manage Vendors

4. **Audit & Compliance**
   - AC-004: Revoke User Session
   - AC-005: Generate HIPAA Access Report

5. **Dashboard & Reporting**
   - DR-002: View User Activity Report
   - DR-003: View Permission Usage Report

### Low Priority (Phase 3)

1. **System Configuration**
   - SC-005: Manage Billing Codes
   - SC-006: Manage Insurance Providers
   - SC-007: Manage Fee Schedules

2. **Cross-Domain Admin**
   - CD-001: Merge Medical Records
   - CD-002: Reverse Medical Record Merge
   - CD-003: View System Health

---

## Implementation Notes

### Security Considerations

- All admin workflows require:
  - `ADMIN` role
  - Appropriate permissions (e.g., `admin:users:write`)
  - Authentication via JWT
  - Session validation

- Sensitive operations (password reset, user deactivation) require:
  - Confirmation dialogs
  - Audit logging
  - Domain events

### Data Integrity

- Immutable records (DomainEvent, RecordMergeHistory, etc.) cannot be modified
- Deactivation is preferred over deletion
- Historical records are preserved for audit

### Performance

- Pagination required for all list views
- Indexes exist on frequently queried fields
- Consider caching for dashboard statistics

### User Experience

- Confirmation dialogs for destructive actions
- Clear error messages
- Loading states for async operations
- Success notifications
- Search and filter on all list views

---

## Related Documents

- `ADMIN_MODULE_IMPLEMENTATION.md` - Current implementation status
- `ADMIN_DASHBOARD_IMPLEMENTATION.md` - Dashboard design (to be created)
- Schema files in `/backend/prisma/schema/` - Database structure

---

**End of Document**









