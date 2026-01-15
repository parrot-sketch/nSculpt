import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

export interface UserIdentity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  departmentId?: string;
  employeeId?: string;
}

/**
 * Request-scoped service for accessing current user identity
 * Injected per-request, provides type-safe access to authenticated user
 */
@Injectable({ scope: Scope.REQUEST })
export class IdentityContextService {
  private identity: UserIdentity | null = null;

  constructor(@Inject(REQUEST) private readonly request: Request) {}

  /**
   * Set user identity for current request
   * Called by JWT strategy after token validation
   */
  setIdentity(identity: UserIdentity): void {
    this.identity = identity;
    // Also set on request for backward compatibility (if request is available)
    if (this.request) {
      (this.request as any).user = identity;
    }
  }

  /**
   * Get current user identity
   */
  getIdentity(): UserIdentity {
    if (!this.identity) {
      throw new Error('User identity not set. Ensure JwtAuthGuard is applied.');
    }
    return this.identity;
  }

  /**
   * Get current user ID
   */
  getUserId(): string {
    return this.getIdentity().id;
  }

  /**
   * Get current user email
   */
  getEmail(): string {
    return this.getIdentity().email;
  }

  /**
   * Get current user roles
   */
  getRoles(): string[] {
    return this.getIdentity().roles;
  }

  /**
   * Get current user permissions
   */
  getPermissions(): string[] {
    return this.getIdentity().permissions;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.getIdentity().sessionId;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  /**
   * Check if user has all specified roles
   */
  hasAllRoles(roles: string[]): boolean {
    return roles.every(role => this.hasRole(role));
  }

  /**
   * Check if a permission matches another permission, supporting wildcards
   * Format: domain:resource:action (e.g., "admin:system:read", "admin:*:read")
   * Also supports legacy 2-part format: domain:action (e.g., "consent:read")
   * Wildcards (*) can be in resource or action position
   */
  private matchesPermission(userPermission: string, requiredPermission: string): boolean {
    // Exact match
    if (userPermission === requiredPermission) {
      return true;
    }

    // Parse permissions into parts: domain:resource:action or domain:action
    const parsePermission = (perm: string): { domain: string; resource: string | null; action: string } | null => {
      const parts = perm.split(':');
      if (parts.length === 2) {
        // Legacy 2-part format: domain:action (e.g., "consent:read")
        return {
          domain: parts[0],
          resource: null, // No resource specified
          action: parts[1],
        };
      } else if (parts.length === 3) {
        // Standard 3-part format: domain:resource:action
        return {
          domain: parts[0],
          resource: parts[1],
          action: parts[2],
        };
      }
      return null; // Invalid format
    };

    const userParts = parsePermission(userPermission);
    const requiredParts = parsePermission(requiredPermission);

    if (!userParts || !requiredParts) {
      return false; // Invalid format, no match
    }

    // Domain must match
    if (userParts.domain !== requiredParts.domain) {
      return false;
    }

    // Handle resource matching:
    // - If user has 2-part format (resource=null), it matches any resource (like *)
    // - If user has 3-part with *, it matches any resource
    // - If both have resources, they must match
    const resourceMatch =
      userParts.resource === null || // 2-part format matches any resource
      userParts.resource === '*' ||
      requiredParts.resource === '*' ||
      requiredParts.resource === null || // Required is 2-part, matches any user resource
      userParts.resource === requiredParts.resource;

    // Action must match (or be wildcard)
    const actionMatch =
      userParts.action === '*' ||
      requiredParts.action === '*' ||
      userParts.action === requiredParts.action;

    return resourceMatch && actionMatch;
  }

  /**
   * Check if user has specific permission (supports wildcard matching)
   */
  hasPermission(permission: string): boolean {
    const userPermissions = this.getPermissions();
    
    // Check for exact match first (fast path)
    if (userPermissions.includes(permission)) {
      return true;
    }

    // Check for wildcard matches
    return userPermissions.some(userPerm => this.matchesPermission(userPerm, permission));
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Check if user has all specified permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Check if identity is set
   */
  isAuthenticated(): boolean {
    return this.identity !== null;
  }
}




