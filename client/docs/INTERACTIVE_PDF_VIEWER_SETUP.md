# Interactive PDF Viewer Setup Guide

## Overview

The Interactive PDF Viewer component has been created for the consent UI. This document outlines what was created and the setup steps required.

## Files Created

### 1. Components

**`components/consents/InteractivePDFViewer.tsx`**
- Main PDF viewer component
- Integrates with existing design system (Card, LoadingSpinner, ErrorState)
- Uses React Query for data fetching
- Respects consent status (disables editing if SIGNED)
- Calls annotation API routes

**`components/consents/AnnotationToolbar.tsx`**
- Separate toolbar component for annotation tools
- Follows existing button styling patterns
- Supports all annotation types (HIGHLIGHT, COMMENT, DRAWING, etc.)

### 2. Types

**`types/consent.ts`** (Enhanced)
- Added `AnnotationType` type
- Added `PDFConsentAnnotation` interface
- Added `CreateAnnotationDto` interface
- Added `UpdateAnnotationDto` interface
- Enhanced `PDFConsentSignature` with position fields

### 3. Services

**`services/consent.service.ts`** (Enhanced)
- Added `getPDFConsentAnnotations()` method
- Added `getPDFConsentAnnotationById()` method
- Added `createPDFConsentAnnotation()` method
- Added `updatePDFConsentAnnotation()` method
- Added `deletePDFConsentAnnotation()` method

### 4. API Routes

**`app/api/v1/pdf-consents/[id]/annotations/route.ts`**
- GET handler for listing annotations
- POST handler for creating annotations
- Zod validation schemas
- Standard response format

**`app/api/v1/pdf-consents/[id]/annotations/[annId]/route.ts`**
- GET handler for single annotation
- PUT handler for updating annotations
- DELETE handler for deleting annotations
- Zod validation schemas
- Standard response format

## Required Dependencies

### Install PDF Viewer Libraries

```bash
cd client
npm install @react-pdf-viewer/core@^3.12.0 @react-pdf-viewer/default-layout@^3.12.0 pdfjs-dist@^3.11.0
```

### PDF.js Worker Setup

You need to configure the PDF.js worker. There are two options:

#### Option 1: Copy Worker to Public Folder (Recommended)

1. Copy `node_modules/pdfjs-dist/build/pdf.worker.min.js` to `public/pdf.worker.min.js`
2. Configure in `next.config.js`:

```javascript
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'pdfjs-dist/build/pdf.worker.min.js': path.resolve(
        __dirname,
        'public/pdf.worker.min.js'
      ),
    };
    return config;
  },
};
```

#### Option 2: Use CDN (Development Only)

For development, you can use a CDN worker URL (not recommended for production).

## Component Integration

### Basic Usage

```typescript
import { InteractivePDFViewer } from '@/components/consents/InteractivePDFViewer';
import { useQuery } from '@tanstack/react-query';
import { consentService } from '@/services/consent.service';

function ConsentPage({ consentId }: { consentId: string }) {
  const { data: consent, isLoading } = useQuery({
    queryKey: ['pdf-consent', consentId],
    queryFn: () => consentService.getPDFConsentById(consentId),
  });

  if (isLoading) return <LoadingSpinner />;
  if (!consent) return <ErrorState />;

  return (
    <InteractivePDFViewer
      consentId={consentId}
      consent={consent}
      onAnnotationChange={(annotations) => {
        console.log('Annotations updated:', annotations);
      }}
    />
  );
}
```

### Integration with Existing ConsentViewer

You can replace the iframe in `ConsentViewer.tsx` with the InteractivePDFViewer:

```typescript
// In ConsentViewer.tsx, replace:
<iframe
  src={pdfUrl}
  className="w-full h-[600px] border border-neutral-200 rounded-lg"
/>

// With:
<InteractivePDFViewer
  consentId={consent.id}
  consent={consent}
/>
```

## Component Features

### Annotation Tools

The toolbar provides 7 annotation tools:
- **HIGHLIGHT** - Text highlighting
- **COMMENT** - Sticky notes/comments
- **TEXT_EDIT** - Text editing (placeholder values)
- **DRAWING** - Freehand drawing
- **ARROW** - Arrow annotations
- **RECTANGLE** - Rectangle shapes
- **CIRCLE** - Circle shapes

### State Management

- **Can Annotate**: DRAFT, READY_FOR_SIGNATURE, PARTIALLY_SIGNED
- **Cannot Annotate**: SIGNED, REVOKED, ARCHIVED
- **Locked**: If `lockedAt` is set, annotations are disabled

### Features

- ✅ Zoom controls (50% - 300%)
- ✅ Page navigation
- ✅ Fullscreen mode
- ✅ Download PDF
- ✅ Real-time annotation sync
- ✅ Error handling
- ✅ Loading states
- ✅ Respects consent status

## Current Limitations

### PDF Viewer Library Not Installed

The component currently uses an iframe placeholder. To enable full PDF viewing:

1. Install dependencies (see above)
2. Uncomment the @react-pdf-viewer code in `InteractivePDFViewer.tsx`
3. Configure PDF.js worker (see above)
4. Remove the iframe placeholder

### Annotation Creation Not Fully Integrated

The `handleAnnotationCreate` function is a placeholder. You need to:

1. Integrate with @react-pdf-viewer's click events
2. Convert PDF coordinates to annotation format
3. Handle different annotation types (highlight, comment, drawing, etc.)

### Middleware Not Integrated

The API routes include commented middleware examples. To enable:

1. Create middleware functions:
   - `lib/middleware/withAuth.ts`
   - `lib/middleware/withRBAC.ts`
   - `lib/middleware/withRLS.ts`
   - `lib/middleware/withErrorHandler.ts`
2. Uncomment middleware examples in route files

## Next Steps

1. **Install Dependencies**: Run `npm install` for PDF viewer packages
2. **Configure Worker**: Set up PDF.js worker (see above)
3. **Implement Backend Endpoints**: Create NestJS controllers for annotation endpoints
4. **Integrate PDF Viewer**: Replace iframe with @react-pdf-viewer
5. **Connect Annotation Tools**: Wire up toolbar tools to PDF viewer events
6. **Add Middleware**: Create and integrate middleware functions
7. **Testing**: Test annotation creation, update, delete workflows

## API Endpoints Required

The component expects these backend endpoints:

- `GET /api/v1/pdf-consents/:id/annotations`
- `POST /api/v1/pdf-consents/:id/annotations`
- `GET /api/v1/pdf-consents/:id/annotations/:annId`
- `PUT /api/v1/pdf-consents/:id/annotations/:annId`
- `DELETE /api/v1/pdf-consents/:id/annotations/:annId`

These should be implemented in the NestJS backend using the state machine service for validation.

## Design System Integration

The component uses:
- ✅ `Card` component (from `@/components/layout/Card`)
- ✅ `LoadingSpinner` (from `@/components/feedback/LoadingSpinner`)
- ✅ `ErrorState` (from `@/components/admin/ErrorState`)
- ✅ `useAuth()` hook (from `@/hooks/useAuth`)
- ✅ React Query (`useQuery`, `useMutation`)
- ✅ Tailwind classes (neutral-*, bg-white, border, etc.)
- ✅ Lucide React icons

## Notes

- The component follows existing patterns from `ConsentViewer.tsx`
- Error handling uses `alert()` (matching existing pattern)
- Button styling follows existing patterns (see `SignaturePanel.tsx`, `ConsentActions.tsx`)
- State management respects consent status and locking
- TypeScript types are fully typed








