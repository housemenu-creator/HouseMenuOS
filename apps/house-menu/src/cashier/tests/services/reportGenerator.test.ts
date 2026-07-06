import { describe, it, expect, vi } from 'vitest';
import {
  buildShiftReport,
  buildOrderReport,
  generateShiftCSV,
  generateOrdersCSV,
  generateShiftSummary,
  downloadCSV,
  downloadText,
} from '../../services/reportGenerator';
import type { KPIs } from '../../services/calculator';
import type { Order } from '../../types';

const mockKPIs: KPIs = {
  totalEfectivo: 150,
  totalYapePlin: 80,
  totalPos: 45,
  totalPendiente: 30,
  totalPorVerificar: 20,
  totalIngresos: 275,
  expectedCash: 350,
  porVerificar: [],
  pendingOrders: [],
  paidCount: 12,
  cancelledCount: 2,
  averageTicket: 22.92,
};

const mockSession = {
  id: 'sess-test-001',
  openedAt: 1720000000000,
  closedAt: 1720086400000,
  openingBalance: 200,
  closingBalance: 340,
  expectedCash: 350,
};

const mockOrders: Order[] = [
  {
    id: 'ord-001', customerName: 'Luis', mesa: '3',
    status: 'recibido', payment_status: 'pagado', payment_method: 'Efectivo',
    financials: { total: 50 }, items: [{ name: 'Pizza', quantity: 1, price: 50 }],
  },
  {
    id: 'ord-002', customerName: 'Ana', mesa: '5',
    status: 'entregado', payment_status: 'pagado', payment_method: 'Yape/Plin',
    financials: { total: 35 }, items: [{ name: 'Ceviche', quantity: 1, price: 25 }, { name: 'Chicha', quantity: 1, price: 10 }],
  },
];

describe('reportGenerator', () => {
  describe('buildShiftReport', () => {
    it('builds report from KPIs and session with difference', () => {
      const report = buildShiftReport(mockKPIs, mockSession);
      expect(report.sessionId).toBe('sess-test-001');
      expect(report.totalEfectivo).toBe(150);
      expect(report.totalIngresos).toBe(275);
      expect(report.difference).toBe(-10); // 340 - 350
      expect(report.paidCount).toBe(12);
    });

    it('handles null closingBalance with null difference', () => {
      const report = buildShiftReport(mockKPIs, { ...mockSession, closingBalance: null, closedAt: null });
      expect(report.closingBalance).toBeNull();
      expect(report.difference).toBeNull();
      expect(report.closedAt).toBeNull();
    });
  });

  describe('buildOrderReport', () => {
    it('builds rows from orders', () => {
      const rows = buildOrderReport(mockOrders);
      expect(rows).toHaveLength(2);
      expect(rows[0].customer).toBe('Luis');
      expect(rows[0].total).toBe(50);
      expect(rows[0].items).toContain('1x Pizza');
    });

    it('handles missing fields', () => {
      const orders: Order[] = [{ id: 'ord-x', status: 'recibido', payment_status: 'pendiente', financials: { total: 0 } }];
      const rows = buildOrderReport(orders);
      expect(rows[0].customer).toBe('—');
      expect(rows[0].mesa).toBe('—');
      expect(rows[0].paymentMethod).toBe('—');
      expect(rows[0].items).toBe('');
    });
  });

  describe('generateShiftCSV', () => {
    it('generates CSV with all sections', () => {
      const report = buildShiftReport(mockKPIs, mockSession);
      const csv = generateShiftCSV(report);
      expect(csv).toContain('Reporte de Turno');
      expect(csv).toContain('Efectivo,150.00');
      expect(csv).toContain('Total Ingresos,275.00');
      expect(csv).toContain('Diferencia,-10.00');
    });
  });

  describe('generateOrdersCSV', () => {
    it('generates CSV with header and rows', () => {
      const rows = buildOrderReport(mockOrders);
      const csv = generateOrdersCSV(rows);
      expect(csv).toContain('ID,Cliente,Mesa,Estado');
      expect(csv).toContain('ord-001,Luis,3');
      expect(csv).toContain('ord-002,Ana,5');
    });

    it('escapes commas inside items', () => {
      const orders: Order[] = [{
        id: 'ord-esc', customerName: 'Test', status: 'recibido', payment_status: 'pagado',
        financials: { total: 30 },
        items: [{ name: 'A, B', quantity: 1, price: 30, productName: 'A, B' }],
      }];
      const rows = buildOrderReport(orders);
      const csv = generateOrdersCSV(rows);
      expect(csv).toContain('"1x A, B"');
    });
  });

  describe('generateShiftSummary', () => {
    it('generates human-readable summary', () => {
      const report = buildShiftReport(mockKPIs, mockSession);
      const text = generateShiftSummary(report);
      expect(text).toContain('REPORTE DE TURNO');
      expect(text).toContain('S/ 275.00'); // totalIngresos
      expect(text).toContain('Cobros: 12');
      expect(text).toContain('-10.00'); // difference
    });
  });

  describe('download helpers', () => {
    it('downloadCSV creates and removes link', () => {
      // URL.createObjectURL must return a string
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const appendSpy = vi.spyOn(document.body, 'appendChild');
      const removeSpy = vi.spyOn(document.body, 'removeChild');

      downloadCSV('a,b\n1,2', 'test-report');

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
      expect(revokeSpy).toHaveBeenCalled();
    });

    it('downloadText creates and removes link', () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      const appendSpy = vi.spyOn(document.body, 'appendChild');
      const removeSpy = vi.spyOn(document.body, 'removeChild');

      downloadText('hello', 'report.txt');

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
    });
  });
});
