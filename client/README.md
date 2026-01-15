# Nairobi Sculpt EHR - Frontend

Production-grade Next.js frontend for the HIPAA-compliant Surgical EHR & Inventory System.

## Architecture

This frontend is built with:

- **Next.js 14** (App Router) - React framework with server components
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **Axios** - HTTP client with interceptors
- **Zod** - Schema validation

## Project Structure

```
client/
├── app/                     # Next.js App Router
│   ├── (auth)/              # Public authentication routes
│   │   └── login/
│   ├── (protected)/         # Authenticated routes
│   │   ├── layout.tsx       # Protected layout with sidebar
│   │   ├── dashboard/
│   │   ├── patients/
│   │   ├── theater/
│   │   ├── inventory/
│   │   ├── billing/
│   │   ├── consent/
│   │   └── settings/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page (redirects)
│   └── providers.tsx        # Global providers
│
├── components/              # Reusable UI components
│   ├── layout/              # Layout components (Header, Sidebar, AuthGuard)
│   ├── forms/               # Form components
│   ├── tables/              # Table components
│   └── feedback/            # Loading, error states
│
├── features/                 # Feature-based domain logic (future)
│
├── hooks/                   # Custom React hooks
│   ├── useAuth.ts           # Authentication hook
│   ├── usePermissions.ts    # Permission checking
│   ├── useSession.ts        # Session management
│   └── useFeatureAccess.ts  # Feature-level access control
│
├── services/                 # API clients
│   ├── apiClient.ts         # Axios instance with interceptors
│   └── auth.service.ts      # Authentication service
│
├── store/                    # Global state
│   └── auth.store.ts        # Auth state (Zustand)
│
├── lib/                      # Utilities
│   ├── permissions.ts       # Permission utilities
│   ├── constants.ts         # App constants
│   ├── env.ts               # Environment config
│   └── utils.ts             # General utilities
│
└── types/                    # TypeScript types
    ├── auth.ts              # Authentication types
    └── api.ts               # API types
```

## Key Features

### Authentication & Authorization

- **JWT-based authentication** with refresh tokens
- **Session management** with automatic timeout
- **Permission-based access control** at route and component level
- **Role-based navigation** (navigation items filtered by permissions)
- **Automatic token refresh** via axios interceptors

### Security

- **No PHI in localStorage** - All sensitive data in sessionStorage
- **Token-based API authentication** with automatic injection
- **Route protection** via middleware and AuthGuard component
- **Permission checks** before rendering protected content
- **HIPAA-compliant** security headers

### Developer Experience

- **Type-safe** - Full TypeScript coverage
- **Strict linting** - ESLint with TypeScript rules
- **Code formatting** - Prettier with Tailwind plugin
- **Hot reload** - Fast development iteration
- **Clear error handling** - User-friendly error messages

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Docker (for containerized development)

### Local Development

1. **Install dependencies:**
   ```bash
   cd client
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
   NEXT_PUBLIC_APP_NAME=Nairobi Sculpt EHR
   NEXT_PUBLIC_APP_ENV=development
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   Navigate to `http://localhost:3000`

### Docker Development

The frontend is integrated into the main Docker Compose setup:

```bash
# Start all services including frontend
docker-compose --profile frontend up

# Or start just frontend (requires backend to be running)
docker-compose --profile frontend up frontend
```

The frontend will be available at `http://localhost:3000`.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Type check without emitting
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (server-side) | `http://localhost:3001/api/v1` |
| `NEXT_PUBLIC_API_URL_BROWSER` | Backend API URL (browser-side) | - |
| `NEXT_PUBLIC_APP_NAME` | Application name | `Nairobi Sculpt EHR` |
| `NEXT_PUBLIC_APP_ENV` | Environment (development/production) | `development` |
| `NEXT_PUBLIC_SESSION_TIMEOUT` | Session timeout in milliseconds | `3600000` (1 hour) |

## Authentication Flow

1. User enters credentials on `/login`
2. Frontend calls `POST /api/v1/auth/login`
3. Backend returns `accessToken`, `refreshToken`, and `user` object
4. Tokens stored in `sessionStorage` (not localStorage for security)
5. User data stored in Zustand store
6. Axios interceptor adds `Authorization: Bearer <token>` to all requests
7. On 401, interceptor attempts token refresh
8. On refresh failure, user is logged out and redirected to login

## Permission System

Permissions are checked at multiple levels:

1. **Route Level** - `AuthGuard` component checks permissions before rendering
2. **Navigation Level** - Sidebar filters nav items based on user permissions
3. **Component Level** - Components use `usePermissions()` or `useFeatureAccess()` hooks
4. **API Level** - Backend enforces permissions (frontend never bypasses)

### Permission Format

Permissions follow the pattern: `domain:resource:action`

Examples:
- `patients:*:read` - Read any patient resource
- `theater:*:book` - Book theater slots
- `billing:*:approve` - Approve billing items

## Branding

- **Name**: Nairobi Sculpt
- **Primary Color**: `#17a2b8` (teal)
- **Accent Color**: `#c59f22` (gold)
- **Design**: Minimal, professional, clinical aesthetic

## Production Deployment

### Build

```bash
npm run build
```

### Docker Production

The production Dockerfile uses multi-stage builds:

```bash
docker build -t nairobi-sculpt-frontend -f Dockerfile .
```

Or use docker-compose with production profile:

```bash
FRONTEND_DOCKERFILE=Dockerfile docker-compose --profile frontend up
```

## Testing

Testing setup to be implemented. Recommended:

- **Unit Tests**: Jest + React Testing Library
- **E2E Tests**: Playwright or Cypress
- **Component Tests**: Storybook (optional)

## Troubleshooting

### CORS Issues

Ensure backend CORS is configured to allow frontend origin:
```env
CORS_ORIGIN=http://localhost:3000
```

### Token Refresh Failing

Check that:
1. Backend `/api/v1/auth/refresh` endpoint is accessible
2. Refresh token is valid and not expired
3. Session storage is not being cleared unexpectedly

### Permission Checks Not Working

Verify:
1. User object includes `permissions` array from `/api/v1/auth/me`
2. Permission strings match backend format exactly
3. `usePermissions()` hook is being used correctly

## Contributing

1. Follow TypeScript strict mode
2. Use ESLint and Prettier
3. Write type-safe code
4. Test permission checks thoroughly
5. Never store PHI in localStorage
6. Always respect backend authority

## License

Proprietary - Nairobi Sculpt EHR System












