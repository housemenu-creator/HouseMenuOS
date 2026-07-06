// printService — Kitchen ticket / receipt printing
// Uses browser print API via hidden iframe. No external dependencies.

export interface PrintOptions {
  title?: string;
  paperWidth?: string; // CSS size, e.g. '80mm'
}

/**
 * Print HTML content as a kitchen ticket / receipt.
 * Opens a hidden iframe, writes HTML, triggers window.print(), then cleans up.
 */
export function printHTML(html: string, options: PrintOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.setAttribute('aria-hidden', 'true');

      iframe.onload = () => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!doc) { reject(new Error('Could not access iframe document')); return; }
          doc.open();
          doc.write(html);
          doc.close();

          // Small delay to ensure rendering before print
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (printErr) {
              // Fallback: just resolve — printing may have already started
              console.warn('printService: print trigger error', printErr);
            }
            resolve();
          }, 250);
        } catch (docErr) {
          reject(docErr);
        }
      };

      document.body.appendChild(iframe);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Format a kitchen ticket HTML from order data.
 * Thermal-printer friendly: 58mm width, monospace, condensed, no images.
 */
export function buildKitchenTicketHTML(params: {
  orderId: string;
  mesa: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; details?: string[] }>;
  notes?: string;
  branchName?: string;
}): string {
  const { orderId, mesa, customerName, items, notes, branchName } = params;
  const shortId = orderId.slice(-6).toUpperCase();
  const now = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  const itemsHTML = items.map(item => `
    <tr>
      <td style="text-align:left;padding:3px 0;font-size:13px;">${item.quantity}x ${item.name}</td>
    </tr>
    ${item.details && item.details.length > 0
      ? `<tr><td style="text-align:left;padding:0 0 3px 12px;font-size:10px;color:#666;">${item.details.join(', ')}</td></tr>`
      : ''}
  `).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comanda #${shortId}</title>
  <style>
    @page { margin: 0; size: 80mm auto; }
    body { font-family: 'Courier New', 'Courier', monospace; font-size: 12px; margin: 0; padding: 8px; width: 80mm; color: #000; }
    .header { text-align: center; margin-bottom: 6px; }
    .header .branch { font-size: 14px; font-weight: bold; }
    .header .meta { font-size: 10px; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    .footer { text-align: center; font-size: 10px; margin-top: 8px; }
    .notes { font-size: 11px; font-style: italic; margin-top: 4px; padding: 4px; border: 1px dashed #999; }
  </style>
</head>
<body>
  <div class="header">
    ${branchName ? `<div class="branch">${branchName}</div>` : ''}
    <div class="meta"># ${shortId} &nbsp;|&nbsp; ${now}</div>
    <div class="meta">Mesa: ${mesa || '—'} &nbsp;|&nbsp; ${customerName || 'Cliente'}</div>
  </div>
  <div class="divider"></div>
  <table>${itemsHTML}</table>
  ${notes ? `<div class="notes">📝 ${notes}</div>` : ''}
  <div class="divider"></div>
  <div class="footer">COMANDA — COCINA</div>
</body>
</html>`;
}
