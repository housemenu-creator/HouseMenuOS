import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MenuItemRow from '../../components/menu-builder/MenuItemRow';

// ── Mocks ──

vi.mock('../../../context/BranchContext', () => ({
  useBranch: () => ({ activeBranchId: 'branch-test' }),
}));

vi.mock('../../../lib/storageService', () => ({
  storageService: {
    uploadProductImage: vi.fn(),
  },
}));

// ── Helpers ──

function createItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    name: 'Lomo Saltado',
    description: 'Tiernos trozos de lomo salteados con cebolla y tomate',
    base_price: 28,
    available: true,
    category: 'Platos',
    sortOrder: 1,
    status: 'published' as const,
    trackStock: false,
    stock: 0,
    tags: [],
    channels: { carta: true, kiosko: true, landing: false, delivery: true },
    ...overrides,
  };
}

/**
 * Find the context menu trigger button (MoreVertical icon).
 * Lucide SVG may not have consistent class names in jsdom, so we scan
 * all buttons and look for one whose inner SVG has a vertical-ellipsis-like
 * path pattern (three circles stacked vertically).
 */
function findContextTrigger(): HTMLElement | null {
  const buttons = screen.getAllByRole('button');
  // The context menu button is typically the last button that is small (p-1.5)
  // and does NOT have a title attribute (unlike move buttons which have titles).
  // Look for buttons with no title that are small (p-1.5 class).
  return (
    buttons.find(b => {
      const html = b.innerHTML.toLowerCase();
      // MoreVertical SVG has 3 circle paths (cx="12" cy="5", "12", "19")
      return html.includes('cx="12" cy="5"') || html.includes('cx="12"') && html.includes('cy="5"');
    })
    // Fallback: last button in the row (right side actions)
    || buttons[buttons.length - 1]
  );
}

const defaultProps = {
  toggleAvailability: vi.fn(),
  updateField: vi.fn(),
  deleteProduct: vi.fn(),
  duplicateProduct: vi.fn(),
  onConfigureWizard: vi.fn(),
  onMoveItem: vi.fn(),
  onReorder: vi.fn(),
  index: 1,
  total: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MenuItemRow', () => {
  it('renders product name, price, and description', () => {
    render(<MenuItemRow item={createItem()} {...defaultProps} />);

    expect(screen.getByText('Lomo Saltado')).toBeDefined();
    expect(screen.getByText('28.00')).toBeDefined();
    expect(screen.getByText(/Tiernos trozos de lomo/)).toBeDefined();
  });

  it('shows draft badge when status is draft', () => {
    render(<MenuItemRow item={createItem({ status: 'draft' })} {...defaultProps} />);

    expect(screen.getByText('Borrador')).toBeDefined();
  });

  it('toggles availability via the active/agotado button', () => {
    const toggleAvailability = vi.fn();
    render(
      <MenuItemRow
        item={createItem()}
        {...defaultProps}
        toggleAvailability={toggleAvailability}
      />
    );

    fireEvent.click(screen.getByText('Activo'));
    expect(toggleAvailability).toHaveBeenCalledWith('prod-1');
  });

  it('shows "Agotado" when product is not available', () => {
    render(<MenuItemRow item={createItem({ available: false })} {...defaultProps} />);

    expect(screen.getByText('Agotado')).toBeDefined();
  });

  it('opens context menu and shows menu items', () => {
    render(<MenuItemRow item={createItem()} {...defaultProps} />);

    const ctxBtn = findContextTrigger();
    expect(ctxBtn).not.toBeNull();
    fireEvent.click(ctxBtn!);

    expect(screen.getByText('Duplicar Plato')).toBeDefined();
    expect(screen.getByText('Eliminar permanentemente')).toBeDefined();
  });

  it('closes context menu when backdrop is clicked', () => {
    render(<MenuItemRow item={createItem()} {...defaultProps} />);

    // Open
    const ctxBtn = findContextTrigger();
    fireEvent.click(ctxBtn!);
    expect(screen.getByText('Duplicar Plato')).toBeDefined();

    // Click backdrop to close
    const backdrop = document.querySelector('.fixed.inset-0.z-40');
    if (backdrop) fireEvent.click(backdrop);

    expect(screen.queryByText('Duplicar Plato')).toBeNull();
  });

  it('shows move up and move down buttons', () => {
    render(<MenuItemRow item={createItem()} {...defaultProps} index={1} total={3} />);

    expect(screen.getByTitle('Mover arriba')).toBeDefined();
    expect(screen.getByTitle('Mover abajo')).toBeDefined();
  });

  it('disables move up on first item', () => {
    render(<MenuItemRow item={createItem()} {...defaultProps} index={0} total={3} />);

    expect(screen.getByTitle('Mover arriba')).toHaveProperty('disabled', true);
  });

  it('disables move down on last item', () => {
    render(<MenuItemRow item={createItem()} {...defaultProps} index={2} total={3} />);

    expect(screen.getByTitle('Mover abajo')).toHaveProperty('disabled', true);
  });

  it('shows stock badge when trackStock is true', () => {
    render(<MenuItemRow item={createItem({ trackStock: true, stock: 15 })} {...defaultProps} />);

    expect(screen.getByText('15')).toBeDefined();
  });

  it('calls deleteProduct on confirm delete', () => {
    const deleteProduct = vi.fn();
    render(
      <MenuItemRow
        item={createItem()}
        {...defaultProps}
        deleteProduct={deleteProduct}
      />
    );

    // Open context menu
    const ctxBtn = findContextTrigger();
    fireEvent.click(ctxBtn!);

    // Click "Eliminar permanentemente"
    fireEvent.click(screen.getByText('Eliminar permanentemente'));

    // Confirm modal should appear — click the confirm button
    fireEvent.click(screen.getByText('Eliminar'));

    expect(deleteProduct).toHaveBeenCalledWith('prod-1');
  });
});
