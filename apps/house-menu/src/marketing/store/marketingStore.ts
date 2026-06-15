import { create } from 'zustand';
import type { Campaign, Banner, PromoCode, Testimonial, MarketingStats, EntityType } from '../marketingTypes';

interface MarketingStore {
  campaigns: Campaign[];
  banners: Banner[];
  promos: PromoCode[];
  testimonials: Testimonial[];
  stats: MarketingStats | null;
  loading: boolean;
  error: string | null;

  applyAdd: (type: EntityType, raw: Record<string, unknown> & { id: string }) => void;
  applyChange: (type: EntityType, raw: Partial<Campaign | Banner | PromoCode | Testimonial> & { id: string }) => void;
  applyRemove: (type: EntityType, id: string) => void;
  setStats: (data: MarketingStats | null) => void;
  reset: () => void;

  getActiveCampaigns: () => Campaign[];
  getActiveBanners: (position?: string) => Banner[];
  getValidPromos: () => PromoCode[];
  getSortedTestimonials: () => Testimonial[];
}

function sortByOrder(a: Testimonial, b: Testimonial) {
  return (a.order ?? 999) - (b.order ?? 999);
}

const useMarketingStore = create<MarketingStore>()((set, get) => ({
  campaigns: [],
  banners: [],
  promos: [],
  testimonials: [],
  stats: null,
  loading: true,
  error: null,

  applyAdd: (type, raw) => {
    set((state): Partial<MarketingStore> => {
      switch (type) {
        case 'campaign': {
          if (state.campaigns.some((c) => c.id === raw.id)) return state;
          return { campaigns: [...state.campaigns, raw as unknown as Campaign], loading: false };
        }
        case 'banner': {
          if (state.banners.some((b) => b.id === raw.id)) return state;
          return { banners: [...state.banners, raw as unknown as Banner], loading: false };
        }
        case 'promo': {
          if (state.promos.some((p) => p.id === raw.id)) return state;
          return { promos: [...state.promos, raw as unknown as PromoCode], loading: false };
        }
        case 'testimonial': {
          if (state.testimonials.some((t) => t.id === raw.id)) return state;
          const updated = [...state.testimonials, raw as unknown as Testimonial].sort(sortByOrder);
          return { testimonials: updated, loading: false };
        }
        default:
          return state;
      }
    });
  },

  applyChange: (type, raw) => {
    set((state): Partial<MarketingStore> => {
      switch (type) {
        case 'campaign': {
          const campaigns = state.campaigns.map((c) =>
            c.id === raw.id ? { ...c, ...(raw as unknown as Campaign) } : c
          );
          if (campaigns.length === state.campaigns.length && !state.campaigns.some((c) => c.id === raw.id)) {
            campaigns.push(raw as unknown as Campaign);
          }
          return { campaigns };
        }
        case 'banner': {
          const banners = state.banners.map((b) =>
            b.id === raw.id ? { ...b, ...(raw as unknown as Banner) } : b
          );
          if (banners.length === state.banners.length && !state.banners.some((b) => b.id === raw.id)) {
            banners.push(raw as unknown as Banner);
          }
          return { banners };
        }
        case 'promo': {
          const promos = state.promos.map((p) =>
            p.id === raw.id ? { ...p, ...(raw as unknown as PromoCode) } : p
          );
          if (promos.length === state.promos.length && !state.promos.some((p) => p.id === raw.id)) {
            promos.push(raw as unknown as PromoCode);
          }
          return { promos };
        }
        case 'testimonial': {
          const testimonials = state.testimonials.map((t) =>
            t.id === raw.id ? { ...t, ...(raw as unknown as Testimonial) } : t
          );
          if (testimonials.length === state.testimonials.length && !state.testimonials.some((t) => t.id === raw.id)) {
            testimonials.push(raw as unknown as Testimonial);
          }
          return { testimonials: testimonials.sort(sortByOrder) };
        }
        default:
          return state;
      }
    });
  },

  applyRemove: (type, id) => {
    set((state) => {
      switch (type) {
        case 'campaign':
          return { campaigns: state.campaigns.filter((c) => c.id !== id) };
        case 'banner':
          return { banners: state.banners.filter((b) => b.id !== id) };
        case 'promo':
          return { promos: state.promos.filter((p) => p.id !== id) };
        case 'testimonial':
          return { testimonials: state.testimonials.filter((t) => t.id !== id) };
        default:
          return state;
      }
    });
  },

  setStats: (data) => set({ stats: data, loading: false }),

  reset: () => set({
    campaigns: [],
    banners: [],
    promos: [],
    testimonials: [],
    stats: null,
    loading: true,
    error: null,
  }),

  getActiveCampaigns: () => {
    const now = Date.now();
    return get().campaigns.filter(
      (c) => c.isActive && c.startDate <= now && c.endDate >= now
    );
  },

  getActiveBanners: (position) => {
    const now = Date.now();
    return get().banners.filter((b) => {
      if (!b.isActive) return false;
      if (b.startDate && b.startDate > now) return false;
      if (b.endDate && b.endDate < now) return false;
      if (position && b.position !== position) return false;
      return true;
    });
  },

  getValidPromos: () => {
    const now = Date.now();
    return get().promos.filter((p) => {
      if (!p.isActive) return false;
      if (p.expiresAt && p.expiresAt < now) return false;
      if (p.maxUses && p.currentUses >= p.maxUses) return false;
      return true;
    });
  },

  getSortedTestimonials: () => {
    return [...get().testimonials]
      .filter((t) => t.isActive)
      .sort(sortByOrder);
  },
}));

export default useMarketingStore;
