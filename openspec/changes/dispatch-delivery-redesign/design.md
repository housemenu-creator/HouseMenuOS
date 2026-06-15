# Design: Dispatch & Delivery Redesign

## Technical Approach

Extract shared utilities → merge 2 stores into 1 → unify 2 RTDB subscriptions into 1 → build slot-based shared card → compose admin dashboard on top. 3 isolated phases, each independently revertible.

## Architecture Decisions

### Store merger: both old stores → one persisted Zustand store

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep 2 stores, share via import | Each view mounts own sub, double RTDB reads, counter drift | ❌ |
| Merge into `@house/store` shared package | Over-abstracts — drivers are dispatch-domain | ❌ |
| **Merge into `dispatch/store/driverStore.ts` with persist middleware** | Follows existing `workerSessionStore` pattern, single source of truth | ✅ |

**Rationale**: Zustand 5 `persist` middleware already used in `workerSessionStore.ts`. Unified store serves both dispatch (full list + filters) and delivery (identity + availability) from one subscription.

### Single subscription hook with ref-based cleanup

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep 2 separate subscriptions | Double RTDB reads, race conditions | ❌ |
| **`useDriverSubscription(branchId)` with ref-based dedup** | Single `onValue`, feeds unified store, both views call it | ✅ |

**Rationale**: Both `useDrivers` and `useDriverIdentity` attached independent `onValue` listeners to the same RTDB path. The new hook uses the same ref-based cleanup pattern as `useDrivers` but is designed to be called once regardless of mount order.

### Component extraction: slot-based OrderCardBase

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep duplicate card rendering | ~80% shared layout duplicated | ❌ |
| **OrderCardBase with `topRight` + `actions` slots** | Full reusability, each card injects only its buttons | ✅ |

**Rationale**: Current `DispatchOrderCard` and `DeliveryCard` share header, items list, observaciones, timing, and urgency. Only action buttons and top-right metadata differ. Slots keep base clean without prop explosion.

## Data Flow

```
                    ┌─────────────────────────┐
                    │  Firebase RTDB           │
                    │  branches/{id}/delivery  │
                    │  /drivers                │
                    └──────────┬──────────────┘
                               │ onValue
                               ▼
               ┌───────────────────────────────┐
               │ useDriverSubscription(branchId)│
               │ (single ref-based listener)    │
               └──────────────┬────────────────┘
                              │ setDrivers()
                              ▼
               ┌───────────────────────────────┐
               │    driverStore (Zustand)       │
               │  ┌─────────────────────────┐   │
               │  │ persist: driverId,       │   │
               │  │   isAvailable            │   │
               │  │   (localStorage)         │   │
               │  └─────────────────────────┘   │
               └──┬──────────────┬──────────────┘
                  │              │
        .drivers  │    .driverId │ .isAvailable
                  ▼              ▼
         DispatchView      RepartidorView
    (full list, filters)   (identity, availability)
```

## Component Tree

```
LiveDeliveryDashboard (Phase 3)
├── KpiCard[] — pipeline stage counts
├── DriverStatusBoard — from unified store
└── OrderPipeline (kanban)
    ├── Column "recibido"
    ├── Column "preparando"
    ├── Column "listo"
    ├── Column "en_camino"
    └── Column "entregado"

OrderCardBase (Phase 2)
├── OrderTypeBadge — LOCAL | DELIVERY | PARA LLEVAR
├── Customer header + location
├── Items list
├── Observaciones
├── Timing + urgency
├── topRight slot   ──→ orderId + total (custom per card)
└── actions slot    ──→ buttons (custom per card)

DispatchOrderCard ──→ wraps OrderCardBase
    actions: ENTREGAR EN LOCAL / ASIGNAR REPARTIDOR / CONFIRMAR ENTREGA
DeliveryCard ──→ wraps OrderCardBase
    actions: MARCAR RECOGIDO / MARCAR ENTREGADO + Nav + Call
```

## Store Schema

```typescript
// src/dispatch/store/driverStore.ts
interface DriverState {
  // From old deliveryStore
  drivers: DeliveryDriver[];
  isLoading: boolean;
  error: string | null;
  driverFilter: 'todos' | 'disponibles' | 'en_ruta';

  // From old deliverySessionStore (persisted)
  driverId: string | null;
  driverName: string | null;
  isAvailable: boolean;
  completedDeliveries: number;

  // Actions
  setDrivers: (drivers: DeliveryDriver[]) => void;
  setDriver: (id: string, name: string) => void;
  setAvailability: (v: boolean) => void;
  incrementCompleted: () => void;
  setError: (e: string | null) => void;
  setDriverFilter: (f: 'todos' | 'disponibles' | 'en_ruta') => void;
  reset: () => void;

  // Derived selectors
  getAvailableDrivers: () => DeliveryDriver[];
  getDriversOnRoute: () => DeliveryDriver[];
}

// persist config (like workerSessionStore):
// name: 'house-delivery-session'
// partialize: { driverId, driverName, isAvailable, completedDeliveries }
```

## File Changes

| File | Action | Phase |
|------|--------|-------|
| `src/lib/delivery-utils.ts` | **Create** | P1 |
| `src/dispatch/store/driverStore.ts` | **Create** | P1 |
| `src/dispatch/hooks/useDriverSubscription.ts` | **Create** | P1 |
| `src/dispatch/store/deliveryStore.ts` | **Delete** | P1 |
| `src/delivery/store/deliverySessionStore.ts` | **Delete** | P1 |
| `src/dispatch/hooks/useDrivers.ts` | **Modify → becomes thin re-export** | P1 |
| `src/delivery/hooks/useDriverIdentity.ts` | **Modify → reads unified store** | P1 |
| `src/delivery/hooks/useDriverDelivery.ts` | **Modify → use shared `isDeliveryOrder()`** | P1 |
| `src/dispatch/components/OrderCardBase.tsx` | **Create** | P2 |
| `src/dispatch/components/OrderTypeBadge.tsx` | **Create** | P2 |
| `src/dispatch/components/DriverStatusBadge.tsx` | **Create** | P2 |
| `src/dispatch/components/DispatchOrderCard.tsx` | **Modify → wrap OrderCardBase** | P2 |
| `src/delivery/components/DeliveryCard.tsx` | **Modify → wrap OrderCardBase** | P2 |
| `src/admin/components/LiveDeliveryDashboard.tsx` | **Create** | P3 |
| `src/admin/components/DeliveryManager.jsx` | **Modify → add tabs** | P3 |
| `src/pages/DispatchView.jsx` | **Modify → use shared `isDeliveryOrder()`** | P1 |
| `src/pages/RepartidorView.jsx` | **Modify → use unified store** | P1 |

## Key Implementation Details

**Subscription dedup**: `useDriverSubscription` uses a module-level ref or global subscription bus to ensure only one `onValue` listener exists even when both DispatchView and RepartidorView mount simultaneously. Pattern: store the unsubscribe function in a ref outside React — if ref already populated, skip creating a new listener.

**Persistence migration**: Old `deliverySessionStore` used manual `localStorage.setItem`. New store uses `zustand/middleware/persist`. On first load, read old key `house-delivery-session` and migrate to new key `house-delivery-driver`, then remove old key. The key name changes to avoid conflict with any tab that still imports the old store during rollout.

**OrderCardBase states**: Since both cards already handle states inline, the base incorporates 4 visual states internally: loading (skeleton), empty (no orders message), error (alert banner), populated (full card layout). The `actions` slot receives `null` for non-populated states.

**DeliveryManager tab refactor**: Current component has `activeTab` as local state. New tabs: `config` (renamed from `drivers` — contains driver/zone/tariff subs), `dashboard` (new), `metrics` (existing metrics + ranking). Each tab's content stays as isolated sections. No structural changes to existing tabs.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `isDeliveryOrder()`, `enrichOrder()`, `DeliveryType` | Pure function tests with known inputs |
| Unit | driverStore actions + persisted selectors | Zustand store unit tests |
| Integration | `useDriverSubscription` → store flow | Mock `onValue` RTDB, verify store updates |
| Visual | Both cards after refactor | No assertion changes — existing tests must pass |
| Visual | Dashboard 4 states | Vitest + jsdom render tests |

## Migration

1. Merge stores → deploy (old stores still importable but deprecated)
2. Create shared utils + new subscription hook → deploy (old hooks still work)
3. Delete old stores → deploy after confirming no imports remain
4. Replace old hook usage in pages → deploy
5. Create base card + refactor wrapper cards → deploy, verify no visual diff
6. Add dashboard + refactor DeliveryManager → deploy

## Open Questions

- [ ] Confirm the `useDrivers.ts` file should become a thin re-export (backward compat) or be deleted directly
- [ ] Confirm DeliveryManager.jsx .jsx→.tsx migration scope (spec doesn't mention it)
