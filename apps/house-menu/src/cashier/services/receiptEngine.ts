/**
 * receiptEngine — Pure receipt generation logic
 * Zero React/UI dependency. Produces HTML and plaintext receipt strings.
 */

import type { Order } from '../types';

export interface ReceiptData {
  header: {
    branchName: string;
    date: string;
    orderId: string;
    table: string;
    customer: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    discount?: string;
  }>;
  totals: {
    subtotal: number;
    discount: number;
    total: number;
    method: string;
    paid: number;
    change: number;
  };
  footer: {
    thanks: string;
    qrData?: string;
  };
}

export function buildReceiptData(order: Order, branchName = 'Restaurante'): ReceiptData {
  const items = (order.items || []).map(item => ({
    name: item.name || item.productName || item.productId || 'Producto',
    quantity: item.quantity || 1,
    unitPrice: item.price || 0,
    total: (item.price || 0) * (item.quantity || 1),
    discount: item.discount
      ? item.discount.type === 'percentage'
        ? `${item.discount.value}%`
        : `S/ ${item.discount.value}`
      : undefined,
  }));

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const discountAmount = order.totalAfterDiscount != null
    ? subtotal - order.totalAfterDiscount
    : 0;
  const total = order.financials?.total || subtotal - discountAmount;

  return {
    header: {
      branchName,
      date: order.createdAt ? new Date(order.createdAt).toLocaleString('es-PE') : new Date().toLocaleString('es-PE'),
      orderId: order.id.slice(-6).toUpperCase(),
      table: order.mesa || '—',
      customer: order.customerName || 'Cliente General',
    },
    items,
    totals: {
      subtotal,
      discount: discountAmount,
      total,
      method: order.payment_method || '—',
      paid: total,
      change: 0,
    },
    footer: {
      thanks: '¡Gracias por su visita!',
    },
  };
}

export function renderReceiptHTML(data: ReceiptData): string {
  const itemsHTML = data.items.map(item => `
    <tr>
      <td style="text-align:left;padding:2px 0;">${item.quantity}x ${item.name}</td>
      <td style="text-align:right;padding:2px 0;">S/ ${item.total.toFixed(2)}</td>
    </tr>
    ${item.discount ? `<tr><td style="text-align:left;font-size:10px;color:#888;padding:0 0 4px 8px;">Desc: ${item.discount}</td><td></td></tr>` : ''}
  `).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 0; size: 80mm auto; }
    body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 8px; width: 80mm; }
    table { width: 100%; border-collapse: collapse; }
    td { font-size: 12px; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .total-row td { border-top: 1px dashed #000; padding-top: 4px; font-weight: bold; font-size: 14px; }
    .line { border-top: 1px dashed #000; margin: 8px 0; }
  </style>
</head>
<body>
  <div class="center bold" style="font-size:14px;margin-bottom:4px;">${data.header.branchName}</div>
  <div class="center" style="font-size:10px;margin-bottom:8px;">${data.header.date}</div>
  <div class="line"></div>
  <table>
    <tr><td>Mesa:</td><td style="text-align:right;">${data.header.table}</td></tr>
    <tr><td>Cliente:</td><td style="text-align:right;">${data.header.customer}</td></tr>
    <tr><td># Orden:</td><td style="text-align:right;">${data.header.orderId}</td></tr>
  </table>
  <div class="line"></div>
  <table>${itemsHTML}</table>
  <div class="line"></div>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right;">S/ ${data.totals.subtotal.toFixed(2)}</td></tr>
    ${data.totals.discount > 0 ? `<tr><td>Descuento</td><td style="text-align:right;">-S/ ${data.totals.discount.toFixed(2)}</td></tr>` : ''}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right;">S/ ${data.totals.total.toFixed(2)}</td></tr>
    <tr><td>Método</td><td style="text-align:right;">${data.totals.method}</td></tr>
  </table>
  <div class="line"></div>
  <div class="center bold" style="margin-top:8px;">${data.footer.thanks}</div>
</body>
</html>`;
}

export function renderReceiptText(data: ReceiptData): string {
  const lines: string[] = [];
  const pad = (s: string, n: number) => s.padEnd(n);

  lines.push(data.header.branchName);
  lines.push(data.header.date);
  lines.push('─'.repeat(32));
  lines.push(`Mesa: ${data.header.table}   #${data.header.orderId}`);
  lines.push(`Cliente: ${data.header.customer}`);
  lines.push('─'.repeat(32));

  for (const item of data.items) {
    lines.push(`${item.quantity}x ${pad(item.name, 20)} S/ ${item.total.toFixed(2)}`);
    if (item.discount) lines.push(`  Desc: ${item.discount}`);
  }

  lines.push('─'.repeat(32));
  lines.push(`Subtotal:       S/ ${data.totals.subtotal.toFixed(2)}`);
  if (data.totals.discount > 0) lines.push(`Descuento:     -S/ ${data.totals.discount.toFixed(2)}`);
  lines.push(`TOTAL:          S/ ${data.totals.total.toFixed(2)}`);
  lines.push(`Método:         ${data.totals.method}`);
  lines.push('─'.repeat(32));
  lines.push(data.footer.thanks);

  return lines.join('\n');
}
