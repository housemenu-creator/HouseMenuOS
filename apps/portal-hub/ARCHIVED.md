# Portal Empleados — ARCHIVED

**Migrated to**: `/staff/empleados` inside `apps/house-menu`

This standalone app has been replaced by the unified `/staff/empleados` route
in the main house-menu application. All functionality was migrated in
PR 3 of the `feature/auth-permissions` branch.

### What changed
- Old: `branches/{branch}/employees/{pushId}` data model with PIN-only auth
- New: `tenants/{tenant}/employees/{firebaseUid}` with full Firebase Auth + AuthGuard

### Why
- Unify employee data model across the system
- Provide real auth with session management
- Fix broken RTDB security rules
- Eliminate duplicate login flows

### Deploy
- nginx at `/empleados` now redirects (301) to `/staff/empleados`
- The old portal-hub build is no longer included in the Docker image
