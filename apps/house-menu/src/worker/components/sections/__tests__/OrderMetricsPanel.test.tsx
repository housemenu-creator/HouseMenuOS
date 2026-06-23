import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OrderMetricsPanel from '../OrderMetricsPanel';

describe('OrderMetricsPanel', () => {
  const pipelineProps = {
    statusCounts: { recibido: 3, preparando: 2, listo: 1, en_camino: 0, entregado: 5, cancelado: 1, all: 12 },
    activeOrders: [
      { id: 'ord-001', status: 'recibido', customerName: 'Cliente A', tableNumber: 3, financials: { total: 50 } },
      { id: 'ord-002', status: 'preparando', customerName: 'Cliente B', financials: { total: 30 } },
    ],
  };

  it('renders pipeline counts for each status', () => {
    render(<OrderMetricsPanel {...pipelineProps} />);
    expect(screen.getByText('3')).toBeDefined();   // recibido
    expect(screen.getByText('2')).toBeDefined();   // preparando
    expect(screen.getByText('1')).toBeDefined();   // listo
    expect(screen.getByText('0')).toBeDefined();   // en_camino
  });

  it('renders active order entries', () => {
    render(<OrderMetricsPanel {...pipelineProps} />);
    expect(screen.getByText(/Cliente A/i)).toBeDefined();
    expect(screen.getByText(/Cliente B/i)).toBeDefined();
    expect(screen.getByText(/Mesa 3/i)).toBeDefined();
  });

  it('shows empty state when there are no active orders', () => {
    render(<OrderMetricsPanel statusCounts={{}} activeOrders={[]} />);
    expect(screen.getByText(/Sin pedidos activos/i)).toBeDefined();
  });
});
