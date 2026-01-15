# Frontend Setup Guide

## Quick Start

The Next.js frontend has been fully scaffolded and is ready for development.

### 1. Install Dependencies

```bash
cd client
npm install
```

### 2. Configure Environment

Create `client/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_API_URL_BROWSER=http://localhost:3002/api/v1
NEXT_PUBLIC_APP_NAME=Nairobi Sculpt EHR
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_SESSION_TIMEOUT=3600000
```

### 3. Run Development Server

```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

## Docker Setup

### Development Mode

```bash
# From project root
docker-compose --profile frontend up frontend
```

Or start all services:

```bash
docker-compose --profile frontend up
```

### Production Build

```bash
cd client
docker build -t nairobi-sculpt-frontend -f Dockerfile .
```

## Project Structure

```
client/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Public routes
│   ├── (protected)/        # Authenticated routes
│   └── layout.tsx          # Root layout
├── components/             # Reusable components
├── hooks/                  # Custom React hooks
├── services/               # API clients
├── store/                  # Global state
├── lib/                    # Utilities
└── types/                  # TypeScript types
```

## Key Features Implemented

✅ **Authentication System**
- JWT-based login/logout
- Automatic token refresh
- Session management
- Secure token storage (sessionStorage)

✅ **Permission-Based Access Control**
- Route protection via AuthGuard
- Permission-aware navigation
- Feature-level access checks
- Backend-aligned permission system

✅ **Professional UI**
- Minimal, clinical design
- Nairobi Sculpt branding
- Responsive layout
- Accessible components

✅ **Developer Experience**
- TypeScript strict mode
- ESLint + Prettier
- Hot reload
- Clear error handling

✅ **Docker Integration**
- Development Dockerfile
- Production Dockerfile
- Docker Compose integration
- Multi-stage builds

## Authentication Flow

1. User logs in at `/login`
2. Credentials sent to `/api/v1/auth/login`
3. Backend returns `accessToken`, `refreshToken`, and `user`
4. Tokens stored in `sessionStorage`
5. User data stored in Zustand store
6. Axios interceptor adds token to all requests
7. On 401, automatic token refresh
8. On refresh failure, logout and redirect

## Permission System

Permissions follow format: `domain:resource:action`

Examples:
- `patients:*:read` - Read patients
- `theater:*:book` - Book theater
- `billing:*:approve` - Approve billing

Permissions are checked at:
1. **Route level** - AuthGuard component
2. **Navigation level** - Sidebar filtering
3. **Component level** - usePermissions() hook
4. **API level** - Backend enforcement (source of truth)

## Available Routes

- `/login` - Authentication
- `/dashboard` - Main dashboard
- `/patients` - Patient management
- `/theater` - Theater scheduling
- `/inventory` - Inventory management
- `/billing` - Billing management
- `/consent` - Consent management
- `/settings` - User settings

## Next Steps

1. **Install dependencies**: `cd client && npm install`
2. **Start backend**: Ensure backend is running on port 3001
3. **Start frontend**: `npm run dev`
4. **Test login**: Use valid credentials from backend
5. **Build features**: Implement patient, theater, inventory UIs

## Troubleshooting

### CORS Issues
Ensure backend has `CORS_ORIGIN=http://localhost:3000` in environment

### Token Refresh Failing
Check that `/api/v1/auth/refresh` endpoint is accessible

### Permission Checks Not Working
Verify user object includes `permissions` array from `/api/v1/auth/me`

## Documentation

- `client/README.md` - Detailed frontend documentation
- `client/ARCHITECTURE.md` - Architecture decisions and patterns

## Security Notes

- ✅ Tokens stored in sessionStorage (not localStorage)
- ✅ No PHI in client storage
- ✅ Permission checks at multiple layers
- ✅ Backend is source of truth for permissions
- ✅ Automatic token refresh
- ✅ Secure HTTP headers

## Branding

- **Name**: Nairobi Sculpt
- **Primary Color**: `#17a2b8` (teal)
- **Accent Color**: `#c59f22` (gold)
- **Design**: Minimal, professional, clinical

## Ready for Development

The frontend is fully scaffolded and ready for feature development. All core infrastructure is in place:
- Authentication ✅
- Authorization ✅
- API client ✅
- Layout & Navigation ✅
- Docker setup ✅
- TypeScript ✅
- Styling ✅

Start building features!












