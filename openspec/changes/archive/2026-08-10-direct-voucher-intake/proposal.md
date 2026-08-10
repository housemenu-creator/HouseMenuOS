# Proposal: direct-voucher-intake

## Intent

Admins can only ingest a boleta/factura when receiving a pending Purchase Order. Supermarket/retail purchases without a PO (paper towels, detergent, extra stock) can't be registered in kardex. This adds a direct voucher intake flow: scan a boleta, OCR its lines, match against existing ingredients, and register stock entries — with human confirmation for anything new.

## Scope

### In Scope
- "Ingresar boleta" button + modal in the Compras tab (LogisticsTab)
- Reuse `validateVoucherFile` + `storageService.uploadVoucher` + `extractVoucher` (Gemini, Tesseract fallback)
- Fuzzy-match extracted lines against existing ingredients via `voucherMatch.fuzzyMatch`
- Matched lines: editable quantity/cost prefilled from OCR
- Unmatched lines: per-line admin approval before creating new ingredients; skip or approve each
- On confirm: `registerMovement` (entrada, reason 'Compra'), ingredient cost update, audit logs

### Out of Scope
- Auto-creating ingredients for unmatched lines (explicitly rejected — decision b)
- Dedicated direct-purchase record node in RTDB (kardex movements + audit logs are the record)
- Finanzas event wiring (`purchase_order.delivered` is PO-specific)
- Editing/deleting past direct purchases

## Capabilities

### New Capabilities
- `logistics-direct-purchase`: scan boleta without PO → OCR → fuzzy match vs existing ingredients → admin-confirmed stock entry (entrada/'Compra') + optional cost update + audit

### Modified Capabilities
- None — no existing spec-level behavior changes

## Approach

1. DirectVoucherModal (or inline modal in LogisticsTab) with upload → extract → confirm steps, mirroring the existing PO receipt modal (cm-* tokens, AnimatePresence)
2. Upload: `validateVoucherFile` → `storageService.uploadVoucher(branchId, '<direct-ref>', file)` → `extractVoucher(file, [])` → `fuzzyMatch(items, ingredientsById)` — the ingredients map already fits the `{id: {name}}` shape fuzzyMatch expects
3. Matched lines → editable qty/cost rows, prefilled from OCR with the untouched-tracking pattern from the receive modal
4. Unmatched lines → **decision (b)**: each rendered with a "create as new ingredient" toggle + editable name/unit; NEVER created without explicit per-line admin approval; non-ingredients (detergent, bags) simply skipped
5. Confirm → new `recordDirectPurchase(branchId, { matched, newIngredients, voucherUrl }, actor)` in logisticsService.js: create approved ingredients (stock 0) → `registerMovement` per line (entrada, 'Compra', reference `VOUCHER-xxx`) → update ingredient cost → `auditLog`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/admin/tabs/LogisticsTab.jsx` | Modified | "Ingresar boleta" button + modal state/handlers |
| `src/admin/components/logistics/DirectVoucherModal.jsx` | New | Upload/extract/confirm wizard (small) |
| `src/lib/logisticsService.js` | Modified | `recordDirectPurchase` |
| `src/lib/__tests__/logisticsService.directPurchase.test.js` | New | node test style, like receivePurchaseOrder tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| OCR matches wrong ingredient | Medium | Match score shown; admin edits qty/cost before confirm |
| New ingredient created with bad name/unit | Low | Per-line approval + editable fields before create |
| Duplicate movements on double-submit | Low | Confirm disabled while running |

## Rollback Plan

Remove the button/modal (no schema changes). Erroneous movements corrected via existing kardex 'ajuste' flow; ingredient deletions via existing `deleteIngredient`.

## Dependencies

- Existing only: `extractVoucher`, `fuzzyMatch`, `registerMovement`, `createIngredient`, `auditLog`, `uploadVoucher`
- No new packages, no new RTDB paths

## Success Criteria

- [x] Admin completes a direct intake with no PO in <2 min
- [x] Unmatched lines create zero ingredients without per-line approval
- [x] Kardex shows entrada/'Compra' movements with correct stock deltas and reference
- [x] Cost updates + audit logs recorded for confirmed lines
- [x] `recordDirectPurchase` covered by tests (matched-only, mixed, all-unmatched, skip paths) — verified 2026-08-10: sdd-verify PASS, 765/765 tests pass, build OK
