import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WizardConfigModal from '../../components/menu-builder/WizardConfigModal';

// ── Mocks ──

vi.mock('../../../context/BranchContext', () => ({
  useBranch: () => ({ activeBranchId: 'branch-test' }),
}));

vi.mock('../../../lib/storageService', () => ({
  storageService: {
    uploadOptionImage: vi.fn(),
    deleteImage: vi.fn(),
  },
}));

vi.mock('../../../lib/normalizeFirebaseData', () => ({
  normalizeFirebaseData: (data: unknown) => data,
}));

vi.mock('../../components/EmojiPicker', () => ({
  default: ({ open, onSelect }: { open: boolean; onSelect: (emoji: string) => void }) =>
    open ? <button data-testid="emoji-picker" onClick={() => onSelect?.('🔥')}>🔥</button> : null,
}));

// ── Helpers ──

function createProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-wiz-1',
    name: 'Combo Ejecutivo',
    base_price: 35,
    available: true,
    category: 'Combos',
    isWizard: true,
    steps: [],
    ...overrides,
  };
}

const defaultProps = {
  open: true,
  product: createProduct(),
  onSave: vi.fn(),
  onClose: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WizardConfigModal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <WizardConfigModal {...defaultProps} open={false} />
    );

    // The modal uses AnimatePresence, but when open=false it should render no visible modal
    // Check that the backdrop is not rendered
    expect(container.querySelector('.fixed.inset-0')).toBeNull();
  });

  it('renders modal when open is true with product name', () => {
    render(<WizardConfigModal {...defaultProps} />);

    expect(screen.getByText('Configurar Pasos del Combo')).toBeDefined();
    expect(screen.getByText('Combo Ejecutivo')).toBeDefined();
  });

  it('shows a default step when product has no steps', () => {
    render(<WizardConfigModal {...defaultProps} />);

    // Should have "Paso 1" heading and option input placeholder
    expect(screen.getByText('Paso 1')).toBeDefined();
  });

  it('adds a step', () => {
    render(<WizardConfigModal {...defaultProps} />);

    // Click "Agregar Paso"
    fireEvent.click(screen.getByText('Agregar Paso'));

    // Now should see "Paso 2"
    expect(screen.getByText('Paso 2')).toBeDefined();
  });

  it('removes a step', () => {
    render(<WizardConfigModal {...defaultProps} />);

    // First add a second step so we can remove the first one
    fireEvent.click(screen.getByText('Agregar Paso'));
    expect(screen.getByText('Paso 2')).toBeDefined();

    // Find all trash buttons (each step has a Trash2 button to remove)
    const trashButtons = screen.getAllByTitle('Eliminar paso');
    expect(trashButtons.length).toBeGreaterThanOrEqual(2);

    // Remove the first step (index 0). The remaining step
    // gets re-indexed to "Paso 1", so "Paso 2" should be gone.
    fireEvent.click(trashButtons[0]);
    expect(screen.queryByText('Paso 2')).toBeNull();
    // The remaining step is now at index 0 → displayed as "Paso 1"
    expect(screen.getByText('Paso 1')).toBeDefined();
  });

  it('calls onSave with steps when saving', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <WizardConfigModal
        {...defaultProps}
        onSave={onSave}
        product={createProduct({
          steps: [
            {
              id: 'step-1',
              title: 'Elige tu proteína',
              type: 'single',
              options: [{ id: 'opt-1', name: 'Pollo', price: 0 }],
            },
          ],
        })}
      />
    );

    // The "Guardar" button shows step count
    const saveBtn = screen.getByText(/Guardar/);
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledOnce();
    const savedSteps = onSave.mock.calls[0][1];
    expect(savedSteps).toHaveLength(1);
    expect(savedSteps[0].title).toBe('Elige tu proteína');
  });

  it('calls onClose when cancelling', () => {
    const onClose = vi.fn();
    render(<WizardConfigModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <WizardConfigModal {...defaultProps} onClose={onClose} />
    );

    // The backdrop is the outer fixed div that calls onClose on click
    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows step count in footer', () => {
    render(<WizardConfigModal {...defaultProps} />);

    // Enter a title in the step input so it counts as a real step
    const stepInput = screen.getByPlaceholderText('Nombre del paso (ej. Elige tu proteína)');
    fireEvent.change(stepInput, { target: { value: 'Elige tu proteína' } });

    // Footer shows step count — use a function matcher since text is split across nodes
    const saveBtn = screen.getByText(content => content.includes('Guardar') && content.includes('1 paso'));
    expect(saveBtn).toBeDefined();
  });

  it('disables save when no steps have titles', () => {
    render(<WizardConfigModal {...defaultProps} />);

    // The default step has no title, so save should be disabled.
    // Use function matcher since text is split across nodes.
    const saveBtn = screen.getByText(content => content.includes('Guardar') && content.includes('0 paso'));
    expect(saveBtn).toBeDefined();
    expect(saveBtn.closest('button')).toHaveProperty('disabled', true);
  });
});
