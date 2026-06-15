# Proposal: Dispatch & Delivery Redesign

## Intent

Dispatch and delivery modules evolved independently into two parallel implementations sharing the same Firebase RTDB data. Two stores (`deliveryStore`, `deliverySessionStore`), two subscriptions to `branches/{id}/delivery/drivers`, duplicated delivery type detection in 3 files, and 40% shared card rendering without components. Causes RTDB read waste, counter drift, and maintenance overhead. Unify the architecture.

## Scope

### In Scope
- Merge both driver stores into one, eliminate double RTDB subscription
- Extract `isDeliveryOrder()` / `enrichOrder()` shared utility
- Build `OrderCardBase` with slot-based action injection; refactor both cards onto it
- Extract `DriverStatusBadge`, `OrderTypeBadge`
- Live admin dashboard (dispatch + delivery monitoring)
- Merge `DeliveryManager` config into tabbed admin view

### Out of Scope
- Delivery pricing/tariff, geolocation tracking, KDS panel
- Firebase RTDB data model — client-side architecture only

## Capabilities

### New Capabilities
- `dispatch-delivery-shared`: Shared store, utilities, and base components for both modules
- `admin-delivery-dashboard`: Live monitoring dashboard with driver states, order pipeline, KPIs

### Modified Capabilities
None — first specs for this domain.

## Approach

1. **Phase 1 — Foundation**: Extract `isDeliveryOrder`/`enrichOrder` into `src/lib/delivery-utils.ts`. Merge both stores under `src/dispatch/store/`. Unify driver subscription in one hook consumed by both dispatch and delivery.
2. **Phase 2 — Shared Components**: Build `OrderCardBase` (header, items, observations, timing). Refactor `DispatchOrderCard` and `DeliveryCard` as wrappers injecting action buttons. Extract `DriverStatusBadge`, `OrderTypeBadge`.
3. **Phase 3 — Admin Dashboard**: Add `LiveDeliveryDashboard` (driver states, order pipeline, KPIs). Merge `DeliveryManager` config into tabbed view.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `dispatch/store/deliveryStore.ts` | Removed | Merged into unified store |
| `delivery/store/deliverySessionStore.ts` | Removed | Merged, session persistence preserved |
| `dispatch/hooks/useDrivers.ts` | Modified | Single shared subscription |
| `delivery/hooks/useDriverIdentity.ts` | Modified | Reads from shared store |
| `dispatch/components/DispatchOrderCard.tsx` | Modified | Uses OrderCardBase |
| `delivery/components/DeliveryCard.tsx` | Modified | Uses OrderCardBase |
| `pages/DispatchView.jsx` | Modified | Uses shared utilities |
| `admin/components/DeliveryManager.jsx` | Modified | Merged with dashboard |
| `lib/deliveryService.ts` | Modified | Exports shared utilities |
| (new files) | New | OrderCardBase, badges, dashboard, delivery-utils |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Store merge breaks in-flight sessions | Med | Preserve localStorage session in unified store, test migration |
| Shared card refactor causes visual regressions | Med | Visual diff per card after refactor |
| Admin dashboard scope creep | Low | Phase isolation, KDS panel explicitly OOS |

## Rollback Plan

Per-phase commits. Revert any phase independently. Store merge needs localStorage migration test before release.

## Dependencies

- None external. Shared utils go in `src/lib/` or `@house/store`.

## Success Criteria

- [ ] Single `onValue` subscription for all driver data across dispatch + delivery
- [ ] `isDeliveryOrder()` used by every file that needs delivery detection — zero inline duplicates
- [ ] Both cards share `OrderCardBase` — no duplicated header/items/timing rendering
- [ ] Admin dashboard shows live driver states, order pipeline, and KPIs
- [ ] All existing tests pass; no regressions in dispatch or delivery flows
