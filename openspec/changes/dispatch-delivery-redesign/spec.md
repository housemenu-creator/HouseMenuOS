# Spec: Dispatch & Delivery Redesign

## Phase 1 — Foundation: Store, Utilities & Subscription

### Requirements

| ID | Req | Strength |
|----|-----|----------|
| F1 | `isDeliveryOrder(order)` in `src/lib/delivery-utils.ts` | MUST |
| F2 | Detection: `(order.type \|\| order.order_type \|\| '').includes('delivery')` lowercased | SHALL |
| F3 | Export `DeliveryType` and `EnrichedOrder` (extends Order + `waitingMs`, `urgency`, `deliveryType`) | MUST |
| F4 | `enrichOrder(order)` returns `EnrichedOrder` | MUST |
| F5 | Unified `driverStore` merging `deliveryStore` + `deliverySessionStore` | MUST |
| F6 | `driverStore` persists `driverId`, `isAvailable` to localStorage | MUST |
| F7 | `driverStore` exposes full list (dispatch) AND single identity (delivery) | MUST |
| F8 | `useDriverSubscription(branchId)` — single `onValue` to `branches/{id}/delivery/drivers` | MUST |
| F9 | Both DispatchView and RepartidorView use it, regardless of mount order | SHALL |
| F10 | `useDriverIdentity` reads from unified store, no own subscription | MUST |
| F11 | Delete both old stores | MUST |

### Scenarios

**F5 — Unified store drives dispatch:** GIVEN dispatch page loads WHEN subscription fires THEN store has full driver list.
**F6 — Session persists reload:** GIVEN driver set `isAvailable` WHEN they reload THEN store reads localStorage, no RTDB write.
**F9 — One sub:** GIVEN both views mounted WHEN both render THEN exactly one `onValue` listener attached.

### Files

**Create:** `src/lib/delivery-utils.ts`, `src/dispatch/store/driverStore.ts`, `src/dispatch/hooks/useDriverSubscription.ts`
**Delete:** `src/dispatch/store/deliveryStore.ts`, `src/delivery/store/deliverySessionStore.ts`
**Modify:** `useDriverIdentity.ts`, `useDrivers.ts`

### Acceptance

1. No inline `includes('delivery')` remains
2. Old store deletion doesn't break views
3. Driver session survives page refresh

---

## Phase 2 — Shared Components: OrderCardBase & Badges

### Requirements

| ID | Req | Strength |
|----|-----|----------|
| S1 | `OrderCardBase` renders header (name, type badge, ID), items, observations, timing | MUST |
| S2 | Props: `order: EnrichedOrder`, `topRight?: ReactNode`, `actions?: ReactNode` | MUST |
| S3 | `DispatchOrderCard` uses base, injects actions | MUST |
| S4 | `DeliveryCard` uses base, injects pickup/deliver/call/navigate | MUST |
| S5 | `OrderTypeBadge`: LOCAL / DELIVERY / PARA LLEVAR | MUST |
| S6 | `DriverStatusBadge`: available/unavailable dot + text | MUST |
| S7 | Base uses same motion patterns as existing | SHOULD |
| S8 | No visual regression vs pre-refactor | MUST |

### Scenarios

**S3 — Del dispatch card:** GIVEN delivery order `listo` WHEN base renders THEN actions slot has "ASIGNAR REPARTIDOR".
**S4 — Driver card:** GIVEN order `en_camino` WHEN card renders THEN actions slot has "Entregado", "Navegar", "Llamar".
**S8 — No diff:** GIVEN refactored card WHEN compared pixel-by-pixel THEN no difference.

### Files

**Create:** `src/dispatch/components/OrderCardBase.tsx`, `OrderTypeBadge.tsx`, `DriverStatusBadge.tsx`
**Modify:** `DispatchOrderCard.tsx`, `DeliveryCard.tsx`

### Acceptance

1. Base renders loading, empty, populated, error states
2. Both card tests pass without assertion changes
3. Visual diff matches pre-refactor

---

## Phase 3 — Admin Dashboard: Live Monitoring

### Requirements

| ID | Req | Strength |
|----|-----|----------|
| D1 | `LiveDeliveryDashboard` in `src/admin/components/` | MUST |
| D2 | KPIs per pipeline stage (recibido → preparando → listo → en_camino → entregado) | MUST |
| D3 | Driver status board: available, on route, offline | MUST |
| D4 | Kanban order pipeline per stage | MUST |
| D5 | Consumes `driverStore` + `orderStore` | MUST |
| D6 | `DeliveryManager.jsx` tabbed: Config / Dashboard / Metrics | MUST |
| D7 | Kanban uses `AnimatePresence` | SHOULD |

### Scenarios

**D2 — Live KPI:** GIVEN dashboard open WHEN order enters `listo` THEN that KPI increments, previous decrements.
**D4 — Kanban:** GIVEN orders in multiple stages WHEN dashboard renders THEN each stage column shows its orders.
**D6 — Tabs preserved:** GIVEN DeliveryManager open WHEN mounted THEN 3 tabs visible AND Config tab unchanged.

### Files

**Create:** `src/admin/components/LiveDeliveryDashboard.tsx`
**Modify:** `src/admin/components/DeliveryManager.jsx`

### Acceptance

1. Dashboard renders loading, populated, empty, error states
2. Existing Config + Metrics tabs work identically
3. Kanban collapses to single-column on mobile


