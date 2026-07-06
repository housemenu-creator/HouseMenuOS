import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Clock, UtensilsCrossed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTrackCampaignView } from '../../marketing/hooks/useMarketingAnalytics';
import { ROUTES } from '../../lib/routes';
import { useBranch } from '../../context/BranchContext';
import { marketingService } from '../../lib/marketingService';

const DEFAULT_KITCHEN_HOURS = [
  { label: 'Almuerzo', open: '11:00', close: '14:30' },
  { label: 'Cena', open: '18:00', close: '21:00' },
];

function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours)) return null;
  return hours * 60 + (minutes || 0);
}

function useKitchenStatus(kitchenHours) {
  const windows = useMemo(() => (
    (kitchenHours?.length ? kitchenHours : DEFAULT_KITCHEN_HOURS)
      .map((window) => ({
        label: window.label, open: window.open, close: window.close,
        openMinutes: timeToMinutes(window.open), closeMinutes: timeToMinutes(window.close),
      }))
      .filter((window) => window.openMinutes !== null && window.closeMinutes !== null)
      .sort((a, b) => a.openMinutes - b.openMinutes)
  ), [kitchenHours]);

  const [status, setStatus] = useState({ isOpen: false, label: 'Almuerzo', next: windows[0] });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const openWindow = windows.find(w => currentMinutes >= w.openMinutes && currentMinutes < w.closeMinutes);
      if (openWindow) { setStatus({ isOpen: true, label: openWindow.label, next: openWindow }); return; }
      setStatus({
        isOpen: false, label: 'Proximo turno',
        next: windows.find(w => currentMinutes < w.openMinutes) || windows[0],
      });
    };
    update();
    const interval = window.setInterval(update, 60000);
    return () => window.clearInterval(interval);
  }, [windows]);

  return status;
}

export default function HeroBanner({ branchName, campaign, kitchenHours, catalog }) {
  const navigate = useNavigate();
  const { activeBranchId } = useBranch();
  const kitchen = useKitchenStatus(kitchenHours);

  useTrackCampaignView(campaign?.id);

  const headline = campaign?.creatives?.heroSubtitle || 'Almuerzos caseros, listos sin perder tiempo';
  const eyebrow = campaign?.creatives?.heroTitle || 'HOUSE ALMUERZOS';
  const ctaText = campaign?.creatives?.ctaText || 'Ver carta';

  const featuredIds = campaign?.creatives?.featuredProductIds || [];
  const featuredProducts = useMemo(() => {
    if (!featuredIds.length || !catalog?.products) return [];
    return featuredIds.map(id => catalog.products[id]).filter(Boolean).slice(0, 3);
  }, [featuredIds, catalog?.products]);

  const handleOrder = () => {
    if (campaign?.id && activeBranchId) {
      marketingService.incrementCampaignConversions(activeBranchId, campaign.id).catch(() => {});
    }
    navigate(ROUTES.CARTA);
  };

  return (
    <section className="relative overflow-hidden bg-cm-surface">
      {/* ── Warm ambient background ── */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Base gradient — warm radiance */}
        <div className="absolute inset-0 bg-gradient-to-br from-cm-accent/[0.03] via-cm-bg to-cm-accent/[0.07]" />
        {/* Decorative glow blobs */}
        <div className="absolute -top-40 -right-32 w-[600px] h-[600px] rounded-full bg-cm-accent/[0.05] blur-[120px]" />
        <div className="absolute -bottom-48 -left-32 w-[500px] h-[500px] rounded-full bg-cm-accent/[0.03] blur-[100px]" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-cm-accent/[0.02] blur-[80px]" />
        {/* Subtle dot pattern for texture */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.012] text-cm-accent" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.8" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-dots)" />
        </svg>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr] min-h-[500px]">
          {/* Left: Content */}
          <div className="flex flex-col justify-center py-14 sm:py-18 lg:py-24 pr-0 lg:pr-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-6"
            >
              {/* Kitchen status badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-cm-border bg-cm-bg/80 backdrop-blur-sm px-3.5 py-1.5 text-[0.65rem] font-bold text-cm-text-secondary">
                  <span className={`h-2 w-2 rounded-full ${kitchen.isOpen ? 'bg-cm-success' : 'bg-cm-warning'}`} />
                  {kitchen.isOpen ? `Cocina ${kitchen.label} abierta` : `${kitchen.label} ${kitchen.next?.open || '11:00'}`}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-cm-border bg-cm-bg/80 backdrop-blur-sm px-3.5 py-1.5 text-[0.65rem] font-bold text-cm-text-secondary">
                  <Clock className="h-3 w-3 text-cm-accent" />
                  {kitchen.next?.open || '11:00'} — {kitchen.next?.close || '14:30'}
                </span>
              </div>

              {/* Headline */}
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cm-accent">{eyebrow}</p>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight text-cm-text max-w-xl">
                  {headline}
                </h1>
                <p className="text-base sm:text-lg leading-relaxed text-cm-text-secondary max-w-lg">
                  Menú del día, carta completa y seguimiento de pedidos en una experiencia rápida para oficina, casa o recojo.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button onClick={handleOrder}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cm-accent px-6 py-3.5 text-sm font-black text-white shadow-cm-md transition-all hover:bg-cm-accent-hover hover:shadow-cm-lg active:scale-[0.98]"
                >
                  <UtensilsCrossed className="h-4 w-4" />
                  {ctaText}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => navigate(ROUTES.RASTREO)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-cm-border bg-cm-bg/80 backdrop-blur-sm px-6 py-3.5 text-sm font-black text-cm-text transition-all hover:border-cm-accent/30 hover:bg-cm-bg active:scale-[0.98]"
                >
                  Seguir pedido
                </button>
              </div>
            </motion.div>

            {/* Featured products */}
            {featuredProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-6"
              >
                <p className="text-[0.55rem] font-black uppercase tracking-[0.15em] text-cm-accent mb-2 flex items-center gap-1.5">
                  <Star className="w-3 h-3" /> Destacados de la campaña
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {featuredProducts.map(p => (
                    <div key={p.id || p.name} className="flex items-center gap-2 shrink-0 bg-cm-bg/80 backdrop-blur-sm border border-cm-border rounded-xl p-2">
                      {p.image && <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-xs font-black text-cm-text truncate max-w-[120px]">{p.name}</p>
                        <p className="text-[0.6rem] font-bold text-cm-accent">S/ {Number(p.base_price || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: Visual panel — bold glass card + decorative brand mark */}
          <div className="hidden lg:flex flex-col justify-end relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col gap-4 pb-8"
            >
              {/* Brand mark — large decorative H */}
              <div className="relative self-end mr-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cm-accent/20 to-cm-accent/5 border border-cm-accent/10 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-cm-accent text-4xl font-black tracking-tight">H</span>
                </div>
                {/* Glow behind */}
                <div className="absolute -inset-4 -z-10 bg-cm-accent/5 rounded-[2rem] blur-[40px]" />
              </div>

              {/* Branch glass card — theme-aware frosted glass */}
              <div className="relative rounded-2xl border border-cm-border/50 bg-cm-surface/70 backdrop-blur-xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-cm-accent/20 flex items-center justify-center">
                    <span className="text-cm-accent text-sm font-black">H</span>
                  </div>
                  <div>
                    <p className="text-cm-text text-sm font-black">{branchName || 'Sede principal'}</p>
                    <p className="text-cm-text-secondary text-[0.6rem] font-semibold">Abierto ahora</p>
                  </div>
                </div>
                <p className="text-cm-text text-lg sm:text-xl font-black leading-snug">
                  Comida servida con ritmo de operación real.
                </p>
                <div className="mt-4 flex items-center gap-2 text-cm-text-secondary/60 text-[0.55rem] font-semibold">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-cm-success" /> Ingredientes frescos</span>
                  <span className="w-1 h-1 rounded-full bg-cm-text-tertiary/30" />
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-cm-success" /> 30 min o menos</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
