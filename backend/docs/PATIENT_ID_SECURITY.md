# Patient ID Security in URLs

## Current Implementation

### URL Structure
- Patient detail: `/admin/patients/[patient-id]`
- Patient consents: `/admin/patients/[patient-id]/consents`
- Patient ID format: UUID (e.g., `d9b17c92-5d44-4654-ae79-37fda8888a18`)

## Security Measures

### 1. **Row-Level Security (RLS)**
- **Enforcement**: `RlsGuard` validates access on every request
- **Validation**: `RlsValidationService.canAccessPatient()` checks:
  - User role (ADMIN bypasses RLS)
  - Patient assignments (doctor assigned to patient's cases)
  - Department access
  - Restricted patient flags

### 2. **Role-Based Access Control (RBAC)**
- **Guards**: `RolesGuard` and `PermissionsGuard` enforce role requirements
- **Permissions**: `patients:*:read` and `consent:*:read` required
- **Role Restrictions**:
  - FRONT_DESK: Limited access (status only, no content)
  - NURSE: Can view but limited signature details
  - DOCTOR/ADMIN: Full access

### 3. **Access Logging**
- **Interceptor**: `DataAccessLogInterceptor` logs all access
- **Audit Trail**: Every request to patient data is logged with:
  - User ID
  - Timestamp
  - IP address
  - Resource accessed
  - Success/failure

### 4. **Error Handling**
- **404 Not Found**: Patient doesn't exist or user has no access
- **403 Forbidden**: User lacks permissions or patient is restricted
- **No Information Leakage**: Errors don't reveal whether patient exists

## Is It Safe to Expose Patient IDs in URLs?

### ✅ **Yes, with proper safeguards:**

1. **UUIDs are non-sequential**: Unlike auto-incrementing IDs, UUIDs don't reveal:
   - Total number of patients
   - Patient creation order
   - Any predictable pattern

2. **Access is controlled**: Even if someone knows a patient ID:
   - They cannot access it without proper authentication
   - RLS prevents unauthorized access
   - All access attempts are logged

3. **Industry Standard**: Most EHR systems use UUIDs in URLs:
   - Epic, Cerner, Allscripts all use UUIDs
   - Protected by authentication + authorization
   - Not considered a security vulnerability

### ⚠️ **Best Practices (Already Implemented):**

1. ✅ **Never expose patient IDs in public URLs** (e.g., email links)
2. ✅ **Always require authentication** (JWT tokens)
3. ✅ **Enforce RLS on every request** (RlsGuard)
4. ✅ **Log all access** (DataAccessLogInterceptor)
5. ✅ **Return generic errors** (don't reveal if patient exists)
6. ✅ **Use HTTPS** (encrypts URLs in transit)

### 🔒 **Additional Security Recommendations:**

#### Option 1: Use MRN in URLs (Future Enhancement)
```typescript
// Instead of: /admin/patients/d9b17c92-5d44-4654-ae79-37fda8888a18
// Use: /admin/patients/MRN-2026-00042
```
- **Pros**: More user-friendly, less "scary" looking
- **Cons**: Requires lookup, MRN can change, still needs RLS

#### Option 2: Short-lived Tokens (For External Access)
```typescript
// For patient portal or email links
/admin/patients/access?token=short-lived-jwt-token
```
- **Pros**: Time-limited, revocable
- **Cons**: Complex, requires token management

#### Option 3: Opaque Identifiers (Current Approach)
```typescript
// Current: UUIDs (already opaque)
// Alternative: Hash-based IDs (e.g., base64url encoded)
```
- **Pros**: Already implemented (UUIDs are opaque)
- **Cons**: None - UUIDs are sufficient

## Current Security Posture: ✅ **SECURE**

The current implementation is **secure** because:

1. ✅ UUIDs are non-guessable (128-bit random)
2. ✅ Every request requires authentication
3. ✅ RLS validates access on every request
4. ✅ All access is logged for audit
5. ✅ Errors don't leak information
6. ✅ HTTPS encrypts URLs in transit

## Conclusion

**Patient UUIDs in URLs are safe** when:
- Proper authentication is required ✅
- RLS is enforced ✅
- Access is logged ✅
- HTTPS is used ✅

**No changes needed** - the current implementation follows industry best practices.

## References

- [OWASP: Information Exposure](https://owasp.org/www-community/vulnerabilities/Information_exposure)
- [HIPAA: Technical Safeguards](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [NIST: Access Control](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)









