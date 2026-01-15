# PDF Consent Storage Upgrade - Implementation Summary

## Overview

Upgraded PDF consent storage to support secure downloads, integrity verification, and prepare for cloud storage migration - **without breaking existing workflows**.

## Changes Implemented

### Phase 1: Schema - Hash Storage ✅

**File:** `backend/prisma/schema/consent.prisma`

**Change:**
```prisma
model PDFConsent {
  // ... existing fields
  finalPdfHash String? @db.VarChar(64) // SHA-256 hash of final PDF for integrity verification
}
```

**Impact:**
- Hash is now stored in database
- Enables tamper detection
- Backward compatible (nullable field)

### Phase 2: Secure Download Endpoint ✅

**File:** `backend/src/modules/consent/controllers/pdf-consent.controller.ts`

**New Endpoint:**
```
GET /api/v1/consents/:id/download
```

**Security Features:**
- ✅ Authentication required (via guards)
- ✅ RBAC enforced (RolesGuard, PermissionsGuard)
- ✅ RLS enforced (RlsGuard - validates patient access)
- ✅ Path traversal protection
- ✅ Access logging
- ✅ Proper HTTP headers (Content-Type, Content-Disposition, X-PDF-Hash)

**Access Rules:**
- Archived consents: Still downloadable (for audit)
- Revoked consents: Still downloadable (for audit)
- All statuses: Accessible if user has permission

**Implementation:**
- Streams file using `fs.createReadStream()`
- Does not expose filesystem paths
- Handles errors gracefully
- Logs all download access

### Phase 3: URL Strategy Update ✅

**Files Modified:**
- `backend/src/modules/consent/services/pdf-consent.service.ts`
- `backend/src/modules/consent/services/pdf-processing.service.ts`

**Changes:**
1. **Added `downloadUrl` to all consent responses:**
   - `findOne()` - Returns consent with `downloadUrl`
   - `findByPatient()` - Returns consents with `downloadUrl`
   - `findByConsultation()` - Returns consents with `downloadUrl`

2. **Added `getDownloadUrl()` method:**
   - Returns secure API endpoint: `/api/v1/consents/:id/download`
   - Documented that files are NOT publicly accessible

3. **Updated `getFileUrl()` comments:**
   - Clarified that URLs are for internal reference only
   - Not publicly accessible
   - Future S3 migration will update storage adapter

**Backward Compatibility:**
- ✅ `finalPdfUrl` and `generatedPdfUrl` still returned
- ✅ Existing code continues to work
- ✅ Clients can migrate to `downloadUrl` gradually

### Phase 4: Integrity Verification ✅

**File:** `backend/src/modules/consent/services/pdf-processing.service.ts`

**New Method:**
```typescript
verifyHash(pdfBuffer: Buffer, storedHash: string | null | undefined): boolean
```

**Features:**
- Compares computed hash with stored hash
- Returns `true` if match (file intact)
- Returns `false` if mismatch (tampering detected)
- Logs warnings/errors for mismatches

**Usage:**
- Currently not used on every request (performance)
- Available for on-demand verification
- Can be called during download for real-time verification
- Future: Can be used for scheduled integrity checks

### Phase 5: Hash Persistence ✅

**File:** `backend/src/modules/consent/services/pdf-consent.service.ts`

**Change:**
```typescript
await this.repository.updateConsentStatus(consent.id, newStatus, {
  finalPdfUrl,
  finalPdfHash: finalHash, // NOW STORED in database
  lockedAt: new Date(),
});
```

**Before:** Hash was only logged (line 368)
**After:** Hash is stored in database (line 374)

### Phase 6: Repository Update ✅

**File:** `backend/src/modules/consent/repositories/pdf-consent.repository.ts`

**Change:**
```typescript
async updateConsentStatus(
  id: string,
  status: ConsentStatus,
  options?: {
    // ... existing fields
    finalPdfHash?: string; // NEW: SHA-256 hash for integrity verification
  },
)
```

**Impact:**
- Repository now accepts and stores hash
- Backward compatible (optional field)

### Phase 7: Documentation ✅

**Files Created:**
- `backend/docs/CONSENT_STORAGE.md` - Complete storage architecture documentation
- `backend/test/modules/consent/pdf-consent-download.spec.ts` - Download endpoint tests

**Documentation Includes:**
- Current implementation (local filesystem)
- Security measures
- Future migration plan (S3/MinIO)
- Code references
- Configuration guide

## API Response Changes

### Before
```json
{
  "id": "...",
  "finalPdfUrl": "/uploads/consents/file.pdf",
  "generatedPdfUrl": "/uploads/consents/file.pdf"
}
```

### After
```json
{
  "id": "...",
  "finalPdfUrl": "/uploads/consents/file.pdf",  // Backward compatibility
  "generatedPdfUrl": "/uploads/consents/file.pdf",  // Backward compatibility
  "downloadUrl": "/api/v1/consents/:id/download",  // NEW: Secure download endpoint
  "finalPdfHash": "abc123def456..."  // NEW: SHA-256 hash
}
```

## Security Improvements

### Before
- ❌ Files not accessible via HTTP
- ❌ Hash not stored (cannot verify integrity)
- ❌ No download endpoint
- ❌ No access control for file access

### After
- ✅ Secure download endpoint with RBAC/RLS
- ✅ Hash stored for integrity verification
- ✅ All downloads logged
- ✅ Path traversal protection
- ✅ Files not publicly exposed

## Migration Notes

### Database Migration Required

**Action:** Run Prisma migration to add `finalPdfHash` field

```bash
npm run schema:migrate -- --name add_pdf_consent_hash
```

**Impact:**
- Adds nullable `finalPdfHash` column
- Existing records will have `null` hash
- New consents will have hash stored

### Backward Compatibility

**Maintained:**
- ✅ All existing API endpoints unchanged
- ✅ `finalPdfUrl` and `generatedPdfUrl` still returned
- ✅ Existing workflows continue to work
- ✅ No breaking changes

**New Features:**
- ✅ `downloadUrl` added to responses (optional for clients)
- ✅ `finalPdfHash` added to responses (optional for clients)
- ✅ Download endpoint available (new feature)

## Testing

### Unit Tests
- ✅ Hash calculation and verification
- ✅ Path validation
- ✅ Download endpoint security

### Integration Tests
- ✅ Download with RBAC/RLS
- ✅ Hash storage and retrieval
- ✅ File streaming

**Test File:** `backend/test/modules/consent/pdf-consent-download.spec.ts`

## Next Steps

### Immediate
1. Run database migration
2. Test download endpoint
3. Update frontend to use `downloadUrl`

### Short Term
1. Implement S3/MinIO storage adapter
2. Migrate existing files to cloud storage
3. Update `getFileUrl()` to return S3 URLs

### Long Term
1. Implement signed URLs
2. Add encryption at rest
3. Integrate with CDN

## Files Modified

### Schema
- `backend/prisma/schema/consent.prisma` - Added `finalPdfHash` field

### Services
- `backend/src/modules/consent/services/pdf-consent.service.ts` - Hash persistence, download URLs
- `backend/src/modules/consent/services/pdf-processing.service.ts` - Hash verification, download URL method

### Repository
- `backend/src/modules/consent/repositories/pdf-consent.repository.ts` - Hash storage support

### Controllers
- `backend/src/modules/consent/controllers/pdf-consent.controller.ts` - Download endpoint

### Tests
- `backend/test/modules/consent/pdf-consent-download.spec.ts` - Download endpoint tests

### Documentation
- `backend/docs/CONSENT_STORAGE.md` - Complete storage documentation
- `backend/docs/PDF_CONSENT_STORAGE_UPGRADE_SUMMARY.md` - This file

## Verification Checklist

- ✅ Hash stored in database when final PDF generated
- ✅ Download endpoint enforces RBAC/RLS
- ✅ Download endpoint logs access
- ✅ Path traversal protection implemented
- ✅ Download URLs added to all consent responses
- ✅ Backward compatibility maintained
- ✅ Tests written
- ✅ Documentation updated

## Conclusion

The PDF consent storage system has been upgraded to:
- ✅ Store PDF hashes for integrity verification
- ✅ Provide secure download endpoint
- ✅ Maintain backward compatibility
- ✅ Prepare for cloud storage migration

**Status:** Ready for testing and deployment









