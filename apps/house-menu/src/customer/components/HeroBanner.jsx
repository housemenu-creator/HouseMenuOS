import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Flame, Sparkles, Clock, ShieldCheck, ChevronDown, ChevronUp, Users, Eye, ArrowDown } from 'lucide-react';
import { useTrackCampaignView } from '../../marketing/hooks/useMarketingAnalytics';
import { useBranch } from '../../context/BranchContext';
import logo from '../../assets/logo.jpg';
import { marketingService } from '../../lib/marketingService';

// Convierte "HH:MM" a minutos desde medianoche
function timeToMinutes(str) {
  if (!str) return null;
  const [h, m] = str.split(':').map(Number);
  return h * 60 + (m || 0);
}

// Fallback cuando no hay horarios configurados en Firebase
const DEFAULT_KITCHEN_HOURS = [
  { label: 'Almuerzo', open: '11:00', close: '14:30' },
  { label: 'Cena', open: '18:00', close: '21:00' },
];

function useKitchenCountdown(kitchenHours) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isOpen: false, label: '' });

  useEffect(() => {
    // Usar horarios de Firebase si están disponibles, sino usar los por defecto
    const windows = (kitchenHours?.length > 0 ? kitchenHours : DEFAULT_KITCHEN_HOURS)
      .map((w) => ({
        open: timeToMinutes(w.open),
        close: timeToMinutes(w.close),
        label: w.label,
      }))
      .filter((w) => w.open !== null && w.close !== null)
      .sort((a, b) => a.open - b.open);

    const calc = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();
      const currentMinutes = h * 60 + m;

      // ¿Está abierto ahora?
      for (const w of windows) {
        if (currentMinutes >= w.open && currentMinutes < w.close) {
          const remaining = (w.close - currentMinutes) * 60 - s;
          return {
            hours: Math.floor(remaining / 3600),
            minutes: Math.floor((remaining % 3600) / 60),
            seconds: remaining % 60,
            isOpen: true,
            label: w.label,
          };
        }
      }

      // Próxima apertura hoy
      const next = windows.find((w) => currentMinutes < w.open);
      if (next) {
        const remaining = (next.open - currentMinutes) * 60 - s;
        return {
          hours: Math.floor(remaining / 3600),
          minutes: Math.floor((remaining % 3600) / 60),
          seconds: remaining % 60,
          isOpen: false,
          label: next.label,
        };
      }

      // Después de todos los turnos → mañana primer turno
      const firstWindow = windows[0];
      const openMinutes = firstWindow?.open ?? 11 * 60;
      const firstLabel = firstWindow?.label ?? 'Almuerzo';
      const remaining = ((24 - h + Math.floor(openMinutes / 60)) * 60 - m) * 60 - s;
      return {
        hours: Math.floor(remaining / 3600),
        minutes: Math.floor((remaining % 3600) / 60),
        seconds: remaining % 60,
        isOpen: false,
        label: firstLabel,
      };
    };

    setTimeLeft(calc());
    const id = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [kitchenHours]);

  return timeLeft;
}

function useViewerCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(Math.floor(Math.random() * 8) + 12); // 12-19
    const id = setInterval(() => {
      setCount(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        return Math.max(8, Math.min(25, prev + delta));
      });
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(id);
  }, []);
  return count;
}

const pad = (n) => String(n).padStart(2, '0');

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function HeroBanner({ branchName, campaign, kitchenHours }) {
  const [isOpen, setIsOpen] = useState(false);
  const kitchen = useKitchenCountdown(kitchenHours);
  const viewers = useViewerCount();
  const { activeBranchId } = useBranch();
  useTrackCampaignView(campaign?.id);

  const heroSubtitle = campaign?.creatives?.heroTitle || 'BIENVENIDO A';
  const heroTitle = campaign?.creatives?.heroSubtitle
    ? (
      <>
        HOUSE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cm-accent via-orange-400 to-amber-500">{campaign.creatives.heroSubtitle}</span>
      </>
    )
    : (
      <>
        HOUSE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cm-accent via-orange-400 to-amber-500">ALMUERZOS</span>
      </>
    );
  const heroDesc = campaign?.creatives?.ctaText
    ? `🔥 ${campaign.creatives.ctaText}`
    : 'Gastronomía peruana premium preparada en el instante. Sabor insuperable, ordenado en segundos y entregado a tu mesa o domicilio.';

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="relative overflow-hidden rounded-3xl border border-cm-accent/20 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 p-6 sm:p-8 shadow-cm-lg"
    >
      {/* Animated ambient lights */}
      <motion.div
        animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-0 right-0 w-64 h-64 bg-cm-accent/25 rounded-full blur-[90px] -translate-y-12 translate-x-12 pointer-events-none"
      />
      <motion.div
        animate={{ opacity: [0.08, 0.15, 0.08], x: [-6, 6, -6] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-0 left-0 w-56 h-56 bg-amber-500/15 rounded-full blur-[80px] translate-y-12 -translate-x-12 pointer-events-none"
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      <div className="relative z-10">
        {/* Top Row: Badges + Live Viewers */}
        <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[0.65rem] font-black uppercase tracking-widest text-cm-accent bg-cm-accent/10 rounded-full border border-cm-accent/20">
              <Flame className="w-3.5 h-3.5 animate-pulse" />
              HECHO AL MOMENTO
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[0.65rem] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Cocina Activa
            </span>
          </div>

          {/* Live viewers */}
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[0.6rem] font-bold text-white/60 bg-white/5 rounded-full border border-white/10"
          >
            <Eye className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400 font-black">{viewers}</span> viendo ahora
          </motion.div>
        </motion.div>

        {/* Main Brand */}
        <motion.div variants={fadeUp} className="flex items-center gap-4 mb-4">
          <img src={logo} alt="House Logo" className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-lg animate-soft-float" />
          <div>
            <p className="text-[0.65rem] font-bold tracking-[0.4em] uppercase text-white/50 mb-1">
              {heroSubtitle}
            </p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-none">
              {heroTitle}
            </h1>
          </div>
        </motion.div>

        <motion.p variants={fadeUp} className="text-sm sm:text-base font-medium text-white/85 max-w-lg leading-relaxed">
          {heroDesc}
        </motion.p>

        {/* Kitchen Countdown */}
        <motion.div
          variants={fadeUp}
          className="mt-5 p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md flex items-center gap-4"
        >
          <div className={`p-2 rounded-xl ${kitchen.isOpen ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[0.65rem] font-bold uppercase tracking-wider ${kitchen.isOpen ? 'text-emerald-400' : 'text-amber-400'}`}>
              {kitchen.isOpen ? `Cocina ${kitchen.label} abierta` : `${kitchen.label} abre en`}
            </p>
            <p className="text-xs text-white/50 mt-0.5">
              {kitchen.isOpen ? 'Cierra en' : 'Próxima apertura en'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            {[
              { val: pad(kitchen.hours), label: 'h' },
              { val: pad(kitchen.minutes), label: 'm' },
              { val: pad(kitchen.seconds), label: 's' },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <span className={`text-lg sm:text-xl font-black tabular-nums ${
                  kitchen.isOpen ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {val}
                </span>
                <span className="text-[0.5rem] text-white/40 ml-0.5">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Details Toggle */}
        <motion.button
          variants={fadeUp}
          onClick={() => setIsOpen(!isOpen)}
          className="mt-5 flex items-center gap-2 text-xs font-bold text-cm-accent hover:text-white transition-colors bg-white/5 hover:bg-cm-accent/10 px-4 py-2 rounded-full border border-white/10 hover:border-cm-accent/20"
        >
          {isOpen ? 'Ocultar detalles' : '¿Por qué somos diferentes?'}
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </motion.button>

        {/* Expanded Details */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5 pt-5 border-t border-white/10">
                {[
                  { icon: ChefHat, title: 'Sabor de Autor', desc: 'Ingredientes locales frescos y recetas exclusivas de alta cocina.', color: 'cm-accent' },
                  { icon: Clock, title: 'En Menos de 30min', desc: 'Despacho priorizado y rastreo quirúrgico en tiempo real.', color: 'cm-accent' },
                  { icon: ShieldCheck, title: 'Garantía Total', desc: 'Si tu pedido no llega caliente o correcto, es gratis y duplicamos el reembolso.', color: 'cm-accent' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cm-accent/20 transition-all hover:bg-white/[0.04]">
                    <div className="p-2 rounded-xl bg-cm-accent/15 text-cm-accent shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">{title}</h4>
                      <p className="text-[0.7rem] text-white/50 mt-1 leading-snug">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer: Branch + Date + CTA */}
        <motion.div variants={fadeUp} className="flex items-center justify-between gap-4 mt-6 pt-5 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/50">
            <span className="w-2 h-2 rounded-full bg-cm-accent animate-pulse" />
            <span>Sede: {branchName || 'Sede Principal'}</span>
          </div>
          <motion.button
            onClick={() => {
              if (campaign?.id) {
                marketingService.incrementCampaignConversions(activeBranchId, campaign.id).catch(() => {});
              }
              const menu = document.getElementById('cat-section-todos') || document.querySelector('[class*="ProductGrid"], [class*="space-y-8"]');
              if (menu) menu.scrollIntoView({ behavior: 'smooth', block: 'start' });
              else window.scrollBy({ top: 600, behavior: 'smooth' });
            }}
            whileHover={{ y: 2 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 text-xs font-bold text-cm-accent hover:text-white bg-cm-accent/10 hover:bg-cm-accent px-4 py-2 rounded-full border border-cm-accent/20 hover:border-cm-accent transition-all"
          >
            Ver Menú <ArrowDown className="w-3.5 h-3.5" />
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
