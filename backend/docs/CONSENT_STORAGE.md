# PDF Consent Storage Implementation

## Overview

This document describes the PDF consent storage architecture, security measures, and future migration plans.

## Current Implementation

### Storage Location

**Local Filesystem (Temporary)**
- **Path:** `./uploads/consents/` (configurable via `UPLOADS_DIR` env var)
- **Format:** Files stored as `consent-{consentId}-{type}-{timestamp}.pdf`
- **Status:** Temporary solution for development/testing

**Why Local Filesystem:**
- Simple to implement and test
- No external dependencies
- Suitable for development and small deployments
- **NOT suitable for production** (see migration plan below)

### Database Storage

**What is Stored:**
- `generatedPdfUrl`: Internal file path/URL for working PDF (before signing)
- `finalPdfUrl`: Internal file path/URL for locked PDF (after signing)
- `finalPdfHash`: SHA-256 hash of final PDF for integrity verification
- `lockedAt`: Timestamp when document was locked

**What is NOT Stored:**
- Raw PDF blobs (files are stored separately)
- Signature images (stored as URLs in `PDFConsentSignature.signatureUrl`)

### File Access

**Secure Download Endpoint:**
```
GET /api/v1/consents/:id/download
```

**Security Measures:**
- ✅ Authentication required (via guards)
- ✅ RBAC enforced (RolesGuard, PermissionsGuard)
- ✅ RLS enforced (RlsGuard - validates patient access)
- ✅ Access logged (DataAccessLogInterceptor)
- ✅ Path traversal protection
- ✅ No filesystem path exposure

**Access Rules:**
- Archived consents: Still downloadable (for audit/historical purposes)
- Revoked consents: Still downloadable (for audit/historical purposes)
- All statuses: Accessible if user has permission to view consent

**Response Headers:**
- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename="consent-{number}.pdf"`
- `X-PDF-Hash: {sha256}` (if available, for client-side verification)

### URL Strategy

**API Response Format:**
```json
{
  "id": "...",
  "finalPdfUrl": "/uploads/consents/file.pdf",  // Backward compatibility
  "generatedPdfUrl": "/uploads/consents/file.pdf",  // Backward compatibility
  "downloadUrl": "/api/v1/consents/:id/download",  // Preferred for client access
  "finalPdfHash": "abc123...",  // SHA-256 hash
  ...
}
```

**Client Usage:**
- ✅ **Use `downloadUrl`** for secure file access
- ⚠️ **Do NOT use `finalPdfUrl`/`generatedPdfUrl` directly** - these are internal paths
- ✅ **Verify `finalPdfHash`** if client-side integrity checking is needed

**Why Keep `finalPdfUrl`/`generatedPdfUrl`:**
- Backward compatibility with existing code
- Internal reference for file management
- Future migration to S3 will update these to S3 URLs

### Integrity Verification

**Hash Storage:**
- SHA-256 hash computed when final PDF is generated
- Hash stored in `finalPdfHash` field
- Hash included in response headers (`X-PDF-Hash`)

**Verification Method:**
```typescript
// In PDFProcessingService
verifyHash(pdfBuffer: Buffer, storedHash: string | null | undefined): boolean
```

**Usage:**
- Currently not used on every request (performance)
- Available for on-demand verification
- Can be used for tamper detection
- Future: Can be called during download for real-time verification

## Security Protections

### Access Control

1. **Authentication:** All endpoints require valid JWT token
2. **RBAC:** Role-based access (ADMIN, DOCTOR, NURSE, PATIENT)
3. **RLS:** Row-level security validates patient access
4. **Permissions:** Fine-grained permission checks

### File Security

1. **No Public Access:** Files are NOT served via static file server
2. **Path Validation:** Directory traversal protection in download endpoint
3. **Access Logging:** All downloads logged with user ID and IP
4. **Hash Verification:** Integrity can be verified via stored hash

### Audit Trail

- All file access logged via `DataAccessLogInterceptor`
- Download endpoint logs: user ID, IP address, timestamp
- Hash stored for tamper detection

## Future Migration Plan

### Phase 1: S3/MinIO Storage Adapter

**Goal:** Replace local filesystem with object storage

**Changes Required:**
1. Create `StorageAdapter` interface
2. Implement `LocalStorageAdapter` (current implementation)
3. Implement `S3StorageAdapter` (new)
4. Update `PDFProcessingService` to use adapter
5. Update `getFileUrl()` to return S3 URLs

**Benefits:**
- Scalability (unlimited storage)
- Redundancy (S3 durability)
- Performance (CDN integration)
- Backup/disaster recovery

### Phase 2: Signed URLs

**Goal:** Time-limited secure URLs for file access

**Implementation:**
- Generate pre-signed S3 URLs with expiration
- URLs valid for limited time (e.g., 15 minutes)
- No authentication required for URL (but URL is time-limited)
- Still log access for audit

**Benefits:**
- Reduced server load (direct S3 access)
- Better performance (CDN caching)
- Still secure (time-limited URLs)

### Phase 3: Encryption at Rest

**Goal:** Encrypt PDFs stored in S3

**Implementation:**
- Use S3 server-side encryption (SSE)
- Or client-side encryption before upload
- Encryption keys managed via KMS

**Benefits:**
- HIPAA compliance
- Defense in depth
- Protection against unauthorized access

### Migration Strategy

**Backward Compatibility:**
- Keep `finalPdfUrl`/`generatedPdfUrl` fields
- Update storage adapter, not API contracts
- Gradual migration (support both local and S3)

**Zero Downtime:**
- Run both storage systems in parallel
- Migrate files gradually
- Update URLs in database as files migrate

## Code References

### Storage Service
- **File:** `backend/src/modules/consent/services/pdf-processing.service.ts`
- **Methods:**
  - `savePDF()` - Save PDF to storage (line 366)
  - `loadPDF()` - Load PDF from storage (line 382)
  - `getFileUrl()` - Get internal file URL (line 415)
  - `getDownloadUrl()` - Get secure API download URL (line 437)
  - `calculateHash()` - Compute SHA-256 hash (line 392)
  - `verifyHash()` - Verify PDF integrity (line 396)

### Download Endpoint
- **File:** `backend/src/modules/consent/controllers/pdf-consent.controller.ts`
- **Method:** `download()` (line 195)
- **Security:** RBAC, RLS, path validation, access logging

### Service Layer
- **File:** `backend/src/modules/consent/services/pdf-consent.service.ts`
- **Hash Storage:** Line 374 - `finalPdfHash: finalHash`
- **Download URL:** Added to all consent responses

## Testing

### Unit Tests
- Hash calculation and verification
- Path validation in download endpoint
- Storage adapter interface

### Integration Tests
- Download endpoint with RBAC/RLS
- Hash storage and retrieval
- File streaming

### Security Tests
- Path traversal attempts
- Unauthorized access attempts
- Hash tampering detection

## Configuration

### Environment Variables

```bash
# Storage location (local filesystem)
UPLOADS_DIR=./uploads/consents

# Base URL for file references (internal use)
FILE_BASE_URL=/uploads/consents

# Future: S3 configuration
# AWS_S3_BUCKET=consent-pdfs
# AWS_S3_REGION=us-east-1
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
```

## Known Limitations

1. **Local Filesystem Only:** Not suitable for production scale
2. **No CDN:** Files served directly from application server
3. **No Automatic Backup:** Files must be backed up manually
4. **Single Server:** No redundancy if server fails

## Recommendations

### Immediate (Production Readiness)
1. ✅ Hash storage implemented
2. ✅ Secure download endpoint implemented
3. ⏳ Add file backup strategy
4. ⏳ Add monitoring for disk space

### Short Term (3-6 months)
1. Implement S3/MinIO storage adapter
2. Migrate existing files to S3
3. Update storage service to use adapter

### Long Term (6-12 months)
1. Implement signed URLs
2. Add encryption at rest
3. Integrate with CDN for performance

## Conclusion

The PDF consent storage system is now:
- ✅ Secure (RBAC/RLS enforced)
- ✅ Auditable (all access logged)
- ✅ Verifiable (hash stored for integrity)
- ✅ Backward compatible (existing URLs preserved)
- ⚠️ **Not production-ready** (local filesystem only)

**Next Steps:**
1. Test download endpoint thoroughly
2. Plan S3 migration
3. Implement storage adapter pattern
4. Migrate to cloud storage









