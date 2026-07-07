# Proposal: Admin Orders Overhaul

## Intent

OrdersTab.jsx (763 lines, monolithic) has 3 critical bugs, no pagination, no loading states, and requires 3+ clicks per status change. Fix bugs, extract modals, add power-user features for high-throughput admin workflows.

## Scope

### In Scope
- Fix `addOrderNote` double definition, `batchUpdateOrderStatus` wrong paths, delivery notification check, missing `pendiente_pago` type
- Extract 5 modals to `src/admin/components/orders/`
- Quick status actions bar in expanded rows
- New order pulse/glow highlight (<60s)
- Pagination or virtual scrolling
- Loading/empty/error/populated states
- Order type filter (delivery/pickup/local)
- Column sorting (date, amount, status)
- Keyboard shortcuts (j/k navigate, 1-5 quick status, Enter expand)
- Optimistic UI on mutations
- Mobile responsive table
- Cobrar confirmation step
- Add items in edit modal
- `pendiente_pago` in status timeline

### Out of Scope
- Order creation (Cashier/NewOrder module)
- KDS/kitchen display overhaul
- Delivery driver app
- Order deletion (hard delete from DB)
- Multi-branch management

## Capabilities

### New Capabilities
- `orders-admin`: Admin order listing, filtering, status management, modals, real-time updates

### Modified Capabilities
- None

## Approach

Phase 1 — **Bugfixes**: Fix `addOrderNote` (rename second overload to `appendOrderNote` or consolidate), fix `batchUpdateOrderStatus` paths to write root fields, fix notification check in `useAdminOrders.ts` (`order.status === 'pendiente'` → correct field), add `pendiente_pago` to worker type union.

Phase 2 — **Architecture**: Extract CobrarModal, EditOrderModal, NotesModal, RefundModal, VerifyPaymentModal to separate files. Decompose OrdersTab into table component, filters bar, expanded row.

Phase 3 — **UX**: Quick status buttons, keyboard shortcuts, pagination, column sorting, new-order highlighting, optimistic UI via Zustand orderStore.

Phase 4 — **Polish**: Mobile responsive, 4-state rendering (loading/empty/error/populated), Cobrar confirmation, add-item in edit modal.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/ordersService.js` | Modified | Fix double addOrderNote, fix batch paths |
| `src/admin/hooks/useAdminOrders.ts` | Modified | Fix delivery notification check |
| `src/admin/tabs/OrdersTab.jsx` | Refactored | Split into components |
| `src/admin/components/orders/` | New | 5 modal components |
| `src/lib/paths.js` | TBD | May need root-level batch paths |
| `src/lib/orderTypes.js` | Modified | Add `pendiente_pago` to type union |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| ordersService changes affect KDS/delivery/cashier | High | Backward-compatible signatures, keep both overloads with wrapper |
| Pagination changes AdminView parent data flow | Medium | Push pagination state down to OrdersTab, keep parent filter interface |
| New order highlight timezone edge cases | Low | Use server timestamps, not client time |

## Rollback Plan

1. Revert `ordersService.js` to last commit — all consumers restore immediately
2. If UX changes break workflow, revert `OrdersTab.jsx` to monolithic version
3. Keep old files until Phase 4 completes — delete after QA sign-off

## Dependencies

- Zustand orderStore (already exists — extend for optimistic state)
- Firebase RTDB (`branches/{branchId}/orders/{orderId}`)

## Success Criteria

- [ ] All 4 critical bugs verified fixed by unit test
- [ ] Each modal extracted to own file with loading/error states
- [ ] Status change == 2 clicks max (expand + quick-status button)
- [ ] Table renders 200+ orders without jank
- [ ] Keyboard shortcuts work without focus issues
- [ ] All existing order service consumers pass their test suites
