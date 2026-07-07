import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartCreateModal } from '../SmartCreateModal';

const mockUseAIProduct = vi.fn();
vi.mock('../../../hooks/useAIProduct', () => ({
  useAIProduct: () => mockUseAIProduct(),
}));

// Need framer-motion mock for AnimatePresence
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      // Extract motion-specific props (starting with initial/animate/exit/transition)
      const { initial, animate, exit, transition, ...domProps } = props;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('SmartCreateModal', () => {
  beforeEach(() => {
    mockUseAIProduct.mockReturnValue({
      image: null,
      setImage: vi.fn(),
      processing: false,
      progress: 0,
      steps: [],
      result: null,
      error: null,
      analyze: vi.fn(),
      saveProduct: vi.fn(),
      reset: vi.fn(),
    });
  });

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    branchId: 'branch-1',
    categories: ['Platos de Fondo', 'Entradas'],
    onProductCreated: vi.fn(),
  };

  it('renderiza cuando isOpen=true', () => {
    render(<SmartCreateModal {...defaultProps} />);
    expect(screen.getByText('✨ Smart Create')).toBeDefined();
  });

  it('no renderiza cuando isOpen=false', () => {
    render(<SmartCreateModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('✨ Smart Create')).toBeNull();
  });

  it('muestra drop zone en estado upload', () => {
    render(<SmartCreateModal {...defaultProps} />);
    expect(screen.getByText('Tomar foto o subir imagen')).toBeDefined();
  });

  it('muestra boton de subir desde galería', () => {
    render(<SmartCreateModal {...defaultProps} />);
    expect(screen.getByText('Subir desde galería')).toBeDefined();
  });

  it('cambia a processing cuando hay resultado de AI', () => {
    mockUseAIProduct.mockReturnValue({
      image: null,
      setImage: vi.fn(),
      processing: false,
      progress: 0.5,
      steps: [{ label: 'Test step', status: 'current' }],
      result: {
        name: 'Lomo Saltado',
        description: 'Clásico peruano',
        price: 28,
        category: 'Platos de Fondo',
        tags: ['Popular'],
        isSpicy: false,
        isVegan: false,
        isGlutenFree: false,
      },
      error: null,
      analyze: vi.fn(),
      saveProduct: vi.fn(),
      reset: vi.fn(),
    });

    render(<SmartCreateModal {...defaultProps} />);
    expect(screen.getByText('🤖 AI Sugiere')).toBeDefined();
    expect(screen.getByDisplayValue('Lomo Saltado')).toBeDefined();
  });

  it('va a modo manual si AI falla', () => {
    mockUseAIProduct.mockReturnValue({
      image: null,
      setImage: vi.fn(),
      processing: false,
      progress: 0,
      steps: [{ label: 'Failed', status: 'error' }],
      result: null,
      error: 'Error al procesar',
      analyze: vi.fn(),
      saveProduct: vi.fn(),
      reset: vi.fn(),
    });

    render(<SmartCreateModal {...defaultProps} />);
    // AI falla → modo manual con formulario vacío
    expect(screen.getByText(/Modo manual/)).toBeDefined();
  });

  it('muestra boton para crear manualmente', () => {
    render(<SmartCreateModal {...defaultProps} />);
    expect(screen.getByText('Crear producto manualmente')).toBeDefined();
  });

  it('va al formulario manual al clickear crear manualmente', () => {
    render(<SmartCreateModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Crear producto manualmente'));
    expect(screen.getByText(/Modo manual/)).toBeDefined();
  });

  it('llama onClose al hacer click en X', () => {
    const onClose = vi.fn();
    render(<SmartCreateModal {...defaultProps} onClose={onClose} />);

    const closeButtons = screen.getAllByRole('button');
    // Find the X button in header
    const xButton = closeButtons.find(b => b.innerHTML.includes('X') || b.querySelector('svg'));
    if (xButton) fireEvent.click(xButton);

    // onClose should have been called
    expect(onClose).toHaveBeenCalled();
  });
});
