# Logistics Direct Purchase Specification

## Purpose

Enable admins to ingest a boleta/factura **without a purchase order** from the Compras tab: upload the voucher, OCR-extract its lines, fuzzy-match them against existing ingredients, let the admin confirm each line (editing quantity/cost, and explicitly approving any new ingredient), and commit stock entries (`entrada`, reason `Compra`) with optional cost updates and audit logs. Unmatched lines are **NEVER auto-created** — each requires explicit per-line approval.

---

## Requirements

### Requirement: Direct Voucher Entry Flow

The system **MUST** provide an "Ingresar boleta" action in the Compras tab (LogisticsTab) that opens a modal for uploading a boleta/factura with no purchase order attached.

The system **MUST** reuse the existing primitives: `validateVoucherFile` (client-side validation), `storageService.uploadVoucher` (Storage persistence), `extractVoucher(imageBase64, [])` (Gemini 2.0 Flash OCR with Tesseract fallback, empty expected-items), and `voucherMatch.fuzzyMatch(items, ingredientsById)` against the existing ingredients map (already in `{id: {name}}` shape).

The system **MUST NOT** create any new RTDB paths or persist a dedicated direct-purchase record — kardex movements and audit logs are the record.

#### Scenario: Entry → upload → extraction → match pipeline

- GIVEN the admin opens the Compras tab and clicks "Ingresar boleta"
- WHEN a valid image file is uploaded and extraction runs
- THEN the file is persisted via `uploadVoucher`, OCR returns structured items, and each item is fuzzy-matched against existing ingredients
- AND matched items are shown prefilled; unmatched items are shown in a review section

#### Scenario: Invalid file rejected before any write

- GIVEN the "Ingresar boleta" modal is open
- WHEN the admin selects an unsupported type or a file over 5 MB
- THEN upload is rejected client-side before any network request
- AND an inline error is shown and nothing is written anywhere

---

### Requirement: Matched Items — Editable Prefill

The system **MUST** render matched lines with `quantity` and `unitCost` prefilled from OCR, editable, using untouched-tracking so edited values win over OCR values.

#### Scenario: All-matched intake — movements, cost update, audit

- GIVEN a voucher whose lines all fuzzy-match existing ingredients
- WHEN the admin confirms
- THEN `recordDirectPurchase` registers one `entrada`/'Compra' movement per line with reference `VOUCHER-<short>` and the confirmed qty × cost
- AND each matched ingredient's cost is updated to the confirmed unitCost
- AND an audit log entry is written
- AND no ingredient is created

#### Scenario: Admin edits prefilled values — edits win

- GIVEN a matched line prefilled `quantity: 10`, `unitCost: 3.5` from OCR
- WHEN the admin changes them to `12` and `3.0` and confirms
- THEN the movement and cost update use `12` and `3.0`
- AND the original OCR values are not silently reapplied

---

### Requirement: Unmatched Items — Per-Line Approval

The system **MUST NOT** auto-create ingredients for unmatched lines. Each unmatched line **MUST** be rendered with an explicit per-line decision: approve as a new ingredient (name and unit editable before approval) or skip. Skipped lines **MUST** create nothing — no ingredient, no movement, no cost change.

#### Scenario: Unmatched lines create zero ingredients without approval

- GIVEN a voucher contains lines matching nothing (e.g., "DETERGENTE", "BOLSAS")
- WHEN the admin confirms without approving any of them
- THEN no new ingredient is created, no movement is registered, and no cost changes
- AND the audit log records the intake with only the approved lines

#### Scenario: Approving an unmatched line creates ingredient (stock 0) then movement

- GIVEN an unmatched line "DETERGENTE 5L" with the approve toggle on and editable name/unit confirmed
- WHEN the admin confirms
- THEN a new ingredient is created with stock 0 and the confirmed name/unit
- AND a movement (`entrada`, 'Compra', `VOUCHER-<short>`) is registered for its quantity
- AND the audit log records the creation and the movement

#### Scenario: Skipping an unmatched line creates nothing for it

- GIVEN an unmatched line "BOLSAS" marked as skip
- WHEN the admin confirms
- THEN no ingredient is created for "BOLSAS" and no movement is registered for it

---

### Requirement: Commit via recordDirectPurchase

The system **MUST** provide `recordDirectPurchase(branchId, payload, actor)` in `src/lib/logisticsService.js` that: creates approved new ingredients (stock 0), registers one movement per confirmed line via `registerMovement` (type `entrada`, reason `Compra`, reference `VOUCHER-<short>`), updates ingredient cost, and writes `auditLog`. The payload includes the voucher reference/URL.

The system **MUST** guard against double-submit: the confirm action is disabled while a commit is running, and a second call **MUST NOT** produce duplicate movements.

#### Scenario: Double-submit guarded — no duplicate movements

- GIVEN a direct intake commit is in progress
- WHEN the admin clicks confirm again (or the handler re-fires)
- THEN the second invocation is rejected/ignored
- AND exactly one set of movements, cost updates, and audit entries is written

#### Scenario: Matched ingredient with empty OCR cost — existing cost kept

- GIVEN a matched line where OCR returned no unitCost
- WHEN the admin confirms without entering a cost
- THEN the movement is registered with the admin-confirmed quantity
- AND the ingredient's existing cost is left unchanged

---

### Requirement: OCR Failure Handling

The system **MUST** show a clear error message when extraction fails, **MUST NOT** write anything (no storage upload side effects beyond the voucher itself, no movements), and **MUST** allow the admin to retry.

#### Scenario: OCR failure — clear error, retry allowed, nothing written

- GIVEN extraction fails (missing API key, network error, malformed response)
- WHEN the admin triggers extraction
- THEN a clear error is shown and the modal stays usable
- AND no movements, ingredients, cost changes, or audit entries are written
- AND a "Reintentar" action re-runs extraction without re-uploading

---

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Reuses existing OCR (`extractVoucher`), matching (`fuzzyMatch`), movement (`registerMovement`), ingredient (`createIngredient`), upload (`uploadVoucher`), and `auditLog` primitives — no reimplementation |
| NFR-2 | No new packages and no new RTDB paths |
| NFR-3 | UI uses only `--cm-*` tokens / `cm-*` Tailwind classes; no legacy classes; dark mode; mobile-first; `AnimatePresence` for modal/state transitions |
| NFR-4 | Modal renders 4 states: loading, empty, error, populated |
| NFR-5 | `recordDirectPurchase` is unit-testable in node style (in-memory RTDB mocks), like `receivePurchaseOrder` tests |

---

## Acceptance Criteria (from Proposal Success Criteria)

- [ ] Admin completes a direct intake with no PO in < 2 min
- [ ] Unmatched lines create zero ingredients without per-line approval
- [ ] Kardex shows `entrada`/'Compra' movements with correct stock deltas and `VOUCHER-<short>` reference
- [ ] Cost updates + audit logs recorded for confirmed lines
- [ ] `recordDirectPurchase` covered by tests (matched-only, mixed, all-unmatched, skip paths)
