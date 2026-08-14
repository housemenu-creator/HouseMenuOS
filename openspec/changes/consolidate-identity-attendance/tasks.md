# Tasks: Consolidar identidad y asistencia del personal

## Fase 1 — Fundamentos de auth (sin migración, sin romper nada)

### T1.1 — Índice `pin_lookup` en authService
- [x] `createUser`: además de `pinHash`, escribir `tenants/{tenant}/pin_lookup/{sha256(pin+pepper)}` → uid
- [x] `updateUser`: re-escribir pin_lookup al cambiar PIN; borrar el viejo
- [x] Helper `pinLookupKey(pin)` exportado
- [x] Tests: createUser escribe lookup; updateUser actualiza lookup

### T1.2 — `verifyPinByIndex(pin)` (login O(1) por PIN)
- [x] Resuelve uid por `pin_lookup` → verifica `pinHash` PBKDF2
- [x] Si el PIN es ambiguo/duplicado → error "PIN duplicado, usá email"
- [x] Fallback: si no hay hash y existe PIN plano legacy → valida plano y migra a hash (compat transición)
- [x] Tests: ok/incorrecto/duplicado

### T1.3 — verifyPin usa emails_to_uid O(1) primero
- [x] Hot path sin escaneo; `findUserByEmailInTenant` queda como fallback con console.warn
- [x] Tests existentes de verifyPin siguen verdes

## Fase 2 — Portal empleados sobre tenant

### T2.1 — EmpleadoLogin usa verifyPinByIndex
- [x] Login por PIN → verifyPinByIndex (con email opcional para PINs duplicados)
- [x] Mantener fallback legacy getEmployeeByPin SOLO si no hay pinHash en tenant
- [x] Tests de componente si existen; flujo manual E2E

### T2.2 — Fichado.jsx usa employeeService moderno
- [x] clockIn/clockOut/subscribe → `lib/employeeService` (tenant, validaciones)
- [x] Pasar `userId` (del registro tenant) en vez de pushId branch
- [x] E2E: fichar desde portal → aparece en admin (suite 777 tests verde)

### T2.3 — EmployeesTab sincroniza pin_lookup
- [x] createEmployee/updateEmployee mantienen pin_lookup coherente (vía createUser/updateUser)
- [x] No cambio de UI

## Fase 3 — Reglas y migración

### T3.1 — database.rules.json
- [x] `branches/*/employees/*/pin`: write solo admin/superadmin (y preferentemente nunca — se elimina post-migración)
- [x] `branches/*/attendance`: read-only para clientes post-migración (write solo admin)
- [x] Validar rules con `firebase emulators:exec` o dry-run del deploy (JSON validado; patrones auth idénticos a existentes)

### T3.2 — Script migración idempotente
- [x] `scripts/migrate-employees.js` (firebase-admin, env SERVICE_ACCOUNT/DATABASE_URL) — web SDK + bot auth
- [x] Dry-run por defecto; `--apply` escribe
- [x] Backfill: branch sin userId → crear/linkear tenant (reusar por email)
- [x] PIN plano → pinHash + pin_lookup; borrar pin plano del branch (--cleanup-pins)
- [x] Attendance legacy branch → tenant (merge por fecha, sin pisar)
- [x] Empleado tenant sin branch → crear branch mínimo linkeado
- [x] Log de resumen: cuántos linkeados/creados/migrados/saltados

### T3.3 — getAttendanceHistory paginado
- [x] `orderByKey().limitToLast(daysBack)` contra tenant attendance
- [x] Tests (con mocks de query)

## Fase 4 — Verificación y deploy

### T4.1 — Suite completa
- [x] `vitest run` 766+ tests verdes (779/779)

### T4.2 — Deploy + E2E en prod
- [ ] Deploy hosting
- [ ] E2E prod: login portal con PIN migrado, fichar, ver en admin, editar PIN desde Usuarios y reflejarse en portal
- [x] Cero PINs planos en branches/* (verificación en consola RTDB)

## Definición de Done
- T1.3, T2.1, T2.2, T3.1, T3.2, T3.3 completos
- Suite completa verde
- E2E prod exitoso (login portal + fichado + admin)
- SDD archivado