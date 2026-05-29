const PRINT_STYLES = `
  @page { margin: 8mm; size: 80mm auto; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 10px;
    color: #000;
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
  .allergen { display: inline-block; border: 1px solid #999; padding: 0 3px; font-size: 7px; margin: 1px; color: #666; }
`;

export function printTicket(order) {
  if (!order) return;

  const itemsHtml = (order.items || [])
    .map(
      (item, i) => `
    <div class="item">
      <span class="item-qty">${item.quantity || 1}x</span>
      <div class="item-name">
        <strong>${item.name || 'Item'}</strong>
        ${item.details?.length ? `<div class="item-details">${item.details.join(' • ')}</div>` : ''}
      </div>
    </div>`
    )
    .join('');

  const allergens = (order.allergens || [])
    .map((a) => `<span class="allergen">${a}</span>`)
    .join('');

  const orderId = order.id?.slice(-6).toUpperCase() || 'N/A';
  const now = new Date().toLocaleString('es-PE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Comanda #${orderId}</title><style>${PRINT_STYLES}</style></head>
<body>
  <div class="header">
    <h1>HOUSE MENU</h1>
    <div class="meta">Comanda #${orderId}</div>
    <div class="meta">${now}</div>
  </div>
  <div class="info">
    <span><strong>${order.customerName || '—'}</strong></span>
    <span>${order.location || ''}</span>
  </div>
  ${order.priority === 'rush' ? '<div style="text-align:center;margin-bottom:2mm"><span class="badge">RUSH</span></div>' : ''}
  <div class="items">${itemsHtml}</div>
  ${allergens ? `<div style="margin-top:2mm;font-size:8px">${allergens}</div>` : ''}
  ${order.notes ? `<div style="margin-top:2mm;padding-top:2mm;border-top:1px dashed #ccc;font-size:8px;color:#555">${order.notes}</div>` : ''}
  <div class="footer">Gracias por su pedido</div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=300,height=600');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 300);
}
