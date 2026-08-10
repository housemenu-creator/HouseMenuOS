# Spec: Direct Voucher Intake

## Phase 1 — Service: `recordDirectPurchase`

### Requirements

| ID | Req | Strength |
|----|-----|----------|
| S1 | `recordDirectPurchase(branchId, payload, actor)` in `src/lib/logisticsService.js` | MUST |
| S2 | Creates approved new ingredients with stock 0 (name/unit from approval) | MUST |
| S3 | Per confirmed line: `registerMovement` type `entrada`, reason `'Compra'`, reference `VOUCHER-<short>` | MUST |
| S4 | Updates ingredient cost to confirmed unitCost when provided | MUST |
| S5 | OCR/confirmed cost empty → keeps existing ingredient cost | MUST |
| S6 | Non-approved (skipped) lines: no ingredient, no movement, no cost change | MUST |
| S7 | Writes `auditLog` entry recording the direct intake | MUST |
| S8 | Double-submit guard: second invocation must not duplicate movements | MUST |
| S9 | Unit-testable node style with in-memory RTDB mocks, no new deps | MUST |

### Scenarios

**S1–S4 — All-matched intake:** GIVEN all voucher lines matched WHEN admin confirms THEN movements registered per line (qty × cost) AND ingredient costs updated AND audit logged, zero ingredients created.
**S6 — All-unmatched, none approved:** GIVEN only unmatched lines WHEN admin confirms with all skipped THEN no ingredient created, no movement, no cost change; audit records zero approved lines.
**S2–S3 — Approve one line:** GIVEN unmatched line approved with name/unit WHEN confirmed THEN ingredient created (stock 0) THEN movement registered for it.
**S8 — Double-submit:** GIVEN commit in progress WHEN confirm re-fires THEN second call rejected AND exactly one set of movements/audit entries written.
**S5 — Empty OCR cost:** GIVEN matched line without OCR cost WHEN confirmed THEN movement uses confirmed qty AND existing ingredient cost unchanged.

### Files

**Create:** `src/lib/__tests__/logisticsService.directPurchase.test.js` (matched-only, mixed, all-unmatched, skip paths)
**Modify:** `src/lib/logisticsService.js`

### Acceptance

1. All five scenario paths pass in node-style tests (`npm run test -w apps/house-menu`)
2. No new packages, no new RTDB paths

---

## Phase 2 — UI: "Ingresar boleta" Modal

### Requirements

| ID | Req | Strength |
|----|-----|----------|
| U1 | "Ingresar boleta" button in Compras tab (LogisticsTab) opening DirectVoucherModal | MUST |
| U2 | Upload path reuses `validateVoucherFile` + `storageService.uploadVoucher` | MUST |
| U3 | Extraction reuses `extractVoucher(file, [])` + `voucherMatch.fuzzyMatch` vs ingredients map `{id: {name}}` | MUST |
| U4 | Matched rows: editable qty/cost prefilled from OCR, untouched-tracking, edits win | MUST |
| U5 | Unmatched rows: per-line approve toggle (editable name/unit) or skip; NEVER auto-created | MUST |
| U6 | Confirm calls `recordDirectPurchase`; button disabled while running | MUST |
| U7 | OCR failure → clear error, retry action, nothing written | MUST |
| U8 | Only `--cm-*` / `cm-*` classes, dark mode, mobile-first, `AnimatePresence`, 4 states (loading/empty/error/populated) | MUST |

### Scenarios

**U4 — Prefill editable:** GIVEN matched line prefilled 10 × 3.5 WHEN admin edits to 12 × 3.0 THEN confirm uses edited values.
**U5 — No auto-create:** GIVEN unmatched lines WHEN admin skips all THEN zero ingredients created.
**U7 — OCR failure:** GIVEN extraction fails WHEN admin retries after fix THEN extraction re-runs AND nothing was written by the failed attempt.

### Files

**Create:** `src/admin/components/logistics/DirectVoucherModal.jsx`
**Modify:** `src/admin/tabs/LogisticsTab.jsx`

### Acceptance

1. Modal renders loading, empty, error, populated states
2. Unmatched lines create zero ingredients without explicit per-line approval
3. Complete direct intake (upload → extract → confirm) achievable in < 2 min

---

## Phase 3 — Spec Artifacts

### Requirements

| ID | Req | Strength |
|----|-----|----------|
| A1 | New capability spec `openspec/specs/logistics-direct-purchase/spec.md` (full spec, new capability) | MUST |
| A2 | Change-level spec `openspec/changes/direct-voucher-intake/spec.md` (this file) | MUST |

### Files

**Create:** `openspec/specs/logistics-direct-purchase/spec.md` (already written)
