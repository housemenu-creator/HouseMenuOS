import { useState, useEffect, useCallback } from 'react';
import { brandingService, getDefaultBranding } from '../lib/brandingService';

/**
 * useBranding — Lee branding de Firebase y lo aplica al DOM.
 * @param {string} branchId
 * @returns {{ branding: object, isApplying: boolean, saveBranding: Function, resetBranding: Function }}
 */
export function useBranding(branchId) {
  const [branding, setBranding] = useState(getDefaultBranding());
  const [isApplying, setIsApplying] = useState(true);

  // ── Subscribe to branding data ──
  useEffect(() => {
    if (!branchId) {
      brandingService.resetDOM();
      setIsApplying(false);
      return;
    }
    setIsApplying(true);
    const unsub = brandingService.subscribeToBranding(branchId, (data) => {
      setBranding(data);
      brandingService.applyToDOM(data);
      setIsApplying(false);
    });
    return () => {
      unsub();
      brandingService.resetDOM();
    };
  }, [branchId]);

  // ── Save ──
  const saveBranding = useCallback(async (data) => {
    if (!branchId) return { success: false, error: 'No branch selected' };
    const result = await brandingService.saveBranding(branchId, data);
    // applyToDOM is handled by the subscription callback
    return result;
  }, [branchId]);

  // ── Reset ──
  const resetBranding = useCallback(() => {
    brandingService.resetDOM();
    setBranding(getDefaultBranding());
  }, []);

  return { branding, isApplying, saveBranding, resetBranding };
}
