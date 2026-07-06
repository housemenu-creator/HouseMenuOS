# House-Portal-OS Firebase RTDB Schema

## Convenciones Generales
- Todos los paths son públicos o privados (reglas RTDB).
- `branchId` es el ID único de cada sucursal.
- `tenantId` para multi-tenant (actualmente siempre `default`).

---

## Paths Compartidos (2+ Apps)

### `/branches/{branchId}/orders/{orderId}`
- **Escriben:** house-menu, housepysbot
- **Lectura:** house-menu, housepysbot, portal-hub
- **Estructura:** `id`, `items`, `total`, `status`, `cliente`, ..., `statusTimestamps`, `driverId`

### `/branches/{branchId}/employees/{employeeId}`
- **Escriben:** house-menu, portal-hub
- **Lectura:** portal-hub, housepysbot
- **Estructura:** `name`, `email`, `role`, `pin`, `active`, `schedule`, `goals`, `hourlyRate`

### `/branches/{branchId}/attendance/{employeeId}/{date}`
- **Escriben:** house-menu, portal-hub
- **Lectura:** portal-hub, housepysbot
- **Estructura:** `clockIn`, `clockOut`, `branchId`

### `/customers/{customerId}`
- **Escriben:** house-menu
- **Lectura:** house-menu, housepysbot
- **Estructura:** `name`, `phone`, `email`, `lastOrder`, `totalSpent`, `points`, `tier`

---

## Paths Exclusivos

### house-menu
- `/branches/{branchId}/catalog/products/{productId}`
- `/branches/{branchId}/tables/{tableId}`
- `/branches/{branchId}/delivery/drivers/{driverId}`
- `/branches/{branchId}/delivery/zones/{zoneId}`
- `/branches/{branchId}/cash_sessions/{sessionId}` (UNIFIED)
- `/branches/{branchId}/marketing/campaigns/{campaignId}`

### housepysbot
- `/chats/{sessionKey}`
- `/branches/{branchId}/system/cache/analytics/{date}`
- `/branches/{branchId}/system/anomalies/{timestamp}`

### portal-hub
- (Write exclusivo: ninguno, todo compartido con house-menu o housepysbot)

---

## Path Migrations (Historial)
- **2026-06:** `caja/sessions/` → `cash_sessions/`
- **2026-06:** `fiscal/credentials` → Fuera de `/branches/{id}/sunat/`

*Actualizado: 2026-06-16*
