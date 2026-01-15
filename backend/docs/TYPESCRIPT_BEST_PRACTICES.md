# TypeScript Best Practices - Enterprise Surgical EHR

## Overview

This document outlines TypeScript best practices and type safety standards for the enterprise surgical EHR system. All code must adhere to these standards to ensure maintainability, reliability, and type safety.

---

## Table of Contents

1. [Compiler Configuration](#compiler-configuration)
2. [Type Safety Rules](#type-safety-rules)
3. [Prisma Type Usage](#prisma-type-usage)
4. [DTO Patterns](#dto-patterns)
5. [Service Layer Types](#service-layer-types)
6. [Repository Layer Types](#repository-layer-types)
7. [Controller Layer Types](#controller-layer-types)
8. [Common Anti-Patterns](#common-anti-patterns)

---

## Compiler Configuration

### Current State

```json
{
  "strictNullChecks": false,  // ❌ Should be true
  "noImplicitAny": false,     // ❌ Should be true
  "strictBindCallApply": true, // ✅ Good
  "forceConsistentCasingInFileNames": true // ✅ Good
}
```

### Target Configuration (Senior Engineer Level)

```json
{
  "strict": true,                    // Enables all strict checks
  "strictNullChecks": true,         // Null/undefined safety
  "noImplicitAny": true,            // No implicit any types
  "strictFunctionTypes": true,      // Function type checking
  "strictPropertyInitialization": true, // Property initialization
  "noUnusedLocals": true,            // Catch unused variables
  "noUnusedParameters": true,        // Catch unused parameters
  "noImplicitReturns": true,         // All code paths return
  "noFallthroughCasesInSwitch": true // Switch statement safety
}
```

**Migration Strategy:** Enable incrementally, module by module, fixing errors as we go.

---

## Type Safety Rules

### ❌ NEVER Use

1. **`any` type**
   ```typescript
   // ❌ BAD
   function process(data: any): any {
     return data.value;
   }
   
   // ✅ GOOD
   function process<T extends { value: string }>(data: T): string {
     return data.value;
   }
   ```

2. **`as any` type assertions**
   ```typescript
   // ❌ BAD
   const result = someValue as any;
   
   // ✅ GOOD
   const result = someValue as SpecificType;
   // Or better: fix the type definition
   ```

3. **Unsafe type assertions**
   ```typescript
   // ❌ BAD
   const user = req.user as User;
   
   // ✅ GOOD
   if (!req.user || !isUser(req.user)) {
     throw new UnauthorizedException();
   }
   const user = req.user;
   ```

4. **Implicit any in function parameters**
   ```typescript
   // ❌ BAD
   function process(data) {
     return data.value;
   }
   
   // ✅ GOOD
   function process(data: ProcessData): string {
     return data.value;
   }
   ```

### ✅ ALWAYS Use

1. **Explicit return types for public methods**
   ```typescript
   // ✅ GOOD
   async findById(id: string): Promise<Appointment | null> {
     // ...
   }
   ```

2. **Prisma generated types**
   ```typescript
   // ✅ GOOD
   import { Prisma, Appointment, AppointmentStatus } from '@prisma/client';
   
   async create(data: Prisma.AppointmentCreateInput): Promise<Appointment> {
     // ...
   }
   ```

3. **Type guards for runtime validation**
   ```typescript
   // ✅ GOOD
   function isAppointmentStatus(value: string): value is AppointmentStatus {
     return Object.values(AppointmentStatus).includes(value as AppointmentStatus);
   }
   ```

---

## Prisma Type Usage

### ✅ Correct Patterns

1. **Use Prisma generated types**
   ```typescript
   import { 
     Prisma, 
     Appointment, 
     AppointmentStatus,
     AppointmentCreateInput,
     AppointmentUpdateInput 
   } from '@prisma/client';
   
   // For create operations
   async create(data: Prisma.AppointmentCreateInput): Promise<Appointment> {
     return this.prisma.appointment.create({ data });
   }
   
   // For update operations
   async update(
     id: string, 
     data: Prisma.AppointmentUpdateInput
   ): Promise<Appointment> {
     return this.prisma.appointment.update({ 
       where: { id }, 
       data 
     });
   }
   
   // For queries with includes
   async findWithRelations(id: string): Promise<Appointment & {
     patient: Patient;
     doctor: User;
   }> {
     return this.prisma.appointment.findUnique({
       where: { id },
       include: { patient: true, doctor: true }
     });
   }
   ```

2. **Use Prisma enums correctly**
   ```typescript
   // ✅ GOOD - Import enum from Prisma
   import { AppointmentStatus } from '@prisma/client';
   
   if (appointment.status === AppointmentStatus.CONFIRMED) {
     // ...
   }
   
   // ❌ BAD - String literals
   if (appointment.status === 'CONFIRMED') {
     // ...
   }
   ```

3. **Type-safe where clauses**
   ```typescript
   // ✅ GOOD
   const where: Prisma.AppointmentWhereInput = {
     status: AppointmentStatus.CONFIRMED,
     scheduledDate: { gte: startDate }
   };
   
   // ❌ BAD
   const where = {
     status: 'CONFIRMED' as any,
     scheduledDate: { gte: startDate }
   };
   ```

### ❌ Anti-Patterns

1. **Don't use `as any` for Prisma enums**
   ```typescript
   // ❌ BAD
   cancellationReason: cancellationReason as any
   
   // ✅ GOOD
   cancellationReason: cancellationReason as CancellationReason
   // Or better: validate the value first
   if (!isCancellationReason(cancellationReason)) {
     throw new BadRequestException('Invalid cancellation reason');
   }
   ```

2. **Don't bypass Prisma types**
   ```typescript
   // ❌ BAD
   async create(data: any): Promise<any> {
     return this.prisma.appointment.create({ data });
   }
   
   // ✅ GOOD
   async create(
     data: Prisma.AppointmentCreateInput
   ): Promise<Appointment> {
     return this.prisma.appointment.create({ data });
   }
   ```

---

## DTO Patterns

### ✅ Correct Patterns

1. **Use class-validator decorators**
   ```typescript
   import { IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';
   import { AppointmentStatus } from '@prisma/client';
   
   export class CreateAppointmentDto {
     @IsUUID()
     patientId: string;
     
     @IsUUID()
     doctorId: string;
     
     @IsEnum(AppointmentStatus)
     status: AppointmentStatus;
     
     @IsString()
     @IsOptional()
     notes?: string;
   }
   ```

2. **Use mapped types for updates**
   ```typescript
   import { PartialType } from '@nestjs/mapped-types';
   
   export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
     // All fields optional
   }
   ```

3. **Separate DTOs for different operations**
   ```typescript
   // Create DTO
   export class CreateAppointmentDto { ... }
   
   // Update DTO
   export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) { ... }
   
   // Query DTO
   export class FindAppointmentsDto {
     @IsOptional()
     @IsEnum(AppointmentStatus)
     status?: AppointmentStatus;
     
     @IsOptional()
     @IsDateString()
     startDate?: string;
   }
   ```

---

## Service Layer Types

### ✅ Correct Patterns

1. **Explicit return types**
   ```typescript
   @Injectable()
   export class AppointmentService {
     async create(
       createDto: CreateAppointmentDto,
       createdBy: string
     ): Promise<Appointment> {
       // Implementation
     }
     
     async findById(id: string): Promise<Appointment | null> {
       // Implementation
     }
   }
   ```

2. **Use Prisma types in services**
   ```typescript
   async findByDoctor(
     doctorId: string,
     startDate?: Date,
     endDate?: Date,
     status?: AppointmentStatus
   ): Promise<Appointment[]> {
     const where: Prisma.AppointmentWhereInput = {
       doctorId,
       ...(startDate && { scheduledDate: { gte: startDate } }),
       ...(endDate && { scheduledDate: { lte: endDate } }),
       ...(status && { status }),
     };
     
     return this.appointmentRepository.findMany({ where });
   }
   ```

3. **Type-safe error handling**
   ```typescript
   async confirmPayment(
     appointmentId: string,
     paymentId: string
   ): Promise<Appointment> {
     const appointment = await this.findById(appointmentId);
     
     if (!appointment) {
       throw new NotFoundException(`Appointment ${appointmentId} not found`);
     }
     
     if (appointment.status !== AppointmentStatus.PENDING_PAYMENT) {
       throw new ConflictException(
         `Appointment is not in PENDING_PAYMENT status. Current: ${appointment.status}`
       );
     }
     
     // Type-safe from here
     return this.appointmentRepository.confirmPayment(appointmentId, paymentId);
   }
   ```

---

## Repository Layer Types

### ✅ Correct Patterns

1. **Use Prisma types exclusively**
   ```typescript
   @Injectable()
   export class AppointmentRepository {
     private prisma: PrismaClient;
     
     async create(
       data: Prisma.AppointmentCreateInput
     ): Promise<Appointment> {
       return this.prisma.appointment.create({ data });
     }
     
     async update(
       id: string,
       data: Prisma.AppointmentUpdateInput
     ): Promise<Appointment> {
       return this.prisma.appointment.update({
         where: { id },
         data,
       });
     }
     
     async findMany(
       args: Prisma.AppointmentFindManyArgs
     ): Promise<Appointment[]> {
       return this.prisma.appointment.findMany(args);
     }
   }
   ```

2. **Type-safe includes**
   ```typescript
   async findByIdWithRelations(
     id: string
   ): Promise<Appointment & {
     patient: Patient;
     doctor: User;
     payment: Payment | null;
   }> {
     return this.prisma.appointment.findUnique({
       where: { id },
       include: {
         patient: true,
         doctor: true,
         payment: true,
       },
     });
   }
   ```

---

## Controller Layer Types

### ✅ Correct Patterns

1. **Use proper CurrentUser type**
   ```typescript
   import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
   import { UserIdentity } from '../../auth/services/identityContext.service';
   
   @Controller('appointments')
   export class AppointmentController {
     @Post()
     create(
       @Body() createDto: CreateAppointmentDto,
       @CurrentUser() user: UserIdentity
     ): Promise<Appointment> {
       return this.appointmentService.create(createDto, user.id);
     }
   }
   ```

2. **Type-safe query parameters**
   ```typescript
   @Get()
   findAll(
     @Query('status') status?: string,
     @Query('startDate') startDate?: string,
     @Query('endDate') endDate?: string
   ): Promise<Appointment[]> {
     // Validate and convert
     const statusEnum = status 
       ? this.validateStatus(status) 
       : undefined;
     const start = startDate ? new Date(startDate) : undefined;
     const end = endDate ? new Date(endDate) : undefined;
     
     return this.appointmentService.findByDoctor(doctorId, start, end, statusEnum);
   }
   
   private validateStatus(status: string): AppointmentStatus {
     if (!Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
       throw new BadRequestException(`Invalid status: ${status}`);
     }
     return status as AppointmentStatus;
   }
   ```

---

## Common Anti-Patterns

### ❌ Anti-Pattern 1: Using `any` for CurrentUser

```typescript
// ❌ BAD
@CurrentUser() user: any

// ✅ GOOD
@CurrentUser() user: UserIdentity
```

### ❌ Anti-Pattern 2: Using `as any` for enums

```typescript
// ❌ BAD
status: status as any

// ✅ GOOD
status: status as AppointmentStatus
// Or validate first
if (!isAppointmentStatus(status)) {
  throw new BadRequestException('Invalid status');
}
```

### ❌ Anti-Pattern 3: Implicit any in return types

```typescript
// ❌ BAD
async findById(id: string): Promise<any> {
  return this.repository.findById(id);
}

// ✅ GOOD
async findById(id: string): Promise<Appointment | null> {
  return this.repository.findById(id);
}
```

### ❌ Anti-Pattern 4: Not using Prisma generated types

```typescript
// ❌ BAD
interface CreateAppointmentData {
  patientId: string;
  doctorId: string;
  // ... manually defined
}

// ✅ GOOD
import { Prisma } from '@prisma/client';
type CreateAppointmentData = Prisma.AppointmentCreateInput;
```

---

## Type Guards and Validation

### ✅ Create Type Guards

```typescript
// Type guard for enum validation
export function isAppointmentStatus(
  value: string
): value is AppointmentStatus {
  return Object.values(AppointmentStatus).includes(value as AppointmentStatus);
}

// Usage
if (!isAppointmentStatus(status)) {
  throw new BadRequestException(`Invalid appointment status: ${status}`);
}
```

### ✅ Use class-validator for DTOs

```typescript
import { IsEnum, IsUUID, IsDateString } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class FindAppointmentsDto {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
  
  @IsOptional()
  @IsUUID()
  doctorId?: string;
}
```

---

## Migration Checklist

When enabling strict TypeScript:

1. ✅ Fix all `any` types
2. ✅ Remove all `as any` assertions
3. ✅ Add explicit return types to public methods
4. ✅ Fix implicit any in function parameters
5. ✅ Add null checks where needed
6. ✅ Use Prisma generated types throughout
7. ✅ Create type guards for enum validation
8. ✅ Fix CurrentUser type usage
9. ✅ Add proper error types
10. ✅ Enable strict mode incrementally

---

## Summary

**Key Principles:**

1. **No `any` types** - Use proper types or generics
2. **No `as any` assertions** - Fix the root cause
3. **Use Prisma types** - Don't redefine what Prisma generates
4. **Explicit return types** - For all public methods
5. **Type guards** - For runtime validation
6. **Strict mode** - Enable incrementally

**Benefits:**

- ✅ Catch errors at compile time
- ✅ Better IDE autocomplete
- ✅ Self-documenting code
- ✅ Easier refactoring
- ✅ Reduced runtime errors






