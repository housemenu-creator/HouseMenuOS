import { useCallback, useEffect, useRef } from 'react';
import { marketingService } from '../../lib/marketingService';
import { useBranch } from '../../context/BranchContext';

export default function useMarketingAnalytics() {
  const { activeBranchId } = useBranch();
  const viewed = useRef(new Set<string>());

  const trackCampaignView = useCallback((campaignId: string) => {
    if (!activeBranchId || !campaignId) return;
    const key = `campaign-view-${campaignId}`;
    if (viewed.current.has(key)) return;
    viewed.current.add(key);
    marketingService.incrementCampaignViews(activeBranchId, campaignId).catch(() => {});
  }, [activeBranchId]);

  const trackCampaignConversion = useCallback((campaignId: string) => {
    if (!activeBranchId || !campaignId) return;
    marketingService.incrementCampaignConversions(activeBranchId, campaignId).catch(() => {});
  }, [activeBranchId]);

  const trackBannerView = useCallback((bannerId: string) => {
    if (!activeBranchId || !bannerId) return;
    const key = `banner-view-${bannerId}`;
    if (viewed.current.has(key)) return;
    viewed.current.add(key);
    marketingService.incrementBannerViews(activeBranchId, bannerId).catch(() => {});
  }, [activeBranchId]);

  const trackBannerClick = useCallback((bannerId: string) => {
    if (!activeBranchId || !bannerId) return;
    marketingService.incrementBannerClicks(activeBranchId, bannerId).catch(() => {});
  }, [activeBranchId]);

  const trackPromoUse = useCallback((promoId: string) => {
    if (!activeBranchId || !promoId) return;
    marketingService.incrementPromoUse(activeBranchId, promoId).catch(() => {});
  }, [activeBranchId]);

  const trackCampaignViewOnce = useCallback((campaignId: string | null | undefined) => {
    useEffect(() => {
      if (!campaignId) return;
      trackCampaignView(campaignId);
    }, [campaignId, trackCampaignView]);
  }, [trackCampaignView]);

  return {
    trackCampaignView,
    trackCampaignConversion,
    trackBannerView,
    trackBannerClick,
    trackPromoUse,
    trackCampaignViewOnce,
  };
}

export function useTrackCampaignView(campaignId?: string | null) {
  const { activeBranchId } = useBranch();
  const tracked = useRef(false);

  useEffect(() => {
    if (!activeBranchId || !campaignId || tracked.current) return;
    tracked.current = true;
    marketingService.incrementCampaignViews(activeBranchId, campaignId).catch(() => {});
  }, [activeBranchId, campaignId]);
}

export function useTrackBannerView(bannerId?: string | null) {
  const { activeBranchId } = useBranch();
  const tracked = useRef(false);

  useEffect(() => {
    if (!activeBranchId || !bannerId || tracked.current) return;
    tracked.current = true;
    marketingService.incrementBannerViews(activeBranchId, bannerId).catch(() => {});
  }, [activeBranchId, bannerId]);
}
