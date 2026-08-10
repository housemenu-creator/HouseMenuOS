# Design: Direct Voucher Intake

## Technical Approach

A 4-step intake wizard (upload → extract/match → confirm → commit) that reuses the existing PO-receipt pipeline end-to-end. No new RTDB paths (kardex movements + audit logs are the record), no new packages. The service layer gets one new function (`recordDirectPurchase`) mirroring `receivePurchaseOrder`'s shape; the UI gets one new modal mirroring the existing "Recibir orden" modal. Spec: `logistics-direct-purchase`.

## Architecture Decisions

### Double-submit guard: in-flight flag (module-level), not an idempotency key

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `runTransaction` status flip (PO pattern) | Needs a status field — direct intake writes no record node (out of scope) | ❌ |
| Client idempotency key + deterministic movement keys | Stock transaction in `registerMovement` would still double-apply on re-run; read-then-write not atomic | ❌ |
| **Module-level `let directPurchaseInFlight` + UI `committing` state** | Blocks same-tab re-entry; simple, testable in node style | ✅ |

**Rationale**: Mirrors the PO flow's *abort* semantics without inventing state. The UI disables Confirm (like `receiving`) AND the service rejects a concurrent second call, so a double-click or re-fired handler can never write twice. **Known ceiling**: not cross-tab/device safe — two tabs can still race. Mitigation: each intake embeds a client-generated `intakeId` in the movement reference (`VOUCHER-<last6>`), making duplicates *detectable* in kardex and correctable via the existing `ajuste` flow. Upgrade path if ever needed: write a tiny marker node — explicitly deferred (NFR-2 forbids new paths now).

### fuzzyMatch without a PO: match against the ingredients collection

| Option | Tradeoff | Decision |
|--------|----------|----------|
| New matching code | Reimplements normalization/threshold logic | ❌ |
| **`fuzzyMatch(result.items, ingredientsById)`** | `fuzzyMatch` only reads `poItems[id].name`; the tab's ingredients map already fits `{id: {name}}` | ✅ |

**Rationale**: `extractVoucher(dataUrl, [])` runs with empty expected items (prompt degrades to "no expected items", no crash). `fuzzyMatch` returns `matched[].poIngredientId` → renamed to `ingredientId` for the payload; `score` kept for display. Unmatched entries lose `unit` (fuzzyMatch doesn't carry it), so the modal pairs each unmatched row with its original `VoucherLineItem` by index to prefill the unit default.

### Cost semantics: `cost > 0` = provided; empty/0 keeps existing

`fuzzyMatch` coerces missing OCR cost to `0`, so "no cost" and "cost 0" are indistinguishable. Rule: only a positive cost triggers the update (S4); `0`/empty keeps the existing cost (S5). Cost changes batch into one multi-path `update()` (atomic, single write) after movements.

### Commit order: create → move → cost → audit, fail loud

Ingredients are created first (stock 0 — `createIngredient` writes no movement when stock is 0, so no intermediate kardex entries), then movements per line, then batch cost update, then one `auditLog`. Any creation failure throws before any movement — nothing committed for a failed ingredient batch. A mid-movement failure surfaces as an error with the modal kept open; partial state is corrected via existing `ajuste`/`deleteIngredient` flows (rollback plan).

## Data Flow

```
Admin clicks "Ingresar boleta" (Compras tab, gated by VITE_ENABLE_VOUCHER_OCR)
  └─ DirectVoucherModal: upload
      ├─ validateVoucherFile(file) → inline error if invalid
      └─ uploadVoucher(branchId, `direct-${intakeId}`, file) → url
          └─ fileToDataURL + downscaleImage(2048) (existing helpers)
  └─ extracting: extractVoucher(dataUrl, [])            (Gemini → Tesseract fallback)
  └─ review:    fuzzyMatch(items, ingredientsById)      (ingredients from tab subscription)
      ├─ matched rows    → qty/cost editable, untouched-tracking (touchedRef)
      └─ unmatched rows  → per-line approve toggle + name/unit edit; skip by default
  └─ committing: recordDirectPurchase(branchId, { matched, newIngredients, voucherUrl, voucherFileName, intakeId }, actor)
      ├─ in-flight guard → reject if running
      ├─ create approved ingredients (stock 0)
      ├─ registerMovement per line: entrada / 'Compra' / VOUCHER-<6> / cost qty×unitCost
      ├─ batch update(): ingredient costs (cost > 0 only)
      └─ auditLog('logistics.direct_purchase.recorded', …)
  └─ toast + close; onValue subscriptions (ingredients, movements/kardex) refresh live
```

## Component Tree

```
LogisticsTab (Compras section)
├── header row: [Nueva orden] [Ingresar boleta] ← new, gated by voucherOcrEnabled()
└── DirectVoucherModal (new; AnimatePresence)
    ├── step upload    — file drop zone (clone of Recibir orden zone) + progress
    ├── step extracting — AI_STEPS_EXTRACT_VOUCHER progress list
    ├── step review    — matched rows (badge "Emparejado" + score) | unmatched rows (warning box, approve toggle, name/unit inputs)
    ├── step committing — spinner in Confirm button ("Registrando…")
    └── step error     — role=alert message + "Reintentar" (re-runs extraction, no re-upload)
4 visual states: loading (ingredients subscription pending) / empty (no items detected) / error / populated
```

Modal receives `branchId`, `actor`, `ingredients` + `ingredientsLoading` as props (tab already subscribes via `subscribeIngredients`, LogisticsTab:104-121) and `onClose`. Builds `ingredientsById` internally via `Object.fromEntries`.

## Payload Contract

```js
// recordDirectPurchase(branchId, payload, actor)
{
  matched: [{ ingredientId, qty, cost }],          // cost > 0 ⇒ update; 0/empty ⇒ keep
  newIngredients: [{ name, unit, cost, qty }],     // only admin-approved lines
  voucherUrl, voucherFileName, intakeId,           // intakeId: crypto.randomUUID()
}
// movements: { type:'entrada', reason:'Compra', reference:`VOUCHER-${intakeId.slice(-6)}`,
//              cost: qty*cost, createdBy: actor }
// audit: auditLog('logistics.direct_purchase.recorded', { branchId, intakeId, lineCount,
//              newIngredients: n, total, voucherFileName }, actor)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/logisticsService.js` | Modify | Add `recordDirectPurchase` + module in-flight guard |
| `src/admin/components/logistics/DirectVoucherModal.jsx` | Create | Upload/extract/review/commit wizard |
| `src/admin/tabs/LogisticsTab.jsx` | Modify | "Ingresar boleta" button, modal state/mount, `ingredientsById` prop, refetch after commit |
| `src/lib/__tests__/logisticsService.directPurchase.test.js` | Create | Node-style vitest suite (see below) |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `recordDirectPurchase` all-matched | hoisted firebase mocks (pattern of `logisticsService.receivePurchaseOrder.test.js`): expect 1 push+set per movement (`entrada`/`Compra`/`VOUCHER-xxxxxx`/qty×cost), batch cost update, 1 audit, 0 ingredient creates |
| Unit | approve-creates | `dbPush` on ingredients (stock 0) + movement for the new id |
| Unit | skip-creates-nothing | all-unmatched payload w/o approvals → no pushes, no updates; audit records 0 new |
| Unit | edits win | payload qty/cost override OCR values in movement + cost update |
| Unit | double-submit | delayed mock; two concurrent calls → second returns `{success:false}`, exactly 1 set of writes |
| Unit | cost preservation | `cost: 0` → no cost update; movement still registered |
| UI (manual) | modal states, approve toggles, retry, <2min flow | existing `LogisticsTab.voucher.test.jsx` style tests cover upload/extract wiring; new modal tests optional, manual QA for OCR realism |

## Migration

None required. Button is behind the existing `VITE_ENABLE_VOUCHER_OCR` flag (same gate as the PO voucher flow). Rollback = remove button + modal mount; wrong entries corrected via existing kardex `ajuste` and `deleteIngredient`.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| OCR matches wrong ingredient | Medium | Match score shown; admin edits qty/cost pre-confirm |
| New ingredient with bad name/unit | Low | Per-line approval + editable fields |
| Cross-tab double-submit | Low | In-flight guard + UI disable; duplicates visible via `VOUCHER-<id>` reference, fixed via `ajuste` |
| Mid-movement failure leaves partial state | Low | Fail loud, error shown, correctable via existing flows |

## Open Questions

- [ ] Confirm the cross-tab idempotency ceiling is acceptable for v1 (in-flight flag only), or a marker node should be added despite NFR-2
- [ ] Confirm `createdBy: actor` on movements (PO flow uses `'system'`) — proposal implies actor-driven traceability
