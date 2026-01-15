# State Management Strategy

## Overview

This application uses a **hybrid state management approach** optimized for enterprise-grade applications, combining TanStack Query for server state and Zustand for client state.

## Architecture

### Server State: TanStack Query (React Query) v5

**Why TanStack Query?**

TanStack Query is the industry standard for managing server state in React applications. It's used by companies like Microsoft, Google, and thousands of enterprise applications.

**Key Benefits:**

1. **Automatic Caching & Synchronization**
   - Intelligent caching with configurable stale times
   - Automatic background refetching
   - Cache invalidation strategies
   - Request deduplication

2. **Network Resilience**
   - Automatic retry with exponential backoff
   - Network status awareness
   - Offline support
   - Request cancellation

3. **Developer Experience**
   - DevTools for debugging
   - TypeScript-first design
   - Excellent error handling
   - Optimistic updates support

4. **Performance**
   - Request deduplication (multiple components requesting same data = 1 request)
   - Background refetching (stale-while-revalidate pattern)
   - Selective cache updates
   - Minimal re-renders

5. **Enterprise Features**
   - Infinite queries for pagination
   - Parallel queries
   - Dependent queries
   - Query prefetching
   - Mutation cache updates

### Client State: Zustand

**Why Zustand?**

For client-only state (UI state, form state, preferences), we use Zustand for its simplicity and performance.

**Use Cases:**
- Authentication state (tokens, user info)
- UI state (modals, sidebar open/close)
- Form state (multi-step forms)
- Theme preferences
- Local filters/selections

**Benefits:**
- Lightweight (~1KB)
- No boilerplate
- TypeScript support
- Simple API
- Great performance

## Configuration

### TanStack Query Configuration

Located in `app/providers.tsx`:

```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutes
      gcTime: 10 * 60 * 1000,          // 10 minutes (cache time)
      retry: (failureCount, error) => {
        // Smart retry: don't retry 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: development,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
})
```

### Key Configuration Decisions

1. **Stale Time (5 minutes)**
   - Balance between data freshness and performance
   - Reduces unnecessary network requests
   - Appropriate for most admin operations

2. **GC Time (10 minutes)**
   - Keeps unused data in cache for quick access
   - Prevents refetching when navigating back
   - Cleans up old data automatically

3. **Smart Retry Strategy**
   - No retry on 4xx errors (client errors like validation failures)
   - Exponential backoff for network/server errors
   - Prevents unnecessary load on failing endpoints

4. **Refetch Strategy**
   - Refetch on window focus (development only)
   - Refetch on reconnect (important for mobile/offline)
   - Refetch on mount if stale

## Usage Patterns

### Server State (TanStack Query)

#### Basic Query

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['admin', 'departments', queryParams],
  queryFn: () => adminService.listDepartments(queryParams),
});
```

#### Mutation with Cache Invalidation

```typescript
const mutation = useMutation({
  mutationFn: (data: CreateDepartmentRequest) => 
    adminService.createDepartment(data),
  onSuccess: () => {
    // Invalidate and refetch
    queryClient.invalidateQueries({ 
      queryKey: ['admin', 'departments'] 
    });
  },
});
```

#### Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: updateDepartment,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ 
      queryKey: ['admin', 'departments'] 
    });
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['admin', 'departments']);
    
    // Optimistically update
    queryClient.setQueryData(['admin', 'departments'], (old) => ({
      ...old,
      data: old.data.map(dept => 
        dept.id === newData.id ? { ...dept, ...newData } : dept
      ),
    }));
    
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(
      ['admin', 'departments'], 
      context.previous
    );
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ 
      queryKey: ['admin', 'departments'] 
    });
  },
});
```

### Client State (Zustand)

```typescript
// store/auth.store.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

// Usage
const { user, setUser } = useAuthStore();
```

## Best Practices

### Query Keys

Use hierarchical, descriptive query keys:

```typescript
// Good
['admin', 'departments', { page: 1, search: 'cardio' }]
['admin', 'users', userId]
['admin', 'dashboard', 'stats']

// Bad
['departments']  // Too vague
['data']         // Not descriptive
```

### Cache Invalidation

1. **Granular Invalidation**
   ```typescript
   // Invalidate all department queries
   queryClient.invalidateQueries({ 
     queryKey: ['admin', 'departments'] 
   });
   
   // Invalidate specific department
   queryClient.invalidateQueries({ 
     queryKey: ['admin', 'departments', departmentId] 
   });
   ```

2. **Optimistic Updates**
   - Use for better UX
   - Always rollback on error
   - Refetch to ensure consistency

### Error Handling

```typescript
const { data, error, isError } = useQuery({
  queryKey: ['admin', 'departments'],
  queryFn: () => adminService.listDepartments(),
  // Query-level error handling
  onError: (error) => {
    // Log to error tracking service
    console.error('Failed to load departments:', error);
  },
});

// Component-level error handling
if (isError) {
  return <ErrorState onRetry={() => refetch()} />;
}
```

### Loading States

```typescript
const { data, isLoading, isFetching } = useQuery({
  queryKey: ['admin', 'departments'],
  queryFn: () => adminService.listDepartments(),
});

// isLoading: Initial load (no data yet)
// isFetching: Any fetch in progress (including background refetch)
if (isLoading) {
  return <LoadingSpinner />;
}
```

## Performance Considerations

### Request Deduplication

TanStack Query automatically deduplicates requests:
- Multiple components requesting the same query key = 1 network request
- Reduces server load
- Improves performance

### Selective Re-renders

- Components only re-render when their specific query data changes
- Unrelated queries don't trigger re-renders
- Significantly better than global state management

### Prefetching

```typescript
// Prefetch on hover/link
const prefetchDepartment = (id: string) => {
  queryClient.prefetchQuery({
    queryKey: ['admin', 'departments', id],
    queryFn: () => adminService.getDepartmentById(id),
    staleTime: 5 * 60 * 1000,
  });
};
```

## Debugging

### React Query DevTools

DevTools are automatically enabled in development:
- View all queries and their states
- Inspect cache contents
- Manually trigger refetches
- Test error scenarios

Access: Bottom-right corner in development mode

### Query Inspection

```typescript
// In browser console
window.queryClient.getQueryCache().getAll();
window.queryClient.getQueryData(['admin', 'departments']);
```

## Migration Notes

### From Redux/MobX

TanStack Query replaces:
- ❌ Action creators for data fetching
- ❌ Reducers for server state
- ❌ Thunks/sagas for async operations
- ❌ Manual cache management
- ❌ Loading/error state management

TanStack Query does NOT replace:
- ✅ Client state (use Zustand or React state)
- ✅ Global UI state (use Zustand)
- ✅ Complex business logic (keep in services)

### When to Use What

| Use Case | Solution |
|----------|----------|
| Server data (API calls) | TanStack Query |
| Authentication tokens | Zustand |
| UI state (modals, sidebar) | Zustand |
| Form state | React state or Formik/React Hook Form |
| Complex business logic | Service layer |
| Preferences/settings | Zustand + localStorage |

## Enterprise Considerations

### Scalability

- Handles thousands of queries efficiently
- Automatic garbage collection
- Memory-efficient caching
- Request deduplication reduces server load

### Reliability

- Automatic retry on failures
- Network status awareness
- Offline support
- Error recovery strategies

### Maintainability

- Declarative API
- TypeScript-first
- Excellent DevTools
- Well-documented patterns

### Performance

- Minimal re-renders
- Background refetching
- Request deduplication
- Selective cache updates

## Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [TanStack Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/important-defaults)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)









