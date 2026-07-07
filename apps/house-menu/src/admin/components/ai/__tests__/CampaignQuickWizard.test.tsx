import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CampaignQuickWizard } from '../CampaignQuickWizard';

const mockUseAICampaign = vi.fn();
vi.mock('../../../hooks/useAICampaign', () => ({
  useAICampaign: () => mockUseAICampaign(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, ...domProps } = props;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('CampaignQuickWizard', () => {
  const product = {
    id: 'p1',
    name: 'Lomo Saltado',
    base_price: 28,
    category: 'Platos de Fondo',
  };

  beforeEach(() => {
    mockUseAICampaign.mockReturnValue({
      generating: false,
      progress: 0,
      steps: [],
      suggestion: null,
      error: null,
      generate: vi.fn(),
      saveCampaign: vi.fn(),
      reset: vi.fn(),
    });
  });

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    branchId: 'b1',
    product: product as any,
    onCampaignCreated: vi.fn(),
  };

  it('renderiza al abrir', () => {
    render(<CampaignQuickWizard {...defaultProps} />);
    expect(screen.getByText(/Lomo Saltado/)).toBeDefined();
  });

  it('no renderiza cerrado', () => {
    render(<CampaignQuickWizard {...defaultProps} isOpen={false} />);
    expect(screen.queryByText(/Lomo Saltado/)).toBeNull();
  });

  it('muestra el nombre del producto en el header', () => {
    render(<CampaignQuickWizard {...defaultProps} />);
    expect(screen.getByText(/Lomo Saltado/)).toBeDefined();
  });

  it('muesta vista previa cuando hay sugerencia', () => {
    mockUseAICampaign.mockReturnValue({
      generating: false,
      progress: 1,
      steps: [{ label: 'Done', status: 'done' }],
      suggestion: {
        heroTitle: 'Oferta!',
        heroSubtitle: 'No te lo pierdas',
        ctaText: 'Compra Ya',
        discountType: 'percentage',
        discountValue: 15,
      },
      error: null,
      generate: vi.fn(),
      saveCampaign: vi.fn(),
      reset: vi.fn(),
    });

    render(<CampaignQuickWizard {...defaultProps} />);
    expect(screen.getByText('Vista Previa')).toBeDefined();
  });

  it('llama onClose al hacer click fuera', () => {
    const onClose = vi.fn();
    const { container } = render(<CampaignQuickWizard {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.firstChild!);
    expect(onClose).toHaveBeenCalled();
  });
});
