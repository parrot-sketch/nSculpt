'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  PDFConsentAnnotation,
  CreateAnnotationDto,
  UpdateAnnotationDto,
} from '@/types/consent';
import { consentService } from '@/services/consent.service';

// ============================================================================
// Types
// ============================================================================

interface PendingOperation {
  tempId: string;
  type: 'add' | 'update' | 'delete';
  annotation?: PDFConsentAnnotation;
  data?: CreateAnnotationDto | UpdateAnnotationDto;
  timestamp: number;
}

interface AnnotationState {
  annotations: PDFConsentAnnotation[];
  pendingOperations: PendingOperation[];
  syncStatus: 'synced' | 'syncing' | 'error';
  error: Error | null;
}

interface AnnotationContextValue {
  annotations: PDFConsentAnnotation[];
  pendingOperations: PendingOperation[];
  syncStatus: 'synced' | 'syncing' | 'error';
  error: Error | null;
  isLoading: boolean;
  
  // Actions (match existing naming convention)
  addAnnotation: (annotation: CreateAnnotationDto) => Promise<void>;
  updateAnnotation: (id: string, data: UpdateAnnotationDto) => Promise<void>;
  deleteAnnotation: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
  clearError: () => void;
}

// ============================================================================
// Reducer Actions
// ============================================================================

type AnnotationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ANNOTATIONS'; payload: PDFConsentAnnotation[] }
  | { type: 'ADD_OPTIMISTIC'; payload: { tempId: string; annotation: PDFConsentAnnotation; data: CreateAnnotationDto } }
  | { type: 'UPDATE_OPTIMISTIC'; payload: { id: string; data: UpdateAnnotationDto } }
  | { type: 'DELETE_OPTIMISTIC'; payload: { id: string } }
  | { type: 'COMMIT_SUCCESS'; payload: { tempId: string; annotation: PDFConsentAnnotation } }
  | { type: 'COMMIT_UPDATE_SUCCESS'; payload: { id: string; annotation: PDFConsentAnnotation } }
  | { type: 'COMMIT_DELETE_SUCCESS'; payload: { id: string } }
  | { type: 'ROLLBACK'; payload: { tempId?: string; id?: string } }
  | { type: 'SET_SYNC_STATUS'; payload: 'synced' | 'syncing' | 'error' }
  | { type: 'SET_ERROR'; payload: Error | null };

// ============================================================================
// Reducer Implementation
// ============================================================================

function annotationReducer(state: AnnotationState, action: AnnotationAction): AnnotationState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        syncStatus: action.payload ? 'syncing' : state.syncStatus,
      };

    case 'SET_ANNOTATIONS':
      return {
        ...state,
        annotations: action.payload,
        syncStatus: 'synced',
        error: null,
      };

    case 'ADD_OPTIMISTIC':
      return {
        ...state,
        annotations: [...state.annotations, action.payload.annotation],
        pendingOperations: [
          ...state.pendingOperations,
          {
            tempId: action.payload.tempId,
            type: 'add',
            annotation: action.payload.annotation,
            data: action.payload.data,
            timestamp: Date.now(),
          },
        ],
        syncStatus: 'syncing',
      };

    case 'UPDATE_OPTIMISTIC':
      return {
        ...state,
        annotations: state.annotations.map((ann) =>
          ann.id === action.payload.id
            ? { ...ann, ...action.payload.data, updatedAt: new Date().toISOString() }
            : ann
        ),
        pendingOperations: [
          ...state.pendingOperations.filter((op) => op.annotation?.id !== action.payload.id),
          {
            tempId: action.payload.id,
            type: 'update',
            data: action.payload.data,
            timestamp: Date.now(),
          },
        ],
        syncStatus: 'syncing',
      };

    case 'DELETE_OPTIMISTIC':
      return {
        ...state,
        annotations: state.annotations.filter((ann) => ann.id !== action.payload.id),
        pendingOperations: [
          ...state.pendingOperations.filter((op) => op.annotation?.id !== action.payload.id),
          {
            tempId: action.payload.id,
            type: 'delete',
            timestamp: Date.now(),
          },
        ],
        syncStatus: 'syncing',
      };

    case 'COMMIT_SUCCESS':
      return {
        ...state,
        annotations: state.annotations.map((ann) =>
          ann.id === action.payload.tempId
            ? action.payload.annotation
            : ann
        ),
        pendingOperations: state.pendingOperations.filter(
          (op) => op.tempId !== action.payload.tempId
        ),
        syncStatus: state.pendingOperations.length > 1 ? 'syncing' : 'synced',
        error: null,
      };

    case 'COMMIT_UPDATE_SUCCESS':
      return {
        ...state,
        annotations: state.annotations.map((ann) =>
          ann.id === action.payload.id
            ? action.payload.annotation
            : ann
        ),
        pendingOperations: state.pendingOperations.filter(
          (op) => op.annotation?.id !== action.payload.id
        ),
        syncStatus: state.pendingOperations.length > 1 ? 'syncing' : 'synced',
        error: null,
      };

    case 'COMMIT_DELETE_SUCCESS':
      return {
        ...state,
        pendingOperations: state.pendingOperations.filter(
          (op) => op.tempId !== action.payload.id && op.annotation?.id !== action.payload.id
        ),
        syncStatus: state.pendingOperations.length > 1 ? 'syncing' : 'synced',
        error: null,
      };

    case 'ROLLBACK':
      if (action.payload.tempId) {
        // Rollback add operation
        return {
          ...state,
          annotations: state.annotations.filter((ann) => ann.id !== action.payload.tempId),
          pendingOperations: state.pendingOperations.filter(
            (op) => op.tempId !== action.payload.tempId
          ),
          syncStatus: state.pendingOperations.length > 1 ? 'syncing' : 'synced',
        };
      } else if (action.payload.id) {
        // Rollback update/delete operation - need to refetch
        return {
          ...state,
          pendingOperations: state.pendingOperations.filter(
            (op) => op.tempId !== action.payload.id && op.annotation?.id !== action.payload.id
          ),
          syncStatus: 'error',
        };
      }
      return state;

    case 'SET_SYNC_STATUS':
      return {
        ...state,
        syncStatus: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        syncStatus: action.payload ? 'error' : state.syncStatus,
      };

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

const AnnotationContext = createContext<AnnotationContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface AnnotationProviderProps {
  consentId: string;
  children: ReactNode;
}

export function AnnotationProvider({ consentId, children }: AnnotationProviderProps) {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(annotationReducer, {
    annotations: [],
    pendingOperations: [],
    syncStatus: 'synced',
    error: null,
  });

  // Fetch annotations using React Query
  const {
    data: annotations = [],
    isLoading,
    error: queryError,
    refetch: refetchQuery,
  } = useQuery<PDFConsentAnnotation[]>({
    queryKey: ['pdf-consent-annotations', consentId],
    queryFn: () => consentService.getPDFConsentAnnotations(consentId),
    enabled: !!consentId,
    refetchOnWindowFocus: false,
  });

  // Sync annotations from query to reducer state
  useEffect(() => {
    if (annotations) {
      dispatch({ type: 'SET_ANNOTATIONS', payload: annotations });
    }
  }, [annotations]);

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      dispatch({
        type: 'SET_ERROR',
        payload: queryError instanceof Error ? queryError : new Error('Failed to load annotations'),
      });
    }
  }, [queryError]);

  // Add annotation with optimistic update
  const addAnnotation = useCallback(
    async (data: CreateAnnotationDto) => {
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      
      // Create optimistic annotation
      const optimisticAnnotation: PDFConsentAnnotation = {
        id: tempId,
        consentId,
        annotationType: data.annotationType,
        pageNumber: data.pageNumber,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        coordinates: data.coordinates,
        content: data.content,
        color: data.color || '#FFEB3B',
        createdById: '', // Will be set by server
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isImmutable: false,
      };

      // Optimistic update
      dispatch({
        type: 'ADD_OPTIMISTIC',
        payload: { tempId, annotation: optimisticAnnotation, data },
      });

      try {
        // Commit to server
        const annotation = await consentService.createPDFConsentAnnotation(consentId, data);
        
        // Replace optimistic annotation with server response
        dispatch({
          type: 'COMMIT_SUCCESS',
          payload: { tempId, annotation },
        });

        // Invalidate query to refetch
        queryClient.invalidateQueries({
          queryKey: ['pdf-consent-annotations', consentId],
        });
      } catch (error) {
        // Rollback on error
        dispatch({
          type: 'ROLLBACK',
          payload: { tempId },
        });
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error : new Error('Failed to create annotation'),
        });
        throw error;
      }
    },
    [consentId, queryClient]
  );

  // Update annotation with optimistic update
  const updateAnnotation = useCallback(
    async (id: string, data: UpdateAnnotationDto) => {
      // Optimistic update
      dispatch({
        type: 'UPDATE_OPTIMISTIC',
        payload: { id, data },
      });

      try {
        // Commit to server
        const annotation = await consentService.updatePDFConsentAnnotation(consentId, id, data);
        
        // Replace optimistic update with server response
        dispatch({
          type: 'COMMIT_UPDATE_SUCCESS',
          payload: { id, annotation },
        });

        // Invalidate query to refetch
        queryClient.invalidateQueries({
          queryKey: ['pdf-consent-annotations', consentId],
        });
      } catch (error) {
        // Rollback on error (refetch to get correct state)
        dispatch({
          type: 'ROLLBACK',
          payload: { id },
        });
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error : new Error('Failed to update annotation'),
        });
        // Refetch to restore correct state
        await refetchQuery();
        throw error;
      }
    },
    [consentId, queryClient, refetchQuery]
  );

  // Delete annotation with optimistic update
  const deleteAnnotation = useCallback(
    async (id: string) => {
      // Store annotation for potential rollback
      const annotation = state.annotations.find((ann) => ann.id === id);
      
      // Optimistic update
      dispatch({
        type: 'DELETE_OPTIMISTIC',
        payload: { id },
      });

      try {
        // Commit to server
        await consentService.deletePDFConsentAnnotation(consentId, id);
        
        // Confirm deletion
        dispatch({
          type: 'COMMIT_DELETE_SUCCESS',
          payload: { id },
        });

        // Invalidate query to refetch
        queryClient.invalidateQueries({
          queryKey: ['pdf-consent-annotations', consentId],
        });
      } catch (error) {
        // Rollback on error (refetch to get correct state)
        dispatch({
          type: 'ROLLBACK',
          payload: { id },
        });
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error : new Error('Failed to delete annotation'),
        });
        // Refetch to restore correct state
        await refetchQuery();
        throw error;
      }
    },
    [consentId, queryClient, refetchQuery, state.annotations]
  );

  // Refetch annotations
  const refetch = useCallback(async () => {
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
    try {
      await refetchQuery();
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'synced' });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error : new Error('Failed to refetch annotations'),
      });
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
    }
  }, [refetchQuery]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const value: AnnotationContextValue = {
    annotations: state.annotations,
    pendingOperations: state.pendingOperations,
    syncStatus: state.syncStatus,
    error: state.error,
    isLoading,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    refetch,
    clearError,
  };

  return (
    <AnnotationContext.Provider value={value}>
      {children}
    </AnnotationContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useAnnotationContext(): AnnotationContextValue {
  const context = useContext(AnnotationContext);
  if (context === undefined) {
    throw new Error('useAnnotationContext must be used within an AnnotationProvider');
  }
  return context;
}








