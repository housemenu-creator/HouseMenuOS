/**
 * House Print Engine — Client for React
 *
 * Comunica con el servicio local Python (house-print-engine) via HTTP.
 * Fallback: si el engine no está disponible, usa window.print() como antes.
 *
 * Endpoints del engine:
 *   POST http://127.0.0.1:42784/print/order   → comanda de cocina
 *   POST http://127.0.0.1:42784/print/receipt  → boleta de cliente
 *   POST http://127.0.0.1:42784/print/test     → ticket de prueba
 *   GET  http://127.0.0.1:42784/health         → health check
 */

const ENGINE_URL = 'http://127.0.0.1:42784';

// ── Helpers ──────────────────────────────────────────────────────────────

async function fetchEngine(endpoint, options = {}) {
  try {
    const res = await fetch(`${ENGINE_URL}${endpoint}`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    return await res.json();
  } catch {
    return null;
  }
}

function isEngineAvailable() {
  return fetchEngine('/health');
}

/**
 * Build order payload compatible with the Python engine.
 * Normaliza el objeto order de Firebase al formato del engine.
 */
function normalizeOrder(order) {
  if (!order) return null;

  const items = (order.items || []).map((item) => ({
    name: item.name || 'Item',
    quantity: item.quantity || 1,
    price: item.price || 0,
    details: item.details || item.options || [],
  }));

  return {
    id: order.id,
    shortCode: order.shortCode || '',
    displayId: order.displayId || `#${(order.id || '').slice(-6).toUpperCase()}`,
    customerName: order.customerName || '',
    table: order.table || order.location || '',
    notes: order.notes || '',
    priority: order.priority || '',
    items,
    financials: order.financials || {},
    total: order.total || order.financials?.total || 0,
    payment_method: order.payment_method || '',
  };
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Print a kitchen order ticket.
 * @param {Object} order - Order object from Firebase
 * @param {string} branchName - Branch display name
 * @returns {Promise<{success: boolean, engine: boolean, error?: string}>}
 */
export async function printOrderTicket(order, branchName = '') {
  const normalized = normalizeOrder(order);
  if (!normalized) {
    return { success: false, engine: false, error: 'Orden inválida' };
  }

  // Try engine first
  const result = await fetchEngine('/print/order', {
    method: 'POST',
    body: JSON.stringify({ order: normalized, branch_name: branchName }),
  });

  if (result?.success) {
    return { success: true, engine: true, bytes: result.bytes_written };
  }

  // Fallback: browser print
  if (result === null) {
    // Engine not available — use browser print
    fallbackPrintOrder(normalized, branchName);
    return { success: true, engine: false };
  }

  // Engine returned error
  return { success: false, engine: true, error: result.error };
}

/**
 * Print a customer receipt.
 * @param {Object} order
 * @param {string} branchName
 * @returns {Promise<{success: boolean, engine: boolean}>}
 */
export async function printReceipt(order, branchName = '') {
  const normalized = normalizeOrder(order);
  if (!normalized) {
    return { success: false, engine: false, error: 'Orden inválida' };
  }

  const result = await fetchEngine('/print/receipt', {
    method: 'POST',
    body: JSON.stringify({ order: normalized, branch_name: branchName }),
  });

  if (result?.success) {
    return { success: true, engine: true, bytes: result.bytes_written };
  }

  if (result === null) {
    fallbackPrintReceipt(normalized, branchName);
    return { success: true, engine: false };
  }

  return { success: false, engine: true, error: result.error };
}

/**
 * Print a dispatch label (rótulo) for packaging.
 * @param {Object} order
 * @param {string} branchName
 * @returns {Promise<{success: boolean, engine: boolean}>}
 */
export async function printDispatchLabel(order, branchName = '') {
  const normalized = normalizeOrder(order);
  if (!normalized) {
    return { success: false, engine: false, error: 'Orden inválida' };
  }

  const result = await fetchEngine('/print/dispatch-label', {
    method: 'POST',
    body: JSON.stringify({ order: normalized, branch_name: branchName }),
  });

  if (result?.success) {
    return { success: true, engine: true, bytes: result.bytes_written };
  }

  if (result === null) {
    return { success: true, engine: false, error: 'Engine no disponible' };
  }

  return { success: false, engine: true, error: result.error };
}

/**
 * Print a test ticket to verify printer connectivity.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function printTestTicket() {
  const result = await fetchEngine('/print/test', { method: 'POST' });
  if (result?.success) {
    return { success: true, bytes: result.bytes_written };
  }
  return {
    success: false,
    error: result?.error || 'No se pudo conectar al servicio de impresión',
  };
}

/**
 * Check if the print engine is running.
 * @returns {Promise<boolean>}
 */
export async function isPrinterReady() {
  const health = await fetchEngine('/health');
  return health?.printer_connected === true;
}

/**
 * Get printer status.
 * @returns {Promise<Object|null>}
 */
export async function getPrinterStatus() {
  return await fetchEngine('/status');
}

/**
 * Open cash drawer.
 */
export async function openDrawer() {
  return await fetchEngine('/print/drawer', { method: 'POST' });
}

// ── Fallback browser print (same as before, but normalized) ──────────────

const PRINT_STYLES = `
  @page { margin: 8mm; size: 80mm auto; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 10px;
    width: 72mm;
    padding: 4mm 0;
  }
  .header { text-align: center; margin-bottom: 4mm; padding-bottom: 3mm; border-bottom: 2px dashed #000; }
  .header h1 { font-size: 14px; font-weight: bold; letter-spacing: 2px; }
  .header .meta { font-size: 8px; margin-top: 2px; color: #555; }
  .info { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 3mm; padding: 2mm 0; border-bottom: 1px dashed #000; }
  .items { margin-bottom: 3mm; }
  .item { display: flex; justify-content: space-between; align-items: flex-start; padding: 1.5mm 0; border-bottom: 1px dotted #ccc; }
  .item:last-child { border-bottom: none; }
  .item-qty { font-weight: bold; min-width: 8mm; }
  .item-name { flex: 1; padding: 0 2mm; }
  .item-details { font-size: 8px; color: #666; margin-top: 1mm; padding-left: 8mm; }
  .footer { text-align: center; margin-top: 4mm; padding-top: 3mm; border-top: 2px dashed #000; font-size: 8px; }
  .badge { display: inline-block; border: 1px solid #000; padding: 1px 4px; font-size: 8px; font-weight: bold; margin-right: 2px; }
`;

function fallbackPrintOrder(order, branchName) {
  const itemsHtml = (order.items || [])
    .map(
      (item) => `
    <div class="item">
      <span class="item-qty">${item.quantity || 1}x</span>
      <div class="item-name">
        <strong>${item.name}</strong>
        ${item.details?.length ? `<div class="item-details">${item.details.join(' • ')}</div>` : ''}
      </div>
    </div>`
    )
    .join('');

  const code = order.displayId || `#${(order.id || '').slice(-6).toUpperCase()}`;
  const now = new Date().toLocaleString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Comanda ${code}</title><style>${PRINT_STYLES}</style></head>
<body>
  <div class="header">
    <h1>HOUSE MENU</h1>
    <div class="meta">Comanda ${code}</div>
    <div class="meta">${now}</div>
  </div>
  <div class="info">
    <span><strong>${order.customerName || '—'}</strong></span>
    <span>${order.table || ''}</span>
  </div>
  ${order.priority === 'rush' ? '<div style="text-align:center;margin-bottom:2mm"><span class="badge">RUSH</span></div>' : ''}
  <div class="items">${itemsHtml}</div>
  ${order.notes ? `<div style="margin-top:2mm;padding-top:2mm;border-top:1px dashed #ccc;font-size:8px;color:#555">${order.notes}</div>` : ''}
  <div class="footer">${branchName || 'Gracias por su pedido'}</div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=300,height=600');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

function fallbackPrintReceipt(order) {
  // Same as order for now — browser print is rarely used for receipts
  fallbackPrintOrder(order);
}

// ── Legacy export ────────────────────────────────────────────────────────

/**
 * Legacy printTicket function — kept for backward compat.
 * Now routes through the engine first, falls back to browser print.
 *
 * @deprecated Use printOrderTicket() or printReceipt() instead.
 */
export function printTicket(order) {
  printOrderTicket(order);
}
