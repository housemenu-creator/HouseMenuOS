# Consolidar identidad y asistencia del personal (single source of truth)

## Indicadores de impacto
- Alcance: identidad, auth, asistencia, reglas RTDB
- Riesgo: ALTO (auth + datos + reglas en prod)
- Complejidad: ALTA (3 sistemas en paralelo → 1)
- Esfuerzo estimado: 3 fases

## Problema
La app tiene TRES modelos de empleado que no se hablan:

1. **`tenants/{tenant}/employees/{uid}`** (authService.js — moderno)
   - Login: `verifyPin(email + PIN)` con PIN hasheado (PBKDF2)
   - Memberships globales, role cache, sesiones propias
   - Lo gestiona UserManager ("Usuarios")

2. **`branches/{branchId}/employees/{pushId}`** (employeeService.js + empleadoService.js — legacy)
   - Login portal: `getEmployeeByPin(PIN)` con **PIN en texto plano**
   - Fichado escribe en `branches/{branchId}/attendance`
   - Lo gestiona EmployeesTab ("Personal")

3. **`tenants/{tenant}/employees/{uid}/attendance`** (employeeService.js — moderno)
   - Fichado con validación de horario/estado/breaks vía runTransaction
   - Es donde lee EmployeesTab para mostrar asistencia

### Síntomas confirmados
- El mismo empleado tiene 2 registros con IDs distintos (pushId branch ≠ userId tenant)
- Editar PIN desde "Usuarios" (`updateUser`) NO sincroniza el PIN plano del branch → Portal Empleados da "PIN incorrecto"
- Usuario creado desde "Usuarios" no existe en `branches/*/employees` → jamás puede fichar por portal
- Las fichadas del portal (branch) NO aparecen en el admin (lee tenant)
- Empleados sin email/rol-login: `clockIn` moderno hace `return null` silencioso → asistencia perdida
- Reglas RTDB exigen `auth.uid === $uid` para auto-escritura, pero los empleados con push ID no tienen Firebase Auth → PERMISSION_DENIED en su propio perfil/attendance

## Solución
Consolidar TODO en el modelo tenant como única fuente de verdad:

1. **Migración de datos** (script idempotente)
   - Backfill `userId` en todos los empleados branch sin linkear
   - Migrar PINs planos a hash en tenant
   - Migrar attendance legacy `branches/*/attendance` → `tenants/*/employees/*/attendance`
   - Reutilizar UID existente cuando hay `userId` o `firebaseUid`

2. **Login unificado**: el portal empleados usa `verifyPin` (hash, tenant) en vez de `getEmployeeByPin` (PIN plano)

3. **Fichado unificado**: `Fichado.jsx` del portal usa el `clockIn/clockOut` moderno de employeeService (con validación de horario/estado) — la versión legacy de empleadoService.js se deja solo como compat de lectura durante la migración

4. **Sincronización bidireccional**: `updateUser` también actualiza el PIN plano del branch (o elimina el PIN plano del branch en la migración y el portal lee solo del tenant)

5. **Índices de escalabilidad**
   - `tenants/*/employees/*/attendance` con `$date` como key — ya es queryable por key
   - `.indexOn` para `attendance` si se consulta por rango
   - Eliminar escaneo O(n) en `findUserByEmailInTenant` y `getEmployeeByPin` → lookup por email index (`global/emails_to_uid`) o por índice de PIN hasheado

## No hacer (YAGNI)
- NO migrar a Firestore — RTDB con índices aguanta miles de fichadas
- NO crear Firebase Auth users por empleado (los PINs son la credencial del sistema, sesión propia RTDB ya funciona)
- NO tocar el modelo de roles/permissions existente

## Criterios de éxito
- Un empleado = un registro (tenant), con `userId` linkeado desde branch
- Portal Empleados autentica con el MISMO PIN que el sistema (hash, no plano)
- Fichadas del portal aparecen en el admin en tiempo real
- Cero PINs en texto plano en `branches/*/employees`
- Login sin escaneo O(n)