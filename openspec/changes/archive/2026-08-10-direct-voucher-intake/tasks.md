# Tasks: Direct Voucher Intake

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550-660 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (service) → PR 2 (modal) → PR 3 (integration) |
| Delivery strategy | ask-on-risk (default) |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | `recordDirectPurchase` + node tests | PR 1 | ~300 lines; independent, merges first |
| 2 | `DirectVoucherModal.jsx` | PR 2 | ~300 lines; depends on PR 1 API |
| 3 | LogisticsTab button/mount + QA | PR 3 | ~60 lines; depends on PR 2 |

## Phase 1: Service — recordDirectPurchase

- [x] 1.1 Add module-level `let directPurchaseInFlight` in `src/lib/logisticsService.js`; `recordDirectPurchase(branchId, payload, actor)` returns `{success:false}` when in-flight, clears in `finally`
- [x] 1.2 Create approved `newIngredients` via `createIngredient` (stock 0, name/unit/cost from payload); collect new ids; throw before any movement on failure
- [x] 1.3 Per confirmed line: `registerMovement` `entrada` / `'Compra'` / `VOUCHER-${intakeId.slice(-6)}` / cost qty×unitCost / `createdBy: actor`; skip qty ≤ 0
- [x] 1.4 Batch cost update: one multi-path `update()` for lines with `cost > 0` only (matched + new); 0/empty keeps existing (S5)
- [x] 1.5 `auditLog('logistics.direct_purchase.recorded', {branchId, intakeId, lineCount, newIngredients, total, voucherFileName}, actor)`; return `{success:true}`

## Phase 2: Tests — directPurchase suite

- [x] 2.1 Create `src/lib/__tests__/logisticsService.directPurchase.test.js` with hoisted firebase mocks (pattern: `logisticsService.receivePurchaseOrder.test.js`); test all-matched: 1 push+set per movement, batch cost update, 1 audit, 0 ingredient creates
- [x] 2.2 Test approve-creates: `dbPush` on ingredients (stock 0) + movement for the new id (S2–S3)
- [x] 2.3 Test skip-creates-nothing: all-unmatched without approvals → no push/update; audit records 0 new (S6)
- [x] 2.4 Test edits-win: payload qty/cost override OCR values in movement + cost update (U4)
- [x] 2.5 Test double-submit: delayed mock, two concurrent calls → second `{success:false}`, exactly one set of writes (S8)
- [x] 2.6 Test cost preservation: `cost: 0` → no cost update, movement still registered (S5)

## Phase 3: UI — DirectVoucherModal

- [x] 3.1 Create `src/admin/components/logistics/DirectVoucherModal.jsx` shell: props `{branchId, actor, ingredients, ingredientsLoading, onClose}`; steps upload/extracting/review/committing/error; AnimatePresence, cm-* tokens, 4 states (U8)
- [x] 3.2 Upload step: `validateVoucherFile` → `storageService.uploadVoucher(branchId, 'direct-'+intakeId, file, onProgress)` → `fileToDataURL` + `downscaleImage(2048)` (clone receive zone, LogisticsTab.jsx:1747) (U2)
- [x] 3.3 Extract step: `extractVoucher(dataUrl, [])` + `fuzzyMatch(items, ingredientsById)` from `Object.fromEntries`; AI_STEPS_EXTRACT_VOUCHER progress (U3)
- [x] 3.4 Matched rows: "Emparejado" badge + score; editable qty/cost prefilled from OCR with `touchedRef` untouched-tracking, edits win (U4)
- [x] 3.5 Unmatched rows: warning box, per-line approve toggle (default off) + editable name/unit prefilled from original `VoucherLineItem` by index; skip excluded from payload (U5)
- [x] 3.6 Commit: payload `{matched:[{ingredientId,qty,cost}], newIngredients, voucherUrl, voucherFileName, intakeId}` → `recordDirectPurchase`; Confirm disabled while committing (U6)
- [x] 3.7 Error state: `role=alert` message + "Reintentar" re-runs extraction without re-upload; nothing written (U7)

## Phase 4: Integration — LogisticsTab

- [x] 4.1 "Ingresar boleta" button (Upload icon) beside "Nueva orden" in PurchaseOrdersSection header (LogisticsTab.jsx:1945), gated by `voucherOcrEnabled()` (U1)
- [x] 4.2 Mount DirectVoucherModal: `showDirectVoucher` state, pass `branchId`/`userEmail`/`ingredients`/`loading`; modal builds `ingredientsById` internally
- [x] 4.3 Post-commit refresh: verify kardex/ingredients update live via existing `onValue` subscriptions (LogisticsTab.jsx:121-126); no manual refetch needed

## Phase 5: Manual QA

- [ ] 5.1 With `VITE_ENABLE_VOUCHER_OCR=true`: upload boleta sintética → OCR → approve/create/skip per line → confirm; complete intake < 2 min (manual QA — human action)
- [ ] 5.2 Verify kardex: entrada/'Compra' movements with `VOUCHER-xxxxxx` reference, correct stock deltas, cost updates, audit entries (manual QA — human action)

Verify: Phases 1-2 `npx vitest run src/lib/__tests__/logisticsService.directPurchase.test.js` (then `npm run test -w apps/house-menu`); Phases 3-4 existing `LogisticsTab.voucher.test.jsx` style + manual browser; Phase 5 manual against production branch.
