# Spec: Consolidar identidad y asistencia del personal

## Requisitos funcionales

### RF-1: Un empleado = un registro (tenant)
- Todo empleado del branch DEBE tener `userId` linkeado al registro tenant.
- La migración DEBE backfillear `userId` para empleados branch sin link, creando el registro tenant si no existe, reutilizando `firebaseUid` o `userId` si ya existen.
- El registro tenant DEBE preservar: name, email, role, branches, homeBranch, status, statusEnd, pinHash.
- La migración DEBE ser idempotente (re-ejecutable sin duplicar registros ni romper datos).

### RF-2: PIN unificado con hash
- El Portal Empleados DEBE autenticar con `verifyPin` (PBKDF2 hash en tenant).
- `getEmployeeByPin` (PIN plano) DEBE dejar de usarse para autenticar.
- La migración DEBE convertir PINs planos de `branches/*/employees` a `pinHash` en tenant y BORRAR el campo `pin` plano del branch.
- `updateUser` y `updateEmployee` DEBEN sincronizar el PIN en ambas vistas durante el periodo de transición (o solo tenant tras migración).

### RF-3: Fichado unificado
- `Fichado.jsx` del portal DEBE usar `employeeService.clockIn/clockOut` (moderno, tenant) — con validación de horario, estado y break.
- La migración DEBE copiar `branches/*/attendance/*` legacy → `tenants/*/employees/*/attendance/*`.
- Tras la migración, el portal y el admin DEBEN leer/escribir la MISMA ruta.

### RF-4: Visualización admin coherente
- `EmployeesTab` y `UserManager` DEBEN mostrar la misma lista de personas (employees del tenant linkeados con branch).
- Un empleado sin email/rol-login NO DEBE quedar ciego: debe existir en tenant (para attendance) aunque no tenga acceso al sistema.

### RF-5: Escalabilidad de lookup
- El login NO DEBE escanear todos los empleados (O(n)); DEBE usar `global/emails_to_uid` (email → uid, O(1)) y/o un índice de PIN hasheado.
- `getAttendanceHistory` DEBE paginar (limit + cursor) en vez de leer todo el historial.

## Escenarios

### E1: Empleado con userId ya linkeado (caso feliz)
1. Empleado branch `emp-abc` con `userId: user-xyz` existe en tenant.
2. Migración detecta link → no duplica, solo normaliza/backfill faltantes.
3. Portal login: PIN verificado contra tenant (hash) → OK.
4. Fichado escribe en tenant → aparece en admin en tiempo real.

### E2: Empleado branch sin userId (el caso roto de hoy)
1. Empleado branch `emp-456` (PIN plano `1234`, sin userId, rol mozo con email).
2. Migración crea registro tenant `user-456` con `pinHash(1234)`, copia branches.
3. Empleado branch recibe `userId: user-456`.
4. Login con PIN `1234` funciona (hash). Fichado va a tenant.

### E3: Usuario tenant sin registro branch (creado desde "Usuarios")
1. Usuario `user-789` existe en tenant (admin lo creó), no existe en branch.
2. Migración crea registro branch mínimo con `userId: user-789`, copia branches del tenant.
3. Aparece en Personal y puede fichar por portal.

### E4: Attendance legacy existente
1. `branches/monteverde/attendance/emp-456/2026-08-10` existe (formato legacy).
2. Migración copia → `tenants/default/employees/user-456/attendance/2026-08-10`.
3. Historial admin muestra la fecha antigua + las nuevas.

### E5: Login sin escaneo
1. `verifyPin(email, pin)` encuentra uid vía `global/emails_to_uid` → O(1).
2. Si no existe mapping, fallback a `findUserByEmailInTenant` SOLO durante migración (log de warning), nunca en el hot path post-migración.

### E6: DNI/CE — documento como identificador
1. Empleado branch con `docType/dni` y `docNum`.
2. Migración preserva esos campos en tenant (profile) para RR.HH.
3. No se usa como key (el uid sigue siendo el id).

## Reglas RTDB requeridas

- `tenants/*/employees/*/attendance/$date` — ya existe write para `auth.uid === $uid || admin/superadmin`.
- Durante transición: `branches/*/employees/*/pin` NO DEBE poder escribirse (solo lectura/compat).
- `.indexOn: ["attendance"]` no aplica (attendance es objeto por fecha); el paginado se hace por key de fecha (orderByKey + limitToLast) — ya soportado sin índice adicional.

## Datos de entrada de la migración (script)

| Fuente | Destino | Campos |
|--------|---------|--------|
| `branches/*/employees/*` | `tenants/*/employees/<uid>` | profile/name, profile/email, role, branches, homeBranch, status, statusEnd, pinHash (convertido) |
| `branches/*/employees/*/userId` | — | link preservado |
| `branches/*/attendance/*` | `tenants/*/employees/<uid>/attendance/*` | por fecha, merge sin pisar |
| `global/emails_to_uid` | — | verificado consistente |

## Fuera de alcance
- Firebase Auth por empleado (no aplica — PIN es credencial local)
- Migración a Firestore
- Cambios de modelo de roles/permisos