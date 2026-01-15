# Remaining TypeScript Errors (83 → Target: 0)

## Progress Summary
- **Started with**: 102 errors
- **Current**: ~83 errors  
- **Fixed**: 19 errors (appointment module, bulk active→isActive, consultation repository)

## Error Categories

### 1. Missing Prisma Includes (Type Mismatches) - ~15 errors
**Problem**: Return types expect relations but TypeScript can't infer them correctly.

**Files**:
- `src/modules/admin/repositories/roles.repository.ts` - Line 103
- `src/modules/admin/repositories/users.repository.ts` - Lines 36, 84
- `src/modules/auth/repositories/auth.repository.ts` - Missing `roleAssignments` includes

**Solution**: Simplify return types or use type assertions:
```typescript
// Instead of:
async findById(id: string): Promise<Prisma.RoleGetPayload<{...}>> {

// Use:
async findById(id: string) {
  return await this.prisma.role.findUnique({...});
}
```

### 2. Missing Relation Includes - ~10 errors
**Problem**: Code accesses `assignment.role` or `assignment.user` but query doesn't include them.

**Files**:
- `src/modules/admin/services/reporting.service.ts` - Lines 274, 278, 284
- `src/modules/admin/services/users.service.ts` - Lines 371, 386

**Solution**: Add `include: { role: true, user: true }` to queries.

### 3. ConsultationStatus Enum - ~37 errors
**Problem**: Code uses `ConsultationStatus` enum but it doesn't exist in Prisma schema.

**Files**:
- `src/modules/consultation/services/consultation.service.ts` (30+ occurrences)
- `src/modules/consultation/controllers/consultation.controller.ts`
- `src/modules/consultation/dto/override-state.dto.ts`

**Solution Options**:
- **Option A**: Add enum to `prisma/schema/foundation.prisma`
- **Option B**: Replace all with string literals

### 4. Schema Field Mismatches - ~8 errors
- `surgicalCase` → `surgicalCases` (plural)
- `procedurePlans` relation check needed
- `rolePermissions` exists but might need include check

### 5. Decimal Type Issues - ~3 errors
- `payment.amount` is `Decimal` but return types expect `number`
- Fix: Use `Decimal` type or convert with `.toNumber()`

## Quick Fix Script

```bash
# Fix return types (remove explicit Prisma.GetPayload types)
find backend/src/modules/admin/repositories -name "*.ts" -exec sed -i 's/: Promise<Prisma\.[A-Za-z]*GetPayload<{/ {/g' {} \;

# Fix ConsultationStatus (Option B - string literals)
find backend/src/modules/consultation -name "*.ts" -exec sed -i 's/ConsultationStatus\./"SCHEDULED"/g' {} \;
# Then manually fix each occurrence

# Fix missing includes
# Add include: { role: true } to userRoleAssignment queries
# Add include: { user: true } where needed
```

## Priority Order

1. **High**: Fix missing includes (prevents runtime errors)
2. **High**: Fix ConsultationStatus (blocks compilation)
3. **Medium**: Fix return type mismatches
4. **Low**: Fix Decimal type issues (cosmetic)






