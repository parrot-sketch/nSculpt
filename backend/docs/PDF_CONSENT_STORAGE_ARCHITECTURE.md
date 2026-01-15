# PDF Consent Storage Architecture Analysis

## Executive Summary

**Storage Location:** Local filesystem (`./uploads/consents/`)  
**Database Storage:** Only file paths/URLs (not raw PDFs)  
**Hash Storage:** **NOT IMPLEMENTED** (calculated but not persisted)  
**Download Endpoint:** **NOT IMPLEMENTED**  
**Static File Serving:** **NOT IMPLEMENTED**  
**Security:** RBAC/RLS enforced on API, but file URLs are unprotected

---

## 1. Prisma Schema Analysis

### PDFConsent Model
**File:** `backend/prisma/schema/consent.prisma:668-706`

```prisma
model PDFConsent {
  // PDF Documents
  generatedPdfUrl  String?  @db.VarChar(1000) // Working document before signing (editable)
  finalPdfUrl     String?  @db.VarChar(1000) // Immutable signed version (locked)
  
  // Workflow tracking
  lockedAt        DateTime? @db.Timestamptz(6) // When document was locked after signing
  
  // NO hash field exists
}
```

**Key Findings:**
- ✅ `generatedPdfUrl` - Stores path/URL to working PDF (before signing)
- ✅ `finalPdfUrl` - Stores path/URL to locked PDF (after signing)
- ❌ **NO `finalPdfHash` field** - Hash is calculated but NOT stored in database
- ✅ `lockedAt` - Timestamp when document was locked

### PDFConsentSignature Model
**File:** `backend/prisma/schema/consent.prisma:709-731`

```prisma
model PDFConsentSignature {
  signatureUrl String @db.VarChar(1000) // URL to signature image/data
  // ... metadata fields
}
```

**Key Findings:**
- ✅ Signature URLs stored (not raw signature data)
- ✅ Metadata captured: `ipAddress`, `deviceInfo`, `signedAt`

---

## 2. Storage Service Analysis

### PDFProcessingService
**File:** `backend/src/modules/consent/services/pdf-processing.service.ts`

#### Storage Location
**Line 37:**
```typescript
private readonly uploadsDir = process.env.UPLOADS_DIR || './uploads/consents';
```

**Storage:** Local filesystem directory `./uploads/consents/`

#### File Save Method
**Lines 366-374:**
```typescript
async savePDF(pdfBuffer: Buffer, filename: string): Promise<string> {
  await this.ensureUploadsDirectory();
  
  const filePath = path.join(this.uploadsDir, `${filename}.pdf`);
  await fs.writeFile(filePath, pdfBuffer);
  
  this.logger.log(`PDF saved to ${filePath}`);
  return filePath; // Returns LOCAL FILE PATH
}
```

**Key Findings:**
- ✅ Uses Node.js `fs/promises.writeFile()` - direct filesystem write
- ✅ Returns **local file path** (e.g., `./uploads/consents/consent-xxx-generated-1234567890.pdf`)
- ❌ **NO S3/MinIO integration** - Comment says "In production, upload to S3" but not implemented

#### File URL Generation
**Lines 415-421:**
```typescript
getFileUrl(filePath: string): string {
  // In production, upload to S3 and return S3 URL
  // For now, return relative path or full URL based on configuration
  const baseUrl = process.env.FILE_BASE_URL || '/uploads/consents';
  const filename = path.basename(filePath);
  return `${baseUrl}/${filename}`;
}
```

**Key Findings:**
- ✅ Returns **relative URL path** (e.g., `/uploads/consents/filename.pdf`)
- ❌ **NOT a signed URL** - Just a path string
- ❌ **NOT an S3 URL** - Comment indicates future S3 support, but not implemented
- ⚠️ **NO access control** - URL is just a path, not a secured endpoint

#### Hash Calculation
**Lines 392-394:**
```typescript
calculateHash(pdfBuffer: Buffer): string {
  return createHash('sha256').update(pdfBuffer).digest('hex');
}
```

**Key Findings:**
- ✅ SHA-256 hash is calculated
- ❌ **Hash is NOT stored in database** - Only logged (see line 368 in pdf-consent.service.ts)
- ⚠️ **No integrity verification** - Hash exists but cannot be verified later

---

## 3. PDF Generation & Locking Flow

### Generate Consent
**File:** `backend/src/modules/consent/services/pdf-consent.service.ts:82-112`

**Flow:**
1. Load template PDF from `template.fileUrl` (line 88)
2. Merge placeholders (line 90)
3. Save to local filesystem: `savePDF()` → returns local path (line 104)
4. Convert path to URL: `getFileUrl()` → returns `/uploads/consents/filename.pdf` (line 105)
5. Store URL in DB: `generatedPdfUrl` field (line 111)

**Code Reference:**
```typescript
const filePath = await this.pdfProcessing.savePDF(mergedPdfBuffer, filename);
const generatedPdfUrl = this.pdfProcessing.getFileUrl(filePath);
// Stored in: consent.generatedPdfUrl
```

### Final PDF Generation (After Signing)
**File:** `backend/src/modules/consent/services/pdf-consent.service.ts:349-378`

**Flow:**
1. Load generated PDF from `consent.generatedPdfUrl` (line 350)
2. Generate final PDF with signatures: `generateFinalPDF()` (line 358)
   - Flattens form fields (line 213 in pdf-processing.service.ts)
   - Embeds signatures (lines 219-306)
   - Adds footer with timestamp and hash preview (lines 318-338)
   - **Calculates SHA-256 hash** (line 347)
3. Save final PDF: `savePDF()` → returns local path (line 364)
4. Convert to URL: `getFileUrl()` → returns `/uploads/consents/filename.pdf` (line 365)
5. Store URL in DB: `finalPdfUrl` field (line 371)
6. **Hash is logged but NOT stored** (line 368)

**Code Reference:**
```typescript
const { pdfBuffer: finalPdfBuffer, hash: finalHash } = 
  await this.pdfProcessing.generateFinalPDF(generatedPdfBuffer, signatureInfos);

const filePath = await this.pdfProcessing.savePDF(finalPdfBuffer, filename);
const finalPdfUrl = this.pdfProcessing.getFileUrl(filePath);

// Hash is calculated but NOT stored:
this.logger.log(`Final PDF hash: ${finalHash}`); // Only logged!

await this.repository.updateConsentStatus(consent.id, newStatus, {
  finalPdfUrl,  // URL stored
  lockedAt: new Date(),
  // finalPdfHash: finalHash, // NOT STORED
});
```

**Key Findings:**
- ✅ PDF is flattened (form fields locked) - line 213
- ✅ PDF permissions set to read-only - line 341
- ✅ Hash is calculated - line 347
- ❌ **Hash is NOT stored in database** - Only logged
- ✅ `lockedAt` timestamp is stored

---

## 4. File Immutability

### PDF Locking Process
**File:** `backend/src/modules/consent/services/pdf-processing.service.ts:200-357`

**Locking Mechanisms:**
1. **Form Field Flattening** (line 213):
   ```typescript
   form.flatten(); // Makes form fields read-only
   ```

2. **PDF Permissions** (line 341):
   ```typescript
   pdfDoc.setProducer('Surgical EHR Consent System');
   pdfDoc.setCreator('Surgical EHR');
   // Note: pdf-lib doesn't easily set PDF security/permissions
   // For true read-only, would need PDF encryption
   ```

3. **Footer with Hash Preview** (lines 318-338):
   ```typescript
   lastPage.drawText('Digitally signed — do not modify', ...);
   lastPage.drawText(`Hash: ${tempHash.substring(0, 16)}...`, ...);
   ```

**Key Findings:**
- ✅ Form fields are flattened (cannot be edited)
- ⚠️ **PDF encryption/permissions NOT fully implemented** - pdf-lib limitations
- ✅ Visual indicators added (footer text)
- ❌ **No cryptographic signature** - Only visual hash preview in footer

---

## 5. Download & Access Endpoints

### Download Endpoint
**Status:** **NOT IMPLEMENTED**

**File:** `backend/src/modules/consent/controllers/pdf-consent.controller.ts`

**Findings:**
- ❌ No `GET /api/v1/consents/:id/download` endpoint exists
- ❌ No file serving endpoint exists
- ❌ No static file serving configured

### File Access
**Current State:**
- Files are stored at: `./uploads/consents/filename.pdf`
- URLs returned: `/uploads/consents/filename.pdf`
- **No serving mechanism** - Files are not accessible via HTTP

**Security:**
- ✅ API endpoints protected by RBAC/RLS (RolesGuard, RlsGuard, PermissionsGuard)
- ❌ **File URLs are NOT protected** - If files were served, they would be publicly accessible
- ❌ **No signed URLs** - No temporary access tokens
- ❌ **No access logging for file downloads** - Only API access is logged

---

## 6. Archive & Revoke Behavior

### Archive Process
**File:** `backend/src/modules/consent/services/pdf-consent.service.ts:592-637`

**Code Analysis:**
- Archive sets `archivedAt` timestamp
- Archive sets `archivedBy` user ID
- Archive sets `archivedReason`
- **Files are NOT deleted** - Only metadata updated

**Key Findings:**
- ✅ Soft delete (archive flag)
- ✅ Files remain on filesystem
- ✅ `finalPdfUrl` remains unchanged

### Revoke Process
**File:** `backend/src/modules/consent/services/pdf-consent.service.ts:471-557`

**Code Analysis:**
- Revoke sets `revokedAt` timestamp
- Revoke sets `revokedBy` user ID
- Revoke sets `revokedReason`
- **Files are NOT deleted** - Only status changed

**Key Findings:**
- ✅ Status changed to REVOKED
- ✅ Files remain on filesystem
- ✅ `finalPdfUrl` remains unchanged

---

## 7. Security Analysis

### Access Control
**API Level:**
- ✅ RBAC enforced via `RolesGuard`
- ✅ RLS enforced via `RlsGuard`
- ✅ Permissions enforced via `PermissionsGuard`
- ✅ All endpoints require authentication

**File Level:**
- ❌ **NO file-level access control** - Files stored on local filesystem
- ❌ **NO signed URLs** - URLs are plain paths
- ❌ **NO download endpoint** - Files cannot be accessed via API
- ⚠️ **If static serving added, files would be public** - No protection mechanism exists

### Audit Logging
**File:** `backend/src/modules/consent/controllers/pdf-consent.controller.ts:61-63`

**Code:**
```typescript
@Get(':id')
async findOne(@Param('id') id: string, @CurrentUser() user: UserIdentity, @Req() request: any) {
  this.logger.log(`Consent ${id} viewed by user ${user.id} from IP ${request.ip}`);
  // ...
}
```

**Findings:**
- ✅ API access is logged
- ❌ **File download access is NOT logged** - No download endpoint exists
- ✅ `DataAccessLogInterceptor` logs API requests

---

## 8. Risks & Gaps

### Critical Gaps

1. **Hash Not Stored**
   - **Risk:** Cannot verify PDF integrity after generation
   - **Impact:** No tamper detection capability
   - **Location:** Hash calculated but not persisted (line 368 in pdf-consent.service.ts)

2. **No Download Endpoint**
   - **Risk:** Files cannot be accessed via API
   - **Impact:** Frontend cannot display/download PDFs
   - **Location:** No endpoint in `pdf-consent.controller.ts`

3. **No Static File Serving**
   - **Risk:** Files stored but not accessible
   - **Impact:** PDFs cannot be viewed/downloaded
   - **Location:** No ServeStaticModule configured

4. **No File Access Control**
   - **Risk:** If files were served, they would be public
   - **Impact:** Unauthorized access possible
   - **Location:** No signed URL mechanism

5. **Local Filesystem Only**
   - **Risk:** Not scalable, no redundancy
   - **Impact:** Single point of failure
   - **Location:** `pdf-processing.service.ts:37` - hardcoded local path

### Medium Risks

6. **PDF Permissions Not Fully Enforced**
   - **Risk:** PDFs can potentially be modified externally
   - **Impact:** Integrity not cryptographically guaranteed
   - **Location:** pdf-lib limitations (line 341 in pdf-processing.service.ts)

7. **No File Cleanup**
   - **Risk:** Disk space accumulation
   - **Impact:** Storage growth over time
   - **Location:** No cleanup mechanism for archived/revoked consents

---

## 9. Recommendations

### Immediate Actions

1. **Add Hash Storage to Schema**
   ```prisma
   model PDFConsent {
     finalPdfHash String? @db.VarChar(64) // SHA-256 hash
   }
   ```

2. **Implement Download Endpoint**
   ```typescript
   @Get(':id/download')
   async download(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
     // Verify access via RLS
     // Load file from filesystem
     // Return file with proper headers
   }
   ```

3. **Add File Access Control**
   - Implement signed URLs or proxy endpoint
   - Verify RBAC/RLS before serving files
   - Log all file access

### Production Readiness

4. **Implement S3/MinIO Storage**
   - Replace local filesystem with object storage
   - Use signed URLs for secure access
   - Enable versioning for audit trail

5. **Add Hash Verification**
   - Store hash in database
   - Implement verification endpoint
   - Add integrity checks on file access

6. **Implement PDF Encryption**
   - Use PDF encryption libraries
   - Set read-only permissions
   - Add digital signatures (not just visual)

---

## 10. Code References Summary

| Component | File | Lines | Status |
|-----------|------|-------|--------|
| Schema | `prisma/schema/consent.prisma` | 668-706 | ✅ Implemented |
| Storage Service | `services/pdf-processing.service.ts` | 366-374 | ✅ Implemented |
| URL Generation | `services/pdf-processing.service.ts` | 415-421 | ⚠️ Basic (no S3) |
| Hash Calculation | `services/pdf-processing.service.ts` | 392-394 | ✅ Implemented |
| Hash Storage | `services/pdf-consent.service.ts` | 368 | ❌ NOT STORED |
| Download Endpoint | `controllers/pdf-consent.controller.ts` | - | ❌ NOT IMPLEMENTED |
| Static Serving | - | - | ❌ NOT IMPLEMENTED |
| File Access Control | - | - | ❌ NOT IMPLEMENTED |

---

## Conclusion

**Current State:**
- PDFs are stored on local filesystem (`./uploads/consents/`)
- Only file paths/URLs are stored in database (not raw PDFs)
- Hash is calculated but **NOT stored**
- Files are **NOT accessible** via HTTP (no serving mechanism)
- Archive/revoke do **NOT delete files**

**Production Readiness:** ⚠️ **NOT READY**
- Missing: Download endpoint, hash storage, file access control, S3 integration
- Security: API protected, but file access is not secured
- Scalability: Local filesystem not suitable for production









