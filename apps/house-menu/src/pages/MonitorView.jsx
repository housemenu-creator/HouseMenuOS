import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import {
  Clock, CheckCircle2, CookingPot, ChevronDown, Monitor,
  Loader2, AlertCircle, Timer, MapPin, UtensilsCrossed,
} from 'lucide-react';
import { useBranch } from '../context/BranchContext';

// ── Constants ────────────────────────────────────────
const PREP_TIME_MS = 10 * 60 * 1000;      // expected prep time (10 min)
const MAX_VISIBLE = 6;                     // cards before auto-page kicks in
const PAGE_INTERVAL = 8000;               // ms between auto-page scrolls
const AMBER_AT = 0.7;                      // 70% of prep time → amber
const RED_AT = 1.0;                        // 100%+ → red

// ── Shared variants ──────────────────────────────────
const cv = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const iv = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 24 } } };

// ═══════════════════════════════════════════════════════
// AnimCounter — eased number transitions
// ═══════════════════════════════════════════════════════
function AnimCounter({ value, duration = 600 }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  const raf = useRef(null);

  useEffect(() => {
    if (value === prev.current) { setDisplay(value); return; }
    const start = prev.current;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(Math.round(start + (value - start) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    prev.current = value;
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <>{display}</>;
}

// ═══════════════════════════════════════════════════════
// ClockDisplay — live time
// ═══════════════════════════════════════════════════════
function ClockDisplay() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-base tabular-nums text-cm-muted/50 tracking-wider">
      {time || '—'}
    </span>
  );
}

// ═══════════════════════════════════════════════════════
// UrgencyBadge
// ═══════════════════════════════════════════════════════
function UrgencyBadge({ elapsed, prepTime }) {
  const ratio = prepTime > 0 ? elapsed / prepTime : 0;
  if (ratio < AMBER_AT) return null;

  const isRed = ratio >= RED_AT;
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${
        isRed ? 'bg-cm-danger/15 text-cm-danger animate-pulse' : 'bg-cm-warning/15 text-cm-warning'
      }`}
    >
      <Timer className="w-3 h-3" />
      {isRed ? 'Demorado' : 'Pronto'}
    </motion.span>
  );
}

// ═══════════════════════════════════════════════════════
// Rich chime for new listo orders
// ═══════════════════════════════════════════════════════
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    // Two-tone ascending chime
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.25, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.5);
    });
  } catch {}
}

// ═══════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════
export default function MonitorView() {
  const { branches, activeBranchId, setActiveBranchId, activeBranch, isLoading: branchLoading } = useBranch();
  const [branchOpen, setBranchOpen] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [persistedBranch, setPersistedBranch] = useState(() => {
    try { return localStorage.getItem('monitor_branchId') || activeBranchId || ''; } catch { return ''; }
  });

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [prepMinutes, setPrepMinutes] = useState(() => {
    try { return parseInt(localStorage.getItem('monitor_prep_min') || '10', 10); } catch { return 10; }
  });

  const effectiveBranchId = persistedBranch || activeBranchId || branches[0]?.id || '';
  const prepTimeMs = prepMinutes * 60 * 1000;

  const switchBranch = (id) => {
    setPersistedBranch(id);
    try { localStorage.setItem('monitor_branchId', id); } catch {}
    setActiveBranchId(id);
    setBranchOpen(false);
    setError(null);
  };

  useEffect(() => {
    if (!persistedBranch && !activeBranchId && branches.length > 0) {
      switchBranch(branches[0].id);
    }
  }, [branches, persistedBranch, activeBranchId]);

  const handleRetry = useCallback(() => {
    setError(null);
    setRetryCount((c) => c + 1);
    setLoading(true);
  }, []);

  // ── Subscribe to orders ──
  useEffect(() => {
    if (!effectiveBranchId) return;
    setLoading(true);
    setError(null);
    const ordersRef = ref(db, `branches/${effectiveBranchId}/orders`);
    const unsub = onValue(ordersRef, (snap) => {
      const data = snap.val();
      if (!data) { setOrders([]); setLoading(false); return; }
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ta - tb;
      });
      setOrders(list);
      setLoading(false);
    }, (err) => {
      console.warn('MonitorView: error subscribing to orders:', err);
      setError('Error al conectar con la base de datos. Verificá la conexión e intentá de nuevo.');
      setLoading(false);
    });
    return unsub;
  }, [effectiveBranchId, retryCount]);

  // ── Clock tick ──
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const branchName = branches.find(b => b.id === effectiveBranchId)?.name || effectiveBranchId;

  // ── Active orders ──
  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status === 'preparando' || o.status === 'listo');
  }, [orders]);

  const preparando = useMemo(() => activeOrders.filter(o => o.status === 'preparando'), [activeOrders]);
  const listos = useMemo(() => activeOrders.filter(o => o.status === 'listo'), [activeOrders]);

  // ── Chime when new order is ready ──
  const prevListoCount = useRef(0);
  useEffect(() => {
    if (prevListoCount.current > 0 && listos.length > prevListoCount.current) {
      playChime();
    }
    prevListoCount.current = listos.length;
  }, [listos.length]);

  // ── Auto-page scroll ──
  const preparandoRef = useRef(null);
  const listoRef = useRef(null);
  const [prepPage, setPrepPage] = useState(0);
  const [listoPage, setListoPage] = useState(0);

  useEffect(() => {
    setPrepPage(0);
  }, [preparando.length]);

  useEffect(() => {
    setListoPage(0);
  }, [listos.length]);

  // Auto-advance preparando
  useEffect(() => {
    if (preparando.length <= MAX_VISIBLE) return;
    const t = setInterval(() => {
      setPrepPage(prev => {
        const next = prev + 1;
        return next >= preparando.length ? 0 : next;
      });
    }, PAGE_INTERVAL);
    return () => clearInterval(t);
  }, [preparando.length]);

  // Auto-advance listo
  useEffect(() => {
    if (listos.length <= MAX_VISIBLE) return;
    const t = setInterval(() => {
      setListoPage(prev => {
        const next = prev + 1;
        return next >= listos.length ? 0 : next;
      });
    }, PAGE_INTERVAL);
    return () => clearInterval(t);
  }, [listos.length]);

  // Scroll preparando into view
  useEffect(() => {
    if (!preparandoRef.current || preparando.length <= MAX_VISIBLE) return;
    const child = preparandoRef.current.children[prepPage];
    if (child) child.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [prepPage, preparando.length]);

  // Scroll listo into view
  useEffect(() => {
    if (!listoRef.current || listos.length <= MAX_VISIBLE) return;
    const child = listoRef.current.children[listoPage];
    if (child) child.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [listoPage, listos.length]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    const ms = now - new Date(dateStr).getTime();
    if (ms < 0) return '0s';
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const shortId = (id) => (id ? id.slice(-6).toUpperCase() : '——');

  // ── Helpers ──
  const elapsedPct = (createdAt) => {
    if (!createdAt) return 0;
    return Math.min((now - new Date(createdAt).getTime()) / prepTimeMs, 1);
  };

  const urgencyClass = (createdAt) => {
    const ratio = createdAt ? (now - new Date(createdAt).getTime()) / prepTimeMs : 0;
    if (ratio >= RED_AT) return 'border-cm-danger/40 bg-cm-danger/[0.04] shadow-cm-danger/5';
    if (ratio >= AMBER_AT) return 'border-cm-warning/30 bg-cm-warning/[0.03]';
    return 'border-cm-border/30 bg-cm-surface';
  };

  const barColor = (createdAt) => {
    const ratio = createdAt ? (now - new Date(createdAt).getTime()) / prepTimeMs : 0;
    if (ratio >= RED_AT) return 'bg-cm-danger';
    if (ratio >= AMBER_AT) return 'bg-cm-warning';
    return 'bg-cm-accent';
  };

  // ── Loading skeleton ──
  if (branchLoading) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cm-accent animate-spin" />
      </div>
    );
  }

  // ── Branch selector ──
  if (!effectiveBranchId) {
    return (
      <div className="min-h-screen bg-cm-bg flex flex-col items-center justify-center p-8 gap-8">
        <div className="w-20 h-20 rounded-2xl bg-cm-accent/10 flex items-center justify-center border border-cm-accent/20">
          <Monitor className="w-10 h-10 text-cm-accent" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-black text-cm-text tracking-tight">Monitor de Pedidos</h1>
          <p className="text-cm-muted text-lg mt-2">Seleccioná una sucursal para empezar</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 max-w-xl">
          {branches.map(b => (
            <motion.button
              key={b.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => switchBranch(b.id)}
              className="px-10 py-5 bg-cm-surface/80 backdrop-blur-xl border-2 border-cm-border/40 hover:border-cm-accent/50 rounded-2xl text-cm-text font-bold text-xl transition-all hover:shadow-cm-lg hover:shadow-cm-accent/5"
            >
              {b.name}
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (!loading && activeOrders.length === 0) {
    return (
      <div className="min-h-screen bg-cm-bg flex flex-col items-center justify-center p-8 select-none">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 mb-10">
          <Monitor className="w-7 h-7 text-cm-accent" />
          <ClockDisplay />
          <h1 className="text-2xl font-black text-cm-text tracking-tight">{branchName}</h1>
        </motion.div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 150, damping: 15 }}
          className="relative"
        >
          {/* Decorative rings */}
          <div className="w-40 h-40 rounded-full border-2 border-cm-accent/15 animate-[spin_8s_linear_infinite]" />
          <div className="absolute inset-3 w-[8.5rem] h-[8.5rem] rounded-full border-2 border-cm-success/15 animate-[spin_12s_linear_infinite_reverse]" />
          <div className="absolute inset-6 w-28 h-28 rounded-full border-2 border-cm-warning/15 animate-[spin_6s_linear_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-cm-muted/20" />
          </div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-cm-text mt-10"
        >
          No hay pedidos activos
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-cm-muted text-base mt-2"
        >
          Los pedidos aparecerán acá automáticamente
        </motion.p>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="min-h-screen bg-cm-bg flex flex-col items-center justify-center p-8 gap-5">
        <div className="w-16 h-16 rounded-full bg-cm-danger/10 flex items-center justify-center border border-cm-danger/20">
          <AlertCircle className="w-8 h-8 text-cm-danger" />
        </div>
        <p className="text-lg font-bold text-cm-danger text-center max-w-md">{error}</p>
        <button onClick={handleRetry}
          className="px-8 py-3 text-sm font-black bg-cm-accent text-white rounded-2xl hover:brightness-110 transition-all tracking-wider uppercase shadow-lg shadow-cm-accent/20">
          Reintentar
        </button>
      </motion.div>
    );
  }

  // ── Skeleton loading ──
  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-cm-bg select-none">
        <div className="flex items-center justify-between px-8 py-4 border-b border-cm-border/10">
          <div className="flex items-center gap-4">
            <Monitor className="w-5 h-5 text-cm-accent/50" />
            <div className="h-5 w-44 bg-cm-muted/10 rounded-lg animate-pulse" />
          </div>
          <div className="h-4 w-24 bg-cm-muted/10 rounded-lg animate-pulse" />
        </div>
        <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-0">
          <div className="flex-1 p-6 lg:p-10 space-y-4">
            <div className="h-7 w-52 bg-cm-muted/10 rounded-lg animate-pulse" />
            {[1,2,3].map((i) => (
              <div key={i} className="bg-cm-surface/50 rounded-2xl border border-cm-border/20 p-6 space-y-4 animate-pulse">
                <div className="h-10 w-28 bg-cm-muted/10 rounded-lg" />
                <div className="h-6 w-44 bg-cm-muted/10 rounded-lg" />
                <div className="h-4 w-full bg-cm-muted/10 rounded-lg" />
              </div>
            ))}
          </div>
          <div className="hidden md:block w-px bg-cm-border/10" />
          <div className="flex-1 p-6 lg:p-10 space-y-4 animate-pulse">
            <div className="h-7 w-52 bg-cm-muted/10 rounded-lg" />
            {[1,2].map((i) => (
              <div key={i} className="bg-cm-surface/50 rounded-2xl border border-cm-border/20 p-8 space-y-4">
                <div className="h-10 w-28 bg-cm-muted/10 rounded-lg" />
                <div className="h-6 w-44 bg-cm-muted/10 rounded-lg" />
                <div className="h-5 w-36 bg-cm-muted/10 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN DISPLAY ──
  return (
    <motion.div variants={cv} initial="hidden" animate="show" className="min-h-screen bg-cm-bg select-none flex flex-col">
      {/* ── Premium header ── */}
      <motion.div variants={iv} className="shrink-0 flex items-center justify-between px-6 lg:px-10 py-4 border-b border-cm-border/10 bg-cm-bg/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-cm-accent/10 flex items-center justify-center border border-cm-accent/20">
            <Monitor className="w-4 h-4 text-cm-accent" />
          </div>
          <h1 className="text-lg font-black text-cm-text tracking-tight">{branchName}</h1>
          <div className="relative">
            <button
              onClick={() => setBranchOpen(!branchOpen)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cm-surface/50 border border-cm-border/20 text-[11px] font-bold text-cm-muted hover:text-cm-text transition-colors"
            >
              Cambiar <ChevronDown className={`w-3 h-3 transition-transform ${branchOpen ? 'rotate-180' : ''}`} />
            </button>
            {branchOpen && (
              <div className="absolute top-full left-0 mt-1.5 z-50 bg-cm-surface border border-cm-border rounded-2xl shadow-cm-xl p-1.5 min-w-[190px] backdrop-blur-xl">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => switchBranch(b.id)}
                    className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      b.id === effectiveBranchId ? 'bg-cm-accent text-white' : 'text-cm-muted hover:text-cm-text hover:bg-cm-muted/5'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-xs font-bold text-cm-muted/40 tracking-widest uppercase">
            {loading ? 'actualizando...' : `${activeOrders.length} activo${activeOrders.length !== 1 ? 's' : ''}`}
          </span>
          <ClockDisplay />
        </div>
      </motion.div>

      {/* ── Refreshing overlay ── */}
      <AnimatePresence>
        {loading && orders.length > 0 && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-cm-bg/60 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Two-column layout ── */}
      <div className="flex-1 flex flex-col md:flex-row gap-0 min-h-0">
        {/* ══════ PREPARANDO ══════ */}
        <div className="flex-1 flex flex-col min-h-0 p-6 lg:p-8 xl:p-10 overflow-hidden">
          <motion.div variants={iv} className="flex items-center gap-3 mb-5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-cm-warning/10 flex items-center justify-center border border-cm-warning/20">
              <CookingPot className="w-4 h-4 text-cm-warning" />
            </div>
            <h2 className="text-xl font-black text-cm-text tracking-tight">En Preparación</h2>
            <span className="text-sm font-bold bg-cm-warning/10 text-cm-warning px-2.5 py-0.5 rounded-full tabular-nums border border-cm-warning/20">
              <AnimCounter value={preparando.length} />
            </span>
          </motion.div>

          <div
            ref={preparandoRef}
            className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide snap-y snap-mandatory"
          >
            <AnimatePresence mode="popLayout">
              {preparando.length === 0 ? (
                <motion.div key="empty-prep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center justify-center h-full text-cm-muted/20 text-sm font-bold tracking-widest uppercase">
                  Sin pedidos
                </motion.div>
              ) : (
                preparando.map(order => {
                  const elapsed = order.createdAt ? now - new Date(order.createdAt).getTime() : 0;
                  const pct = elapsedPct(order.createdAt);
                  return (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                      className={`snap-start rounded-2xl border-2 transition-all ${urgencyClass(order.createdAt)}`}
                    >
                      <div className="p-5 lg:p-6">
                        {/* Row 1: ID + Mesa + Timer */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-3xl lg:text-4xl font-black text-cm-text tabular-nums tracking-tight">
                              #{shortId(order.id)}
                            </span>
                            <UrgencyBadge elapsed={elapsed} prepTime={prepTimeMs} />
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Clock className={`w-5 h-5 ${
                              pct >= RED_AT ? 'text-cm-danger' : pct >= AMBER_AT ? 'text-cm-warning' : 'text-cm-muted/40'
                            }`} />
                            <span className={`text-2xl lg:text-3xl font-black tabular-nums ${
                              pct >= RED_AT ? 'text-cm-danger' : pct >= AMBER_AT ? 'text-cm-warning' : 'text-cm-text'
                            }`}>
                              {formatTime(order.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Row 2: Mesa + Customer */}
                        <div className="flex items-center gap-4 mb-3">
                          {order.tableNumber || order.mesa ? (
                            <div className="flex items-center gap-2 bg-cm-bg/50 px-3 py-1.5 rounded-xl border border-cm-border/20">
                              <MapPin className="w-4 h-4 text-cm-accent/60" />
                              <span className="text-xl lg:text-2xl font-black text-cm-text tabular-nums">
                                {order.tableNumber || order.mesa}
                              </span>
                            </div>
                          ) : null}
                          <span className="text-xl lg:text-2xl font-bold text-cm-text truncate">
                            {order.customerName || 'Cliente'}
                          </span>
                        </div>

                        {/* Items */}
                        {order.items && order.items.length > 0 && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                            {order.items.slice(0, 5).map((item, i) => (
                              <span key={i} className="text-sm text-cm-muted font-medium">
                                <span className="font-bold text-cm-text/80">{item.quantity || 1}x</span> {item.name}
                              </span>
                            ))}
                            {order.items.length > 5 && (
                              <span className="text-sm text-cm-muted/40 font-bold">
                                +{order.items.length - 5} más
                              </span>
                            )}
                          </div>
                        )}

                        {/* Progress bar */}
                        <div className="h-1.5 bg-cm-muted/10 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${barColor(order.createdAt)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(pct * 100).toFixed(0)}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-cm-border/20 to-transparent self-stretch mx-0" />

        {/* ══════ LISTOS ══════ */}
        <div className="flex-1 flex flex-col min-h-0 p-6 lg:p-8 xl:p-10 overflow-hidden">
          <motion.div variants={iv} className="flex items-center gap-3 mb-5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-cm-success/10 flex items-center justify-center border border-cm-success/20">
              <CheckCircle2 className="w-4 h-4 text-cm-success" />
            </div>
            <h2 className="text-xl font-black text-cm-text tracking-tight">Listos para Recoger</h2>
            <span className="text-sm font-bold bg-cm-success/10 text-cm-success px-2.5 py-0.5 rounded-full tabular-nums border border-cm-success/20">
              <AnimCounter value={listos.length} />
            </span>
          </motion.div>

          <div
            ref={listoRef}
            className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide snap-y snap-mandatory"
          >
            <AnimatePresence mode="popLayout">
              {listos.length === 0 ? (
                <motion.div key="empty-listo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center justify-center h-full text-cm-muted/20 text-sm font-bold tracking-widest uppercase">
                  Sin pedidos
                </motion.div>
              ) : (
                listos.map(order => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    className="snap-start rounded-2xl border-2 border-cm-success/25 bg-cm-success/[0.04] transition-all hover:border-cm-success/40 hover:shadow-cm-md hover:shadow-cm-success/5"
                  >
                    <div className="p-5 lg:p-6">
                      {/* Row 1: ID + Mesa */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-4xl lg:text-5xl font-black text-cm-text tabular-nums tracking-tight">
                            #{shortId(order.id)}
                          </span>
                          <span className="px-3 py-1 bg-cm-success text-white text-xs font-black rounded-full uppercase tracking-widest shadow-lg shadow-cm-success/20">
                            Listo
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <CheckCircle2 className="w-6 h-6 text-cm-success" />
                        </div>
                      </div>

                      {/* Row 2: Mesa + Customer */}
                      <div className="flex items-center gap-4 mb-3">
                        {order.tableNumber || order.mesa ? (
                          <div className="flex items-center gap-2 bg-cm-success/5 px-3 py-1.5 rounded-xl border border-cm-success/15">
                            <MapPin className="w-4 h-4 text-cm-success/60" />
                            <span className="text-2xl lg:text-3xl font-black text-cm-text tabular-nums">
                              {order.tableNumber || order.mesa}
                            </span>
                          </div>
                        ) : null}
                        <span className="text-2xl lg:text-3xl font-bold text-cm-text truncate">
                          {order.customerName || 'Cliente'}
                        </span>
                      </div>

                      {/* Items */}
                      {order.items && order.items.length > 0 && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                          {order.items.slice(0, 5).map((item, i) => (
                            <span key={i} className="text-base text-cm-muted font-medium">
                              <span className="font-bold text-cm-text/80">{item.quantity || 1}x</span> {item.name}
                            </span>
                          ))}
                          {order.items.length > 5 && (
                            <span className="text-base text-cm-muted/40 font-bold">
                              +{order.items.length - 5} más
                            </span>
                          )}
                        </div>
                      )}

                      {/* Ready since */}
                      <div className="flex items-center gap-3 pt-1 border-t border-cm-success/10">
                        <span className="text-[11px] font-bold text-cm-muted/40 uppercase tracking-widest">Listo desde</span>
                        <span className="text-base font-bold text-cm-text tabular-nums">
                          {order.updatedAt
                            ? new Date(order.updatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </span>
                        <span className="text-sm text-cm-muted/40 ml-auto tabular-nums">
                          {formatTime(order.updatedAt || order.createdAt)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
