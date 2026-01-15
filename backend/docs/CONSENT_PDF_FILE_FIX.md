# Consent PDF File Saving and Loading Fix

## Problem

When admin uploaded a consent template, the PDF file was not being saved properly, resulting in the error:
```
"Template does not have a PDF file"
```

This occurred when trying to generate a consent from the template.

## Root Causes

1. **File Not Required**: The controller had `fileIsRequired: false`, allowing templates to be created without PDF files
2. **Path Mismatch**: The `fileUrl` was saved as a URL path (e.g., `/uploads/consents/filename.pdf`), but `loadPDF()` expected a file system path
3. **No Validation**: No validation to ensure PDF file was actually saved before creating template

## Fixes Applied

### 1. Made File Required
**File**: `backend/src/modules/consent/controllers/pdf-consent-template.controller.ts`

- Changed `fileIsRequired: false` to `fileIsRequired: true`
- Added explicit check: `if (!file) throw new BadRequestException('PDF file is required')`
- Ensures PDF file is always provided during template creation

### 2. Enhanced PDF Loading
**File**: `backend/src/modules/consent/services/pdf-processing.service.ts`

- Updated `loadPDF()` to handle both URL paths and file system paths
- Converts URL paths (e.g., `/uploads/consents/filename.pdf`) to file system paths
- Added path traversal protection
- Validates path is within uploads directory

```typescript
async loadPDF(filePath: string): Promise<Buffer> {
  // Handle URL paths (e.g., /uploads/consents/filename.pdf)
  let actualPath = filePath;
  if (filePath.startsWith('/uploads/')) {
    actualPath = filePath.replace('/uploads/consents/', './uploads/consents/');
  }
  
  // Resolve to absolute path and validate
  const resolvedPath = path.resolve(actualPath);
  const uploadsDir = path.resolve(this.uploadsDir);
  
  if (!resolvedPath.startsWith(uploadsDir)) {
    throw new Error(`Invalid file path: ${filePath}`);
  }
  
  return await fs.readFile(resolvedPath);
}
```

### 3. Fixed Path Conversion in Consent Generation
**File**: `backend/src/modules/consent/services/pdf-consent.service.ts`

- Added path conversion when loading template PDF
- Converts `fileUrl` (URL path) to file system path before loading

```typescript
// Convert URL path to file path
let templatePath = template.fileUrl;
if (templatePath.startsWith('/uploads/')) {
  templatePath = templatePath.replace('/uploads/consents/', './uploads/consents/');
}
const templateBuffer = await this.pdfProcessing.loadPDF(templatePath);
```

### 4. Enhanced Template Service
**File**: `backend/src/modules/consent/services/pdf-consent-template.service.ts`

- Added logging for debugging
- Added validation to ensure `fileUrl` is set before creating template
- Improved filename generation with template name sanitization
- Added Logger for better debugging

```typescript
if (!fileUrl) {
  throw new BadRequestException('PDF file is required. Please upload a PDF file.');
}
```

## File Storage Flow

### Template Upload
1. Admin uploads PDF file
2. File saved to: `./uploads/consents/template-{name}-{timestamp}.pdf`
3. `fileUrl` saved as: `/uploads/consents/template-{name}-{timestamp}.pdf`
4. Template record created with `fileUrl`

### Consent Generation
1. Load template by ID
2. Get `fileUrl` from template (e.g., `/uploads/consents/template-xyz.pdf`)
3. Convert URL path to file system path: `./uploads/consents/template-xyz.pdf`
4. Load PDF file from file system
5. Merge patient data into placeholders
6. Save generated PDF
7. Create consent record

## Verification

After these fixes:
- ✅ PDF file is required during template upload
- ✅ PDF file is saved to disk
- ✅ `fileUrl` is saved in template record
- ✅ PDF file can be loaded from `fileUrl` during consent generation
- ✅ Path conversion handles both URL and file system paths
- ✅ Security: Path traversal protection

## Testing

1. **Upload Template**:
   - Admin uploads PDF
   - Verify template created with `fileUrl`
   - Check file exists on disk

2. **Generate Consent**:
   - Select template
   - Generate consent for patient
   - Verify PDF is loaded and merged correctly

3. **Test Signing**:
   - Open consent in interactive viewer
   - Verify PDF displays correctly
   - Test signing workflow

## Next Steps

- [ ] Add file existence check before generating consent
- [ ] Add file size validation
- [ ] Add file type validation (already done in controller)
- [ ] Consider S3/MinIO integration for production
- [ ] Add file cleanup for old templates





