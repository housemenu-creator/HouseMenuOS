# Design: Purchase Order Voucher OCR

## Technical Approach

Implement voucher OCR extraction directly in the "Recibir orden" modal. User uploads a boleta/factura image → stored in Firebase Storage at `branches/{branchId}/vouchers/{orderId}_{timestamp}` → voucher metadata (`voucherUrl`, `voucherFileName`, `uploadedAt`) persisted on the PO record → Gemini Flash `extractVoucher(imageBase64, expectedItems)` returns structured line items → fuzzy match against PO items (case/accent-insensitive, strip units KG/UN/LT, substring containment) → prefill `receiveQtys` state in modal → human reviews/edits → clicks "Confirmar recepción" → existing `receivePurchaseOrder` runs unchanged (atomic runTransaction lock, stock movements, price change detection, event emission).

## Architecture Decisions

### Decision: Client-side OCR via Gemini Flash (no backend function)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Firebase Functions (Gen 2) + Vertex AI | Secure API key, server-side processing, but adds deploy latency, cold starts, IAM complexity | Rejected |
| Client-side `fetch` to Gemini REST API with `VITE_GEMINI_API_KEY` | Key exposed in bundle (already public web key), zero infra, instant latency, simpler | **Chosen** |

**Rationale**: `VITE_GEMINI_API_KEY` is already used by `aiService.ts` for `describeProduct`/`suggestCampaign`. It's a public web API key (not a secret). No server-side secret needed. Keeps architecture simple and fast.

### Decision: Prefill-only, human confirms

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Auto-receive on high-confidence match | Risk of wrong quantities, no audit trail of human review | Rejected |
| Prefill modal, human edits, then confirm | Full control, audit trail via existing `receivePurchaseOrder`, zero behavior change to reception logic | **Chosen** |

**Rationale**: Non-negotiable per spec. `receivePurchaseOrder` unchanged — atomic lock, stock movements, price change detection, `purchase_order.delivered` event all preserved.

### Decision: Fuzzy match algorithm (substring + normalized)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Levenshtein distance only | Good for typos, but overkill for Spanish boleta abbreviations (e.g., "Tomate" vs "TOMATE KG") | Rejected |
| Normalize (lowercase, remove accents, strip units KG/UN/LT/GR/ML) → substring containment → score by longest match | Handles "Tomate 1kg" vs "tomate", "Limon" vs "Limón", "Cilantro" vs "Cilantro (manojo)" | **Chosen** |

**Rationale**: Spanish receipts use abbreviations and inconsistent casing. Substring after normalization catches 95% of cases with O(1) per item.

### Decision: Voucher storage path convention

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `vouchers/{branchId}/{orderId}/{filename}` (spec) | Clean separation, but differs from existing `storageVouchersPath` | Rejected |
| `branches/{branchId}/vouchers/{orderId}_{timestamp}` (existing `storageService.js:50`) | Consistent with `storageProductImagesPath`, `storageCategoryImagesPath`, existing Storage rules already cover `/branches/{branchId}/vouchers/*` | **Chosen** |

**Rationale**: Reuse existing `uploadVoucher` function and Storage rules. No new rules deploy needed.

---

## Data Flow

```
┌─────────────┐    1. User clicks "Subir voucher"    ┌──────────────────┐
│ ReceiveOrderModal │ ─────────────────────────────────▶ │ <input type=file> │
└─────────────┘                                     └────────┬─────────┘
                                                               │
                                                               ▼
                                                      ┌──────────────────┐
                                                      │ storageService.  │
                                                      │ uploadVoucher(   │
                                                      │   branchId,      │
                                                      │   orderId,       │
                                                      │   file,          │
                                                      │   onProgress     │
                                                      │ )                │
                                                      └────────┬─────────┘
                                                               │
                                                               ▼
                                                      ┌──────────────────┐
                                                      │ Firebase Storage │
                                                      │ branches/{bid}/  │
                                                      │ vouchers/        │
                                                      │ {oid}_{ts}       │
                                                      └────────┬─────────┘
                                                               │
                                              { url, path }    ▼
                                                               │
                                                      ┌──────────────────┐
                                                      │ logisticsService.│
                                                      │ attachVoucher(   │  2. Persist voucher metadata on PO
                                                      │   branchId,      │
                                                      │   orderId,       │
                                                      │   { voucherUrl,  │
                                                      │     voucherFileName,│
                                                      │     uploadedAt } │
                                                      │ )                │
                                                      └────────┬─────────┘
                                                               │
                                                               ▼
                                                      ┌──────────────────┐
                                                      │ RTDB:            │
                                                      │ branches/{bid}/  │
                                                      │ logistics/       │
                                                      │ purchase_orders/ │
                                                      │ {oid}            │
                                                      │   voucherUrl: ".."
                                                      │   voucherFileName:".."
                                                      │   uploadedAt: ".." │
                                                      └────────┬─────────┘
                                                               │
                                                               ▼
                                                      ┌──────────────────┐
                                                      │ aiService.       │  3. Extract line items via Gemini
                                                      │ extractVoucher(  │
                                                      │   imageBase64,   │
                                                      │   expectedItems  │
                                                      │ )                │
                                                      └────────┬─────────┘
                                                               │
                                              { items: [{name, qty, unit, unitCost, confidence}] } ▼
                                                               │
                                                      ┌──────────────────┐
                                                      │ fuzzyMatch(      │  4. Match against PO items
                                                      │   extracted,     │
                                                      │   poItems        │
                                                      │ )                │
                                                      └────────┬─────────┘
                                                               │
                                              { matched: [{poItemId, extractedItem, score}],
                                                unmatched: [extractedItem] } ▼
                                                               │
                                                      ┌──────────────────┐
                                                      │ setReceiveQtys(  │  5. Prefill modal state
                                                      │   matched.reduce │
                                                      │     (acc, m) =>  │
                                                      │       ({...acc,  │
                                                      │        [m.poItemId]: m.extractedItem.qty}), 
                                                      │   {})            │
                                                      └────────┬─────────┘
                                                               │
                                                               ▼
                                                      ┌──────────────────┐
                                                      │ Render:          │  6. UI shows matched rows (prefilled)
                                                      │ - Matched items  │     unmatched in "Revisar" section
                                                      │   with green ✓   │     "Re-escanear" button
                                                      │ - Unmatched list │
                                                      └────────┬─────────┘
                                                               │
                                                               ▼
                                                      ┌──────────────────┐
                                                      │ User clicks      │  7. Existing flow unchanged
                                                      │ "Confirmar      │
                                                      │  recepción"      │
                                                      └────────┬─────────┘
                                                               │
                                                               ▼
                                                      ┌──────────────────┐
                                                      │ receivePurchase  │
                                                      │ Order(branchId,  │
                                                      │   orderId, actor,│
                                                      │   quantities)    │
                                                      └──────────────────┘
```

---

## Component Changes

### 1. `apps/house-menu/src/admin/tabs/LogisticsTab.jsx` — ReceiveOrderModal

**Location**: Lines 2131-2173 (modal), lines 2175-2203 (priceChanges modal)

**Changes**:

| Area | Change |
|------|--------|
| State | Add `voucherFile`, `voucherUploading`, `voucherUploadProgress`, `extractionState` (`idle` \| `extracting` \| `done` \| `error`), `extractedItems`, `matchedItems`, `unmatchedItems`, `extractionError` |
| File input | Add `<input type="file" accept="image/*" capture="environment" onChange={handleVoucherSelect} />` with drag-drop area |
| Upload handler | `handleVoucherSelect` → validate type/size → `storageService.uploadVoucher(branchId, orderId, file, setVoucherUploadProgress)` → on success: `logisticsService.attachVoucher(...)` → convert to base64 → `aiService.extractVoucher(base64, poItems)` |
| Extraction UI | While extracting: show steps (Analizando → Reconociendo items → Emparejando). On done: render matched rows with green check, unmatched in "⚠️ Revisar manualmente" section. "Re-escanear" button re-runs extraction. |
| Prefill logic | `matchedItems.forEach(m => setReceiveQtys(prev => ({ ...prev, [m.poItemId]: m.qty })))` |
| Error handling | Toast on upload/extract failure. Keep modal open, allow manual entry fallback. |
| Cleanup | Reset voucher/extraction state when modal closes (`setReceiveOrder(null)`) |

**New helper in LogisticsTab.jsx** (above `PurchaseOrdersSection`):
```jsx
function normalizeForMatch(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/\b(kg|gr|g|litro|l|ml|unidad|und|un|docena|doc)\b/g, '') // strip units
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatch(extracted, poItems) {
  const matched = [];
  const unmatched = [];
  const usedPoIds = new Set();

  for (const ext of extracted) {
    const extNorm = normalizeForMatch(ext.name);
    let best = { poItemId: null, score: 0 };
    for (const [poId, poItem] of Object.entries(poItems)) {
      if (usedPoIds.has(poId)) continue;
      const poNorm = normalizeForMatch(poItem.name);
      if (extNorm.includes(poNorm) || poNorm.includes(extNorm)) {
        const score = Math.max(extNorm.length, poNorm.length);
        if (score > best.score) best = { poItemId: poId, score };
      }
    }
    if (best.poItemId) {
      matched.push({ poItemId: best.poItemId, extractedItem: ext, score: best.score });
      usedPoIds.add(best.poItemId);
    } else {
      unmatched.push(ext);
    }
  }
  return { matched, unmatched };
}
```

### 2. `apps/house-menu/src/lib/aiService.ts` — Add `extractVoucher`

**New export** (after `suggestCampaign`, before `AI_STEPS_DESCRIBE`):

```typescript
export interface VoucherLineItem {
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  confidence: number; // 0-1
}

export interface VoucherExtractionResult {
  items: VoucherLineItem[];
  rawText?: string;
}

const SYSTEM_EXTRACT_VOUCHER = `Eres un experto en lectura de boletas/facturas peruanas (SUNAT). 
Analiza la imagen y extrae SOLO las líneas de productos comprados.
Responde EXCLUSIVAMENTE con JSON válido:
{
  "items": [
    {
      "name": "Nombre del producto tal como aparece",
      "quantity": numero_cantidad,
      "unit": "kg|gr|unidad|litro|ml|docena",
      "unitCost": precio_unitario_en_soles,
      "confidence": 0_a_1
    }
  ]
}
Ignora: totales, impuestos, datos del proveedor, número de documento, fechas.
Si no se detecta unidad, usa "unidad".`;

export async function extractVoucher(
  imageBase64: string,
  expectedItems: Array<{ name: string; quantity: number; unit: string; unitCost: number }>
): Promise<VoucherExtractionResult> {
  const base64 = imageBase64.includes('base64,')
    ? imageBase64.split('base64,')[1]
    : imageBase64;

  const context = `Items esperados en la orden (para guiar la extracción):\n` +
    expectedItems.map(i => `- ${i.name}: ${i.quantity} ${i.unit} x S/ ${i.unitCost.toFixed(2)}`).join('\n');

  const result = await geminiRequest(SYSTEM_EXTRACT_VOUCHER, [
    { inline_data: { mime_type: 'image/jpeg', data: base64 } },
    { text: context },
    { text: 'Extrae las líneas de productos en formato JSON.' },
  ]);

  return {
    items: Array.isArray(result.items)
      ? result.items.map((it: any) => ({
          name: String(it.name || ''),
          quantity: Number(it.quantity) || 0,
          unit: String(it.unit || 'unidad'),
          unitCost: Number(it.unitCost) || 0,
          confidence: Math.max(0, Math.min(1, Number(it.confidence) || 0.5)),
        }))
      : [],
    rawText: result.rawText,
  };
}

export const AI_STEPS_EXTRACT_VOUCHER: AIProcessingStep[] = [
  { label: 'Subiendo imagen...', status: 'pending' },
  { label: 'Analizando boleta con IA...', status: 'current' },
  { label: 'Extrayendo líneas de productos', status: 'pending' },
  { label: 'Emparejando con tu orden', status: 'pending' },
];
```

### 3. `apps/house-menu/src/lib/logisticsService.js` — Add `attachVoucher`

**New export** (after `receivePurchaseOrder`, before `cancelPurchaseOrder`):

```javascript
export async function attachVoucher(branchId, orderId, voucherData) {
  const updates = {
    voucherUrl: voucherData.voucherUrl,
    voucherFileName: voucherData.voucherFileName,
    uploadedAt: voucherData.uploadedAt || nowISO(),
    updatedAt: nowISO(),
  };
  await update(ref(db, `${LOG(branchId)}/purchase_orders/${orderId}`), updates);
  auditLog('logistics.purchase_order.voucher_attached', { branchId, orderId, fileName: voucherData.voucherFileName }, 'system');
  return { success: true };
}
```

**Also update** `createPurchaseOrder` and `updatePurchaseOrder` to allow `voucherUrl`, `voucherFileName`, `uploadedAt` in the order object (no-op if not provided — additive fields).

### 4. `apps/house-menu/src/lib/storageService.js` — Ensure voucher upload path

**No code change needed** — existing `uploadVoucher` (lines 50-85) already uses:
```javascript
const path = `${storageVouchersPath(branchId)}/${orderId}_${Date.now()}`;
```
where `storageVouchersPath(branchId)` → `branches/${branchId}/vouchers` (from `paths.js:232-234`).

**Verify**: Function accepts `onProgress` callback, returns `{ url, path }`. Used by `PTTButton` pattern — reuse same pattern.

### 5. Firebase Storage Rules — `apps/house-menu/storage.rules`

**Existing rule (lines 32-39) already covers**:
```
match /branches/{branchId}/vouchers/{fileName} {
  allow read: if true;
  allow write: if request.resource.size < 5 * 1024 * 1024
                && request.resource.contentType.matches('image/.*');
  allow delete: if request.auth != null;
}
```
**No change needed** — 5MB limit, image/* only, public read (for guest verification if needed), authenticated write/delete.

---

## Fuzzy Match Algorithm

**Normalization pipeline** (applied to both extracted name and PO item name):
1. Lowercase
2. Unicode NFD → strip combining diacritics (accents): "Limón" → "limon"
3. Remove unit tokens (word-boundary regex): `kg|gr|g|litro|l|ml|unidad|und|un|docena|doc`
4. Remove non-alphanumeric (except spaces): `[^a-z0-9\s]`
5. Collapse whitespace: `\s+` → ` `
6. Trim

**Matching**:
- For each extracted item, find PO item with **substring containment** in either direction (`extractedNorm.includes(poNorm) || poNorm.includes(extractedNorm)`)
- Score = `max(extractedNorm.length, poNorm.length)` (longer match = more specific)
- One-to-one: each PO item matched at most once (greedy by score)
- Threshold: score > 0 (any substring match after normalization). If multiple candidates, pick highest score.

**Output**:
```typescript
interface MatchResult {
  matched: Array<{
    poItemId: string;
    extractedItem: VoucherLineItem;
    score: number;
  }>;
  unmatched: VoucherLineItem[];
}
```

**Edge cases handled**:
- "Tomate 1kg" vs "tomate" → match (substring)
- "Limon" vs "Limón" → match (accent stripped)
- "Cilantro (manojo)" vs "cilantro" → match (parens stripped)
- "Papas" (plural) vs "Papa" → no match (substring fails) → goes to unmatched → human reviews

---

## Error Handling Matrix

| Scenario | Detection | UI State | Toast Message | Fallback |
|----------|-----------|----------|---------------|----------|
| Missing `VITE_GEMINI_API_KEY` | `getApiKey()` throws | `extractionState: 'error'` | "IA no configurada. Ingresa cantidades manualmente." | Manual entry |
| Gemini API error (4xx/5xx) | `geminiRequest` throws | `extractionState: 'error'` | "Error al procesar la boleta. Intenta de nuevo." | "Re-escanear" button, manual entry |
| Oversized file (>5MB) | Storage upload rejects | `voucherUploading: false`, error | "Archivo > 5MB. Usa una foto más ligera." | Re-select file |
| Unsupported type (non-image) | `accept="image/*"` + Storage rule | Same as above | "Solo imágenes (JPG/PNG/WebP)." | Re-select file |
| Malformed JSON from Gemini | `JSON.parse` throws in `geminiRequest` | `extractionState: 'error'` | "Respuesta inválida de IA. Intenta de nuevo." | "Re-escanear" button |
| No items extracted | `items.length === 0` | `extractionState: 'done'`, empty matched | "No se detectaron productos. Revisa la foto." | "Re-escanear", manual entry |
| Network timeout (8s) | `AbortSignal.timeout(8000)` | `extractionState: 'error'` | "Tiempo agotado. Verifica tu conexión." | "Re-escanear" button |
| Voucher upload fails | `uploadVoucher` rejects | `voucherUploading: false`, error | "No se pudo subir el voucher." | Retry upload |

All errors keep the ReceiveOrderModal open — user can always enter quantities manually.

---

## Security

- **API Key**: `VITE_GEMINI_API_KEY` already in `.env` (public web key, not secret). Used by existing `aiService.ts`. No new secrets.
- **Storage Rules**: Existing rule at `/branches/{branchId}/vouchers/*` allows authenticated write, public read, 5MB/image limit. No new rules deploy.
- **Data Access**: Voucher URL stored on PO record — readable by any authenticated user with branch access (same as PO data). No additional IAM.
- **No Server-Side Secrets**: Entire flow client-side. Firebase Functions not required.

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| **Unit** | `normalizeForMatch`, `fuzzyMatch` | Vitest pure functions. Cases: accents, units, substrings, no-match, plural mismatch. |
| **Unit** | `extractVoucher` JSON parsing | Mock `geminiRequest` → verify shape, confidence clamping, base64 prefix stripping. |
| **Integration** | `storageService.uploadVoucher` | Mock Firebase Storage `ref`, `uploadBytesResumable` → verify path format, progress callback, URL resolution. |
| **Integration** | `logisticsService.attachVoucher` | Mock RTDB `update` → verify fields written, auditLog called. |
| **Integration** | ReceiveOrderModal flow | @testing-library/react + jsdom. Mock `uploadVoucher`, `extractVoucher`, `attachVoucher`, `fuzzyMatch`. Verify: file select → upload → extract → match → prefill → "Confirmar recepción" calls `receivePurchaseOrder` with prefilled quantities. |
| **E2E** (manual) | Real boleta image | Test with actual Peruvian boleta photo: upload → extract → verify matched items → confirm → verify stock movements in RTDB. |

**Test file locations** (follow existing patterns):
- `apps/house-menu/src/admin/tabs/__tests__/LogisticsTab.voucher.test.jsx` (modal integration)
- `apps/house-menu/src/lib/__tests__/aiService.extractVoucher.test.ts`
- `apps/house-menu/src/lib/__tests__/logisticsService.voucher.test.js`
- `apps/house-menu/src/lib/__tests__/fuzzyMatch.test.js`

---

## Migration / Rollout

**No migration required** — additive fields only:
- PO records gain optional `voucherUrl`, `voucherFileName`, `uploadedAt` (absent on existing records)
- `receivePurchaseOrder` unchanged — zero risk to existing reception flow
- Storage path follows existing convention — no bucket migration

**Rollback**: Revert commits. No database migration to undo.

**Feature flag** (optional): Wrap voucher UI behind `VITE_ENABLE_VOUCHER_OCR=true` for gradual rollout.

---

## Open Questions

- [ ] Should `extractVoucher` also return supplier name/RUC from boleta for auto-populating PO supplier fields? (Spec says prefill quantities only)
- [ ] Confidence threshold for auto-match vs. manual review? Current: any substring match → matched. Consider `confidence > 0.7` threshold.
- [ ] Multi-page PDF support? Spec says image only (JPG/PNG/WebP). PDF would need `pdfjs-dist` + page rendering.
- [ ] Offline support? Current: requires network for upload + Gemini. Could queue locally and sync when online (future).

---

## Next Step

Ready for tasks (sdd-tasks).