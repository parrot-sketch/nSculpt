# Annotation Context Usage Guide

## Overview

The `AnnotationContext` provides centralized state management for PDF consent annotations using React Context and useReducer pattern. It includes optimistic updates, error handling, and sync status tracking.

## Setup

### 1. Wrap Components with AnnotationProvider

```typescript
import { AnnotationProvider } from '@/contexts/AnnotationContext';

function ConsentPage({ consentId }: { consentId: string }) {
  return (
    <AnnotationProvider consentId={consentId}>
      <InteractivePDFViewer consentId={consentId} />
    </AnnotationProvider>
  );
}
```

### 2. Use the Hook in Components

```typescript
import { useAnnotationContext } from '@/contexts/AnnotationContext';

function InteractivePDFViewer({ consentId }: { consentId: string }) {
  const {
    annotations,
    pendingOperations,
    syncStatus,
    error,
    isLoading,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    refetch,
    clearError,
  } = useAnnotationContext();

  // Use annotations state...
}
```

## API Reference

### Context Value

```typescript
interface AnnotationContextValue {
  // State
  annotations: PDFConsentAnnotation[];
  pendingOperations: PendingOperation[];
  syncStatus: 'synced' | 'syncing' | 'error';
  error: Error | null;
  isLoading: boolean;

  // Actions
  addAnnotation: (annotation: CreateAnnotationDto) => Promise<void>;
  updateAnnotation: (id: string, data: UpdateAnnotationDto) => Promise<void>;
  deleteAnnotation: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
  clearError: () => void;
}
```

### Methods

#### `addAnnotation(annotation: CreateAnnotationDto): Promise<void>`

Creates a new annotation with optimistic update.

```typescript
try {
  await addAnnotation({
    annotationType: 'HIGHLIGHT',
    pageNumber: 1,
    x: 100,
    y: 200,
    width: 200,
    height: 30,
    color: '#FFEB3B',
  });
  // Annotation added successfully
} catch (error) {
  // Handle error (optimistic update will be rolled back automatically)
  console.error('Failed to add annotation:', error);
}
```

#### `updateAnnotation(id: string, data: UpdateAnnotationDto): Promise<void>`

Updates an existing annotation with optimistic update.

```typescript
try {
  await updateAnnotation(annotationId, {
    content: 'Updated comment text',
    color: '#FF5722',
  });
  // Annotation updated successfully
} catch (error) {
  // Handle error (optimistic update will be rolled back automatically)
  console.error('Failed to update annotation:', error);
}
```

#### `deleteAnnotation(id: string): Promise<void>`

Deletes an annotation with optimistic update.

```typescript
try {
  await deleteAnnotation(annotationId);
  // Annotation deleted successfully
} catch (error) {
  // Handle error (optimistic update will be rolled back automatically)
  console.error('Failed to delete annotation:', error);
}
```

#### `refetch(): Promise<void>`

Manually refetch annotations from server.

```typescript
await refetch();
```

#### `clearError(): void`

Clear the current error state.

```typescript
clearError();
```

## Features

### Optimistic Updates

All mutations (add, update, delete) use optimistic updates:

1. **Immediate UI Update**: Changes are reflected immediately in the UI
2. **Server Sync**: Changes are sent to the server in the background
3. **Rollback on Error**: If the server request fails, changes are automatically rolled back

### Sync Status

The `syncStatus` field indicates the current state:

- `'synced'`: All operations are synced with the server
- `'syncing'`: There are pending operations being synced
- `'error'`: An error occurred during sync

### Pending Operations

The `pendingOperations` array tracks operations that are being synced:

```typescript
interface PendingOperation {
  tempId: string;
  type: 'add' | 'update' | 'delete';
  annotation?: PDFConsentAnnotation;
  data?: CreateAnnotationDto | UpdateAnnotationDto;
  timestamp: number;
}
```

You can use this to show loading indicators for specific operations:

```typescript
const isPending = pendingOperations.some(op => op.annotation?.id === annotationId);
```

## Integration with InteractivePDFViewer

### Basic Integration

```typescript
import { AnnotationProvider, useAnnotationContext } from '@/contexts/AnnotationContext';

function ConsentViewer({ consentId }: { consentId: string }) {
  return (
    <AnnotationProvider consentId={consentId}>
      <InteractivePDFViewerContent consentId={consentId} />
    </AnnotationProvider>
  );
}

function InteractivePDFViewerContent({ consentId }: { consentId: string }) {
  const {
    annotations,
    syncStatus,
    error,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
  } = useAnnotationContext();

  const handleAnnotationCreate = async (data: CreateAnnotationDto) => {
    try {
      await addAnnotation(data);
    } catch (error) {
      alert('Failed to create annotation');
    }
  };

  // Use annotations, syncStatus, error, etc.
  return (
    <div>
      {syncStatus === 'syncing' && <span>Syncing...</span>}
      {error && <div>Error: {error.message}</div>}
      {/* Your PDF viewer UI */}
    </div>
  );
}
```

### Advanced: Show Pending Operations

```typescript
function AnnotationList() {
  const { annotations, pendingOperations } = useAnnotationContext();

  return (
    <div>
      {annotations.map((annotation) => {
        const isPending = pendingOperations.some(
          op => op.annotation?.id === annotation.id || op.tempId === annotation.id
        );

        return (
          <div key={annotation.id} className={isPending ? 'opacity-50' : ''}>
            {annotation.content}
            {isPending && <span>Syncing...</span>}
          </div>
        );
      })}
    </div>
  );
}
```

## Error Handling

Errors are automatically handled by the context:

1. **Optimistic Rollback**: Failed operations are automatically rolled back
2. **Error State**: Errors are stored in the `error` field
3. **Error Display**: Show errors to users and allow them to retry

```typescript
function AnnotationEditor() {
  const { error, clearError, refetch } = useAnnotationContext();

  if (error) {
    return (
      <div className="error-banner">
        <p>Error: {error.message}</p>
        <button onClick={clearError}>Dismiss</button>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  return <div>Editor content...</div>;
}
```

## Best Practices

1. **Single Provider per Consent**: Use one `AnnotationProvider` per consent ID
2. **Error Handling**: Always wrap mutations in try-catch blocks
3. **Loading States**: Use `isLoading` and `syncStatus` to show loading indicators
4. **Pending Operations**: Check `pendingOperations` to show per-operation loading states
5. **Error Recovery**: Provide retry mechanisms using `refetch()`

## React Query Integration

The context uses React Query internally for server state management. It automatically:

- Caches annotations
- Refetches on focus (disabled by default)
- Invalidates cache on mutations
- Provides loading and error states

The context layer adds:
- Optimistic updates
- Pending operations tracking
- Sync status
- Rollback on errors

## TypeScript Support

All types are fully typed:

```typescript
import type {
  PDFConsentAnnotation,
  CreateAnnotationDto,
  UpdateAnnotationDto,
} from '@/types/consent';
```

The context value is typed, so you get full IntelliSense support in your IDE.








