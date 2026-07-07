# Tasks: Admin Orders Overhaul

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1200–1700 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (bugfixes) → PR 2 (hooks + modals) → PR 3 (components + integration + polish) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base | Notes |
|------|------|-----------|------|-------|
| 1 | Fix 4 bugs + add missing statuses | PR 1 | main | ~50 lines, isolated, no behavioral change |
| 2 | Create 3 hooks + extract 5 modals | PR 2 | main | ~500 lines, foundation, no consumer changes |
| 3 | 4 UI components + OrdersTab refactor + polish (25 tasks total) | PR 3 | main | ~700 lines, all UX+integration work |

## Phase 0: Bugfixes

- [ ] T1: Fix `addOrderNote` double def in `ordersService.js` — remove first overload (writes `internalNote`), keep array-append
- [ ] T2: Fix `batchUpdateOrderStatus` paths — write `order.status` + `order.updatedAt` as root fields via `ordersPath()` in `paths.js`
- [ ] T3: Fix delivery notification in `useAdminOrders.ts` — check `(type\|order_type)` + `payment_status` instead of `status === 'pendiente'`
- [ ] T4: Add `pendiente_pago` + `programado` to `ORDER_STATUSES`, `STATUS_WORKFLOW` in `workerTypes.ts`

## Phase 1: Hooks

- [ ] T5: Create `useOrdersDisplay` hook — pagination (50/page), column sorting, order type filter (Todos/Delivery/Recojo/Local), 4-state (loading/empty/error/populated)
- [ ] T6: Create `useKeyboardNav` hook — j/k navigate, Enter expand, Esc deselect, 1-5 quick status, c cobrar, p print
- [ ] T7: Create `useOptimisticUpdate` utility — wrap Zustand `orderStore.applyChange`, revert on error, toast on success/fail

## Phase 2: Modal Components

All go into `src/admin/components/orders/`

- [ ] T8: Extract `VerifyPaymentModal.jsx` — voucher display, verify/reject flow, loading states, reject reason input
- [ ] T9: Extract `CobrarModal.jsx` — method selection (Efectivo/Yape/Tarjeta), final confirmation step
- [ ] T10: Extract `EditOrderModal.jsx` — inline item editing, quantity +/- , remove item, recalculate total
- [ ] T11: Extract `NotesModal.jsx` — textarea bound to `notes[]` array, fallback to deprecated `internalNote`
- [ ] T12: Extract `RefundModal.jsx` — amount input, method grid, reason field, confirm dialog

## Phase 3: UI Components

- [ ] T13: Create `QuickStatusActions.jsx` — single-click Preparando→Listo→Entregado buttons, gated by `orders:update_status`, Entregado needs confirm
- [ ] T14: Create `OrdersToolbar.jsx` — search input + order type pills (Todos/Delivery/Recojo/Local) + payment filter pills
- [ ] T15: Create `OrdersTable.jsx` — sortable headers (ID, Cliente, Estado, Total, Fecha), expandable rows, new-order pulse + NUEVO badge (<60s), empty state row
- [ ] T16: Create `OrderDetailPanel.jsx` — items table, financial summary, action buttons (Editar/Nota/Imprimir/Reembolsar/Cancelar)

## Phase 4: Integration

- [ ] T17: Refactor `OrdersTab.jsx` — delegate all state to `useOrdersDisplay`, import and wire all 9 components, remove 500+ lines of inline modal code
- [ ] T18: Wire `useKeyboardNav` to expanded rows, status buttons, and cobrar shortcut — hint tooltip on hover
- [ ] T19: Wrap all mutations (cobrar, edit items, save notes, refund) with `useOptimisticUpdate` via Zustand `orderStore.applyChange`
- [ ] T20: Implement 4-state rendering — 6 skeleton rows (loading), illustration+CTA (empty), message+Reintentar (error), table (populated)
- [ ] T21: Add new-order highlight — CSS pulse animation + "NUEVO" badge for orders with `createdAt` <60s ago, auto-fade after threshold
- [ ] T22: Add mobile responsive — `<md` breakpoint renders card layout instead of table, modals become bottom sheets with drag-to-dismiss

## Phase 5: Polish

- [ ] T23: Add second confirmation step before Cobrar executes (method selected → "Confirmar cobro?" dialog)
- [ ] T24: Add "Agregar item" button to `EditOrderModal` — inserts blank row, persists on save alongside full `items[]`
- [ ] T25: Clean unused props from `AdminView.jsx` — inline searchQuery/filter state is no longer needed if `OrdersTab` owns its own filters now (keep backward-compat if other tabs consume them)
