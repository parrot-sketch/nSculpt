# Consent Workflow Fix - Implementation Plan

## Problem Summary

The current workflow forces admins through an unnecessary "template builder" step even when they just want to upload a PDF for direct signing. The system has two consent models but the UI doesn't clearly distinguish between them.

## Solution: Simplified PDF-Only Workflow

### New Flow:
1. **Admin uploads PDF** → Creates `PDFConsent` template directly (one step)
2. **Skip template builder** → Not needed for PDF-based consents
3. **Patient opens PDF** → Interactive PDF viewer
4. **Patient signs** → Direct annotation/signature on PDF
5. **Done** → Signed PDF locked and stored

## Implementation Steps

### Step 1: Fix Upload Page
**File**: `client/app/(protected)/admin/system-config/consent-templates/upload/page.tsx`

**Changes**:
- Remove redirect to template builder
- Create PDF template directly after upload
- Use endpoint: `POST /api/v1/consents/templates` (with file upload)
- Show success → Redirect to templates list

### Step 2: Update Frontend Service
**File**: `client/services/consent.service.ts`

**Changes**:
- Add `createPDFTemplate(file: File, data: { name, description })` method
- Uses `POST /api/v1/consents/templates` with FormData
- Returns created template

### Step 3: Fix Signing Page
**File**: `client/app/(protected)/consent/[id]/sign/page.tsx`

**Changes**:
- Use `PDFConsent` model (not `PatientConsentInstance`)
- Integrate `InteractivePDFViewer` component
- Use PDF annotation/signature APIs

### Step 4: Update Template List
**File**: `client/app/(protected)/admin/system-config/consent-templates/page.tsx`

**Changes**:
- Show both PDF templates and structured templates
- Add filter: "PDF Templates" vs "Structured Templates"
- For PDF templates, show "View PDF" action
- For structured templates, show "Edit Template" action

## Technical Details

### Backend Endpoint (Already Exists)
```
POST /api/v1/consents/templates
Content-Type: multipart/form-data

Body:
- file: PDF file
- name: string
- description?: string
- placeholders?: string[]
```

**Response**: Created `ConsentTemplate` with `fileUrl` set

### Frontend Service Method
```typescript
async createPDFTemplate(
  file: File,
  data: { name: string; description?: string }
): Promise<ConsentTemplate> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', data.name);
  if (data.description) {
    formData.append('description', data.description);
  }

  const response = await apiClient.post<ConsentTemplate>(
    '/consents/templates',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}
```

### Workflow Comparison

**Old (Confusing)**:
```
Upload PDF → Get filePath/fileHash → Template Builder → Create Structured Template → Patient Signs (Structured)
```

**New (Simple)**:
```
Upload PDF + Metadata → Create PDF Template → Patient Signs (PDF)
```

## Benefits

1. **Simpler**: One step instead of three
2. **Clearer**: PDF is the template, no confusion
3. **Faster**: No manual template building
4. **Better UX**: Direct workflow matches user intent

## Migration Notes

- Existing structured templates remain functional
- New uploads use PDF workflow
- Can add workflow selector later if needed
- Template builder can be kept for complex structured consents





