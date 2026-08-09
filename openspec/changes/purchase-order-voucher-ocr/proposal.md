# Proposal: Purchase Order Voucher OCR

## Intent

Receiving purchase orders in house-menu requires manually typing quantities and unit costs from a physical boleta/factura/nota de venta into the "Recibir orden" modal — slow and error-prone. Add voucher upload + Gemini OCR extraction to prefill the modal; a human confirms before any stock moves.

## Scope

### In Scope
- Upload voucher image in "Recibir orden" modal → Firebase Storage; persist `voucherUrl` (+ `voucherFileName`, `uploadedAt`) on the PO record
- `extractVoucher(imageBase64, expectedItems)` in aiService.ts — Gemini 2.0 Flash JSON mode → `{ items: [{name, quantity, unitCost}], total, ruc, serie }`
- Fuzzy-match extracted lines to PO items; show matched/unmatched to the user
- Prefill qty/cost inputs; confirmation calls existing `receivePurchaseOrder` unchanged

### Out of Scope
- Auto-committing stock without human confirmation (non-negotiable)
- Multi-page PDFs, voucher archival/history UI, supplier auto-matching, credit notes

## Capabilities

### New Capabilities
- `purchase-order-voucher-extraction`: voucher upload, OCR extraction, and prefill matching for PO reception

### Modified Capabilities
None — first specs for this domain.

## Approach

1. **Upload**: file input in ReceiveOrderModal → `storageService` upload → save `voucherUrl` on `branches/{branchId}/logistics/purchase_orders/{orderId}`
2. **Extract**: new `extractVoucher()` in aiService.ts (image via `inline_data` + expected item names → structured JSON)
3. **Prefill**: map extracted items onto modal rows (fuzzy name match); unmatched flagged visually, left empty
4. **Confirm**: existing `receivePurchaseOrder` — atomic lock, stock/kardex, price-change detection, `purchase_order.delivered` — untouched

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/house-menu/src/admin/tabs/LogisticsTab.jsx` | Modified | Upload UI, extraction state, prefill, matched/unmatched display |
| `apps/house-menu/src/lib/aiService.ts` | Modified | Add `extractVoucher` (JSON mode, inline_data) |
| `apps/house-menu/src/lib/logisticsService.js` | Modified | Attach `voucherUrl` when saving PO |
| `apps/house-menu/src/lib/storageService.js` | Reused | Existing upload path, no change |
| Firebase Storage rules | Modified | Allow authenticated uploads to `vouchers/` path |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| OCR misreads quantities/costs | Med | Prefill only; totals recalculated from editable inputs; human confirms |
| Fuzzy name mismatch (supplier vs ingredient names) | Med | Matched/unmatched shown; unmatched left for manual entry |
| Image too large / API request limits | Med | Client-side size cap + downscale before send |
| Missing `VITE_GEMINI_API_KEY` | Low | Graceful error toast; manual entry still fully works |

## Rollback Plan

Revert the change's commits. `voucherUrl` is additive (new fields) — no data migration. Reception path is untouched, so stock integrity is never at risk. Removing the UI block + `extractVoucher` restores prior behavior exactly.

## Dependencies

- `VITE_GEMINI_API_KEY` in apps/house-menu env
- Firebase Storage rules permitting upload (existing bucket `house-menuapp.firebasestorage.app`)
- Existing: aiService JSON mode, storageService, `receivePurchaseOrder`, event catalog

## Success Criteria

- [ ] Uploading a boleta persists `voucherUrl` on the PO record in RTDB
- [ ] `extractVoucher` returns structured items; modal qty/cost inputs prefilled
- [ ] Matched/unmatched items visible before confirmation
- [ ] Confirmed reception completes via `receivePurchaseOrder` — stock/kardex updated, `purchase_order.delivered` published
- [ ] `npm run test -w apps/house-menu` passes; manual E2E with a real boleta
