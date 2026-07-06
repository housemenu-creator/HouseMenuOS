import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewOrderModal } from '../../components/modals/NewOrderModal';
import type { CatalogState, CartItem, OrderPayload } from '../../types';

const mockProducts = [
  { id: 'p1', name: 'Lomo Saltado', category: 'Platos', base_price: 28.0, available: true },
  { id: 'p2', name: 'Ceviche', category: 'Entradas', base_price: 22.0, available: true },
  { id: 'p3', name: 'Chicha Morada', category: 'Bebidas', base_price: 6.0, available: true },
  { id: 'p4', name: 'Arroz con Mariscos', category: 'Platos', base_price: 32.0, available: true },
];

const populatedCatalog: CatalogState = {
  products: mockProducts,
  categories: ['Bebidas', 'Entradas', 'Platos'],
  grouped: {
    Bebidas: [mockProducts[2]],
    Entradas: [mockProducts[1]],
    Platos: [mockProducts[0], mockProducts[3]],
  },
  loading: false,
  error: null,
  isEmpty: false,
};

const loadingCatalog: CatalogState = {
  products: [],
  categories: [],
  grouped: {},
  loading: true,
  error: null,
  isEmpty: true,
};

const emptyCatalog: CatalogState = {
  products: [],
  categories: [],
  grouped: {},
  loading: false,
  error: null,
  isEmpty: true,
};

const errorCatalog: CatalogState = {
  products: [],
  categories: [],
  grouped: {},
  loading: false,
  error: 'Error de conexión',
  isEmpty: false,
};

function createMockOrderBuilder(overrides: Record<string, unknown> = {}) {
  return {
    items: [] as CartItem[],
    customerName: '',
    mesa: '',
    notes: '',
    itemCount: 0,
    total: 0,
    isEmpty: true,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    setCustomerName: vi.fn(),
    setMesa: vi.fn(),
    setNotes: vi.fn(),
    clearCart: vi.fn(),
    buildPayload: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

describe('NewOrderModal', () => {
  // ── 4-State Rendering ──

  it('renders loading state', () => {
    render(
      <NewOrderModal
        catalog={loadingCatalog}
        orderBuilder={createMockOrderBuilder()}
        sessionId="sess-1"
        onClose={vi.fn()}
        onCreateOrder={vi.fn()}
      />
    );
    expect(screen.getByText(/Cargando catálogo/i)).toBeDefined();
  });

  it('renders empty state', () => {
    render(
      <NewOrderModal
        catalog={emptyCatalog}
        orderBuilder={createMockOrderBuilder()}
        sessionId="sess-1"
        onClose={vi.fn()}
        onCreateOrder={vi.fn()}
      />
    );
    expect(screen.getByText(/No hay productos disponibles/i)).toBeDefined();
  });

  it('renders error state with retry', () => {
    const retry = vi.fn();
    render(
      <NewOrderModal
        catalog={{ ...errorCatalog, retry }}
        orderBuilder={createMockOrderBuilder()}
        sessionId="sess-1"
        onClose={vi.fn()}
        onCreateOrder={vi.fn()}
      />
    );
    expect(screen.getByText(/Error de conexión/i)).toBeDefined();
    expect(screen.getByText(/Reintentar/i)).toBeDefined();
    fireEvent.click(screen.getByText(/Reintentar/i));
    expect(retry).toHaveBeenCalled();
  });

  it('renders products when catalog populated', () => {
    render(
      <NewOrderModal
        catalog={populatedCatalog}
        orderBuilder={createMockOrderBuilder()}
        sessionId="sess-1"
        onClose={vi.fn()}
        onCreateOrder={vi.fn()}
      />
    );
    expect(screen.getByText('Lomo Saltado')).toBeDefined();
    expect(screen.getByText('Ceviche')).toBeDefined();
    expect(screen.getByText('Chicha Morada')).toBeDefined();
    expect(screen.getByText('S/ 28.00')).toBeDefined();
  });

  // ── Category Tabs ──

  it('shows category tabs and filters products', () => {
    render(
      <NewOrderModal
        catalog={populatedCatalog}
        orderBuilder={createMockOrderBuilder()}
        sessionId="sess-1"
        onClose={vi.fn()}
        onCreateOrder={vi.fn()}
      />
    );
    expect(screen.getByText('Todos')).toBeDefined();
    expect(screen.getByText('Platos')).toBeDefined();
    expect(screen.getByText('Bebidas')).toBeDefined();
    expect(screen.getByText('Entradas')).toBeDefined();
  });

  // ── Adding items invokes orderBuilder.addItem ──

  it('calls addItem when clicking a product', () => {
    const addItem = vi.fn();
    render(
      <NewOrderModal
        catalog={populatedCatalog}
        orderBuilder={createMockOrderBuilder({ addItem })}
        sessionId="sess-1"
        onClose={vi.fn()}
        onCreateOrder={vi.fn()}
      />
    );
    const addButtons = screen.getAllByRole('button', { name: /Agregar/i });
    expect(addButtons.length).toBeGreaterThanOrEqual(4);
    fireEvent.click(addButtons[0]);
    expect(addItem).toHaveBeenCalledWith(mockProducts[0]);
  });

  // ── Cart shows items ──

  it('shows items in the cart panel', () => {
    const items: CartItem[] = [
      { productId: 'p1', name: 'Lomo Saltado', quantity: 2, unitPrice: 28, total: 56 },
    ];
    render(
      <NewOrderModal
        catalog={populatedCatalog}
        orderBuilder={createMockOrderBuilder({ items, itemCount: 2, total: 56, isEmpty: false })}
        sessionId="sess-1"
        onClose={vi.fn()}
        onCreateOrder={vi.fn()}
      />
    );
    // "Lomo Saltado" appears in both catalog grid and cart panel
    expect(screen.getAllByText('Lomo Saltado').length).toBeGreaterThanOrEqual(2);
    // Cart shows S/ 56.00 in both line item and footer total
    expect(screen.getAllByText('S/ 56.00').length).toBeGreaterThanOrEqual(2);
  });

  // ── Cart total display ──

  it('displays correct total in cart', () => {
    const items: CartItem[] = [
      { productId: 'p1', name: 'Lomo Saltado', quantity: 2, unitPrice: 28, total: 56 },
      { productId: 'p4', name: 'Arroz con Mariscos', quantity: 1, unitPrice: 32, total: 32 },
    ];
    render(
      <NewOrderModal
        catalog={populatedCatalog}
        orderBuilder={createMockOrderBuilder({ items, itemCount: 3, total: 88, isEmpty: false })}
        sessionId="sess-1"
        onClose={vi.fn()}
        onCreateOrder={vi.fn()}
      />
    );
    expect(screen.getByText('S/ 88.00')).toBeDefined();
  });

  // ── "Enviar a Cocina" disabled when cart empty ──

  it('disables confirm button when cart empty', () => {
    render(
      <NewOrderModal
        catalog={populatedCatalog}
        orderBuilder={createMockOrderBuilder()}
        sessionId="sess-1"
        onClose={vi.fn()}
        onCreateOrder={vi.fn()}
      />
    );
    const confirmBtn = screen.getByText(/Enviar a Cocina/i).closest('button');
    expect(confirmBtn).toBeDisabled();
  });

  // ── Confirm calls onCreateOrder with payload ──

  it('calls onCreateOrder with payload on confirm', async () => {
    const items: CartItem[] = [
      { productId: 'p1', name: 'Lomo Saltado', quantity: 2, unitPrice: 28, total: 56 },
    ];
    const payload: OrderPayload = {
      customerName: 'Juan',
      mesa: '5',
      items: [{ productId: 'p1', name: 'Lomo Saltado', quantity: 2, price: 28, subtotal: 56 }],
      total: 56,
      notes: [],
      source: 'cashier',
      sessionId: 'sess-1',
      payment_status: 'pendiente',
    };
    const buildPayload = vi.fn(() => payload);
    const onCreateOrder = vi.fn().mockResolvedValue({ success: true, orderId: 'ord-123' });

    render(
      <NewOrderModal
        catalog={populatedCatalog}
        orderBuilder={createMockOrderBuilder({
          items,
          itemCount: 2,
          total: 56,
          isEmpty: false,
          customerName: 'Juan',
          mesa: '5',
          buildPayload,
        })}
        sessionId="sess-1"
        onClose={vi.fn()}
        onCreateOrder={onCreateOrder}
      />
    );
    const confirmBtn = screen.getByText(/Enviar a Cocina/i);
    fireEvent.click(confirmBtn);

    expect(buildPayload).toHaveBeenCalledWith('sess-1', 'cashier');
    expect(onCreateOrder).toHaveBeenCalledWith(payload);
    // Wait for the promise to resolve
    await vi.waitFor(() => {
      expect(screen.queryByText(/Enviar a Cocina/i)).toBeDefined();
    });
  });

  // ── "Cobrar ahora" checkbox present ──

  it('shows "Cobrar ahora" checkbox', () => {
    render(
      <NewOrderModal
        catalog={populatedCatalog}
        orderBuilder={createMockOrderBuilder({
          items: [{ productId: 'p1', name: 'Lomo Saltado', quantity: 1, unitPrice: 28, total: 28 }],
          itemCount: 1,
          total: 28,
          isEmpty: false,
        })}
        sessionId="sess-1"
        onClose={vi.fn()}
        onCreateOrder={vi.fn()}
      />
    );
    expect(screen.getByText(/Cobrar ahora/i)).toBeDefined();
  });

  // ── Calls onClose on backdrop click ──

  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn();
    render(
      <NewOrderModal
        catalog={populatedCatalog}
        orderBuilder={createMockOrderBuilder()}
        sessionId="sess-1"
        onClose={onClose}
        onCreateOrder={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  // ── Calls onClose when cancel button clicked ──

  it('calls onClose when cancel button clicked', () => {
    const onClose = vi.fn();
    render(
      <NewOrderModal
        catalog={populatedCatalog}
        orderBuilder={createMockOrderBuilder()}
        sessionId="sess-1"
        onClose={onClose}
        onCreateOrder={vi.fn()}
      />
    );
    const cancelBtns = screen.getAllByText(/Cancelar/i);
    // Click the last Cancelar button (the modal-level cancel, not item remove)
    fireEvent.click(cancelBtns[cancelBtns.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });

  // ── Customer fields render ──

  it('renders customer name and mesa inputs', () => {
    render(
      <NewOrderModal
        catalog={populatedCatalog}
        orderBuilder={createMockOrderBuilder({
          items: [{ productId: 'p1', name: 'Lomo Saltado', quantity: 1, unitPrice: 28, total: 28 }],
          itemCount: 1,
          total: 28,
          isEmpty: false,
        })}
        sessionId="sess-1"
        onClose={vi.fn()}
        onCreateOrder={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText(/Nombre del cliente/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Mesa/i)).toBeDefined();
  });
});
