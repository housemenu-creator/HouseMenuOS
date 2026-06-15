import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import {
  Clock,
  UtensilsCrossed, ArrowRight, Sparkles,
  ChefHat, ShieldCheck, Heart, Star, Package,
} from 'lucide-react';
import { useBranch } from '../context/BranchContext';
import { useMarketing } from '../context/MarketingContext';
import logo from '../assets/logo.jpg';
import HeroBanner from '../customer/components/HeroBanner';
import FlashOffer from '../customer/components/FlashOffer';
import MarketingHighlights from '../customer/components/MarketingHighlights';
import UrgencyBar from '../customer/components/UrgencyBar';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const VALUES = [
  { icon: ChefHat, title: 'Cocina de Autor', desc: 'Cada plato es preparado al instante por nuestros chefs. Ingredientes frescos, recetas exclusivas, sabor que habla por sí solo.' },
  { icon: Clock, title: '30 Min o Menos', desc: 'Despacho priorizado con rastreo en tiempo real. Si no llega a tiempo, es cortesía de la casa.' },
  { icon: ShieldCheck, title: 'Garantía HOUSE', desc: '¿Tu pedido llegó frío o incorrecto? Lo rehacemos al instante sin costo y te duplicamos el reembolso.' },
];

export default function LandingView() {
  const navigate = useNavigate();
  const { branches, activeBranchId } = useBranch();
  const branchName = branches.find((b) => b.id === activeBranchId)?.name;
  const { activeCampaigns, stats } = useMarketing();
  const campaign = activeCampaigns?.[0] || null;
  const ordersDelivered = stats?.deliveriesCount || 1240;
  const avgRating = stats?.averageRating || 4.9;

  // ── Horarios de cocina desde Firebase ─────────────────────────────────────
  const [kitchenHours, setKitchenHours] = useState(null);

  useEffect(() => {
    if (!activeBranchId) return;
    const kitchenRef = ref(db, `branches_config/${activeBranchId}/kitchenHours`);
    const unsub = onValue(kitchenRef, (snap) => {
      const val = snap.val();
      if (val && Array.isArray(val) && val.length > 0) {
        setKitchenHours(val);
      } else if (val && typeof val === 'object') {
        // Puede venir como objeto {0: {...}, 1: {...}}
        setKitchenHours(Object.values(val));
      } else {
        setKitchenHours(null); // Sin datos → HeroBanner usa fallback
      }
    });
    return unsub;
  }, [activeBranchId]);

  // ── Configuración de diseño desde Firebase ────────────────────────────────
  const [layoutConfig, setLayoutConfig] = useState({
    landingShowHero: true,
    landingShowFlashOffer: true,
    landingShowStats: true,
    landingShowValues: true,
    landingShowHighlights: true,
    cartaShowHero: false,
    cartaShowFlashOffer: false,
    cartaShowDailyMenu: true,
    cartaShowHighlights: false,
  });

  useEffect(() => {
    if (!activeBranchId) return;
    const layoutRef = ref(db, `branches_config/${activeBranchId}/marketingLayout`);
    const unsub = onValue(layoutRef, (snap) => {
      const val = snap.val();
      if (val) {
        setLayoutConfig((prev) => ({ ...prev, ...val }));
      }
    });
    return unsub;
  }, [activeBranchId]);

  // Texto de horarios para mostrar en el panel info
  const scheduleRows = kitchenHours ?? [
    { label: 'Almuerzo', open: '11:00', close: '14:30' },
    { label: 'Cena', open: '18:00', close: '21:00' },
  ];

  return (
    <div className="min-h-screen bg-cm-bg flex flex-col">
      {/* Sticky Urgency / Coupon Bar at the very top of the landing page */}
      <UrgencyBar />

      {/* Header Bar */}
      <nav className="sticky top-0 z-40 bg-cm-bg/85 backdrop-blur-md border-b border-cm-accent/15 px-6 py-4 flex justify-between items-center max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <img src={logo} alt="House Logo" className="w-8 h-8 rounded-lg object-cover border border-cm-border shadow-cm-sm" />
          <div className="flex items-center gap-2">
            <span className="text-[0.95rem] font-black tracking-widest text-cm-accent">HOUSE</span>
            <span className="text-[0.6rem] font-bold bg-cm-accent/10 text-cm-accent px-2 py-0.5 rounded-full uppercase tracking-wider">
              {branchName || 'Principal'}
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('/carta')}
          className="px-4 py-1.5 bg-cm-accent/10 hover:bg-cm-accent text-cm-accent hover:text-white rounded-full transition-all text-xs font-bold border border-cm-accent/20"
        >
          Pedir Ahora
        </button>
      </nav>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 pb-32">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.12 } } }}
          className="space-y-8"
        >
          {/* ── Hero ─────────────────────────── */}
          {layoutConfig.landingShowHero && (
            <motion.div variants={fadeUp}>
              <HeroBanner branchName={branchName} campaign={campaign} kitchenHours={kitchenHours} />
            </motion.div>
          )}

          {/* ── Flash Offer ──────────────────── */}
          {layoutConfig.landingShowFlashOffer && (
            <motion.div variants={fadeUp}>
              <FlashOffer />
            </motion.div>
          )}

          {/* ── Social Proof Bento Grid ──────── */}
          {layoutConfig.landingShowStats && (
            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-cm-surface to-slate-900 border border-cm-border hover:border-cm-accent/30 rounded-2xl p-5 text-center transition-all shadow-cm-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-cm-accent/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-center gap-0.5 mb-1.5 group-hover:scale-105 transition-transform duration-300">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-3xl font-black text-white tracking-tight">{avgRating}</p>
                <p className="text-[0.65rem] font-bold text-cm-muted uppercase tracking-wider mt-0.5">Calidad de Alimentos</p>
              </div>
              <div className="bg-gradient-to-br from-cm-surface to-slate-900 border border-cm-border hover:border-cm-accent/30 rounded-2xl p-5 text-center transition-all shadow-cm-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-cm-accent/5 rounded-full blur-xl pointer-events-none" />
                <div className="w-7 h-7 bg-cm-accent/10 rounded-full flex items-center justify-center mx-auto mb-2 text-cm-accent group-hover:scale-105 transition-transform duration-300">
                  <Package className="w-4 h-4" />
                </div>
                <p className="text-3xl font-black text-white tracking-tight tabular-nums">{ordersDelivered.toLocaleString()}</p>
                <p className="text-[0.65rem] font-bold text-cm-muted uppercase tracking-wider mt-0.5">Pedidos Entregados</p>
              </div>
            </motion.div>
          )}

          {/* ── ¿Por qué HOUSE? ──────────────── */}
          {layoutConfig.landingShowValues && (
            <motion.div variants={fadeUp} className="space-y-4">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-cm-accent" />
                <h2 className="text-sm font-black text-cm-text uppercase tracking-wider">Por qué HOUSE</h2>
              </div>
              <div className="space-y-3.5">
                {VALUES.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3.5 p-4 bg-cm-surface border border-cm-border rounded-2xl hover:border-cm-accent/30 transition-all duration-300 group">
                    <div className="p-2.5 rounded-xl bg-cm-accent/10 text-cm-accent shrink-0 group-hover:bg-cm-accent group-hover:text-white transition-colors duration-300">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-cm-text group-hover:text-cm-accent transition-colors">{title}</h3>
                      <p className="text-xs text-cm-muted mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Marketing Highlights ─────────── */}
          {layoutConfig.landingShowHighlights && (
            <motion.div variants={fadeUp}>
              <MarketingHighlights />
            </motion.div>
          )}

          {/* ── Info + CTA ───────────────────── */}
          <motion.div variants={fadeUp} className="bg-cm-surface border border-cm-border rounded-2xl p-6 space-y-4 shadow-cm-md">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cm-accent" />
              <h3 className="text-sm font-black text-cm-text uppercase tracking-wider">Horarios de Cocina</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {scheduleRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between p-3 rounded-xl bg-cm-bg/50 border border-cm-border/40">
                  <span className="text-xs font-bold text-white">{row.label}</span>
                  <span className="text-xs font-semibold text-cm-muted">{row.open} — {row.close}</span>
                </div>
              ))}
            </div>
            <p className="text-[0.65rem] font-semibold text-cm-muted text-center">
              Sede activa: {branchName || 'No seleccionada'}
            </p>
          </motion.div>

          {/* ── CTA Principal ────────────────── */}
          <motion.button
            variants={fadeUp}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate('/carta')}
            className="w-full group py-4 bg-gradient-to-r from-cm-accent to-orange-500 text-white font-black text-lg rounded-2xl shadow-cm-lg hover:shadow-cm-xl transition-all flex items-center justify-center gap-3 border border-orange-500/20"
          >
            <UtensilsCrossed className="w-5 h-5" />
            Ver Carta Completa
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>

          <motion.p variants={fadeUp} className="text-xs text-cm-muted text-center font-semibold">
            Explora nuestro menú completo con fotos, descripciones y precios
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
