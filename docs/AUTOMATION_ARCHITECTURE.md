# Automation Architecture — House Portal OS + n8n

> **Versión:** 2.0  
> **Autor:** Arquitecto de Integración  
> **Estado:** Borrador para revisión  

---

## Tabla de Contenidos

1. [Análisis de la Arquitectura Actual](#1-análisis-de-la-arquitectura-actual)
2. [Cambios Propuestos](#2-cambios-propuestos)
3. [Arquitectura Objetivo](#3-arquitectura-objetivo)
4. [Diagrama de Componentes](#4-diagrama-de-componentes)
5. [Sistema de Eventos](#5-sistema-de-eventos)
6. [Integración con n8n](#6-integración-con-n8n)
7. [APIs Necesarias](#7-apis-necesarias)
8. [Webhooks Necesarios](#8-webhooks-necesarios)
9. [Modelo de Datos](#9-modelo-de-datos)
10. [Estrategia de Autenticación](#10-estrategia-de-autenticación)
11. [Estrategia Multi-Tenant](#11-estrategia-multi-tenant)
12. [Desarrollo Local](#12-desarrollo-local)
13. [Rollback y Feature Flags](#13-rollback-y-feature-flags)
14. [Plan de Implementación por Fases](#14-plan-de-implementación-por-fases)
15. [Riesgos Técnicos](#15-riesgos-técnicos)
16. [Recomendaciones](#16-recomendaciones)

---

## 1. Análisis de la Arquitectura Actual

### 1.1 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite (SPA) |
| Backend | Firebase Realtime Database + Firestore |
| Auth | Firebase Auth + custom sessions |
| Hosting | Firebase Hosting |
| Serverless | Firebase Functions (Cloud Functions v2) |
| Monorepo | Turborepo + npm workspaces |
| Paquetes compartidos | `@house/db`, `@house/ui`, `@house/store`, `@house/validation` |

### 1.2 Estructura de Datos Actual

```
branches/{branchId}/
  ├── orders/           # Pedidos
  ├── catalog/          # Catálogo de productos
  ├── delivery/         # Repartidores y zonas
  ├── cash_sessions/    # Sesiones de caja
  ├── finanzas/         # Gastos
  ├── marketing/        # Campañas
  ├── comm/             # Mensajería interna
  ├── config/           # Configuración
  ├── fcm_tokens/       # Push notifications
  ├── social/           # Redes sociales
  └── cuentas/          # Cuentas por cobrar

tenants/{tenantId}/
  ├── users/            # Usuarios
  ├── roles/            # Roles
  └── sessions/         # Sesiones

audit/logs/{YYYY-MM-DD}/
  └── {logId}           # Logs de auditoría
```

### 1.3 Problemas Identificados

1. **Sin bus de eventos**: No existe un sistema de eventos pub/sub. La comunicación entre módulos es directa vía Firebase RTDB.
2. **Lógica de negocio distribuida**: Reglas de inventario, compras y notificaciones están mezcladas en los componentes React.
3. **Sin capa de automatización**: No hay un motor de workflows. Las tareas repetitivas (notificaciones, actualizaciones) se hacen manualmente o con código ad-hoc.
4. **Sin trazabilidad de procesos**: No hay manera de seguir el estado de un proceso de compra, delivery o reposición de principio a fin.
5. **Acoplamiento Firebase-n8n**: Al no haber una capa de abstracción, cualquier integración directa con n8n crearía dependencias frágiles.
6. **WhatsApp no integrado**: El envío de mensajes WhatsApp no está estandarizado ni integrado con procesos.
7. **Sin webhooks entrantes**: No hay infraestructura para recibir callbacks de proveedores, delivery o servicios externos.

---

## 2. Cambios Propuestos

### 2.1 Resumen

| Componente | Cambio |
|-----------|--------|
| **Event Bus** | Nuevo — RTDB-based con cola de eventos pendientes + reintentos |
| **Event Publisher** | Nuevo — wrapper en `packages/event-bus/` que todos los servicios usan para emitir eventos |
| **Event Dispatcher** | Nuevo — worker que lee eventos pendientes de RTDB y los envía a n8n |
| **API Gateway** | Nuevo — capa HTTP como Cloud Function (no Cloud Run) para webhooks entrantes y APIs externas |
| **Webhook Manager** | Nuevo — registro, firma y validación de webhooks |
| **n8n** | Nuevo — Docker Compose en VPS o n8n Cloud como motor de workflows |
| **Audit Log** | Mejora — agregar correlationId, eventId y trazabilidad de procesos |
| **Feature Flags** | Nuevo — toggle por workflow para rollback rápido |

### 2.2 Lo que NO se agrega (vs v1)

| Componente | Motivo |
|-----------|--------|
| **Cloud PubSub** | Overkill para ~500 eventos/día. RTDB con `onChildAdded` alcanza. |
| **Process Manager** | El status de la OC en `/branches/{branchId}/purchase_orders/{poId}/status` ES la máquina de estados. Duplicar en `/processes/` agrega complejidad sin beneficio real. |
| **Cloud Run para API Gateway** | Cloud Functions HTTP cumple el mismo rol sin cold starts ni Docker. |
| **25+ tipos de evento** | Fase 1 usa 5. El catálogo grande se construye cuando hay necesidad real. |

### 2.3 Principios de Diseño

1. **El SaaS es el source of truth** — toda la data maestra vive en Firebase.
2. **Los eventos son inmutables** — una vez publicados, no se modifican.
3. **n8n ejecuta, no decide** — las reglas de negocio críticas están en el SaaS.
4. **Comunicación asíncrona** — el SaaS nunca espera una respuesta de n8n para continuar.
5. **Idempotencia** — todos los eventos y webhooks pueden recibirse múltiples veces sin efecto secundario.
6. **Trazabilidad total** — cada acción, evento y transición de estado queda registrada.
7. **Multi-tenant nativo** — tenantId en cada evento, workflow y ejecución.
8. **Mínimo stack viable** — lo más simple que funcione. No agregar infraestructura hasta que haga falta.

---

## 3. Arquitectura Objetivo

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SAAS CORE (Firebase)                        │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Orders   │  │ Catalog  │  │Inventory │  │ Cashier          │   │
│  │ Service  │  │ Service  │  │ Service  │  │ Service          │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬──────────┘   │
│       │              │             │                │              │
│       ▼              ▼             ▼                ▼              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              EVENT PUBLISHER — packages/event-bus/           │  │
│  │  pub(eventType, payload, context)                            │  │
│  │  - Crea HouseEvent con UUID v7 + correlationId               │  │
│  │  - Persiste en /events/{tenantId}/pending/{eventId}          │  │
│  │  - Valida schema contra catálogo                             │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │                                      │
│                             ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              EVENT BUS — RTDB (único canal)                  │  │
│  │                                                              │  │
│  │  /events/{tenantId}/                                         │  │
│  │    ├── pending/{eventId}/    → eventos a procesar            │  │
│  │    ├── processing/{eventId}/ → siendo procesados (lease)     │  │
│  │    └── done/{eventId}/       → completados (historial)       │  │
│  │                                                              │  │
│  │  El Event Dispatcher escucha via onChildAdded("pending")     │  │
│  │  Lease de 30s para evitar procesamiento duplicado.           │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │                                      │
│                             ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              EVENT DISPATCHER (Cloud Function v2)            │  │
│  │  - Disparado por onCreate en /events/{t}/pending/{id}       │  │
│  │  - Mueve a "processing" (lease atómico con update())        │  │
│  │  - Envía evento a n8n via HTTPS POST                        │  │
│  │  - Reintentos con backoff (5s, 30s, 5min)                   │  │
│  │  - Mueve a "done" con resultado                              │  │
│  └────────┬─────────────────────────────────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────────────┘
            │
            │ HTTPS (eventos + webhooks)
            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       INFRAESTRUCTURA EXTERNA                        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │   API GATEWAY (Cloud Function HTTP — NO Cloud Run)           │   │
│  │   - /api/v1/webhooks/{provider}  → entrantes                │   │
│  │   - /api/v1/workflows/{id}/status → consulta                │   │
│  │   - /api/v1/events → publicación externa                    │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                          │
│                         ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                 WEBHOOK MANAGER (servicio)                   │   │
│  │  - Registro de webhooks por tenant                          │   │
│  │  - Validación de firmas (HMAC-SHA256)                       │   │
│  │  - Rate limiting                                            │   │
│  │  - Idempotencia (idempotency-key)                           │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                          │
│                         ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │   n8n (Docker Compose en VPS / n8n Cloud)                   │   │
│  │                                                              │   │
│  │  ┌─────────────────┐                                         │   │
│  │  │ PO Auto v1      │  ← ÚNICO workflow en Fase 1            │   │
│  │  └─────────────────┘                                         │   │
│  │                                                              │   │
│  │  - Escucha eventos vía Webhook node                          │   │
│  │  - Ejecuta el workflow                                       │   │
│  │  - Responde al SaaS vía API Gateway                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              SERVICIOS EXTERNOS                              │   │
│  │  - WhatsApp Business API (Cloud API)                         │   │
│  │  - Proveedores (Webhooks entrantes)                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Diagrama de Componentes

### 4.1 Componentes del SaaS Core

| Componente | Responsabilidad |
|-----------|----------------|
| **Event Publisher** | API pública `pub(eventType, payload, context)` en `packages/event-bus/`. Persiste en RTDB como evento pendiente. Valida schema. |
| **Event Bus** | RTDB con 3 estados: `pending/`, `processing/`, `done/`. El worker mueve eventos entre estados con lease atómico. |
| **Event Dispatcher** | Cloud Function v2 disparada por `onCreate("pending")`. Envía evento a n8n, maneja reintentos con backoff exponencial. |
| **Webhook Manager** | Registry de webhooks configurados por tenant/branch. Almacena secretos de firma, URLs de callback, y estado. Valida HMAC en webhooks entrantes. |
| **API Gateway** | Cloud Function HTTP que expone endpoints externos: webhooks de proveedores, consulta de estado de procesos, callback n8n. NO es Cloud Run. |
| **Audit Log** | Sistema existente mejorado. Ahora todo evento y llamada a webhook se registra con `eventId`, `correlationId`. |

### 4.2 Componentes Externos

| Componente | Responsabilidad |
|-----------|----------------|
| **n8n** | Motor de workflows. Recibe eventos vía Webhook node. Ejecuta automatizaciones. Llama APIs del SaaS para leer/escribir datos. Responde con webhooks de retorno. |
| **WhatsApp Business API** | Envío y recepción de mensajes. n8n se conecta via HTTP node. |
| **Proveedores** | Webhooks entrantes para confirmar/rechazar órdenes de compra. |

---

## 5. Sistema de Eventos

### 5.1 Formato del Evento

```typescript
interface HouseEvent {
  id: string;                 // UUID v7
  type: EventType;            // ver catálogo
  version: number;            // schema version (empieza en 1)

  tenantId: string;
  branchId: string;

  occurredAt: string;         // ISO 8601
  source: string;             // "inventory-service", "system"
  correlationId: string;      // para seguir el proceso completo

  payload: Record<string, unknown>;

  metadata?: {
    idempotencyKey?: string;
    userEmail?: string;
    userRole?: string;
  };
}
```

### 5.2 Catálogo de Eventos — Fase 1

Solo 5 eventos para el workflow de Purchase Order Automation. El resto se agrega cuando haya un workflow que lo necesite.

| Evento | Disparador | Payload | Workflow n8n |
|--------|-----------|---------|-------------|
| `inventory.stock.low` | Stock por debajo del mínimo | `{ productId, branchId, productName, currentStock, minStock, supplierId }` | PO Auto |
| `purchase_order.created` | OC creada por n8n | `{ purchaseOrderId, supplierId, branchId, items[], total }` | PO Auto |
| `purchase_order.confirmed` | Proveedor confirma | `{ purchaseOrderId, supplierId, confirmedAt }` | PO Auto |
| `purchase_order.ready` | Proveedor marca listo | `{ purchaseOrderId, supplierId, readyAt }` | PO Auto |
| `purchase_order.delivered` | Mercadería recibida | `{ purchaseOrderId, receivedBy, deliveredAt }` | PO Auto |

### 5.3 Catálogo de Eventos — Futuro (documentado, no implementado)

> Estos eventos están documentados para referencia pero NO se implementan en Fase 1.
> Se agregan cuando un workflow los necesita.

| Área | Eventos futuros |
|------|----------------|
| Sales | `sales.completed`, `sales.order.created`, `sales.order.cancelled` |
| Delivery | `delivery.requested`, `delivery.assigned`, `delivery.delivered` |
| Cash | `cash.session.opened`, `cash.session.closed`, `cash.payment.received` |
| Customers | `customer.created`, `customer.loyalty.updated` |
| System | `system.workflow.completed`, `system.workflow.failed`, `system.error` |

### 5.4 Ciclo de Vida de un Evento

```
1. ORIGEN: Un servicio del SaaS llama a pub(eventType, payload)
       │
       ▼
2. VALIDACIÓN: Event Publisher valida el schema contra el catálogo
       │
       ▼
3. ENRICH: Se agrega tenantId, branchId, correlationId,
           source, occurredAt, idempotencyKey
       │
       ▼
4. PERSISTENCIA: Se escribe en RTDB: /events/{tenantId}/pending/{eventId}
       │
       ▼
5. DISPATCH: Cloud Function se dispara con onCreate("pending")
       │
       ▼
6. LEASE: Mueve evento a "processing" con update() atómico
       │
       ▼
7. ENRUTAMIENTO: ¿Tiene workflow asociado?
       ├── Sí → Envía a n8n via POST
       └── No  → Mueve a "done" sin acción
       │
       ▼
8. n8n: Ejecuta workflow
       │
       ▼
9. RESPUESTA: n8n llama al webhook de retorno del API Gateway
       │
       ▼
10. RESULTADO: Event Dispatcher mueve a "done" con resultado
```

### 5.5 Publisher API

```typescript
// packages/event-bus/src/publisher.ts
// Uso desde cualquier servicio del SaaS
import { pub } from '@house/event-bus';

// Ejemplo en inventoryService.js
async function updateStock(productId, delta, reason) {
  // ... lógica de negocio ...

  await pub('inventory.stock.updated', {
    productId,
    previousStock: oldStock,
    newStock: oldStock + delta,
    delta,
    reason,
  }, {
    branchId: currentBranch,
    correlationId: generateCorrelationId(),
  });

  if (newStock < product.minStock) {
    await pub('inventory.stock.low', {
      productId,
      productName: product.name,
      currentStock: newStock,
      minStock: product.minStock,
      supplierId: product.supplierId,
    }, {
      branchId: currentBranch,
      correlationId, // mismo para trazabilidad
    });
  }
}
```

---

## 6. Integración con n8n

### 6.1 Modelo de Integración

```
SaaS Core ──pub(event)──▶ RTDB ──▶ Event Dispatcher ──HTTP──▶ n8n Webhook
                                                                   │
                                                                   │
  SaaS API ◀──────── Webhook Callback ────────────── n8n ─────┐   │
                                                                │   │
  SaaS API ◀────── HTTP Request (leer/escribir) ───────────────┘   │
                                                                    │
                                                                    ▼
                                                           WhatsApp API
                                                           Proveedores
```

### 6.2 Qué Eventos Enviar a n8n

Solo los 5 eventos de Fase 1. El Event Dispatcher tiene un mapa de ruteo:

```typescript
const EVENT_WORKFLOW_MAP: Record<string, string | null> = {
  'inventory.stock.low':       'purchase-order-auto-v1',
  'purchase_order.created':    'purchase-order-auto-v1',
  'purchase_order.confirmed':  'purchase-order-auto-v1',
  'purchase_order.ready':      'purchase-order-auto-v1',
  'purchase_order.delivered':  'purchase-order-auto-v1',

  // null = evento registrado pero sin workflow → solo queda en RTDB
  'inventory.stock.updated':   null,
};
```

### 6.3 Qué Información Enviar

Cada evento enviado a n8n incluye:

```json
{
  "eventId": "evt_01J8X...",
  "type": "inventory.stock.low",
  "version": 1,
  "tenantId": "rest-001",
  "branchId": "monteverde",
  "occurredAt": "2026-07-12T15:30:00.000Z",
  "correlationId": "corr_abc123",
  "source": "inventory-service",
  "payload": {
    "productId": "prod_123",
    "productName": "Papa Amarilla",
    "currentStock": 5,
    "minStock": 20,
    "supplierId": "prov_001"
  }
}
```

Nunca se envía data sensible (contraseñas, tokens). n8n obtiene lo que necesita mediante llamadas API al SaaS.

### 6.4 Cómo Autenticar

#### Autenticación SaaS → n8n

```
1. El SaaS tiene un API Key por tenant configurado en n8n
2. Cada request del Event Dispatcher a n8n incluye:
   Header: Authorization: Bearer n8n_api_key_xxx
   Header: X-House-Signature: HMAC-SHA256(body + secret)
   Header: X-House-Tenant: rest-001
   Header: X-House-Event-Id: evt_01J8X...
   Header: Idempotency-Key: evt_01J8X...
3. n8n valida el HMAC en el Webhook node
```

#### Autenticación n8n → SaaS

```
1. n8n tiene un API Key del SaaS (por tenant)
2. Cada request de n8n al SaaS incluye:
   Header: Authorization: Bearer saas_api_key_xxx
   Header: X-House-Signature: HMAC-SHA256(body + secret)
   Header: X-House-Tenant: rest-001
3. El API Gateway valida la firma antes de procesar
```

### 6.5 Manejo de Errores

| Escenario | Estrategia |
|-----------|-----------|
| **n8n no responde** (timeout) | Event Dispatcher reintenta 3 veces con backoff (5s, 30s, 5min). Luego mueve evento a `done` con `status: failed`. |
| **n8n responde con 4xx** | Error del workflow. Se marca como `failed` y se notifica al admin vía WhatsApp. |
| **n8n responde con 5xx** | Error temporal. Reintento con backoff. |
| **Workflow falla internamente** | n8n llama al webhook de retorno con `{ eventId, status: 'failed', error }`. |
| **Webhook de retorno falla** | n8n reintenta 3 veces. Si persiste, queda en cola de dead letters interna de n8n. |

### 6.6 Cómo Reintentar

```
Estrategia: Backoff exponencial con jitter

Intento 1: esperar 5s
Intento 2: esperar 30s
Intento 3: esperar 5min → si falla, evento queda en done con status=failed

Cada intento se registra en:
  /events/{tenantId}/processing/{eventId}/
    └── attempts: [{timestamp, status, responseCode, error}]
```

### 6.7 Cómo Versionar Workflows

```
Convención de naming en n8n:
  {tenantId}-{workflow}-v{version}
  Ej: rest-001-purchase-order-auto-v1

Estrategia:
  - Cada workflow tiene versión en el nombre
  - El Event Dispatcher rutea según EVENT_WORKFLOW_MAP
  - Para cambiar de versión: actualizar el mapa + deploy
  - Workflows anteriores se mantienen como fallback manual
```

### 6.8 Cómo Identificar Empresas (Multi-Tenant)

Cada evento lleva `tenantId` y `branchId`. n8n usa estos campos para:

1. **Namespacing**: workflows nombrados como `{tenantId}-{nombre}`
2. **Data isolation**: n8n llama a la API del SaaS con header `X-House-Tenant`
3. **Credentials**: cada tenant puede tener sus propias credenciales de WhatsApp
4. **Webhooks**: cada tenant tiene su propia configuración en el SaaS

### 6.9 Cómo Evitar Ejecuciones Duplicadas

```
Idempotencia en 2 capas (PubSub ya no está, se reemplaza con lease):

1. LEASE ATÓMICO en RTDB
   - El Event Dispatcher mueve de "pending" a "processing" con update()
   - Si el evento ya no está en "pending", otro worker ya lo tomó
   - Lease de 30s: si el worker crashea, otro puede retomarlo

2. IDEMPOTENCY KEY en n8n
   - n8n usa Idempotency-Key header para detectar duplicados
   - Si recibe el mismo eventId dos veces, omite la segunda
```

---

## 7. APIs Necesarias

Todas implementadas como **Cloud Functions HTTP** (no Cloud Run).

### 7.1 API Interna (SaaS → n8n)

```
POST /api/v1/events              → Enviar evento a n8n
GET  /api/v1/workflows/:id/status → Consultar estado de workflow
POST /api/v1/webhooks/return     → Webhook de retorno (n8n → SaaS)
```

### 7.2 API Pública (API Gateway como Cloud Function)

```
POST /api/v1/webhooks/supplier       → Webhooks de proveedores
POST /api/v1/webhooks/return         → Retorno de n8n

GET  /api/v1/purchase-orders/:id     → Consultar OC
PATCH /api/v1/purchase-orders/:id/status → Actualizar estado OC
```

### 7.3 API de Consulta (n8n → SaaS)

Todas autenticadas con API Key + HMAC:

```
GET    /api/v1/products             → Listar productos
GET    /api/v1/products/:id/stock   → Consultar stock
GET    /api/v1/suppliers            → Listar proveedores
GET    /api/v1/suppliers/:id        → Detalle proveedor
POST   /api/v1/purchase-orders      → Crear orden de compra
GET    /api/v1/purchase-orders/:id  → Consultar OC
PATCH  /api/v1/purchase-orders/:id/status → Actualizar estado OC
PATCH  /api/v1/inventory/:productId → Actualizar inventario
POST   /api/v1/messages/whatsapp    → Enviar WhatsApp
```

---

## 8. Webhooks Necesarios

### 8.1 Webhook de Retorno (n8n → SaaS)

Cuando n8n completa (o falla) un workflow, llama a este webhook:

```
POST /api/v1/webhooks/return
Content-Type: application/json
X-House-Signature: HMAC-SHA256
X-House-Tenant: rest-001

{
  "eventId": "evt_01J8X...",
  "workflowId": "purchase-order-auto-v1",
  "executionId": "exec_abc...",
  "status": "completed" | "failed",
  "result": {
    "purchaseOrderId": "po_20260712_001",
    "deliveryRequested": true
  },
  "error": {
    "message": "...",
    "node": "WhatsApp Send"
  }
}
```

### 8.2 Webhook de Proveedor

```
POST /api/v1/webhooks/supplier/{supplierId}
Content-Type: application/json
X-Supplier-Signature: HMAC-SHA256

{
  "event": "order.confirmed" | "order.ready" | "order.rejected",
  "purchaseOrderId": "po_20260712_001",
  "timestamp": "2026-07-12T16:00:00Z",
  "notes": "Listo para recoger a las 5pm"
}
```

---

## 9. Modelo de Datos

### 9.1 Eventos

```
/events/{tenantId}/
  ├── pending/{eventId}/
  │     ├── type: "inventory.stock.low"
  │     ├── version: 1
  │     ├── tenantId: "rest-001"
  │     ├── branchId: "monteverde"
  │     ├── occurredAt: "2026-07-12T15:30:00.000Z"
  │     ├── correlationId: "corr_abc123"
  │     ├── source: "inventory-service"
  │     ├── payload: { productId, currentStock, minStock, supplierId }
  │     └── metadata: { idempotencyKey }
  │
  ├── processing/{eventId}/
  │     ├── ... (mismo que pending +)
  │     ├── leaseUntil: "2026-07-12T15:30:30.000Z"
  │     └── attempts: [ { timestamp, status, responseCode? } ]
  │
  └── done/{eventId}/
        ├── ... (mismo que pending +)
        ├── deliveryStatus: "delivered" | "failed" | "no_workflow"
        ├── deliveredAt: "2026-07-12T15:30:01.000Z"
        └── attempts: [ ... ]
```

### 9.2 Purchase Orders (el status ES la máquina de estados)

No existe `/processes/` separado. El `status` field de la OC es la máquina de estados.

```
/branches/{branchId}/purchase_orders/{poId}/
  ├── poNumber: "OC-20260712-001"
  ├── supplierId: "prov_001"
  ├── supplierName: "Distribuidora La Inmaculada"
  ├── status: "pending" | "confirmed" | "preparing" | "ready"
  |         | "in_transit" | "delivered" | "completed" | "cancelled"
  ├── items: [{ productId, productName, quantity, unit, unitPrice, total }]
  ├── totals: { subtotal, tax, shipping, total }
  ├── notes: "Entregar antes de las 6pm"
  ├── correlationId: "corr_abc123"
  ├── createdBy: "system" | "user@email.com"
  ├── createdVia: "auto" | "manual"
  ├── createdAt: "2026-07-12T15:30:00Z"
  ├── confirmedAt: "2026-07-12T16:00:00Z"
  ├── readyAt: "2026-07-12T17:00:00Z"
  ├── deliveryId: "del_001"
  ├── receivedAt: "2026-07-12T18:00:00Z"
  ├── receivedBy: "user@email.com"
  ├── completedAt: "2026-07-12T18:05:00Z"
  │
  ├── events: [eventId1, eventId2]  // Referencias a eventos del proceso
  │
  └── stateHistory: [                 // Trazabilidad sin process manager
        { step: "created", at: "...", by: "system", eventId: "..." },
        { step: "confirmed", at: "...", by: "supplier", eventId: "..." },
        { step: "ready", at: "...", by: "supplier", eventId: "..." },
      ]
```

### 9.3 Workflows Registry

```
/tenants/{tenantId}/workflows/{workflowId}/
  ├── name: "Compra Automática"
  ├── triggerEvents: ["inventory.stock.low"]
  ├── activeVersion: 2
  ├── enabled: true                          ← FEATURE FLAG
  ├── config: {
        maxPurchaseAmount: 5000,
        autoApprove: true
      }
  └── versions: {
        1: { url: "...", status: "deprecated", deployedAt: "..." },
        2: { url: "...", status: "active", deployedAt: "..." }
      }
```

### 9.4 Webhooks Registry

```
/tenants/{tenantId}/webhooks/{webhookId}/
  ├── provider: "supplier" | "whatsapp" | "n8n-return"
  ├── label: "Webhook Proveedor La Inmaculada"
  ├── url: "https://api.house.com/webhooks/supplier/prov_001"
  ├── secret: "whsec_..."  (hashed)
  ├── active: true
  ├── allowedIps: ["192.168.1.0/24"]
  ├── rateLimit: 100  // requests por minuto
  └── lastCalledAt: "2026-07-12T16:00:00Z"
```

---

## 10. Estrategia de Autenticación

### 10.1 Tokens

| Token | Quién lo genera | Quién lo usa | Propósito |
|-------|----------------|-------------|-----------|
| `n8n_api_key` | n8n admin | SaaS → n8n | Autenticar requests del SaaS a n8n |
| `house_api_key` | SaaS admin | n8n → SaaS | Autenticar requests de n8n al SaaS |
| `supplier_token` | SaaS admin | Proveedores | Portal de proveedores |

### 10.2 Firma de Webhooks (HMAC)

```
Firma para requests SaaS → n8n:
  payload = JSON.stringify(body)
  signature = HMAC-SHA256(payload + ":" + timestamp, shared_secret)
  Header: X-House-Signature: sha256={signature}
  Header: X-House-Timestamp: {timestamp}

Validación en n8n:
  1. Verificar timestamp (≤ 5min de diferencia)
  2. Recalcular HMAC con shared_secret
  3. Comparar firmas (timing-safe)
```

### 10.3 Permisos

```
n8n API Key permissions (en el SaaS):
  - events:write        → Publicar eventos de retorno
  - purchase_orders:*   → CRUD de órdenes de compra
  - inventory:read      → Consultar inventario
  - inventory:write     → Actualizar inventario
  - products:read       → Consultar productos
  - suppliers:read      → Consultar proveedores
  - messages:send       → Enviar WhatsApp

Supplier Token permissions:
  - purchase_orders:read     → Ver sus órdenes
  - purchase_orders:write    → Confirmar/rechazar/marcar listo
```

### 10.4 Trazabilidad

Cada request autenticado queda registrado en audit log existente:

```
/audit/logs/{YYYY-MM-DD}/{logId}/
  ├── action: "api.purchase_order.created"
  ├── actor: "n8n" | "supplier:prov_001" | "user@email.com"
  ├── tenantId: "rest-001"
  ├── correlationId: "corr_abc123"
  ├── ip: "203.0.113.1"
  ├── request: { method, path, body (sanitized) }
  ├── response: { statusCode, body }
  └── timestamp: serverTimestamp()
```

---

## 11. Estrategia Multi-Tenant

### 11.1 Data Isolation

```
RTDB paths:
  /events/{tenantId}/...            → Eventos por tenant
  /workflows/{tenantId}/...         → Feature flags + config por tenant
  /webhooks/{tenantId}/...          → Webhooks por tenant

  /branches/{branchId}/...          → Ya existe, branch pertenece a un tenant
  /tenants/{tenantId}/...           → Ya existe, metadata del tenant
```

### 11.2 Configuración por Tenant

```
/tenants/{tenantId}/
  ├── name: "Restaurante Monteverde"
  ├── slug: "monteverde"
  ├── n8n: {
        webhookUrl: "https://n8n.house.com/webhook/tenant-monteverde",
        apiKey: "n8n_key_xxx...",
        returnWebhookUrl: "https://api.house.com/webhooks/return"
      }
  ├── whatsapp: {
        phoneNumberId: "123456789",
        businessAccountId: "987654321",
        apiKey: "wa_key_xxx..."
      }
  └── features: {                      ← Feature flags por tenant
        autoPurchase: true,
        supplierPortal: true,
        deliveryIntegration: false
      }
```

---

## 12. Desarrollo Local

### 12.1 Entorno de Desarrollo

```yaml
# docker-compose.yml en la raíz del monorepo
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    volumes:
      - ./n8n/data:/home/node/.n8n
      - ./n8n/workflows:/backup/workflows
    environment:
      - N8N_WEBHOOK_URL=http://localhost:5678/

  event-simulator:    # Herramienta interna para testear eventos sin n8n
    build: ./packages/event-bus/simulator
    ports:
      - "3001:3001"
    volumes:
      - .:/app
```

### 12.2 Modos de Operación

| Modo | n8n | Event Dispatcher | Para qué |
|------|-----|-----------------|----------|
| **Full** | Real | Conectado | Tests E2E, debugging de workflows |
| **Mock** | No | Modo dry-run | Desarrollo de features del SaaS |
| **Off** | No | No | Desarrollo normal sin eventos |

### 12.3 Mock Event Dispatcher

```typescript
// En desarrollo, cuando n8n no está disponible:
// El Event Dispatcher imita a n8n respondiendo 200 OK

const DEV_MODE = process.env.NODE_ENV === 'development';

async function dispatchEvent(event: HouseEvent): Promise<void> {
  if (DEV_MODE) {
    console.log('[EVENT-DISPATCHER:MOCK] Evento recibido:', event.type, event.eventId);
    console.log('[EVENT-DISPATCHER:MOCK] Payload:', JSON.stringify(event.payload, null, 2));
    // Simular respuesta exitosa después de 500ms
    await delay(500);
    return { status: 'delivered' };
  }

  // ... lógica real de dispatch a n8n ...
}
```

### 12.4 Fixtures de Eventos

```
packages/event-bus/__fixtures__/
  ├── stock-low.json          → inventory.stock.low
  ├── po-created.json         → purchase_order.created
  ├── po-confirmed.json       → purchase_order.confirmed
  └── po-delivered.json       → purchase_order.delivered

Uso:
  import { injectFixture } from '@house/event-bus/testing';
  await injectFixture('stock-low', { branchId: 'test-branch' });
  // → el evento aparece en RTDB como pending
  // → el Event Dispatcher lo procesa
```

---

## 13. Rollback y Feature Flags

### 13.1 Kill Switch por Workflow

Cada workflow tiene un feature flag en la config del tenant:

```typescript
// /tenants/{tenantId}/workflows/purchase-order-auto-v1/enabled

// Si enabled = false:
//   El Event Dispatcher NO envía eventos a n8n para este workflow
//   Los eventos se mueven directamente a "done" con status "disabled"
//   El workflow de n8n queda paused hasta que se reactive

async function dispatchEvent(event: HouseEvent): Promise<void> {
  const workflowId = EVENT_WORKFLOW_MAP[event.type];
  if (!workflowId) {
    await moveToDone(event.eventId, { deliveryStatus: 'no_workflow' });
    return;
  }

  // CHECK FEATURE FLAG
  const workflowConfig = await getWorkflowConfig(event.tenantId, workflowId);
  if (!workflowConfig.enabled) {
    await moveToDone(event.eventId, { deliveryStatus: 'disabled' });
    console.log(`[EVENT-DISPATCHER] Workflow ${workflowId} disabled for ${event.tenantId}`);
    return;
  }

  // ... enviar a n8n ...
}
```

### 13.2 Cómo Hacer Rollback

| Escenario | Acción | Tiempo |
|-----------|--------|--------|
| Workflow de n8n roto | Setear `enabled: false` en RTDB → kill inmediato | 5 segundos |
| Versión nueva falla | Volver a apuntar `activeVersion` a la anterior | 5 segundos |
| n8n caído | Deshabilitar todos los workflows desde dashboard | 1 minuto |
| Desastre total | `DELETE /events/{tenantId}/pending` + deshabilitar | 10 segundos |

### 13.3 Deploy Seguro

```
1. Deploy nuevo workflow en n8n como {tenantId}-{name}-v{N+1}
2. Configurar en RTDB: /tenants/{t}/workflows/{id}/versions/{N+1}/{url}
3. NO cambiar activeVersion aún
4. Probar manualmente enviando un evento de prueba
5. Si funciona → cambiar activeVersion
6. Si falla   → borrar la versión, investigar
```

---

## 14. Plan de Implementación por Fases

### Fase 1: Fundación (Semana 1-2)

**Objetivo:** Event Bus RTDB funcionando + n8n recibiendo eventos.

| Tarea | Descripción |
|-------|-------------|
| 1.1 | Crear `packages/event-bus/` — estructura del paquete, types, publisher |
| 1.2 | Implementar `pub()` — validación + persistencia en `/events/{t}/pending/{id}` |
| 1.3 | Implementar Event Dispatcher — Cloud Function con lease atómico + reintentos |
| 1.4 | Implementar mock dispatcher para desarrollo local |
| 1.5 | Catálogo de 5 eventos + schemas de validación |
| 1.6 | Desplegar n8n (Docker Compose en VPS) |
| 1.7 | Configurar webhook de entrada en n8n |
| 1.8 | Implementar autenticación HMAC entre SaaS y n8n |
| 1.9 | Implementar feature flag por workflow (kill switch) |
| 1.10 | Fixtures de eventos para testing |
| 1.11 | Tests: publisher unitario, dispatcher con mock n8n |

**Entregable:** Sistema base de eventos funcionando. n8n recibe eventos y responde 200 OK.
Feature flag permite desactivar sin deploy.

### Fase 2: API Gateway + Webhook Manager (Semana 3-4)

**Objetivo:** Exponer APIs seguras para n8n.

| Tarea | Descripción |
|-------|-------------|
| 2.1 | Crear API Gateway (Cloud Function HTTP — NO Cloud Run) |
| 2.2 | Implementar middleware de autenticación (API Key + HMAC) |
| 2.3 | Crear `Webhook Manager` — registro y validación de webhooks |
| 2.4 | Endpoint `POST /api/v1/webhooks/return` (callback de n8n) |
| 2.5 | Endpoints CRUD para purchase_orders |
| 2.6 | Endpoints de consulta (products, suppliers, inventory) |
| 2.7 | Idempotencia con lease atómico + Idempotency-Key |
| 2.8 | Rate limiting por tenant/API key |
| 2.9 | Tests: integración API Gateway + n8n |

**Entregable:** API Gateway funcional. n8n puede leer/escribir en el SaaS via API.

### Fase 3: Purchase Order Automation (Semana 5-6)

**Objetivo:** Workflow completo de compras automáticas.

| Tarea | Descripción |
|-------|-------------|
| 3.1 | Crear workflow n8n: Stock Low → PO (Purchase Order Auto v1) |
| 3.2 | Calcular cantidades de compra basado en stock actual |
| 3.3 | Agrupar productos por proveedor |
| 3.4 | Crear Purchase Order en SaaS via API |
| 3.5 | Enviar pedido por WhatsApp |
| 3.6 | Manejar confirmación del proveedor (webhook) |
| 3.7 | Manejar "Listo para recoger" + notificar admin |
| 3.8 | Marcar entrega y actualizar inventario |
| 3.9 | stateHistory en la OC como trazabilidad |
| 3.10 | Tests E2E del flujo completo |

**Entregable:** Compras automáticas funcionando de principio a fin para un producto.

### Fase 4: Proveedores + Delivery (Semana 7-8)

**Objetivo:** Portales de proveedor y delivery.

| Tarea | Descripción |
|-------|-------------|
| 4.1 | Portal proveedor: endpoints API (consultar, confirmar, rechazar) |
| 4.2 | Portal proveedor: autenticación con token |
| 4.3 | Webhooks de proveedor (integración directa) |
| 4.4 | Gestión de múltiples proveedores por tenant |
| 4.5 | Timeout de confirmación (24h → escalar a admin) |

**Entregable:** Proveedores integrados via API.

### Fase 5: Expansión de Eventos (Semana 9-10)

**Objetivo:** Agregar más eventos y workflows según necesidad real.

| Tarea | Descripción |
|-------|-------------|
| 5.1 | Evento `sales.completed` + workflow de encuesta WhatsApp |
| 5.2 | Evento `customer.created` + workflow de bienvenida |
| 5.3 | Evento `cash.session.closed` + workflow de reporte |
| 5.4 | Dashboard de monitoreo de eventos |

**Entregable:** Múltiples workflows activos según demanda real.

### Fase 6: IA + Optimización (Semana 11-12, opcional)

**Objetivo:** Nodos de IA en n8n.

| Tarea | Descripción |
|-------|-------------|
| 6.1 | Generar mensajes para proveedores con LLM |
| 6.2 | Recomendar cantidades de compra basado en histórico |
| 6.3 | Detectar anomalías en inventario con AI |
| 6.4 | Logging y alertas centralizadas |

**Entregable:** IA integrada en workflows.

---

## 15. Riesgos Técnicos

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|-------------|------------|
| **Eventos perdidos** (crash antes de escribir) | Alto | Baja | Escritura en RTDB es atómica. Si el publisher crashea antes de write, el evento simplemente no existe — no hay evento corrupto. |
| **Evento procesado dos veces** (lease expira) | Medio | Baja | Idempotency-Key en n8n. Si el lease expira y otro worker toma el evento, n8n recibe duplicado pero lo omite. |
| **n8n caído** | Alto | Baja | Feature flag kill switch. Mientras está caído, eventos quedan en "pending" con reintentos. Al volver, se procesan. |
| **Webhook de proveedor malicioso** | Alto | Baja | HMAC-SHA256 + IP whitelist + rate limiting. |
| **Firebase RTDB write limits** | Medio | Media | Eventos tienen TTL (30 días). ~500 eventos/día está muy por debajo del límite (200k conexiones simultáneas, 1k writes/s). |
| **n8n workflow versioning desordenado** | Bajo | Media | Convención de naming estricta + activeVersion en RTDB. |
| **Secret leakage (API keys)** | Alto | Baja | Secretos en Secret Manager. Nunca en código ni RTDB. |
| **Proveedor no responde** | Medio | Alta | Timeout de 24h en OC. Escalada a compra manual. Notificación al admin por WhatsApp. |
| **Multi-tenancy data leak** | Alto | Baja | tenantId en todos los paths de RTDB. Validación en cada API call. |

---

## 16. Recomendaciones

### 16.1 Prioridades

1. **Fase 1 es obligatoria** antes de cualquier workflow en n8n. Sin event bus, la integración será frágil.
2. **Comenzar con UN solo workflow** (Purchase Order Automation) y validar antes de escalar.
3. **No mover reglas de negocio a n8n** — el SaaS debe seguir siendo el source of truth.

### 16.2 Infraestructura

1. **n8n en Docker Compose** en un VPS (DigitalOcean, Hetzner) — más barato que n8n Cloud para empezar.
2. **RTDB como único bus de eventos** — ya lo usás, consistente con el stack actual, sin costo adicional.
3. **Cloud Functions para el API Gateway** — mismo stack que ya tenés, sin agregar Cloud Run.
4. **No tocar PubSub** hasta que se superen ~10k eventos/día (si es que pasa).

### 16.3 Desarrollo Local

1. **docker-compose.yml** con n8n para desarrollo local.
2. **Mock dispatcher** para cuando no querés depender de n8n.
3. **Fixtures de eventos** en `packages/event-bus/__fixtures__/` para tests reproducibles.

### 16.4 Monitoreo

1. **Dashboard simple**: eventos en pending, processing, done. Tasa de fallos.
2. **Alertas**: workflow fallido, evento en pending > 5 min, OC sin confirmar > 24h.
3. **Logging**: Cloud Logging con filtros por tenantId, correlationId, eventId.

### 16.5 Seguridad

1. **Todos los secretos en Secret Manager** (nunca en código, .env, ni RTDB).
2. **HMAC-SHA256 en todos los webhooks** (ambas direcciones).
3. **Rate limiting por tenant y endpoint**.
4. **Feature flag kill switch** para desactivar workflows sin deploy.

### 16.6 Escalabilidad

| Métrica | Estimación inicial | Escalabilidad |
|---------|-------------------|---------------|
| Eventos/día | ~500 | Particionado por tenant |
| Workflows/día | ~50 | n8n escala vertical/horizontal |
| Empresas | 1-5 | Aislamiento por tenantId |
| Webhooks entrantes | ~50/día | Rate limiting |
| Payload máximo | 10KB | Validación en Event Publisher |

---

## Anexo A: Flujo de Compras Automáticas (Detalle)

```
1. Stock bajo detectado
   └── pub('inventory.stock.low', { productId, currentStock, minStock, supplierId })
   └── RTDB: /events/{t}/pending/{id}

2. Event Dispatcher (Cloud Function) toma el evento
   └── Lease atómico: mueve a "processing"
   └── POST a n8n Webhook

3. n8n: Calcular cantidades
   ├── GET /api/v1/products/:id → detalles
   ├── GET /api/v1/suppliers/:id → info proveedor
   └── Calcular cantidad: (stock_seguridad - stock_actual) * factor_empaque

4. n8n: Crear Purchase Order
   └── POST /api/v1/purchase-orders → { supplierId, items }

5. SaaS: Procesar creación de OC
   ├── Crear OC en /branches/{b}/purchase_orders/{poId}
   ├── pub('purchase_order.created', { purchaseOrderId, supplierId, items })
   └── stateHistory: [{ step: "created", at: "...", by: "system" }]

6. n8n: Enviar WhatsApp al proveedor
   ├── POST /api/v1/messages/whatsapp → { to: supplier.phone, template: "pedido", data }
   └── Esperar webhook de retorno

7. Proveedor responde (webhook)
   ├── POST /api/v1/webhooks/supplier/{supplierId}
   │     └── { event: "order.confirmed", purchaseOrderId }
   ├── SaaS: OC.status = "confirmed"
   ├── OC.stateHistory: [{ step: "confirmed", at: "...", by: "supplier" }]
   └── pub('purchase_order.confirmed', { purchaseOrderId })

8. n8n espera "ready"
   └── (timeout de 24h si no responde → escalar a admin)

9. Proveedor marca listo
   ├── POST /api/v1/webhooks/supplier/{supplierId}
   │     └── { event: "order.ready", purchaseOrderId }
   ├── SaaS: OC.status = "ready"
   └── pub('purchase_order.ready', { purchaseOrderId })

10. n8n notifica admin para recoger
    └── POST /api/v1/messages/whatsapp → admin: "OC lista para recoger"

11. Mercadería recibida (admin marca en sistema)
    ├── PATCH /api/v1/purchase-orders/:id/status → { status: "delivered" }
    ├── SaaS: OC.status = "delivered"
    ├── OC.stateHistory: [{ step: "delivered", at: "...", by: "admin" }]
    └── pub('purchase_order.delivered', { purchaseOrderId })

12. n8n: Confirmar recepción
    └── PATCH /api/v1/inventory/:productId → { delta: +receivedQuantity }

13. Proceso completado
    └── OC.status = "completed"
    └── pub('purchase_order.completed')  // futuro
```

---

## Anexo B: Esquema del Event Dispatcher

```typescript
// functions/eventDispatcher/index.ts
import { onValueWritten } from 'firebase-functions/v2/database';
import { getDatabase, ref, update, get } from 'firebase-admin/database';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const HOUSE_WEBHOOK_SECRET = process.env.HOUSE_WEBHOOK_SECRET;

const MAX_RETRIES = 3;
const RETRY_DELAYS = [5_000, 30_000, 300_000]; // 5s, 30s, 5min

// Mapa de eventos → workflows (single source of truth para ruteo)
const EVENT_WORKFLOW_MAP: Record<string, string | null> = {
  'inventory.stock.low':       'purchase-order-auto-v1',
  'purchase_order.created':    'purchase-order-auto-v1',
  'purchase_order.confirmed':  'purchase-order-auto-v1',
  'purchase_order.ready':      'purchase-order-auto-v1',
  'purchase_order.delivered':  'purchase-order-auto-v1',
};

export const dispatchEvent = onValueWritten(
  '/events/{tenantId}/pending/{eventId}',
  async (event) => {
    const { tenantId, eventId } = event.params;

    // Solo procesar CREACIONES, no actualizaciones
    if (event.data.after.exists() && event.data.before.exists()) return;

    const houseEvent = event.data.after.val();
    const workflowId = EVENT_WORKFLOW_MAP[houseEvent.type];

    // 1. Verificar si tiene workflow asociado
    if (!workflowId) {
      await moveToDone(eventId, tenantId, { deliveryStatus: 'no_workflow' });
      return;
    }

    // 2. Verificar feature flag
    const workflowEnabled = await checkWorkflowEnabled(tenantId, workflowId);
    if (!workflowEnabled) {
      await moveToDone(eventId, tenantId, { deliveryStatus: 'disabled' });
      return;
    }

    // 3. Lease atómico: mover a "processing"
    const leaseUntil = Date.now() + 30_000;
    await update(ref(getDatabase(), `/events/${tenantId}/processing/${eventId}`), {
      ...houseEvent,
      leaseUntil,
      attempts: [],
    });
    await ref(getDatabase(), `/events/${tenantId}/pending/${eventId}`).remove();

    // 4. Enviar a n8n con reintentos
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${N8N_API_KEY}`,
            'X-House-Signature': generateSignature(houseEvent),
            'X-House-Tenant': tenantId,
            'Idempotency-Key': eventId,
          },
          body: JSON.stringify(houseEvent),
        });

        if (response.ok) {
          await moveToDone(eventId, tenantId, {
            deliveryStatus: 'delivered',
            attempts: [...attempts, { timestamp: Date.now(), status: 'ok' }],
          });
          return;
        }

        // 4xx = error permanente
        if (response.status >= 400 && response.status < 500) {
          await moveToDone(eventId, tenantId, {
            deliveryStatus: 'failed',
            error: `n8n returned ${response.status}`,
          });
          return;
        }
      } catch (err) {
        console.error(`[DISPATCH] Attempt ${attempt + 1} failed:`, err);
      }

      // Esperar antes de reintentar
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAYS[attempt]);
      }
    }

    // 5. Todos los reintentos fallaron
    await moveToDone(eventId, tenantId, { deliveryStatus: 'failed', error: 'max retries exceeded' });
  }
);

async function moveToDone(eventId: string, tenantId: string, data: any) {
  const db = getDatabase();
  const updates: Record<string, any> = {};
  updates[`/events/${tenantId}/done/${eventId}`] = data;
  updates[`/events/${tenantId}/processing/${eventId}`] = null; // remove
  await update(ref(db), updates);
}

async function checkWorkflowEnabled(tenantId: string, workflowId: string): Promise<boolean> {
  const snapshot = await get(ref(getDatabase(),
    `/tenants/${tenantId}/workflows/${workflowId}/enabled`));
  return snapshot.val() !== false; // default: enabled
}
```

---

## Anexo C: Paquetes y Módulos Nuevos

```
packages/
  event-bus/                           # ← NUEVO (cross-cutting, no en apps/)
    package.json
    src/
      publisher.ts                     #   pub() — API pública
      types.ts                         #   HouseEvent, EventType
      catalog.ts                       #   Catálogo de eventos + mapa de ruteo
      validator.ts                     #   Validación de schemas
      signature.ts                     #   HMAC generation
    __fixtures__/
      stock-low.json
      po-created.json
      po-confirmed.json
      po-delivered.json
    testing/
      mockDispatcher.ts                #   Mock para desarrollo local
      injectFixture.ts                 #   Inyectar fixtures en RTDB

functions/
  eventDispatcher/                     # ← NUEVO (Cloud Function v2)
    index.ts
    package.json
  apiGateway/                          # ← NUEVO (Cloud Function HTTP)
    index.ts
    package.json

n8n/                                   # ← NUEVO
  docker-compose.yml
  workflows/
    purchase-order-auto-v1.json
  README.md
```

---

## Cambios vs Versión 1.0

| Aspecto | v1.0 | v2.0 |
|---------|------|------|
| **Event Bus** | PubSub + RTDB dual | RTDB solo con pending/processing/done |
| **Process Manager** | Cloud Function separada | Eliminado — status de la OC ES la máquina de estados |
| **Eventos en catálogo** | 25+ | 5 (Fase 1), resto documentado como "futuro" |
| **API Gateway** | Cloud Run | Cloud Functions HTTP |
| **n8n hosting** | Cloud Run / VPS | Docker Compose en VPS |
| **Paquete de eventos** | `apps/house-menu/src/events/` | `packages/event-bus/` |
| **Desarrollo local** | No mencionado | docker-compose + mock dispatcher + fixtures |
| **Rollback** | No mencionado | Feature flag kill switch + versionado |
| **Arquitectura** | Compleja, muchos servicios | Simple, mínimo stack viable |

---

*Documento generado el 2026-07-12. v2.0 — simplificado y enfocado en Fase 1.*
