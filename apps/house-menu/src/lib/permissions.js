import { PERMISSIONS as REGISTRY_PERMISSIONS, ROLE_REGISTRY, hasPermission as checkPermission } from './roleRegistry';

export const PERMISSIONS = REGISTRY_PERMISSIONS;

export function getDefaultRoles() {
  return Object.fromEntries(
    Object.entries(ROLE_REGISTRY).map(([key, r]) => [
      key,
      { name: r.name, key: r.key, permissions: r.permissions },
    ])
  );
}

export function hasPermission(userPermissions, permission) {
  return checkPermission(userPermissions, permission);
}
