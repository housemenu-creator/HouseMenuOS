import { useEffect, useRef } from 'react';
import { marketingService } from '../../lib/marketingService';
import useMarketingStore from '../store/marketingStore';
import type { MarketingStats } from '../marketingTypes';

interface UseMarketingSyncOptions {
  branchId?: string;
}

export default function useMarketingSync(options?: UseMarketingSyncOptions) {
  const branchId = options?.branchId;
  const applyAdd = useMarketingStore((s) => s.applyAdd);
  const applyChange = useMarketingStore((s) => s.applyChange);
  const applyRemove = useMarketingStore((s) => s.applyRemove);
  const setStats = useMarketingStore((s) => s.setStats);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!branchId) return;

    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    const unsubCampaigns = marketingService.subscribeCampaigns(branchId, {
      onAdd: (raw: Record<string, unknown> & { id: string }) => applyAdd('campaign', raw),
      onChange: (raw: Record<string, unknown> & { id: string }) => applyChange('campaign', raw),
      onRemove: (id: string) => applyRemove('campaign', id),
    });

    const unsubBanners = marketingService.subscribeBanners(branchId, {
      onAdd: (raw: Record<string, unknown> & { id: string }) => applyAdd('banner', raw),
      onChange: (raw: Record<string, unknown> & { id: string }) => applyChange('banner', raw),
      onRemove: (id: string) => applyRemove('banner', id),
    });

    const unsubPromos = marketingService.subscribePromos(branchId, {
      onAdd: (raw: Record<string, unknown> & { id: string }) => applyAdd('promo', raw),
      onChange: (raw: Record<string, unknown> & { id: string }) => applyChange('promo', raw),
      onRemove: (id: string) => applyRemove('promo', id),
    });

    const unsubTestimonials = marketingService.subscribeTestimonials(branchId, {
      onAdd: (raw: Record<string, unknown> & { id: string }) => applyAdd('testimonial', raw),
      onChange: (raw: Record<string, unknown> & { id: string }) => applyChange('testimonial', raw),
      onRemove: (id: string) => applyRemove('testimonial', id),
    });

    const unsubStats = marketingService.subscribeStats(branchId, (data: Record<string, unknown> | null) => {
      setStats(data as MarketingStats | null);
    });

    const unsubAll = () => {
      unsubCampaigns();
      unsubBanners();
      unsubPromos();
      unsubTestimonials();
      unsubStats();
    };

    unsubRef.current = unsubAll;
    return () => {
      unsubAll();
      useMarketingStore.getState().reset();
    };
  }, [branchId, applyAdd, applyChange, applyRemove, setStats]);
}
