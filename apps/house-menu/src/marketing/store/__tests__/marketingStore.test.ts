import { describe, it, expect, beforeEach } from 'vitest';
import useMarketingStore from '../marketingStore';

const mockCampaign = (overrides = {}) => ({
  id: 'cmp-001',
  name: 'Summer Sale',
  description: 'Descuentos de verano',
  type: 'promo' as const,
  startDate: Date.now() - 86400000,
  endDate: Date.now() + 86400000,
  isActive: true,
  branchIds: ['branch-1'],
  creatives: {
    heroTitle: 'Summer Sale',
    heroSubtitle: '50% off',
    ctaText: 'Ver ofertas',
    ctaLink: '/promos',
  },
  analytics: { views: 0, conversions: 0, revenue: 0 },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

const mockBanner = (overrides = {}) => ({
  id: 'bnr-001',
  title: 'Oferta Especial',
  subtitle: 'Lleva 2 pizzas',
  bgColor: '#FF0000',
  textColor: '#FFFFFF',
  position: 'hero' as const,
  isActive: true,
  branchIds: ['branch-1'],
  analytics: { views: 0, clicks: 0 },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

const mockPromo = (overrides = {}) => ({
  id: 'pro-001',
  code: 'BIENVENIDA10',
  type: 'percentage' as const,
  value: 10,
  currentUses: 0,
  maxUses: 100,
  isActive: true,
  expiresAt: Date.now() + 86400000 * 30,
  branchIds: ['branch-1'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

const mockTestimonial = (overrides = {}) => ({
  id: 'tst-001',
  author: 'Ana M.',
  rating: 5,
  text: 'Excelente comida!',
  isActive: true,
  order: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('marketingStore', () => {
  beforeEach(() => {
    useMarketingStore.getState().reset();
  });

  it('starts with empty state and loading true', () => {
    const state = useMarketingStore.getState();
    expect(state.loading).toBe(true);
    expect(state.campaigns).toHaveLength(0);
    expect(state.banners).toHaveLength(0);
    expect(state.promos).toHaveLength(0);
    expect(state.testimonials).toHaveLength(0);
    expect(state.stats).toBeNull();
    expect(state.error).toBeNull();
  });

  describe('applyAdd', () => {
    it('adds a campaign', () => {
      useMarketingStore.getState().applyAdd('campaign', mockCampaign());
      const state = useMarketingStore.getState();
      expect(state.campaigns).toHaveLength(1);
      expect(state.campaigns[0].id).toBe('cmp-001');
      expect(state.loading).toBe(false);
    });

    it('adds a banner', () => {
      useMarketingStore.getState().applyAdd('banner', mockBanner());
      expect(useMarketingStore.getState().banners).toHaveLength(1);
    });

    it('adds a promo', () => {
      useMarketingStore.getState().applyAdd('promo', mockPromo());
      expect(useMarketingStore.getState().promos).toHaveLength(1);
    });

    it('adds a testimonial', () => {
      useMarketingStore.getState().applyAdd('testimonial', mockTestimonial());
      expect(useMarketingStore.getState().testimonials).toHaveLength(1);
    });

    it('sorts testimonials by order on add', () => {
      const store = useMarketingStore.getState();
      store.applyAdd('testimonial', mockTestimonial({ id: 'b', order: 2 }));
      store.applyAdd('testimonial', mockTestimonial({ id: 'a', order: 1 }));
      store.applyAdd('testimonial', mockTestimonial({ id: 'c', order: 3 }));
      const testimonials = useMarketingStore.getState().testimonials;
      expect(testimonials.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    });

    it('ignores duplicate ids', () => {
      const store = useMarketingStore.getState();
      store.applyAdd('campaign', mockCampaign());
      store.applyAdd('campaign', mockCampaign());
      expect(useMarketingStore.getState().campaigns).toHaveLength(1);
    });
  });

  describe('applyChange', () => {
    it('merges into an existing entity', () => {
      const store = useMarketingStore.getState();
      store.applyAdd('campaign', mockCampaign());
      store.applyChange('campaign', { id: 'cmp-001', name: 'Winter Sale' });
      expect(useMarketingStore.getState().campaigns[0].name).toBe('Winter Sale');
      expect(useMarketingStore.getState().campaigns[0].description).toBe('Descuentos de verano');
    });

    it('adds entity if not exists', () => {
      useMarketingStore.getState().applyChange('campaign', mockCampaign({ id: 'cmp-002' }));
      expect(useMarketingStore.getState().campaigns).toHaveLength(1);
    });
  });

  describe('applyRemove', () => {
    it('removes an entity by type and id', () => {
      const store = useMarketingStore.getState();
      store.applyAdd('campaign', mockCampaign());
      store.applyAdd('banner', mockBanner());
      store.applyRemove('campaign', 'cmp-001');
      expect(useMarketingStore.getState().campaigns).toHaveLength(0);
      expect(useMarketingStore.getState().banners).toHaveLength(1);
    });
  });

  describe('setStats', () => {
    it('sets stats and stops loading', () => {
      const stats = {
        recordTime: 26,
        freshnessPercent: 100,
        deliveriesCount: 1240,
        averageRating: 4.9,
        totalReviews: 523,
      };
      useMarketingStore.getState().setStats(stats);
      const state = useMarketingStore.getState();
      expect(state.stats).toEqual(stats);
      expect(state.loading).toBe(false);
    });

    it('clears stats with null', () => {
      useMarketingStore.getState().setStats(null);
      expect(useMarketingStore.getState().stats).toBeNull();
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      const store = useMarketingStore.getState();
      store.applyAdd('campaign', mockCampaign({ id: 'active-1' }));
      store.applyAdd('campaign', mockCampaign({ id: 'expired', endDate: Date.now() - 1000 }));
      store.applyAdd('campaign', mockCampaign({ id: 'inactive', isActive: false }));
      store.applyAdd('campaign', mockCampaign({ id: 'future', startDate: Date.now() + 86400000 }));
      store.applyAdd('banner', mockBanner({ id: 'hero-1', position: 'hero' }));
      store.applyAdd('banner', mockBanner({ id: 'sidebar-1', position: 'sidebar' }));
      store.applyAdd('banner', mockBanner({ id: 'inactive-banner', isActive: false }));
      store.applyAdd('promo', mockPromo({ id: 'valid-1' }));
      store.applyAdd('promo', mockPromo({ id: 'expired-promo', expiresAt: Date.now() - 1000 }));
      store.applyAdd('promo', mockPromo({ id: 'maxed-out', maxUses: 5, currentUses: 5 }));
      store.applyAdd('promo', mockPromo({ id: 'inactive-promo', isActive: false }));
      store.applyAdd('testimonial', mockTestimonial({ id: 't1', order: 2 }));
      store.applyAdd('testimonial', mockTestimonial({ id: 't2', order: 1 }));
      store.applyAdd('testimonial', mockTestimonial({ id: 't3', order: 3, isActive: false }));
    });

    it('getActiveCampaigns returns only currently active campaigns', () => {
      const active = useMarketingStore.getState().getActiveCampaigns();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('active-1');
    });

    it('getActiveBanners returns only active banners, filtered by position', () => {
      const heroBanners = useMarketingStore.getState().getActiveBanners('hero');
      expect(heroBanners).toHaveLength(1);
      expect(heroBanners[0].id).toBe('hero-1');

      const all = useMarketingStore.getState().getActiveBanners();
      expect(all).toHaveLength(2);
    });

    it('getValidPromos returns only valid promos', () => {
      const valid = useMarketingStore.getState().getValidPromos();
      expect(valid).toHaveLength(1);
      expect(valid[0].id).toBe('valid-1');
    });

    it('getSortedTestimonials returns only active testimonials sorted by order', () => {
      const sorted = useMarketingStore.getState().getSortedTestimonials();
      expect(sorted).toHaveLength(2);
      expect(sorted.map((t) => t.id)).toEqual(['t2', 't1']);
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      const store = useMarketingStore.getState();
      store.applyAdd('campaign', mockCampaign());
      store.applyAdd('banner', mockBanner());
      store.setStats({ recordTime: 26, freshnessPercent: 100, deliveriesCount: 1240, averageRating: 4.9, totalReviews: 523 });
      store.reset();
      const state = useMarketingStore.getState();
      expect(state.campaigns).toHaveLength(0);
      expect(state.banners).toHaveLength(0);
      expect(state.promos).toHaveLength(0);
      expect(state.testimonials).toHaveLength(0);
      expect(state.stats).toBeNull();
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });
  });
});
