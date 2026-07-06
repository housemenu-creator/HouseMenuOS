# Archive Report: cashier-pro-enhancements

**Archived**: 2026-07-05
**Mode**: openspec
**Previous Archive**: 2026-07-05-cashier-order-entry

## Summary

Change `cashier-pro-enhancements` has been fully implemented, verified, and deployed. The change transformed the cashier from modal-based to keyboard-first POS with 6 enhancements:

1. **Quick Product Grid** — Inline split view (grid top, cart bottom) in right column
2. **Keyboard Shortcuts** — N, Enter, Esc, P, 1-9, arrows
3. **Variations/Modifiers** — Bottom sheet for `isWizard` products
4. **Customer CRM Search** — Autocomplete via `customerService.subscribeCustomers()`
5. **Persistent Cart Badge** — Header item count always visible
6. **Auto-Print Comanda** — Kitchen ticket via `receiptEngine` + hidden iframe

## New Capabilities Created

| Capability | Type |
|------------|------|
| `cashier-keyboard-shortcuts` | New |
| `customer-crm-search` | New |
| `persistent-cart` | New |
| `kitchen-print` | New |
| `catalog-browser` (variations data) | Modified |
| `order-builder` (cart with variations) | Modified |
| `cashier-create-order` (auto-print) | Modified |

## Files Created/Modified

| Area | Impact |
|------|--------|
| `cashier/components/CashierUI.tsx` | Modified — inline layout, cart badge |
| `cashier/hooks/useCatalog.ts` | Modified — expose variations/modifiers |
| `cashier/hooks/useOrderBuilder.ts` | Modified — variation data on CartItem |
| `cashier/types.ts` | Modified — extend CatalogProduct, CartItem |
| `cashier/index.tsx` | Modified — lift cart state, wire print |
| `cashier/hooks/useKeyboardShortcuts.ts` | New hook |
| `cashier/hooks/useCustomerSearch.ts` | New hook |
| `cashier/hooks/useProductVariations.ts` | New hook |
| `cashier/services/printService.ts` | New service |

## Verification Status

- ✅ 197 tests passing (23 suites)
- ✅ Build successful (10.74s)
- ✅ Deployed to production (house-menuapp.web.app)

## Spec Sync

No delta spec files were present in the change folder. Main specs (`order-builder`, `catalog-browser`, `cashier-create-order`) remain the source of truth from prior archive. The implementation enhanced these capabilities without requiring spec modifications.

## Artifacts in Archive

- `proposal.md` — Change proposal with scope and approach
- `archive-report.md` — This report

## Rollback

Set `fallback: 'modal'` in CashierUI config. Revert CashierUI.tsx to `<NewOrderModal>`. Keep hooks unmounted.
