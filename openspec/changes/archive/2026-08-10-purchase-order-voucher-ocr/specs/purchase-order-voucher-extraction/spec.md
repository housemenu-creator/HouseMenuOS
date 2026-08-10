# Purchase Order Voucher Extraction Specification

## Purpose

Enable upload of a supplier voucher (boleta/factura/nota de venta) during purchase order reception, extract structured line items via Gemini 2.0 Flash OCR, fuzzy-match extracted items to PO lines, prefill the "Recibir orden" modal with quantities and unit costs, and require human confirmation before committing stock via the existing `receivePurchaseOrder` function.

---

## Requirements

### Requirement: Voucher Upload and Persistence

The system **MUST** allow the user to select an image file (JPEG, PNG, WebP) in the "Recibir orden" modal and upload it to Firebase Storage under a `vouchers/` path.

The system **MUST** persist `voucherUrl`, `voucherFileName`, and `uploadedAt` on the purchase order record at `branches/{branchId}/logistics/purchase_orders/{orderId}` upon successful upload.

The system **SHOULD** validate file type and size client-side before upload (max 5 MB, image/* MIME types).

The system **MUST** display the uploaded voucher as a thumbnail/preview in the modal with the filename and upload timestamp.

#### Scenario: Upload voucher — URL persisted on PO record, shown in UI

- GIVEN a purchase order in "pending" state is open in the "Recibir orden" modal
- WHEN the user selects a valid image file (e.g., `factura-123.jpg`, 2.1 MB) and clicks upload
- THEN the file is uploaded to Firebase Storage under `vouchers/{branchId}/{orderId}/factura-123.jpg`
- AND the PO record is updated with `voucherUrl`, `voucherFileName: "factura-123.jpg"`, `uploadedAt: <timestamp>`
- AND the modal displays a preview thumbnail with the filename and upload time

#### Scenario: Upload rejects oversized file

- GIVEN the "Recibir orden" modal is open
- WHEN the user selects a file larger than 5 MB
- THEN the upload is rejected before any network request
- AND an inline error message "File must be 5 MB or smaller" is shown
- AND no `voucherUrl` is written to the PO record

#### Scenario: Upload rejects unsupported file type

- GIVEN the "Recibir orden" modal is open
- WHEN the user selects a PDF or non-image file
- THEN the upload is rejected before any network request
- AND an inline error message "Only image files (JPEG, PNG, WebP) are supported" is shown

---

### Requirement: OCR Extraction via Gemini 2.0 Flash

The system **MUST** provide an `extractVoucher(imageBase64, expectedItems)` function in `aiService.ts` that calls Gemini 2.0 Flash in JSON mode with `inline_data` and returns structured data: `{ items: [{ name, quantity, unitCost }], total, ruc, serie }`.

The system **MUST** include the PO's expected item names in the prompt to guide extraction and improve matching accuracy.

The system **SHOULD** downscale images client-side to ≤ 2048 px on longest edge before base64 encoding to stay within API limits.

The system **MUST** handle API errors gracefully: missing `VITE_GEMINI_API_KEY`, network failure, API rate limits, or malformed JSON responses.

#### Scenario: Extraction succeeds — structured items returned

- GIVEN a voucher image has been uploaded and the user triggers extraction
- WHEN `extractVoucher` is called with the image and expected item names `["cebolla roja", "tomate", "papa"]`
- THEN Gemini returns `{ items: [{ name: "CEBOLLA ROJA KG", quantity: 10, unitCost: 3.5 }, { name: "TOMATE KG", quantity: 5, unitCost: 4.0 }], total: 55.0, ruc: "20123456789", serie: "F001-000123" }`
- AND the extraction result is stored in modal state for prefill

#### Scenario: Extraction fails — missing API key

- GIVEN `VITE_GEMINI_API_KEY` is not set in the environment
- WHEN the user triggers extraction
- THEN a toast error "OCR unavailable: API key not configured" is shown
- AND the modal remains fully usable for manual entry
- AND no exception is thrown

#### Scenario: Extraction fails — API error or malformed response

- GIVEN the Gemini API returns an error (rate limit, 5xx, invalid JSON)
- WHEN extraction is attempted
- THEN a toast error "OCR extraction failed: {reason}" is shown
- AND the modal remains fully usable for manual entry
- AND the error is logged for debugging

---

### Requirement: Fuzzy Matching and Prefill

The system **MUST** fuzzy-match each extracted line item to the PO's expected items using case-insensitive, accent-insensitive string similarity (e.g., Levenshtein or substring containment).

The system **MUST** display matched items with prefilled `quantity` and `unitCost` inputs, visually indicated as "matched".

The system **MUST** display unmatched extracted items in a separate "Unmatched / Review" section with name, quantity, unitCost — editable but not mapped to any PO line.

The system **MUST** leave PO lines with no extracted match as empty editable inputs (manual entry required).

The system **MUST** recalculate line totals and order total from the editable inputs in real time.

#### Scenario: Fuzzy match — supplier name vs ingredient name matched

- GIVEN PO lines include `cebolla roja` (ingredient name)
- AND extracted items include `CEBOLLA ROJA KG` (supplier line)
- WHEN fuzzy matching runs
- THEN the items are matched (case/accent insensitive, substring "cebolla roja" contained)
- AND the PO line for `cebolla roja` is prefilled with `quantity: 10`, `unitCost: 3.5`
- AND a "matched" badge/icon is shown next to the line

#### Scenario: Fuzzy match — no match found, item shown as unmatched

- GIVEN PO lines include `cebolla roja`, `tomate`
- AND extracted items include `CEBOLLA ROJA KG`, `LECHUGA KG`
- WHEN fuzzy matching runs
- THEN `cebolla roja` ↔ `CEBOLLA ROJA KG` is matched and prefilled
- AND `LECHUGA KG` appears in "Unmatched / Review" section with its extracted quantity/cost
- AND `tomate` PO line remains empty for manual entry

#### Scenario: User edits prefilled values — edited values win

- GIVEN a PO line was prefilled with `quantity: 10`, `unitCost: 3.5` from OCR
- WHEN the user changes `quantity` to `12` and `unitCost` to `3.0`
- THEN the modal uses `12` and `3.0` for totals and confirmation
- AND the original OCR values are not silently reapplied

---

### Requirement: Human Confirmation and Reception

The system **MUST** require an explicit "Confirmar recepción" action — extraction and prefill **MUST NOT** auto-commit stock.

The system **MUST** call the existing `receivePurchaseOrder(branchId, orderId, actor, quantities)` with the user-confirmed quantities upon confirmation.

The system **MUST** preserve `voucherUrl`, `voucherFileName`, `uploadedAt` on the PO record after reception.

The system **MUST NOT** modify `receivePurchaseOrder` — atomic lock, stock movement (qty × unitCost), kardex, price-change detection, and `purchase_order.delivered` event publication remain unchanged.

#### Scenario: Confirmation — receivePurchaseOrder runs, stock moves, event published

- GIVEN the modal shows prefilled quantities (some from OCR, some manual)
- WHEN the user clicks "Confirmar recepción"
- THEN `receivePurchaseOrder(branchId, orderId, actor, confirmedQuantities)` is called
- AND the function acquires atomic lock, creates stock movements with qty × unitCost, updates kardex
- AND price-change detection runs (comparing unitCost vs current ingredient cost)
- AND `purchase_order.delivered` event is published to the event catalog
- AND the PO status becomes "delivered"
- AND `voucherUrl`, `voucherFileName`, `uploadedAt` remain on the PO record

#### Scenario: Double-receipt attempt — atomic lock aborts (no regression)

- GIVEN a PO was already received (status "delivered")
- WHEN a second reception is attempted (via any path)
- THEN `receivePurchaseOrder` rejects with "Order already received" (existing atomic lock behavior)
- AND no duplicate stock movements are created
- AND no duplicate `purchase_order.delivered` event is published

---

### Requirement: Graceful Degradation

The system **MUST** allow full manual reception if OCR is unavailable, fails, or the user chooses not to use it.

The system **MUST** show extraction state: idle → extracting → success | error.

The system **SHOULD** allow re-running extraction after an error (e.g., after fixing API key).

#### Scenario: Manual reception without OCR works end-to-end

- GIVEN the user opens "Recibir orden" modal and does not upload a voucher
- WHEN the user enters quantities and costs manually and clicks "Confirmar recepción"
- THEN `receivePurchaseOrder` executes successfully with the manual values
- AND stock/kardex/events proceed exactly as before this feature

#### Scenario: Re-run extraction after error

- GIVEN extraction failed due to missing API key
- AND the API key is now configured (env var added, app restarted)
- WHEN the user clicks "Reintentar extracción"
- THEN extraction runs again and on success prefills the modal

---

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Extraction latency **SHOULD** be < 3 s for typical vouchers (≤ 5 MB, downscaled) |
| NFR-2 | Client-side downscale **MUST** preserve aspect ratio and legibility for OCR |
| NFR-3 | Firebase Storage rules **MUST** allow authenticated users to write to `vouchers/{branchId}/{orderId}/*` |
| NFR-4 | No sensitive data (API key) **MUST** be exposed to the client beyond `VITE_GEMINI_API_KEY` env var |
| NFR-5 | The feature **MUST** work offline for manual entry (upload/extraction require connectivity) |

---

## Acceptance Criteria (from Proposal Success Criteria)

- [x] Uploading a boleta persists `voucherUrl` on the PO record in RTDB
- [x] `extractVoucher` returns structured items; modal qty/cost inputs prefilled
- [x] Matched/unmatched items visible before confirmation
- [x] Confirmed reception completes via `receivePurchaseOrder` — stock/kardex updated, `purchase_order.delivered` published
- [ ] `npm run test -w apps/house-menu` passes; manual E2E with a real boleta — tests pass (751/751); manual E2E pending (task 7.6, human action)