/**
 * Permission utility functions for role and permission checking
 */

export type Permission = string;
export type Role = string;

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  // Fast path: exact match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Support wildcard and 2/3-part permission formats, mirroring backend logic
  const matchesPermission = (userPermission: Permission, required: Permission): boolean => {
    if (userPermission === required) return true;

    const parse = (
      perm: Permission
    ): { domain: string; resource: string | null; action: string } | null => {
      const parts = perm.split(':');
      if (parts.length === 2) {
        // domain:action (legacy / resource-agnostic)
        return { domain: parts[0], resource: null, action: parts[1] };
      }
      if (parts.length === 3) {
        // domain:resource:action
        return { domain: parts[0], resource: parts[1], action: parts[2] };
      }
      return null;
    };

    const userParts = parse(userPermission);
    const reqParts = parse(required);
    if (!userParts || !reqParts) return false;

    if (userParts.domain !== reqParts.domain) return false;

    // Resource matching:
    // - 2-part user permission (resource=null) matches any resource
    // - '*' in either resource matches any
    // - otherwise resources must be equal
    const resourceMatch =
      userParts.resource === null ||
      userParts.resource === '*' ||
      reqParts.resource === '*' ||
      reqParts.resource === null ||
      userParts.resource === reqParts.resource;

    // Action matching with wildcard support
    const actionMatch =
      userParts.action === '*' || reqParts.action === '*' || userParts.action === reqParts.action;

    return resourceMatch && actionMatch;
  };

  return userPermissions.some((userPerm) => matchesPermission(userPerm, requiredPermission));
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some((permission) =>
    hasPermission(userPermissions, permission)
  );
}

/**
 * Check if user has all of the required permissions
 */
export function hasAllPermissions(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every((permission) =>
    hasPermission(userPermissions, permission)
  );
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRoles: Role[], requiredRole: Role): boolean {
  return userRoles.includes(requiredRole);
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(userRoles: Role[], requiredRoles: Role[]): boolean {
  return requiredRoles.some((role) => userRoles.includes(role));
}

/**
 * Build permission string from domain, resource, and action
 */
export function buildPermission(
  domain: string,
  resource: string,
  action: string
): Permission {
  return `${domain}:${resource}:${action}`;
}

/**
 * Parse permission string into components
 */
export function parsePermission(permission: Permission): {
  domain: string;
  resource: string;
  action: string;
} {
  const parts = permission.split(':');
  if (parts.length !== 3) {
    throw new Error(`Invalid permission format: ${permission}`);
  }
  return {
    domain: parts[0],
    resource: parts[1],
    action: parts[2],
  };
}












