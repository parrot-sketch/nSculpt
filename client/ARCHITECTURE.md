# Frontend Architecture Documentation

## Design Principles

### 1. Security First
- **No PHI in localStorage** - All sensitive data uses sessionStorage
- **Token-based authentication** - JWT with automatic refresh
- **Permission-driven UI** - Frontend never assumes permissions
- **Fail-safe defaults** - Deny access by default

### 2. Maintainability
- **Feature-based structure** - Clear separation of concerns
- **Type safety** - Full TypeScript coverage
- **Explicit patterns** - No magic, clear data flow
- **Documentation** - Self-documenting code structure

### 3. Scalability
- **Server Components** - Use where appropriate for performance
- **Client Components** - Only when necessary (interactivity)
- **Code splitting** - Automatic via Next.js App Router
- **Lazy loading** - Feature modules loaded on demand

### 4. User Experience
- **Minimal UI** - Professional, clinical aesthetic
- **Clear feedback** - Loading states, error messages
- **Accessible** - WCAG compliance
- **Responsive** - Works on all devices

## Architecture Layers

### 1. Presentation Layer (`app/`, `components/`)

**App Router Structure:**
- `(auth)/` - Public routes (login, forgot password)
- `(protected)/` - Authenticated routes with layout
- Route groups organize without affecting URL structure

**Components:**
- `layout/` - Header, Sidebar, AuthGuard
- `forms/` - Reusable form components
- `tables/` - Data table components
- `feedback/` - Loading, error, empty states

### 2. Business Logic Layer (`features/`, `hooks/`)

**Features:**
- Domain-specific UI logic
- Feature modules (patients, theater, inventory, etc.)
- Each feature is self-contained

**Hooks:**
- `useAuth()` - Authentication state and actions
- `usePermissions()` - Permission checking
- `useSession()` - Session timeout management
- `useFeatureAccess()` - Feature-level access control

### 3. Data Layer (`services/`, `store/`)

**Services:**
- `apiClient.ts` - Axios instance with interceptors
- `auth.service.ts` - Authentication API calls
- Feature services (patient.service.ts, etc.)

**Store:**
- `auth.store.ts` - Global auth state (Zustand)
- Minimal global state (prefer server state)

### 4. Infrastructure Layer (`lib/`, `types/`)

**Utilities:**
- `permissions.ts` - Permission checking functions
- `constants.ts` - App-wide constants
- `env.ts` - Environment configuration
- `utils.ts` - General utilities

**Types:**
- TypeScript interfaces and types
- Shared across layers

## Data Flow

### Authentication Flow

```
User Login
  ↓
LoginForm submits credentials
  ↓
useAuth().login() called
  ↓
authService.login() makes API call
  ↓
Backend returns tokens + user
  ↓
Tokens stored in sessionStorage
  ↓
User stored in Zustand store
  ↓
Redirect to /dashboard
```

### API Request Flow

```
Component calls service method
  ↓
Service uses apiClient
  ↓
Request interceptor adds Authorization header
  ↓
Request sent to backend
  ↓
Response interceptor handles:
  - Success: Return data
  - 401: Attempt token refresh
  - Refresh success: Retry original request
  - Refresh failure: Logout and redirect
```

### Permission Check Flow

```
Component renders
  ↓
usePermissions() or useFeatureAccess() hook
  ↓
Checks user.permissions array
  ↓
Returns boolean or filtered data
  ↓
Component conditionally renders
```

## Security Considerations

### Token Storage
- **sessionStorage** (not localStorage)
- Cleared on browser close
- Reduces risk of XSS attacks

### Token Refresh
- Automatic via axios interceptor
- Transparent to components
- Handles race conditions

### Permission Enforcement
- **Frontend**: UI/UX only (never trusted)
- **Backend**: Source of truth
- Frontend checks prevent flashing unauthorized content
- Backend always validates permissions

### Route Protection
- **Middleware**: First line of defense (edge)
- **AuthGuard**: Component-level protection
- **Permission checks**: Feature-level access

## State Management

### Server State
- **TanStack Query** for API data
- Automatic caching and refetching
- Optimistic updates support

### Client State
- **Zustand** for auth state (minimal)
- **React state** for component-local state
- Prefer server state when possible

### Session State
- Tokens in sessionStorage
- User object in Zustand
- Synced on mount

## Styling Approach

### Tailwind CSS
- Utility-first CSS
- Custom theme with brand colors
- Consistent spacing system
- Responsive by default

### Component Classes
- Reusable utility classes (`.btn-primary`, `.card`)
- Component-specific styles in components
- Global styles in `globals.css`

## Performance Optimizations

### Next.js Optimizations
- **Server Components** - Reduce client bundle
- **Code splitting** - Automatic route-based splitting
- **Image optimization** - Next.js Image component
- **Font optimization** - Next.js font loading

### React Optimizations
- **Memoization** - useMemo, useCallback where needed
- **Lazy loading** - Dynamic imports for heavy components
- **Virtualization** - For large lists (future)

## Error Handling

### API Errors
- Axios interceptor catches all API errors
- Standardized error format
- User-friendly error messages
- Automatic retry for transient errors

### Component Errors
- Error boundaries (to be implemented)
- Graceful degradation
- Clear error messages

## Testing Strategy (Future)

### Unit Tests
- Utilities and hooks
- Permission functions
- Service methods

### Integration Tests
- Authentication flow
- API client interceptors
- Permission checks

### E2E Tests
- Critical user flows
- Authentication
- Permission-based access

## Future Enhancements

1. **Error Boundaries** - React error boundaries
2. **Offline Support** - Service worker for offline access
3. **Real-time Updates** - WebSocket integration
4. **Advanced Caching** - TanStack Query optimizations
5. **Accessibility** - Full WCAG 2.1 AA compliance
6. **Internationalization** - Multi-language support

## Integration with Backend

### API Contract
- RESTful API at `/api/v1`
- JWT authentication
- Standardized error responses
- Pagination support

### Authentication
- JWT access tokens (short-lived)
- Refresh tokens (long-lived)
- Server-side session tracking
- Token revocation support

### Authorization
- Role-based access control (RBAC)
- Permission-based access control (PBAC)
- Backend enforces all permissions
- Frontend respects backend authority

## Deployment

### Development
- Hot reload enabled
- Source maps for debugging
- Verbose error messages

### Production
- Optimized builds
- Minified code
- Security headers
- Error tracking (to be added)

## Monitoring (Future)

- Error tracking (Sentry)
- Performance monitoring
- User analytics (privacy-compliant)
- API monitoring












