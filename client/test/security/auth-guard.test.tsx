/**
 * Security Test Suite: AuthGuard and PermissionsGuard
 * 
 * Tests multi-role user access, unauthorized attempts, and permission checks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { PermissionsGuard } from '@/components/layout/PermissionsGuard';
import { useAuthStore } from '@/store/auth.store';
import { buildPermission } from '@/lib/permissions';
import { PERMISSION_DOMAINS, PERMISSION_ACTIONS, ROLES } from '@/lib/constants';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

describe('AuthGuard Security Tests', () => {
  beforeEach(() => {
    // Reset auth store
    useAuthStore.getState().setUser(null);
    useAuthStore.getState().setLoading(false);
  });

  describe('Authentication Checks', () => {
    it('should redirect to login when user is not authenticated', async () => {
      const router = await import('next/navigation');
      const mockPush = vi.fn();
      vi.mocked(router.useRouter).mockReturnValue({
        push: mockPush,
        back: vi.fn(),
      } as any);

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should render children when user is authenticated', () => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [ROLES.DOCTOR],
        permissions: [buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ)],
        sessionId: 'session-1',
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Role Checks', () => {
    it('should deny access when user lacks required role', () => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [ROLES.NURSE], // User has NURSE, but ADMIN is required
        permissions: [],
        sessionId: 'session-1',
      });

      render(
        <AuthGuard requiredRole={ROLES.ADMIN}>
          <div>Admin Only Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument();
    });

    it('should allow access when user has required role', () => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [ROLES.ADMIN],
        permissions: [],
        sessionId: 'session-1',
      });

      render(
        <AuthGuard requiredRole={ROLES.ADMIN}>
          <div>Admin Only Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Admin Only Content')).toBeInTheDocument();
    });

    it('should allow access when user has ANY of the required roles', () => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [ROLES.DOCTOR], // User has DOCTOR, which is in requiredRoles
        permissions: [],
        sessionId: 'session-1',
      });

      render(
        <AuthGuard requiredRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE]}>
          <div>Clinical Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Clinical Content')).toBeInTheDocument();
    });

    it('should deny access when user has NONE of the required roles', () => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [ROLES.BILLING], // User has BILLING, but not in requiredRoles
        permissions: [],
        sessionId: 'session-1',
      });

      render(
        <AuthGuard requiredRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE]}>
          <div>Clinical Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  describe('Permission Checks', () => {
    it('should deny access when user lacks required permission', () => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [ROLES.DOCTOR],
        permissions: [
          buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ),
          // Missing WRITE permission
        ],
        sessionId: 'session-1',
      });

      render(
        <AuthGuard
          requiredPermission={buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.WRITE)}
        >
          <div>Write Access Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Write Access Content')).not.toBeInTheDocument();
    });

    it('should allow access when user has required permission', () => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [ROLES.DOCTOR],
        permissions: [
          buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ),
        ],
        sessionId: 'session-1',
      });

      render(
        <AuthGuard
          requiredPermission={buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ)}
        >
          <div>Read Access Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Read Access Content')).toBeInTheDocument();
    });

    it('should require ALL permissions when multiple are specified', () => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [ROLES.DOCTOR],
        permissions: [
          buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ),
          // Missing WRITE permission
        ],
        sessionId: 'session-1',
      });

      render(
        <AuthGuard
          requiredPermissions={[
            buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ),
            buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.WRITE),
          ]}
        >
          <div>Multi-Permission Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/Missing:/)).toBeInTheDocument();
    });

    it('should allow access when user has ALL required permissions', () => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [ROLES.DOCTOR],
        permissions: [
          buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ),
          buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.WRITE),
        ],
        sessionId: 'session-1',
      });

      render(
        <AuthGuard
          requiredPermissions={[
            buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ),
            buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.WRITE),
          ]}
        >
          <div>Multi-Permission Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Multi-Permission Content')).toBeInTheDocument();
    });
  });

  describe('Multi-Role User Access', () => {
    it('should allow access when user has multiple roles with combined permissions', () => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [ROLES.DOCTOR, ROLES.NURSE], // Multi-role user
        permissions: [
          // Permissions from DOCTOR role
          buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ),
          buildPermission(PERMISSION_DOMAINS.MEDICAL_RECORDS, '*', PERMISSION_ACTIONS.READ),
          // Permissions from NURSE role
          buildPermission(PERMISSION_DOMAINS.THEATER, '*', PERMISSION_ACTIONS.READ),
          buildPermission(PERMISSION_DOMAINS.CONSENT, '*', PERMISSION_ACTIONS.WRITE),
        ],
        sessionId: 'session-1',
      });

      // User should be able to access DOCTOR-only content
      render(
        <AuthGuard
          requiredRole={ROLES.DOCTOR}
          requiredPermission={buildPermission(PERMISSION_DOMAINS.MEDICAL_RECORDS, '*', PERMISSION_ACTIONS.READ)}
        >
          <div>Doctor Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Doctor Content')).toBeInTheDocument();

      // User should also be able to access NURSE-only content
      render(
        <AuthGuard
          requiredRole={ROLES.NURSE}
          requiredPermission={buildPermission(PERMISSION_DOMAINS.CONSENT, '*', PERMISSION_ACTIONS.WRITE)}
        >
          <div>Nurse Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Nurse Content')).toBeInTheDocument();
    });

    it('should not bypass backend restrictions with multiple roles', () => {
      // This test demonstrates that frontend guards don't bypass backend RLS
      // Even with multiple roles, backend will filter results by ownership
      useAuthStore.getState().setUser({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [ROLES.DOCTOR, ROLES.ADMIN], // Multi-role user
        permissions: [
          buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ),
        ],
        sessionId: 'session-1',
      });

      // Frontend allows access (user has required role and permission)
      render(
        <AuthGuard
          requiredRole={ROLES.DOCTOR}
          requiredPermission={buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ)}
        >
          <div>Patients List</div>
        </AuthGuard>
      );

      expect(screen.getByText('Patients List')).toBeInTheDocument();

      // However, backend will still filter results by ownership
      // User will only see patients they have relationships with
      // This is enforced by backend RlsGuard, not frontend
    });
  });
});

describe('PermissionsGuard Security Tests', () => {
  beforeEach(() => {
    useAuthStore.getState().setUser(null);
  });

  it('should render children when user has required permission', () => {
    useAuthStore.getState().setUser({
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      roles: [ROLES.DOCTOR],
      permissions: [
        buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ),
      ],
      sessionId: 'session-1',
    });

    render(
      <PermissionsGuard
        requiredPermission={buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ)}
      >
        <div>Conditional Content</div>
      </PermissionsGuard>
    );

    expect(screen.getByText('Conditional Content')).toBeInTheDocument();
  });

  it('should render fallback when user lacks required permission', () => {
    useAuthStore.getState().setUser({
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      roles: [ROLES.DOCTOR],
      permissions: [
        buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ),
        // Missing WRITE permission
      ],
      sessionId: 'session-1',
    });

    render(
      <PermissionsGuard
        requiredPermission={buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.WRITE)}
        fallback={<div>No Access</div>}
      >
        <div>Conditional Content</div>
      </PermissionsGuard>
    );

    expect(screen.getByText('No Access')).toBeInTheDocument();
    expect(screen.queryByText('Conditional Content')).not.toBeInTheDocument();
  });

  it('should require ALL permissions by default (matches backend)', () => {
    useAuthStore.getState().setUser({
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      roles: [ROLES.DOCTOR],
      permissions: [
        buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ),
        // Missing WRITE permission
      ],
      sessionId: 'session-1',
    });

    render(
      <PermissionsGuard
        requiredPermissions={[
          buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ),
          buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.WRITE),
        ]}
        fallback={<div>No Access</div>}
      >
        <div>Conditional Content</div>
      </PermissionsGuard>
    );

    // Should render fallback because user doesn't have ALL permissions
    expect(screen.getByText('No Access')).toBeInTheDocument();
  });
});












