# Design: Consolidar identidad y asistencia del personal

## Contexto
Tres modelos de empleado en paralelo (ver proposal.md). Este design define cómo confluir en uno sin romper prod.

## Decisiones arquitectónicas

### D1: Fuente de verdad = `tenants/{tenant}/employees/{uid}`
- Auth (PIN hash), attendance, schedule, goals ya viven acá para el sistema.
- `branches/{branch}/employees/{pushId}` queda como **vista branch** (perfil RR.HH + link `userId`), necesaria para reglas `_role_cache` y features de sucursal.
- El `userId` del branch es el vínculo canónico → tenant.

### D2: Autenticación única = `verifyPin` (hash)
- El portal empleados migra de `getEmployeeByPin` (PIN plano, branch) a `verifyPin` (email+PIN, tenant).
- Problema: el portal hoy pide SOLO PIN, no email. Solución: el login del portal pide PIN + email opcional; si el PIN es único en el tenant (validación al crear), se resuelve con **índice de PIN**:
  - `tenants/{tenant}/pin_lookup/{pinKey}` → uid, donde `pinKey = sha256(pin + pepper)` (hash determinístico, NO reversible, permite lookup O(1) sin exponer el PIN).
  - Al crear/actualizar usuario con PIN, se mantiene `pin_lookup`.
  - `verifyPin` gana un path `verifyPinByIndex(pin)` que resuelve uid por `pin_lookup` y luego verifica el hash fuerte PBKDF2 (defensa en profundidad: el lookup SOLO resuelve identidad; la autorización sigue exigiendo el hash).

### D3: Fichado único = employeeService moderno
- `Fichado.jsx` (portal) pasa a importar `clockIn/clockOut` de `lib/employeeService` (con validación de horario/estado/breaks, writes a tenant).
- `lib/empleadoService.js` legacy: se elimina clockIn/clockOut/subscribeAttendance del portal; queda solo `getEmployeeByPin` como compat temporal (delete post-migración) — nunca en el hot path del portal.

### D4: Migración idempotente — script Node (firebase-admin) + modo dev
- No hay service account en el repo (sin functions deploy). La migración corre como **script local Node con `firebase-admin` usando credenciales env** O como **utilidad admin en UI** (superadmin) — decisión: script Node standalone `scripts/migrate-employees.js` que toma `DATABASE_URL` + `SERVICE_ACCOUNT` de env, e imprime dry-run por defecto (flag `--apply` para escribir).
- Idempotencia: cada registro se decide por existencia de `userId`/`firebaseUid`/email mapping. Nunca crea duplicados: si el tenant ya tiene un employee con ese email → linkea a ese uid.

### D5: Paginación de attendance
- `getAttendanceHistory(branchId, employeeId, userId, daysBack)` → query `orderByKey().limitToLast(daysBack)` contra `tenant/employees/{userId}/attendance`, sin leer todo el nodo.
- RTDB: las fichadas por día son keys de fecha (YYYY-MM-DD) → `orderByKey` lexicográfico == cronológico. No requiere `.indexOn` adicional.

### D6: Reglas RTDB — endurecer
- `branches/*/employees` (general) no cambia salvo: NINGUNA escritura a `pin` (solo admin/superadmin puede, y el PIN plano deja de existir post-migración).
- Añadir `tenants/*/employees/*/pin_lookup` no necesario como regla (deriva de employees) — se escribe junto con el usuario por admin/self.
- `branches/*/attendance` queda read-only post-migración (o se elimina).

## Flujo post-migración

```
Portal Empleados:
  login: PIN (+ email si ambiguo)
    → verifyPinByIndex(pin) → uid
    → verifyPinHash(pin, pinHash) → sesión propia
  fichar: employeeService.clockIn(branchId, uid) → tenant attendance

Admin (EmployeesTab):
  lista: subscribeEmployees → branch view, con userId → tenant data
  asistencia: subscribeTodayAttendance (tenant) → mapea userId → pushId
  crear/editar: createEmployee/updateEmployee → sincroniza tenant (pinHash + pin_lookup)

Usuarios (UserManager):
  createUser/updateUser → tenant + pin_lookup + (si hay branch link) branch pin
```

## Estructura de cambios

| Archivo | Cambio |
|---------|--------|
| `src/lib/authService.js` | `verifyPinByIndex`, mantener `pin_lookup` en createUser/updateUser, lookup O(1) en verifyPin |
| `src/lib/employeeService.js` | `getAttendanceHistory` paginado |
| `src/lib/empleadoService.js` | retirar del hot path del portal (dejar compat) |
| `src/empleados/EmpleadoLogin.jsx` | login por PIN → verifyPinByIndex |
| `src/empleados/pages/Fichado.jsx` | usar employeeService moderno |
| `src/admin/tabs/EmployeesTab.jsx` | submit empleado sincroniza pin_lookup |
| `database.rules.json` | endurecer `pin` en branch; attendance branch read-only |
| `scripts/migrate-employees.js` | migración idempotente (dry-run por defecto, --apply) |

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| PIN duplicado entre empleados → índice ambiguo | Al crear/editar, validar unicidad; si hay duplicados pre-existentes, migración genera PIN random + requiere cambio |
| Romper login en prod durante transición | Portal mantiene fallback a `getEmployeeByPin` SOLO si `verifyPinByIndex` falla y el empleado no tiene pinHash (flag por empleado `pinMigrated`) |
| Race migración vs edición activa | Script corre con `--apply` en ventana de mantenimiento; idempotente → re-ejecutable |
| Pérdida de attendance legacy | Migración hace merge por fecha sin pisar (source != dest) |

## Validación
- Tests unitarios: `authService.test.js` (verifyPinByIndex, unicidad PIN), `employeeService.test.js` (paginación)
- Suite completa `vitest run` (766+ tests)
- E2E en prod: login portal con PIN migrado, fichar, ver en admin