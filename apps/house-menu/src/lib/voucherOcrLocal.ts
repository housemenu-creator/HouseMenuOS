/**
 * Local voucher OCR — free fallback using Tesseract.js (runs in the browser).
 *
 * Used when the Gemini API key has no quota (429/403). Day the key works again,
 * Gemini takes over automatically; this module stays as a no-cost safety net.
 */

import type { VoucherExtractionResult, VoucherLineItem } from './aiService';

const UNIT_PATTERN = '(?:kg|kilo|gr|g|gramo|und|un|unidad|bot|lata|ml|docena|sol|s)';

/** Skip header/footer/aggregate lines that are not product rows. */
const NOISE_RE =
  /^(total|subtotal|igv|impuesto|vuelto|cambio|efectivo|tarjeta|yape|plin|ruc|boleta|factura|gracias|atendido|fecha|cliente|direccion|telefono|cajero|vendedor)\b/i;

/** Extract product rows from raw OCR text. Heuristic, tuned for thermal receipts. */
export function parseBoletaText(rawText: string): VoucherLineItem[] {
  const items: VoucherLineItem[] = [];
  if (!rawText) return items;

  for (const rawLine of rawText.split('\n')) {
    const line = rawLine.trim().replace(/\s+/g, ' ');
    if (!line || NOISE_RE.test(line)) continue;

    // Patterns: "PAPA 10 KG S/ 2.50" | "papa blanca 1 kg x S/4.26" | "CEBOLLA 5kg 1.80" | "AJI LIMO 1 sol S/3.00"
    const m = line.match(
      new RegExp(
        `^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_PATTERN})\\.?\\s*(?:x\\s*)?(?:S\\/?\\s*)?(\\d+(?:[.,]\\d+)?)\\s*$`,
        'i'
      )
    );

    if (!m) continue;

    let name = m[1].trim();
    const unit = (m[3] || 'unidad').toLowerCase();
    const quantity = parseFloat(m[2].replace(',', '.'));
    let unitCost = parseFloat(m[4].replace(',', '.'));

    if (!name || !isFinite(quantity) || !isFinite(unitCost) || quantity <= 0) continue;

    // Strip trailing junk like "S/", "S/." or doubled separators from the name.
    name = name.replace(/[:\-–—]+$/g, '').trim();
    if (!name) continue;

    // Heuristic: some receipts print total with quantity 1; keep it, fuzzyMatch will score it.
    items.push({ name, quantity, unit, unitCost, confidence: 0.7 });
  }

  return items;
}

/**
 * Runs Tesseract.js OCR locally and parses the receipt text into line items.
 * Falls back to expected items when OCR yields nothing usable.
 */
export async function extractVoucherLocal(
  imageBase64: string,
  expectedItems: Array<{ name: string; quantity: number; unit: string; unitCost: number }>
): Promise<VoucherExtractionResult> {
  const { createWorker } = await import('tesseract.js');

  const worker = await createWorker('spa');
  try {
    const { data } = await worker.recognize(imageBase64);
    const items = parseBoletaText(data.text || '');

    // OCR empty or garbage → keep the order's expected items with low confidence
    // so the user can still confirm manually without losing the receipt.
    const result =
      items.length > 0
        ? items
        : expectedItems.map(i => ({ ...i, confidence: 0.2 }));

    return { items: result, rawText: data.text };
  } finally {
    await worker.terminate();
  }
}

/** True when the local OCR fallback can run in this environment (browser only). */
export function canRunLocalOcr(): boolean {
  return typeof window !== 'undefined' && typeof window.Worker !== 'undefined';
}
