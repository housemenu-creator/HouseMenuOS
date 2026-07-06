import { motion } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { isFirstRun } from '../lib/onboardingService';
import {
  Clock, UtensilsCrossed, ArrowRight, ChefHat, ShieldCheck, Star, Package, Calendar, ShoppingBag,
  MapPin, Phone, Clock3, ExternalLink, User, LogIn,
  Tv, Smartphone, Zap, Search, Bike, HeartHandshake,
} from 'lucide-react';
import { useBranch } from '../context/BranchContext';
import { useMarketing } from '../context/MarketingContext';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { slugRoute, staffDashboardRoute } from '../lib/routes';
import { menuService } from '../lib/menuService';
import CustomerAuthModal from '../components/CustomerAuthModal';
import logo from '../assets/logo.jpg';
import HeroBanner from '../customer/components/HeroBanner';
import FlashOffer from '../customer/components/FlashOffer';
import MarketingHighlights from '../customer/components/MarketingHighlights';
import UrgencyBar from '../customer/components/UrgencyBar';

const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function LandingView() {
  const navigate = useNavigate();
  const { activeBranch, activeBranchId } = useBranch();
  const { slug, isPublicView } = useTenant();
  const { user: authUser, isAuthenticated } = useAuth();
  const { isAuthenticated: customerAuth, points: customerPoints } = useCustomerAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // ── First-run detection ──
  useEffect(() => {
    if (isPublicView) return;
    isFirstRun().then(first => {
      if (first) navigate(ROUTES.ONBOARDING, { replace: true });
    });
  }, [navigate, isPublicView]);

  const branchName = activeBranch?.name || 'Sucursal';
  const branchAddress = activeBranch?.address || '';
  const branchPhone = activeBranch?.phone || '';
  const branchSchedule = activeBranch?.schedule || '';

  const { activeCampaigns, stats } = useMarketing();
  const campaign = activeCampaigns?.[0] || null;
  const ordersDelivered = stats?.deliveriesCount || null;
  const avgRating = stats?.averageRating || null;

  // ── Schedule formatting ──
  function formatSchedule(sched) {
    if (!sched) return [];
    if (typeof sched === 'string') return [{ label: 'Horario', value: sched }];
    if (sched.open && sched.close) return [{ label: 'Horario', value: `${sched.open} — ${sched.close}` }];
    const dayNames = {
      lunes: 'Lun', martes: 'Mar', miércoles: 'Mié', miercoles: 'Mié',
      jueves: 'Jue', viernes: 'Vie', sábado: 'Sáb', sabado: 'Sáb', domingo: 'Dom',
    };
    return Object.entries(sched)
      .map(([day, h]) => ({ label: dayNames[day] || day, value: `${h.open || h.start} — ${h.close || h.end}` }))
      .filter(r => r.value);
  }
  const scheduleRows = formatSchedule(branchSchedule);

  // ── Kitchen hours ──
  const [kitchenHours, setKitchenHours] = useState(null);
  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = onValue(ref(db, `branches_config/${activeBranchId}/kitchenHours`), snap => {
      let val = snap.val();
      if (Array.isArray(val) && val.length > 0) setKitchenHours(val);
      else if (val && typeof val === 'object') setKitchenHours(Object.values(val));
      else setKitchenHours(null);
    });
    return unsub;
  }, [activeBranchId]);

  // ── Kitchen status (live) ──
  function timeToMin(v) {
    if (!v) return null;
    const [h, m] = v.split(':').map(Number);
    return isNaN(h) ? null : h * 60 + (m || 0);
  }
  const [kitchenStatus, setKitchenStatus] = useState({ isOpen: false, label: 'Proximo turno', next: null });
  useEffect(() => {
    if (!kitchenHours?.length) return;
    const windows = kitchenHours.map(w => ({
      label: w.label, open: w.open, close: w.close,
      openMin: timeToMin(w.open), closeMin: timeToMin(w.close),
    })).filter(w => w.openMin != null);
    const update = () => {
      const now = new Date();
      const curr = now.getHours() * 60 + now.getMinutes();
      const open = windows.find(w => curr >= w.openMin && curr < w.closeMin);
      if (open) { setKitchenStatus({ isOpen: true, label: open.label, next: open }); return; }
      const next = windows.find(w => curr < w.openMin) || windows[0];
      setKitchenStatus({ isOpen: false, label: 'Proximo turno', next });
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [kitchenHours]);

  // ── Marketing layout config ──
  const [layoutConfig, setLayoutConfig] = useState({
    landingShowHero: true, landingShowFlashOffer: true, landingShowStats: true,
    landingShowValues: true, landingShowHighlights: true,
  });
  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = onValue(ref(db, `branches_config/${activeBranchId}/marketingLayout`), snap => {
      const val = snap.val();
      if (val) setLayoutConfig(prev => ({ ...prev, ...val }));
    });
    return unsub;
  }, [activeBranchId]);

  const kitchenRows = kitchenHours ?? [
    { label: 'Almuerzo', open: '11:00', close: '14:30' },
    { label: 'Cena', open: '18:00', close: '21:00' },
  ];

  const mapsUrl = branchAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branchAddress)}`
    : null;
  const callUrl = branchPhone ? `tel:${branchPhone.replace(/[^0-9+]/g, '')}` : null;

  // ── Catalog for menu preview ──
  const [catalog, setCatalog] = useState(null);
  useEffect(() => {
    if (!activeBranchId) return;
    return menuService.subscribeToCatalog(activeBranchId, data => {
      setCatalog(data);
    });
  }, [activeBranchId]);

  const menuPreviewItems = useMemo(() => {
    if (!catalog?.products) return [];
    return Object.values(catalog.products)
      .filter(p => p.image && p.available !== false && p.status !== 'draft')
      .slice(0, 6);
  }, [catalog]);

  const hasStats = ordersDelivered !== null || avgRating !== null;

  // ── Value props ──
  const VALUES = [
    { icon: ChefHat, title: 'Cocina de Autor', desc: 'Cada plato es preparado al instante por nuestros chefs. Ingredientes frescos, recetas exclusivas, sabor que habla por sí solo.' },
    { icon: Clock, title: '30 Min o Menos', desc: 'Despacho priorizado con rastreo en tiempo real. Si no llega a tiempo, es cortesía de la casa.' },
    { icon: ShieldCheck, title: 'Garantía HOUSE', desc: '¿Tu pedido llegó frío o incorrecto? Lo rehacemos al instante sin costo y te duplicamos el reembolso.' },
  ];

  return (
    <div className="flex-1 min-h-0 bg-cm-bg flex flex-col">
      {/* ── Coupon Bar ── */}
      <UrgencyBar />

      {/* ════════════════ NAV ════════════════ */}
      <nav className="sticky top-0 z-40 bg-cm-bg/80 backdrop-blur-xl border-b border-cm-accent/10 px-4 sm:px-8 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src={logo} alt="House Logo" className="w-9 h-9 rounded-xl object-cover border border-cm-border shadow-cm-sm" />
          <div>
            <span className="text-sm font-black tracking-widest text-cm-accent">HOUSE</span>
            <span className="ml-2 text-[0.55rem] font-bold bg-cm-accent/10 text-cm-accent px-2 py-0.5 rounded-full uppercase tracking-wider align-middle">
              {branchName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={() => navigate(slugRoute(slug, ROUTES.MIS_PEDIDOS))}
            className="px-3 py-1.5 bg-cm-surface border border-cm-border text-cm-text-secondary hover:text-cm-accent hover:border-cm-accent rounded-full transition-all text-xs font-bold flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mis Pedidos</span>
          </button>
          <button onClick={() => navigate(slugRoute(slug, ROUTES.RESERVA))}
            className="px-3 py-1.5 bg-cm-surface border border-cm-border text-cm-text-secondary hover:text-cm-accent hover:border-cm-accent rounded-full transition-all text-xs font-bold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reservar</span>
          </button>
          {isAuthenticated ? (
            <button onClick={() => navigate(staffDashboardRoute(authUser?.role || 'admin'))}
              className="hidden sm:flex px-3 py-1.5 bg-cm-accent/10 text-cm-accent rounded-full transition-all text-xs font-bold items-center gap-1.5 border border-cm-accent/20 hover:bg-cm-accent hover:text-white">
              <User className="w-3.5 h-3.5" /> Dashboard
            </button>
          ) : customerAuth ? (
            <button onClick={() => navigate(ROUTES.MI_CUENTA)}
              className="hidden sm:flex px-3 py-1.5 bg-cm-accent/10 text-cm-accent rounded-full transition-all text-xs font-bold items-center gap-1.5 border border-cm-accent/20 hover:bg-cm-accent hover:text-white">
              <User className="w-3.5 h-3.5" /> {customerPoints} pts
            </button>
          ) : (
            <>
              <button onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 text-cm-accent hover:bg-cm-accent/10 rounded-full transition-all text-xs font-bold flex items-center gap-1.5 border border-cm-accent/20">
                <span className="hidden sm:inline">Crear Cuenta</span>
                <User className="w-3.5 h-3.5 sm:hidden" />
              </button>
              <button onClick={() => navigate(ROUTES.LOGIN)}
                className="px-3 py-1.5 text-cm-text-secondary hover:text-cm-accent rounded-full transition-all text-xs font-bold flex items-center gap-1.5">
                <LogIn className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Ingresar</span>
              </button>
            </>
          )}
          <button onClick={() => navigate(slugRoute(slug, ROUTES.CARTA))}
            className="px-4 py-1.5 bg-cm-accent hover:bg-cm-accent-hover text-white rounded-full transition-all text-xs font-bold shadow-cm-sm flex items-center gap-1.5">
            Pedir Ahora <Zap className="w-3 h-3" />
          </button>
        </div>
      </nav>

      <main className="flex-1">
        {/* ════════════════ HERO ════════════════ */}
        {layoutConfig.landingShowHero && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <HeroBanner branchName={branchName} campaign={campaign} kitchenHours={kitchenHours} catalog={catalog} />
          </motion.section>
        )}

        {/* ════════════════ METRICS STRIP ════════════════ */}
        {hasStats && (
          <div className="border-y border-cm-accent/8 bg-gradient-to-r from-cm-accent/[0.02] via-cm-accent/[0.04] to-cm-accent/[0.02]">
            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-center gap-5 sm:gap-8 text-xs font-semibold text-cm-text-secondary">
              <span className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${kitchenStatus.isOpen ? 'bg-cm-success' : 'bg-cm-warning'} animate-pulse`} />
                {kitchenStatus.isOpen
                  ? <span>Cocina <strong className="text-cm-text font-black">{kitchenStatus.label}</strong> abierta</span>
                  : <span>Próximo turno <strong className="text-cm-text font-black">{kitchenStatus.next?.open || '11:00'}</strong></span>
                }
              </span>
              <span className="w-px h-4 bg-cm-border" />
              {avgRating !== null && (
                <>
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3 h-3 fill-cm-warning text-cm-warning" />
                    <strong className="text-cm-text font-black tabular-nums">{avgRating}</strong>
                  </span>
                  <span className="w-px h-4 bg-cm-border" />
                </>
              )}
              {ordersDelivered !== null && (
                <span className="flex items-center gap-1.5">
                  <Package className="w-3 h-3 text-cm-accent" />
                  <strong className="text-cm-text font-black tabular-nums">{ordersDelivered.toLocaleString()}</strong>
                  <span className="hidden sm:inline text-cm-text-tertiary">pedidos</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* ════════════════ MAIN CONTENT ════════════════ */}
        <motion.div
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          initial="hidden"
          animate="show"
          className="max-w-6xl mx-auto px-4 sm:px-8 py-12 pb-32 space-y-20"
        >
          {/* ─── Flash Offer ─── */}
          {layoutConfig.landingShowFlashOffer && (
            <motion.div variants={FADE_UP}>
              <FlashOffer />
            </motion.div>
          )}

          {/* ─── CÓMO FUNCIONA ─── */}
          <motion.div variants={FADE_UP} className="space-y-8">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-black text-cm-text">Cómo funciona</h2>
              <p className="text-sm text-cm-text-secondary mt-2 max-w-md mx-auto">Pedir en HOUSE es tan simple como 1-2-3</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: Search, step: '01', title: 'Elige', desc: 'Explora nuestro menú con fotos, descripciones y precios. Filtra por categoría y encuentra tu plato ideal.' },
                { icon: ChefHat, step: '02', title: 'Cocinamos', desc: 'Tu pedido llega en tiempo real a nuestra cocina. Chefs preparan cada plato al instante con ingredientes frescos.' },
                { icon: Bike, step: '03', title: 'Recibe', desc: 'Despacho priorizado con rastreo en vivo. También puedes recoger en sede y evitar esperas.' },
              ].map(({ icon: Icon, step, title, desc }) => (
                <div key={step}
                  className="relative rounded-2xl border border-cm-border bg-cm-surface p-6 shadow-cm-sm group hover:border-cm-accent/20 hover:shadow-cm-md transition-all">
                  {/* Step number */}
                  <span className="absolute top-4 right-4 text-[0.55rem] font-black text-cm-muted/30 tracking-widest">{step}</span>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cm-accent/15 to-cm-accent/5 border border-cm-accent/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6 text-cm-accent" />
                  </div>
                  <h3 className="text-base font-black text-cm-text mb-2">{title}</h3>
                  <p className="text-xs text-cm-text-secondary leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ─── MENU PREVIEW ─── */}
          {menuPreviewItems.length >= 3 && (
            <motion.div variants={FADE_UP} className="space-y-8">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-cm-text">Nuestra carta</h2>
                  <p className="text-sm text-cm-text-secondary mt-1">Los platos más populares de {branchName}</p>
                </div>
                <button onClick={() => navigate(slugRoute(slug, ROUTES.CARTA))}
                  className="hidden sm:flex items-center gap-1.5 text-xs font-black text-cm-accent hover:text-cm-accent-hover transition-colors">
                  Ver todo <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {menuPreviewItems.map(product => (
                  <button key={product.id || product.name}
                    onClick={() => navigate(slugRoute(slug, ROUTES.CARTA))}
                    className="group relative overflow-hidden rounded-2xl border border-cm-border bg-cm-surface shadow-cm-sm hover:shadow-cm-md hover:border-cm-accent/25 transition-all text-left active:scale-[0.99]">
                    {/* Image */}
                    <div className="aspect-[4/3] overflow-hidden bg-cm-bg-alt">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-cm-muted">
                          <UtensilsCrossed className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    {/* Info overlay at bottom */}
                    <div className="p-3.5">
                      <h3 className="text-sm font-black text-cm-text group-hover:text-cm-accent transition-colors truncate">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-[0.6rem] text-cm-text-secondary mt-0.5 line-clamp-1 leading-relaxed">{product.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-black text-cm-accent">S/ {Number(product.base_price || 0).toFixed(2)}</span>
                        <span className="text-[0.5rem] font-bold text-cm-accent uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                          + Pedir
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {/* Mobile "ver todo" */}
              <div className="text-center sm:hidden">
                <button onClick={() => navigate(slugRoute(slug, ROUTES.CARTA))}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-cm-accent/10 text-cm-accent font-black text-xs rounded-xl hover:bg-cm-accent hover:text-white transition-all">
                  Ver carta completa <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── HECHO CON PROPÓSITO ─── */}
          {layoutConfig.landingShowValues && (
            <motion.div variants={FADE_UP} className="space-y-8">
              <div className="max-w-xl">
                <h2 className="text-xl sm:text-2xl font-black text-cm-text">Hecho con propósito</h2>
                <p className="text-sm text-cm-text-secondary mt-2">No solo cocinamos. Creamos una experiencia que va del fogón a tu mesa sin perder calidad ni calidez.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
                {/* Large — Cocina de Autor */}
                <div className="relative overflow-hidden rounded-2xl border border-cm-accent/15 bg-gradient-to-br from-cm-accent/[0.04] to-cm-bg p-6 sm:p-8 shadow-cm-sm group hover:shadow-cm-md transition-shadow">
                  <div className="absolute -top-8 -right-8 w-28 h-28 bg-cm-accent/[0.06] rounded-full group-hover:scale-150 transition-transform duration-700 ease-out" />
                  <div className="relative flex flex-col sm:flex-row items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cm-accent/20 to-cm-accent/5 border border-cm-accent/10 flex items-center justify-center shrink-0">
                      <ChefHat className="w-7 h-7 text-cm-accent" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-cm-text mb-2">Cocina de Autor</h3>
                      <p className="text-sm text-cm-text-secondary leading-relaxed">Cada plato es preparado al instante por nuestros chefs. Ingredientes frescos, recetas exclusivas, sabor que habla por sí solo.</p>
                      <div className="mt-4 flex items-center gap-3 text-xs font-bold text-cm-accent">
                        <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" /> Recetas exclusivas</span>
                        <span className="w-px h-3 bg-cm-accent/20" />
                        <span className="flex items-center gap-1"><ChefHat className="w-3.5 h-3.5" /> Chefs en sede</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Smaller stacked */}
                <div className="flex flex-col gap-4">
                  {VALUES.slice(1).map(({ icon: Icon, title, desc }) => (
                    <div key={title}
                      className="flex-1 rounded-2xl border border-cm-border bg-cm-surface p-5 shadow-cm-sm group hover:border-cm-accent/20 hover:shadow-cm-md transition-all">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-cm-accent/10 text-cm-accent flex items-center justify-center shrink-0 group-hover:bg-cm-accent group-hover:text-white transition-colors duration-300">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-cm-text mb-1">{title}</h3>
                          <p className="text-xs text-cm-text-secondary leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── BRANCH INFO ─── */}
          {(branchAddress || branchPhone || scheduleRows.length > 0) && (
            <motion.div variants={FADE_UP}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-cm-border rounded-2xl bg-cm-surface shadow-cm-sm">
                {branchAddress && mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-5 py-4 hover:bg-cm-surface-hover transition-colors group flex-1 min-w-0">
                    <MapPin className="w-4 h-4 text-cm-accent shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-cm-accent">Dirección</p>
                      <p className="text-xs text-cm-text-secondary mt-0.5 truncate">{branchAddress}</p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-cm-muted shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
                {branchPhone && callUrl && (
                  <a href={callUrl}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-cm-surface-hover transition-colors group flex-1 min-w-0">
                    <Phone className="w-4 h-4 text-cm-accent shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-cm-accent">Teléfono</p>
                      <p className="text-xs text-cm-text-secondary mt-0.5">{branchPhone}</p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-cm-muted shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
                {scheduleRows.length > 0 && (
                  <div className="flex items-center gap-3 px-5 py-4 flex-1 min-w-0">
                    <Clock3 className="w-4 h-4 text-cm-accent shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-cm-accent">Horario</p>
                      <p className="text-xs text-cm-text-secondary mt-0.5">
                        {scheduleRows[0]?.label}: {scheduleRows[0]?.value}
                        {scheduleRows.length > 1 && ` · ${scheduleRows[1]?.label}: ${scheduleRows[1]?.value}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── MARKETING HIGHLIGHTS ─── */}
          {layoutConfig.landingShowHighlights && (
            <motion.div variants={FADE_UP}>
              <MarketingHighlights />
            </motion.div>
          )}

          {/* ─── FOOTER / TOOLS ─── */}
          <motion.div variants={FADE_UP}
            className="border-t border-cm-border/30 pt-8">
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-cm-text-secondary/60">
              <span className="uppercase tracking-widest text-[0.55rem]">Herramientas</span>
              <button onClick={() => window.open(ROUTES.MONITOR, '_blank')}
                className="flex items-center gap-1.5 hover:text-cm-accent transition-colors">
                <Tv className="w-3.5 h-3.5" /> Monitor TV
              </button>
              <button onClick={() => window.open(ROUTES.KIOSKO, '_blank')}
                className="flex items-center gap-1.5 hover:text-cm-accent transition-colors">
                <Smartphone className="w-3.5 h-3.5" /> Kiosko
              </button>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* ─── STICKY MOBILE CTA ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-cm-bg/90 backdrop-blur-lg border-t border-cm-border/30 sm:hidden">
        <button onClick={() => navigate(slugRoute(slug, ROUTES.CARTA))}
          className="w-full py-3.5 bg-cm-accent hover:bg-cm-accent-hover text-white font-black text-sm rounded-xl shadow-cm-lg flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform">
          <UtensilsCrossed className="w-4 h-4" />
          Ver Carta Completa
        </button>
      </div>

      <CustomerAuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode="register" />
    </div>
  );
}
