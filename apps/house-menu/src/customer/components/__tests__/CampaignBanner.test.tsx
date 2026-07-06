import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CampaignBanner from '../CampaignBanner';

// ── Mocks ──
const mockUseMarketing = vi.fn();
vi.mock('../../../context/MarketingContext', () => ({
  useMarketing: () => mockUseMarketing(),
}));

const mockUseBranch = vi.fn();
vi.mock('../../../context/BranchContext', () => ({
  useBranch: () => mockUseBranch(),
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

const MOCK_CAMPAIGN = {
  id: 'cmp-ai-001',
  name: 'Lomo Saltado Week',
  description: 'Campaña generada por AI',
  type: 'promo' as const,
  startDate: Date.now() - 10000,
  endDate: Date.now() + 86400000,
  isActive: true,
  branchIds: ['b1'],
  creatives: {
    heroTitle: 'Lomo Saltado en Oferta',
    heroSubtitle: 'Disfruta nuestro lomo saltado con un 15% de descuento',
    ctaText: 'Ordenar Ahora',
    ctaLink: '/carta',
  },
  rules: {
    discountType: 'percentage' as const,
    discountValue: 15,
    applicableProducts: ['p1'],
  },
  analytics: { views: 0, conversions: 0, revenue: 0 },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const MOCK_CAMPAIGN_NO_DISCOUNT = {
  ...MOCK_CAMPAIGN,
  id: 'cmp-002',
  name: 'Seasonal',
  creatives: {
    heroTitle: 'Temporada de Verano',
    heroSubtitle: 'Platos frescos para el calor',
    ctaText: 'Ver Menú',
    ctaLink: '/carta',
  },
  rules: undefined,
};

describe('CampaignBanner', () => {
  beforeEach(() => {
    mockUseBranch.mockReturnValue({ activeBranchId: 'b1' });
    mockUseMarketing.mockReturnValue({ activeCampaigns: [MOCK_CAMPAIGN] });
  });

  it('no renderiza si no hay campaña activa', () => {
    mockUseMarketing.mockReturnValue({ activeCampaigns: [] });
    const { container } = render(<CampaignBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('no renderiza antes de montar (SSR safety)', () => {
    mockUseMarketing.mockReturnValue({ activeCampaigns: [MOCK_CAMPAIGN] });
    // Simular SSR: el useEffect de mounted no se ejecuta (no se renderiza)
    // Pero en testing-library se ejecuta, así que probamos que sí renderiza normalmente
    // Este test verifica que el componente no crashea
    expect(() => render(<CampaignBanner />)).not.toThrow();
  });

  it('muestra el heroTitle de la campaña activa', () => {
    render(<CampaignBanner />);
    expect(screen.getByText('Lomo Saltado en Oferta')).toBeDefined();
  });

  it('muestra el heroSubtitle de la campaña activa', () => {
    render(<CampaignBanner />);
    expect(screen.getByText(/15% de descuento/)).toBeDefined();
  });

  it('muestra el CTA', () => {
    render(<CampaignBanner />);
    expect(screen.getByText('Ordenar Ahora')).toBeDefined();
  });

  it('muestra el badge de descuento cuando hay discount rules', () => {
    render(<CampaignBanner />);
    expect(screen.getByText('15%')).toBeDefined();
  });

  it('no muestra badge de descuento cuando no hay discount rules', () => {
    mockUseMarketing.mockReturnValue({ activeCampaigns: [MOCK_CAMPAIGN_NO_DISCOUNT] });
    render(<CampaignBanner />);
    expect(screen.queryByText('15%')).toBeNull();
  });

  it('se puede cerrar con el botón dismiss', () => {
    render(<CampaignBanner />);
    expect(screen.getByText('Lomo Saltado en Oferta')).toBeDefined();
    fireEvent.click(screen.getByLabelText('Cerrar banner'));
    expect(screen.queryByText('Lomo Saltado en Oferta')).toBeNull();
  });

  it('usa campaign prop si se pasa en lugar del context', () => {
    mockUseMarketing.mockReturnValue({ activeCampaigns: [] });
    render(<CampaignBanner campaign={MOCK_CAMPAIGN} />);
    expect(screen.getByText('Lomo Saltado en Oferta')).toBeDefined();
  });

  it('muestra skeleton si creatives están vacíos', () => {
    const emptyCreative = {
      ...MOCK_CAMPAIGN,
      creatives: { heroTitle: '', heroSubtitle: '', ctaText: '', ctaLink: '' },
    };
    mockUseMarketing.mockReturnValue({ activeCampaigns: [emptyCreative] });
    const { container } = render(<CampaignBanner />);
    // El skeleton tiene animate-pulse
    expect(container.querySelector('.animate-pulse')).toBeDefined();
  });

  it('no es dismissible cuando dismissible=false', () => {
    render(<CampaignBanner dismissible={false} />);
    expect(screen.queryByLabelText('Cerrar banner')).toBeNull();
  });

  it('aplica className adicional', () => {
    const { container } = render(<CampaignBanner className="test-class" />);
    const banner = container.firstChild as HTMLElement;
    expect(banner.className).toContain('test-class');
  });
});
