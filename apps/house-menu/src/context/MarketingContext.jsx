import { createContext, useContext, useEffect, useCallback } from 'react';
import useMarketingStore from '../marketing/store/marketingStore';
import useMarketingSync from '../marketing/hooks/useMarketingSync';
import { useBranch } from './BranchContext';
import { marketingService } from '../lib/marketingService';

const MarketingContext = createContext(null);

export const useMarketing = () => useContext(MarketingContext);

export const MarketingProvider = ({ children }) => {
  const { activeBranchId } = useBranch();

  useMarketingSync({ branchId: activeBranchId });

  const promos = useMarketingStore((s) => s.promos);
  const stats = useMarketingStore((s) => s.stats);
  const testimonials = useMarketingStore((s) => s.testimonials);
  const campaigns = useMarketingStore((s) => s.campaigns);
  const getValidPromos = useMarketingStore((s) => s.getValidPromos);
  const getSortedTestimonials = useMarketingStore((s) => s.getSortedTestimonials);
  const getActiveCampaigns = useMarketingStore((s) => s.getActiveCampaigns);
  const getActiveBanners = useMarketingStore((s) => s.getActiveBanners);

  const validPromos = getValidPromos();
  const activeCampaigns = getActiveCampaigns();
  const activeTestimonials = getSortedTestimonials();
  const heroBanner = getActiveBanners('hero')[0] || null;

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
