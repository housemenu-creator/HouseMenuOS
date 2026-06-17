import { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import useMarketingStore from '../marketing/store/marketingStore';
import useMarketingSync from '../marketing/hooks/useMarketingSync';
import { useBranch } from './BranchContext';
import { marketingService } from '../lib/marketingService';

const MarketingContext = createContext(null);

export const useMarketing = () => useContext(MarketingContext);

export const MarketingProvider = ({ children }) => {
  const { activeBranchId } = useBranch();

  useMarketingSync({ branchId: activeBranchId });

  // ── Zustand selectors: SOLO primitivas o referencias estables ──
  // NO usar getValidPromos/getSortedTestimonials/getActiveCampaigns/getActiveBanners
  // como selectors porque retornan nuevas referencias en cada llamada
  // → bucle infinito con useSyncExternalStore de React 18.
  // Mismo bug que WorkerDashboard.tsx:137-139 y VendedorView.jsx
  const promos = useMarketingStore((s) => s.promos);
  const stats = useMarketingStore((s) => s.stats);
  const testimonials = useMarketingStore((s) => s.testimonials);
  const campaigns = useMarketingStore((s) => s.campaigns);

  // ── Derivados estables con useMemo ──
  const validPromos = useMemo(() => {
    const now = Date.now();
    return promos.filter((p) => {
      if (!p.isActive) return false;
      if (p.expiresAt && p.expiresAt < now) return false;
      if (p.maxUses && p.currentUses >= p.maxUses) return false;
      return true;
    });
  }, [promos]);

  const activeCampaigns = useMemo(() => {
    const now = Date.now();
    return campaigns.filter(
      (c) => c.isActive && c.startDate <= now && c.endDate >= now
    );
  }, [campaigns]);

  const activeTestimonials = useMemo(() => {
    return [...testimonials]
      .filter((t) => t.isActive)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [testimonials]);

  const heroBanner = useMemo(() => {
    const now = Date.now();
    return campaigns
      .filter((b) => {
        if (!b.isActive) return false;
        if (b.startDate && b.startDate > now) return false;
        if (b.endDate && b.endDate < now) return false;
        if (b.position !== 'hero') return false;
        return true;
      })[0] || null;
  }, [campaigns]);

  const validatePromoCode = useCallback((code) => {
    if (!code || !validPromos.length) return null;
    return validPromos.find((p) => p.code.toUpperCase() === code.toUpperCase()) || null;
  }, [validPromos]);

  const addLoyaltyPoints = useCallback(async (customerId, points) => {
    if (!customerId || !points) return;
    try {
      const { addCustomerPoints } = await import('../lib/customerService');
      await addCustomerPoints(customerId, points);
    } catch (err) {
      console.warn('[Loyalty] Error adding points:', err);
    }
  }, []);

  const trackPixel = useCallback((event, data = {}) => {
    console.log(`[Pixel] Event: ${event}`, data);
    if (event === 'Purchase' && data.value) {
      const campaign = activeCampaigns[0];
      if (campaign) {
        marketingService.incrementCampaignConversions(activeBranchId, campaign.id).catch(() => {});
      }
    }
  }, [activeCampaigns, activeBranchId]);

  const value = {
    promos,
    stats,
    testimonials,
    campaigns,
    validPromos,
    activeCampaigns,
    activeTestimonials,
    heroBanner,
    validatePromoCode,
    addLoyaltyPoints,
    trackPixel,
  };

  return (
    <MarketingContext.Provider value={value}>
      {children}
    </MarketingContext.Provider>
  );
};