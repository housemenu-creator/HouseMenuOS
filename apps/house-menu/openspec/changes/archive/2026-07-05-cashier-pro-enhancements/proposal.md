# Proposal: Cashier Pro Enhancements

## Intent

Transform cashier from modal-based to keyboard-first POS with instant product access, CRM autocomplete, persistent cart, and auto kitchen-ticket printing.

## Scope

### In Scope

1. **Quick Product Grid** — Inline split view (grid top, cart bottom) in right column. Toggle mode via button.
2. **Keyboard Shortcuts** — N (order mode), Enter (confirm), Esc (cancel), P (QuickPay), 1-9 (quick-add), arrows.
3. **Variations/Modifiers** — Bottom sheet for `isWizard` products. Selection on cart item.
4. **Customer CRM Search** — Autocomplete via `customerService.subscribeCustomers()`. Fills name + mesa.
5. **Persistent Cart Badge** — Header item count always visible. Click re-opens builder.
6. **Auto-Print Comanda** — Kitchen ticket via `receiptEngine` + hidden iframe `window.print()`.

### Out of Scope

- Physical printer drivers, multi-order queue, touch gestures, customer creation

## Capabilities

### New Capabilities

- `cashier-keyboard-shortcuts`: Global keyboard nav in ordering mode
- `customer-crm-search`: Customer autocomplete from RTDB CRM
- `persistent-cart`: Header badge + state across mode toggles
- `kitchen-print`: Thermal ticket generation + print trigger

### Modified Capabilities

- `catalog-browser`: Inline render, expose variations/modifiers raw data, numbered quick-add
- `order-builder`: Cart items carry variation selections; CRM enriches metadata
- `cashier-create-order`: Trigger auto-print; update persistent cart state

## Approach

Extract OrderingLayout from NewOrderModal → inline render. 4 new hooks (keyboard shortcuts, product variations, customer search, printService). Extend useCatalog for variations data. Lift cart count to index.tsx. Remove newOrder modal path.

## Affected Areas

| Area | Impact |
|------|--------|
| `cashier/components/CashierUI.tsx` | Modified — inline layout, cart badge |
| `cashier/hooks/useCatalog.ts` | Modified — expose variations/modifiers |
| `cashier/hooks/useOrderBuilder.ts` | Modified — variation data on CartItem |
| `cashier/types.ts` | Modified — extend CatalogProduct, CartItem |
| `cashier/index.tsx` | Modified — lift cart state, wire print |
| `cashier/hooks/` | New — 4 hooks |
| `cashier/services/` | New — `printService.ts` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Variations missing from RTDB data | Med | Graceful skip if no variations |
| `window.print()` blocked | Low | Fallback manual print button |
| Shortcut conflicts with browser | Low | Scope to ordering mode only |

## Rollback Plan

Revert `CashierUI.tsx` to `<NewOrderModal>`. Keep hooks unmounted. Flag `fallback: 'modal'` restores old path.

## Dependencies

- `customerService.subscribeCustomers()` in `src/lib/customerService.js`
- `receiptEngine` in `cashier/services/receiptEngine.ts`

## Success Criteria

- [ ] Product added in 1 click vs. 3 (modal): measured interaction count
- [ ] Full keyboard-only order creation flow
- [ ] Variations/modifiers shown as sheet + in cart payload
- [ ] Customer autocomplete returns 5+ results
- [ ] Cart badge persists across mode toggles
- [ ] Kitchen ticket prints on order creation
- [ ] All existing tests pass; new hooks have unit tests
