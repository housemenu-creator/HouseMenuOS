# Tasks: Purchase Order Voucher OCR

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350–450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Foundation + Upload → PR 2: Extraction + Match → PR 3: Confirmation + Tests |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation services (aiService, logisticsService, storageService verify) + Voucher upload UI | PR 1 | Base: main; includes storage rules verify, upload validation, voucher preview |
| 2 | OCR extraction + fuzzy match + prefill UI | PR 2 | Base: PR 1 branch; extractVoucher, normalizeForMatch, fuzzyMatch, matched/unmatched UI, real-time totals |
| 3 | Confirmation wiring + graceful degradation + tests | PR 3 | Base: PR 2 branch; receivePurchaseOrder unchanged, manual fallback, re-run, unit/integration/E2E tests |

## Phase 1: Foundation (Services — No UI)

- [ ] 1.1 Add `VoucherLineItem`, `VoucherExtractionResult` types and `extractVoucher()` to `apps/house-menu/src/lib/aiService.ts` with SYSTEM_EXTRACT_VOUCHER prompt, base64 prefix stripping, expectedItems context, 8s timeout, JSON parse + confidence clamping; export `AI_STEPS_EXTRACT_VOUCHER` array
- [ ] 1.2 Add `attachVoucher(branchId, orderId, voucherData)` to `apps/house-menu/src/lib/logisticsService.js` — writes `voucherUrl`, `voucherFileName`, `uploadedAt`, `updatedAt` to PO record via RTDB `update()`, calls `auditLog('logistics.purchase_order.voucher_attached', ...)`; export
- [ ] 1.3 Update `createPurchaseOrder` and `updatePurchaseOrder` in `logisticsService.js` to accept optional `voucherUrl`, `voucherFileName`, `uploadedAt` fields (no-op if absent)
- [ ] 1.4 Verify `storageService.uploadVoucher(branchId, orderId, file, onProgress)` in `apps/house-menu/src/lib/storageService.js` uses `branches/{branchId}/vouchers/{orderId}_{timestamp}` path, returns `{ url, path }`, accepts progress callback — no code change needed, just confirm behavior
- [ ] 1.5 Verify Firebase Storage rules at `apps/house-menu/storage.rules` cover `match /branches/{branchId}/vouchers/{fileName}` with 5MB/image limit, public read, authenticated write — no deploy needed

**Rollback 1.1–1.3**: Revert aiService.ts, logisticsService.js changes. No DB migration.

## Phase 2: ReceiveOrderModal — Voucher Upload

- [ ] 2.1 Add state to `ReceiveOrderModal` in `LogisticsTab.jsx`: `voucherFile`, `voucherUploading`, `voucherUploadProgress`, `voucherUrl`, `voucherFileName`, `voucherUploadedAt`, `voucherError`
- [ ] 2.2 Add file input `<input type="file" accept="image/*" capture="environment" onChange={handleVoucherSelect} />` with drag-drop area (`onDragOver`, `onDrop`), show preview thumbnail + filename + timestamp when `voucherUrl` exists
- [ ] 2.3 Implement `handleVoucherSelect(file)`: validate type (`image/*`), size ≤ 5MB client-side → show inline error if invalid → set `voucherUploading=true` → call `storageService.uploadVoucher(branchId, orderId, file, setVoucherUploadProgress)` → on success: call `logisticsService.attachVoucher(branchId, orderId, { voucherUrl, voucherFileName: file.name, uploadedAt: nowISO() })` → set `voucherUrl`, `voucherFileName`, `voucherUploadedAt` → convert file to base64 (data URL) for extraction step
- [ ] 2.4 Add upload progress bar (linear, 0–100%) and cancel button (abort upload if needed)
- [ ] 2.5 Reset voucher state in `setReceiveOrder(null)` cleanup (when modal closes)

**Acceptance**: Spec scenarios "Upload voucher — URL persisted on PO record, shown in UI", "Upload rejects oversized file", "Upload rejects unsupported file type"
**Rollback 2.1–2.5**: Revert LogisticsTab.jsx modal state and upload handler.

## Phase 3: ReceiveOrderModal — OCR Extraction

- [ ] 3.1 Add extraction state: `extractionState` (`idle`|`extracting`|`done`|`error`), `extractedItems`, `extractionError`, `extractionSteps` (from `AI_STEPS_EXTRACT_VOUCHER`)
- [ ] 3.2 Add "Extraer datos" button (enabled when `voucherUrl` exists, disabled during extraction) → calls `handleExtractVoucher()`
- [ ] 3.3 Implement `handleExtractVoucher()`: set `extractionState='extracting'`, step through `AI_STEPS_EXTRACT_VOUCHER` → call `aiService.extractVoucher(base64Image, expectedItems)` where `expectedItems` = PO lines mapped to `{ name, quantity, unit, unitCost }` → on success: set `extractedItems`, `extractionState='done'` → on error: set `extractionError`, `extractionState='error'`, show toast per error matrix (missing key, API error, timeout, malformed JSON, empty items)
- [ ] 3.4 Add extraction UI: while extracting show step labels with spinner; on done show "Extracción completada" badge; on error show toast + "Reintentar extracción" button that re-runs extraction
- [ ] 3.5 Downscale image client-side to ≤ 2048px longest edge before base64 (use `canvas.drawImage` + `toDataURL('image/jpeg', 0.85)`) — NFR-2

**Acceptance**: Spec scenarios "Extraction succeeds — structured items returned", "Extraction fails — missing API key", "Extraction fails — API error or malformed response", NFR-1 (<3s), NFR-2 (downscale)
**Rollback 3.1–3.5**: Revert extraction state, handler, UI.

## Phase 4: ReceiveOrderModal — Fuzzy Match + Prefill

- [ ] 4.1 Add `normalizeForMatch(str)` helper (lowercase, NFD strip accents, strip unit tokens `kg|gr|g|litro|l|ml|unidad|und|un|docena|doc`, remove non-alphanumeric, collapse whitespace, trim) — pure function, export for testing
- [ ] 4.2 Add `fuzzyMatch(extracted, poItems)` helper: for each extracted item, normalize name → find PO item with substring containment either direction (`extNorm.includes(poNorm) || poNorm.includes(extNorm)`) → score = max length → greedy one-to-one by highest score → return `{ matched: [{ poItemId, extractedItem, score }], unmatched: [extractedItem] }` — pure function, export for testing
- [ ] 4.3 Add state: `matchedItems`, `unmatchedItems`; after extraction success, run `fuzzyMatch(extractedItems, poItems)` → set both
- [ ] 4.4 Render matched PO lines: prefill `receiveQtys[poItemId] = extractedItem.quantity`, show green check badge "✓ Emparejado", unit cost prefilled from `extractedItem.unitCost`
- [ ] 4.5 Render unmatched section "⚠️ Revisar manualmente": list unmatched extracted items with name, qty, unitCost as editable inputs (not mapped to PO lines)
- [ ] 4.6 Ensure real-time totals recalculation: `receiveQtys` changes + unit cost changes → update line totals + order total immediately
- [ ] 4.7 User edits win: if user changes a prefilled qty/cost, keep edited value; do not re-apply OCR values on re-render
- [ ] 4.8 Add "Re-escanear" button: clears `extractedItems`, `matchedItems`, `unmatchedItems`, `extractionState='idle'` → user can re-run extraction

**Acceptance**: Spec scenarios "Fuzzy match — supplier name vs ingredient name matched", "Fuzzy match — no match found, item shown as unmatched", "User edits prefilled values — edited values win"
**Rollback 4.1–4.8**: Revert helpers, match state, prefill logic, unmatched UI.

## Phase 5: ReceiveOrderModal — Confirmation Wiring

- [ ] 5.1 On "Confirmar recepción" click: build `confirmedQuantities` from `receiveQtys` state (includes both OCR-prefilled and manual entries) → call existing `logisticsService.receivePurchaseOrder(branchId, orderId, actor, confirmedQuantities)` — **do not modify this function**
- [ ] 5.2 Verify PO record retains `voucherUrl`, `voucherFileName`, `uploadedAt` after reception (additive fields, no overwrite)
- [ ] 5.3 Double-receipt guard: rely on existing `receivePurchaseOrder` atomic lock — no new code, just verify behavior unchanged
- [ ] 5.4 Toast success "Orden recibida correctamente" on completion, close modal

**Acceptance**: Spec scenarios "Confirmation — receivePurchaseOrder runs, stock moves, event published", "Double-receipt attempt — atomic lock aborts (no regression)"
**Rollback 5.1–5.4**: Revert confirmation handler only.

## Phase 6: Graceful Degradation

- [ ] 6.1 Manual reception path: if no voucher uploaded OR extraction failed/skipped, `receiveQtys` starts empty → user enters all manually → "Confirmar recepción" works identically
- [ ] 6.2 Extraction error states: missing API key → toast "IA no configurada. Ingresa cantidades manualmente."; API error → "Error al procesar la boleta. Intenta de nuevo."; timeout → "Tiempo agotado. Verifica tu conexión."; empty items → "No se detectaron productos. Revisa la foto." — all keep modal open
- [ ] 6.3 "Reintentar extracción" button visible on error → re-runs Phase 3
- [ ] 6.4 Offline: manual entry works without network; upload/extraction show appropriate network errors

**Acceptance**: Spec scenarios "Manual reception without OCR works end-to-end", "Re-run extraction after error", NFR-5
**Rollback 6.1–6.4**: Revert error handling, retry logic.

## Phase 7: Testing

- [ ] 7.1 Unit: `apps/house-menu/src/lib/__tests__/fuzzyMatch.test.js` — test `normalizeForMatch` (accents, units, case, punctuation) and `fuzzyMatch` (match: "Tomate 1kg"↔"tomate", "Limon"↔"Limón", "Cilantro (manojo)"↔"cilantro"; no-match: "Papas"↔"Papa"; plural mismatch; one-to-one greedy)
- [ ] 7.2 Unit: `apps/house-menu/src/lib/__tests__/aiService.extractVoucher.test.ts` — mock `geminiRequest`, verify base64 prefix stripping, expectedItems context passed, JSON parse, confidence clamping 0–1, empty items handling, error propagation
- [ ] 7.3 Integration: `apps/house-menu/src/lib/__tests__/logisticsService.voucher.test.js` — mock RTDB `update`, verify `attachVoucher` writes correct fields, calls `auditLog`, `createPurchaseOrder`/`updatePurchaseOrder` accept additive voucher fields
- [ ] 7.4 Integration: `apps/house-menu/src/lib/__tests__/storageService.voucher.test.js` — mock Firebase Storage `ref` + `uploadBytesResumable`, verify path format `branches/{bid}/vouchers/{oid}_{ts}`, progress callback fired, URL resolved
- [ ] 7.5 Integration: `apps/house-menu/src/admin/tabs/__tests__/LogisticsTab.voucher.test.jsx` — RTL + jsdom, mock `uploadVoucher`, `extractVoucher`, `attachVoucher`, `fuzzyMatch`; verify: file select → upload → extract → match → prefill → "Confirmar recepción" calls `receivePurchaseOrder` with confirmed quantities
- [ ] 7.6 E2E (manual): Test with real Peruvian boleta photo — upload → extract → verify matched items → confirm → verify stock movements in RTDB, `purchase_order.delivered` event, voucher fields persisted

**Acceptance**: All spec scenarios covered by at least one test; `npm run test -w apps/house-menu` passes
**Rollback 7.1–7.6**: Delete test files.

## Phase 8: Polish / Cleanup

- [ ] 8.1 Add optional feature flag guard: wrap voucher UI in `if (import.meta.env.VITE_ENABLE_VOUCHER_OCR === 'true')` for gradual rollout (default false)
- [ ] 8.2 Ensure all new strings use existing i18n pattern (if any) or consistent Spanish labels
- [ ] 8.3 Verify no TypeScript errors, ESLint passes (`npm run lint -w apps/house-menu`)
- [ ] 8.4 Update `walkthrough.md` with feature summary and key files

**Rollback 8.1–8.4**: Revert flag wrapper, lint fixes.