// Cashier Module — Report Generator Service
// Pure functions for generating structured reports, CSV exports, and formatted summaries

import type { Order } from '../types';
import type { KPIs } from './calculator';

export interface ShiftReportData {
  sessionId: string;
  openedAt: string;
  closedAt: string | null;
  openingBalance: number;
  closingBalance: number | null;
  expectedCash: number;
  totalEfectivo: number;
  totalYapePlin: number;
  totalPos: number;
  totalIngresos: number;
  totalPendiente: number;
  totalPorVerificar: number;
  paidCount: number;
  cancelledCount: number;
  averageTicket: number;
  difference: number | null;
}

export interface OrderReportRow {
  id: string;
  customer: string;
  mesa: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  items: string;
  total: number;
}

/**
 * Build a structured shift report from KPIs and session data.
 */
export function buildShiftReport(
  kpis: KPIs,
  session: {
    id: string;
    openedAt: number;
    closedAt: number | null;
    openingBalance: number;
    closingBalance: number | null;
    expectedCash: number | null;
  },
): ShiftReportData {
  const diff =
    session.closingBalance != null
      ? session.closingBalance - (session.expectedCash ?? kpis.expectedCash)
      : null;

  return {
    sessionId: session.id,
    openedAt: formatTimestamp(session.openedAt),
    closedAt: session.closedAt ? formatTimestamp(session.closedAt) : null,
    openingBalance: session.openingBalance,
    closingBalance: session.closingBalance,
    expectedCash: session.expectedCash ?? kpis.expectedCash,
    totalEfectivo: kpis.totalEfectivo,
    totalYapePlin: kpis.totalYapePlin,
    totalPos: kpis.totalPos,
    totalIngresos: kpis.totalIngresos,
    totalPendiente: kpis.totalPendiente,
    totalPorVerificar: kpis.totalPorVerificar,
    paidCount: kpis.paidCount,
    cancelledCount: kpis.cancelledCount,
    averageTicket: kpis.averageTicket,
    difference: diff,
  };
}

/**
 * Build per-order report rows for detailed export.
 */
export function buildOrderReport(orders: Order[]): OrderReportRow[] {
  return orders.map(o => ({
    id: o.id,
    customer: o.customerName || '—',
    mesa: o.mesa || '—',
    status: o.status,
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method || '—',
    items: (o.items || []).map(i => `${i.quantity}x ${i.name || i.productName || 'Item'}`).join('; '),
    total: o.financials?.total ?? o.total ?? 0,
  }));
}

/**
 * Generate a CSV string from a shift report.
 */
export function generateShiftCSV(report: ShiftReportData): string {
  const rows: string[][] = [
    ['Reporte de Turno — Cajero'],
    [],
    ['Campo', 'Valor'],
    ['ID Sesión', report.sessionId],
    ['Apertura', report.openedAt],
    ['Cierre', report.closedAt || '—'],
    ['Saldo Inicial', report.openingBalance.toFixed(2)],
    ['Saldo Final', report.closingBalance?.toFixed(2) ?? '—'],
    ['Esperado en Caja', report.expectedCash.toFixed(2)],
    [],
    ['Ingresos por Método de Pago'],
    ['Efectivo', report.totalEfectivo.toFixed(2)],
    ['Yape/Plin', report.totalYapePlin.toFixed(2)],
    ['Tarjeta (POS)', report.totalPos.toFixed(2)],
    ['Total Ingresos', report.totalIngresos.toFixed(2)],
    [],
    ['Órdenes'],
    ['Cobros Completados', report.paidCount.toString()],
    ['Cancelaciones', report.cancelledCount.toString()],
    ['Pendientes', report.totalPendiente.toFixed(2)],
    ['Por Verificar', report.totalPorVerificar.toFixed(2)],
    ['Ticket Promedio', report.averageTicket.toFixed(2)],
    [],
    ['Diferencia', report.difference?.toFixed(2) ?? '—'],
  ];

  return rows.map(row => row.map(cell => escapeCSV(cell)).join(',')).join('\n');
}

/**
 * Generate a CSV string from order report rows.
 */
export function generateOrdersCSV(orders: OrderReportRow[]): string {
  const header = ['ID', 'Cliente', 'Mesa', 'Estado', 'Pago', 'Método', 'Items', 'Total'];
  const rows = orders.map(o => [
    o.id,
    o.customer,
    o.mesa,
    o.status,
    o.paymentStatus,
    o.paymentMethod,
    o.items,
    o.total.toFixed(2),
  ]);
  return [header.map(escapeCSV).join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n');
}

/**
 * Generate a human-readable text summary of the shift.
 */
export function generateShiftSummary(report: ShiftReportData): string {
  const lines = [
    '╔══════════════════════════════════╗',
    '║     REPORTE DE TURNO — CAJERO    ║',
    '╚══════════════════════════════════╝',
    '',
    `Sesión:    ${report.sessionId.slice(-8).toUpperCase()}`,
    `Apertura:  ${report.openedAt}`,
    `Cierre:    ${report.closedAt || '—'}`,
    '',
    '── Ingresos ──',
    `Efectivo:    S/ ${report.totalEfectivo.toFixed(2)}`,
    `Yape/Plin:   S/ ${report.totalYapePlin.toFixed(2)}`,
    `Tarjeta POS: S/ ${report.totalPos.toFixed(2)}`,
    `TOTAL:       S/ ${report.totalIngresos.toFixed(2)}`,
    '',
    `Saldo Inicial:  S/ ${report.openingBalance.toFixed(2)}`,
    `Esperado Caja:  S/ ${report.expectedCash.toFixed(2)}`,
    `Saldo Final:    ${report.closingBalance != null ? 'S/ ' + report.closingBalance.toFixed(2) : '—'}`,
    `Diferencia:     ${report.difference != null ? (report.difference >= 0 ? '+' : '') + report.difference.toFixed(2) : '—'}`,
    '',
    `Cobros: ${report.paidCount}  |  Cancelaciones: ${report.cancelledCount}`,
    `Ticket Promedio: S/ ${report.averageTicket.toFixed(2)}`,
  ];
  return lines.join('\n');
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger a text download (for printable reports).
 */
export function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Helpers ──

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function escapeCSV(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
