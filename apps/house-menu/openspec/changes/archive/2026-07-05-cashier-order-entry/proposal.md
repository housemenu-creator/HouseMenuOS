# Proposal: cashier-order-entry

## Intent

Cashier staff see and manage orders but cannot create new ones. This blocks core POS flow: browse catalog → build cart → push order to kitchen → optionally take payment.

## Scope

### In Scope
- Product catalog browsing (searchable, categorized grid) inside Cashier
- Cart management: add/remove items, adjust quantities, customer name, table, notes
- Order creation via existing `useOrdersPipeline.createOrder()` with active sessionId
- Optional immediate payment via existing QuickPayModal after creation
- Integration with catalog subscription patterns from `menuService`

### Out of Scope
- Full CustomerView modifiers/variations wizard (future enhancement)
- Delivery zone selection, CRM customer lookup, points/discounts
- Offline queue wiring into cashier main flow

## Capabilities

> No existing `openspec/specs/` found — all capabilities are net-new.

### New Capabilities
- `catalog-browser`: Searchable, categorized product grid for staff order creation
- `order-builder`: Cart state management (items, quantities, customer fields, notes)
- `cashier-create-order`: Server-side order creation wired to cashier session and optional payment

### Modified Capabilities
- None — net-new feature; no existing spec-level behavior changes

## Approach

1. "Nuevo Pedido" button in `CashierUI.tsx` → opens `NewOrderModal`
2. `useCatalog` hook: subscribe via `menuService.subscribeToCatalog(branchId, cb)`
3. `useOrderBuilder` hook: local cart (items[], customerName, mesa, notes, total)
4. `NewOrderModal`: category tabs + product grid + cart footer
5. "Confirmar" → `useOrdersPipeline.createOrder(sessionId, payload)`
6. "Cobrar ahora" checkbox → opens `QuickPayModal` after creation
7. On success: close modal, refresh list, toast

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/cashier/components/CashierUI.tsx` | Modified | "Nuevo Pedido" button |
| `src/cashier/index.tsx` | Modified | Wire catalog + handlers |
| `src/cashier/hooks/useOrdersPipeline.ts` | Modified | Expose createOrder |
| `src/cashier/components/modals/NewOrderModal.tsx` | New | Product + cart modal |
| `src/cashier/hooks/useOrderBuilder.ts` | New | Local cart state |
| `src/cashier/hooks/useCatalog.ts` | New | Catalog subscription |
| `src/cashier/types.ts` | Modified | New types |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stock deduction on auth-user-created orders | Medium | Test with real catalog data first |
| No active session → orphan orders | Low | Disable "New Order" button when no open session |

## Rollback Plan

Revert `CashierUI.tsx`, `index.tsx`, and drop new hook/component files. Existing orders untouched — `createOrder()` path was already in the pipeline, just never called.

## Dependencies

- `menuService.subscribeToCatalog(branchId, cb)` — exists
- `useOrdersPipeline.createOrder()` — exists; verify optional payment flag
- `QuickPayModal` — exists for payment-at-creation

## Success Criteria

- [ ] Cashier can browse products and add items to cart
- [ ] Created order appears in RTDB with sessionId and reflects in pending orders list
- [ ] All existing 151 tests still pass
- [ ] New tests for `useOrderBuilder`, `useCatalog`, and `NewOrderModal`
