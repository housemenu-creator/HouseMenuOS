# Tasks: Dispatch & Delivery Redesign

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~950-1100 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Phase 1 → Phase 2 → Phase 3 |
| Delivery strategy | ask-on-risk (default) |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation: store, utils, sub, wiring | PR 1 | ~333 changed lines; base = feature/tracker |
| 2 | Components: card base, badge, refactors | PR 2 | ~403 changed lines; base = PR 1 branch |
| 3 | Dashboard + DeliveryManager tabs | PR 3 | ~260 changed lines; base = PR 2 branch |

## Dependency Graph

```
delivery-utils ←── useDriverDelivery
       │
driverStore ← useDriverSubscription ← useDrivers
    ↕                            ↕
useDriverIdentity        DispatchView / RepartidorView
       │
OrderCardBase ←── DispatchOrderCard, DeliveryCard
       │
LiveDeliveryDashboard → DeliveryManager
```

## Phase 1: Foundation (store, utils, subscription)

- [ ] 1.1 Create `src/lib/delivery-utils.ts` — types + `isDeliveryOrder()`, `enrichOrder()`
- [ ] 1.2 Create `src/dispatch/store/driverStore.ts` — Zustand persist, merge both stores, localStorage migration
- [ ] 1.3 Create `src/dispatch/hooks/useDriverSubscription.ts` — single ref-based `onValue`
- [ ] 1.4 Modify `src/dispatch/hooks/useDrivers.ts` → thin re-export from new store
- [ ] 1.5 Modify `src/delivery/hooks/useDriverIdentity.ts` → read from driverStore, remove own sub
- [ ] 1.6 Modify `src/delivery/hooks/useDriverDelivery.ts` → use shared `isDeliveryOrder()`
- [ ] 1.7 Modify `DispatchView.jsx` + `RepartidorView.jsx` → new store/hooks imports
- [ ] 1.8 Delete old stores after verifying zero imports remain

## Phase 2: Shared Components

- [ ] 2.1 Create `OrderCardBase.tsx` — header, items, obs, timing, `topRight` + `actions` slots
- [ ] 2.2 Create `OrderTypeBadge.tsx` — LOCAL / DELIVERY / PARA LLEVAR
- [ ] 2.3 Create `DriverStatusBadge.tsx` — available/unavailable dot + label
- [ ] 2.4 Refactor `DispatchOrderCard.tsx` → wrap OrderCardBase
- [ ] 2.5 Refactor `DeliveryCard.tsx` → wrap OrderCardBase

## Phase 3: Admin Dashboard

- [ ] 3.1 Create `LiveDeliveryDashboard.tsx` — KPI cards, driver board, kanban pipeline
- [ ] 3.2 Modify `DeliveryManager.jsx` — add tabs: Config | Dashboard | Metrics
