import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Percent, Sparkles, ShoppingBag, X } from 'lucide-react';
import { useMarketing } from '../../context/MarketingContext';
import { useBranch } from '../../context/BranchContext';
import type { Campaign } from '../../marketing/marketingTypes';

// ---------------------------------------------------------------------------
// CampaignBanner — Customer-facing discount campaign banner
// Reads active campaigns from MarketingContext, highlights the first one with
// a discount rule. LED/Cashier DNA consistent with admin AI components.
// ---------------------------------------------------------------------------

interface CampaignBannerProps {
  /** Optional override — if not provided, reads from MarketingContext */
  campaign?: Campaign | null;
  /** Optional className for layout positioning */
  className?: string;
  /** Allow user to dismiss the banner */
  dismissible?: boolean;
}

export default function CampaignBanner({
  campaign: campaignProp,
  className = '',
  dismissible = true,
}: CampaignBannerProps) {
  const { activeCampaigns } = useMarketing();
  const { activeBranchId } = useBranch();
  const [dismissed, setDismissed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const campaign = campaignProp ?? activeCampaigns?.[0] ?? null;
  const hasDiscount = campaign?.rules?.discountType && campaign?.rules?.discountValue;

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  // ── Reset dismiss on campaign change ──
  useEffect(() => {
    setDismissed(false);
    setImageError(false);
  }, [campaign?.id]);

  // ── Empty state (no active campaign) ──
  if (!mounted) return null;
  if (!campaign) return null;
  if (dismissed && dismissible) return null;

  const {
    creatives = { heroTitle: '', heroSubtitle: '', ctaText: '' },
    rules = {},
  } = campaign;

  const discountLabel = hasDiscount
    ? rules.discountType === 'percentage'
      ? `${rules.discountValue}%`
      : rules.discountType === 'bogo'
        ? '2×1'
        : `S/ ${rules.discountValue}`
    : null;

  // ── Loading / skeleton (campaign exists but creatives may be empty) ──
  if (!creatives.heroTitle && !creatives.heroSubtitle) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-cm-surface border border-cm-border p-5 ${className}`}>
        <div className="flex items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-xl bg-cm-border/50" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-cm-border/50" />
            <div className="h-3 w-1/2 rounded bg-cm-border/30" />
          </div>
        </div>
      </div>
    );
  }

  // ── Populated ──
  return (
    <AnimatePresence>
      <motion.div
        key={campaign.id}
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={`relative overflow-hidden rounded-2xl border border-cm-accent/20 bg-gradient-to-br from-cm-accent/[0.06] via-cm-surface to-cm-accent/[0.03] shadow-cm-md ${className}`}
      >
        {/* ── Decorative LED glow ── */}
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-cm-accent/8 blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-cm-warning/5 blur-[60px] pointer-events-none" />

        {/* ── Scanline overlay (Cashier DNA) ── */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)',
          }}
        />

        {/* ── Content ── */}
        <div className="relative z-10 flex items-start gap-4 p-4 sm:p-5">
          {/* Discount badge (LED panel style) */}
          {hasDiscount && discountLabel && (
            <div className="shrink-0 flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] shadow-[inset_0_0_20px_rgba(0,0,0,0.6)]">
              <Percent className="w-4 h-4 text-cm-warning mb-0.5" />
              <span
                className="font-mono font-black text-lg sm:text-xl text-cm-success tracking-tight"
                style={{ textShadow: '0 0 8px rgba(34,197,94,0.3)' }}
              >
                {discountLabel}
              </span>
            </div>
          )}

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-cm-warning shrink-0" />
              <span className="text-[0.6rem] font-black uppercase tracking-[0.15em] text-cm-warning">
                Campaña activa
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-cm-text leading-tight tracking-tight">
              {creatives.heroTitle}
            </h3>
            {creatives.heroSubtitle && (
              <p className="text-xs text-cm-text-secondary mt-1 leading-relaxed max-w-md">
                {creatives.heroSubtitle}
              </p>
            )}

            {/* CTA */}
            {creatives.ctaText && (
              <button
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cm-accent text-white text-[0.65rem] font-black uppercase tracking-wider shadow-cm-sm hover:brightness-110 active:translate-y-px transition-all duration-100"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {creatives.ctaText}
              </button>
            )}
          </div>

          {/* Dismiss */}
          {dismissible && (
            <button
              onClick={handleDismiss}
              className="shrink-0 p-1 rounded-lg hover:bg-cm-bg/50 transition-colors"
              aria-label="Cerrar banner"
            >
              <X className="w-4 h-4 text-cm-text-secondary" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
