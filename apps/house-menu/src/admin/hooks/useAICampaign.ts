import { useState, useCallback } from 'react';
import { suggestCampaign, AI_STEPS_CAMPAIGN } from '../../lib/aiService';
import type { CampaignSuggestion, AIProcessingStep } from '../../lib/aiService';
import { marketingService } from '../../lib/marketingService';

export interface CampaignProduct {
  name: string;
  base_price: number;
  category: string;
  description?: string;
}

export function useAICampaign(branchId: string, product: CampaignProduct) {
  const [generating, setGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<CampaignSuggestion | null>(null);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<AIProcessingStep[]>(AI_STEPS_CAMPAIGN);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setProgress(0);
    setSteps(
      AI_STEPS_CAMPAIGN.map((s, i) => ({
        ...s,
        status: i === 0 ? ('current' as const) : ('pending' as const),
      }))
    );

    try {
      const advanceStep = (step: number) => {
        setProgress(step / 4);
        setSteps(prev =>
          prev.map((s, i) => ({
            ...s,
            status:
              i < step ? ('done' as const) : i === step ? ('current' as const) : ('pending' as const),
          }))
        );
      };

      advanceStep(1);
      const result = await suggestCampaign(product);
      advanceStep(4);

      setSuggestion(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al generar campaña';
      setError(msg);
      setSteps(prev =>
        prev.map(s =>
          s.status === 'current' ? { ...s, status: 'error' as const } : s
        )
      );
    } finally {
      setGenerating(false);
    }
  }, [product]);

  const saveCampaign = useCallback(
    async (overrides: Partial<CampaignSuggestion>): Promise<string | null> => {
      if (!suggestion) return null;
      const merged = { ...suggestion, ...overrides };
      try {
        const now = Date.now();
        const id = await marketingService.createCampaign(branchId, {
          name: merged.heroTitle,
          description: merged.heroSubtitle,
          type: 'promo',
          startDate: now,
          endDate: now + 7 * 24 * 60 * 60 * 1000, // 7 days
          isActive: true,
          branchIds: [branchId],
          creatives: {
            heroTitle: merged.heroTitle,
            heroSubtitle: merged.heroSubtitle,
            ctaText: merged.ctaText,
          },
          rules: {
            discountType: merged.discountType,
            discountValue: merged.discountValue,
            applicableProducts: [],
          },
          analytics: { views: 0, conversions: 0, revenue: 0 },
        });
        return id;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar campaña');
        return null;
      }
    },
    [suggestion, branchId]
  );

  const reset = useCallback(() => {
    setGenerating(false);
    setSuggestion(null);
    setProgress(0);
    setSteps(AI_STEPS_CAMPAIGN);
    setError(null);
  }, []);

  return { generating, progress, steps, suggestion, error, generate, saveCampaign, reset };
}
