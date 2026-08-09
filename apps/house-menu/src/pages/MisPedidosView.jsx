import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES, rastreoRoute } from '../lib/routes';
import { Mail, Search, Clock, ShoppingBag, Store, FileDown, Navigation, RefreshCw, ArrowLeft, Loader2, Calendar, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@house/store';
import { findCustomerAndOrders } from '../lib/customerService';

// ── AnimCounter ──────────────────────────────────────
function AnimCounter({ value, duration = 500 }) {
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

const cv = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const iv = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } } };

function SkeletonBlock({ className = '' }) {
  return <div className={`bg-cm-border rounded-lg animate-pulse ${className}`} />;
}

const STATUS_LABELS = {
  recibido: { label: 'Recibido', class: 'bg-blue-500/10 text-blue-500' },
  preparando: { label: 'Preparando', class: 'bg-amber-500/10 text-amber-500' },
  listo: { label: 'Listo', class: 'bg-emerald-500/10 text-emerald-500' },
  en_camino: { label: 'En camino', class: 'bg-purple-500/10 text-purple-500' },
      entregado: { label: 'Entregado', class: 'bg-cm-bg-alt text-cm-text-secondary' },
  cancelado: { label: 'Cancelado', class: 'bg-red-500/10 text-red-500' },
};

function formatCurrency(n) { return 'S/ ' + (n ?? 0).toFixed(2); }

function OrderCard({ order, onReorder, onTrack }) {
  const status = STATUS_LABELS[order.status] || STATUS_LABELS.recibido;
  const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : '—';
  const total = order.financials?.total ?? order.items?.reduce((s, i) => s + (i.price || 0), 0) ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-cm-surface rounded-xl border border-cm-border space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.class}`}>
            {status.label}
          </span>
          <span className="text-[10px] text-cm-text-tertiary font-mono">
            #{order.id?.slice(-6).toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-cm-text-tertiary">
          <Store className="w-3 h-3" />
          <span>{order.branchName || order.branchId?.slice(0, 8)}</span>
        </div>
      </div>

      {/* Date & time */}
      <div className="flex items-center gap-1.5 text-xs text-cm-text-secondary">
        <Calendar className="w-3.5 h-3.5" />
        <span>{date}</span>
      </div>

      {/* Items summary */}
      <div>
        <p className="text-xs font-bold text-cm-text mb-1">
          {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
        </p>
        <div className="flex flex-wrap gap-1">
          {order.items?.slice(0, 5).map((item, i) => (
            <span key={i} className="text-[10px] bg-cm-bg-alt px-1.5 py-0.5 rounded text-cm-text-secondary">
              {item.name}
            </span>
          ))}
          {order.items?.length > 5 && (
            <span className="text-[10px] text-cm-text-tertiary">+{order.items.length - 5} más</span>
          )}
        </div>
      </div>

      {/* Total */}
      <div className="flex items-center justify-between pt-1 border-t border-cm-border/50">
        <span className="text-xs text-cm-text-secondary">Total</span>
        <span className="text-sm font-black text-cm-accent">{formatCurrency(total)}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {order.status !== 'cancelado' && (
          <button
            onClick={() => onTrack(order)}
            className="flex items-center gap-1 px-3 py-1.5 bg-cm-accent/10 hover:bg-cm-accent text-cm-accent hover:text-white rounded-lg text-xs font-bold transition-all"
          >
            <Navigation className="w-3.5 h-3.5" />
            Rastrear
          </button>
        )}
        {order.items?.length > 0 && (
          <button
            onClick={() => onReorder(order)}
            className="flex items-center gap-1 px-3 py-1.5 bg-cm-surface border border-cm-border hover:border-cm-accent/30 text-cm-text-secondary hover:text-cm-accent rounded-lg text-xs font-bold transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-ordenar
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function MisPedidosView() {
  const navigate = useNavigate();
  const clearCart = useAppStore(s => s.clearCart);
  const addToCart = useAppStore(s => s.addToCart);
  const [email, setEmail] = useState(() => localStorage.getItem('cm_customer_email') || '');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!email?.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const result = await findCustomerAndOrders(email.trim());
      setData(result);
      if (!result.customer) {
        setError('No encontramos un cliente registrado con ese email. Probá con el email que usaste al hacer tu pedido.');
      }
    } catch (err) {
      setError('Error al buscar tus pedidos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = (order) => {
    if (!order.items?.length) return;
    clearCart();
    order.items.forEach(item => {
      addToCart({
        productId: item.productId || item.id,
        name: item.name,
        price: item.price || 0,
        quantity: item.quantity || 1,
        details: item.details || [],
        categoryId: item.categoryId || '',
      });
    });
    navigate(ROUTES.CARTA);
  };

  const handleTrack = (order) => {
    navigate(rastreoRoute(order.id, order.branchId));
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-cm-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-cm-bg/80 backdrop-blur-xl border-b border-cm-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-cm-surface transition-colors">
            <ArrowLeft className="w-5 h-5 text-cm-text" />
          </button>
          <div>
            <h1 className="text-sm font-black text-cm-text tracking-wider">Mis Pedidos</h1>
            <p className="text-[10px] text-cm-text-tertiary">Historial de tus pedidos</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Search form */}
        <form onSubmit={handleSearch} className="space-y-2">
          <label className="text-xs font-bold text-cm-text-secondary block">
            Ingresá tu email para ver tus pedidos
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full pl-9 pr-3 py-2.5 bg-cm-surface border border-cm-border rounded-xl text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="px-4 py-2.5 bg-cm-accent text-white rounded-xl text-xs font-bold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-cm-error/10 border border-cm-error/30 rounded-xl p-4">
            <AlertTriangle className="w-4 h-4 text-cm-error shrink-0 mt-0.5" />
            <p className="text-xs text-cm-error font-semibold">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <motion.div variants={cv} initial="hidden" animate="show" className="space-y-3">
            <motion.div variants={iv} className="bg-cm-surface rounded-xl border border-cm-border p-4 space-y-2">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-3 w-44" />
                </div>
                <div className="space-y-2 text-right">
                  <SkeletonBlock className="h-4 w-20 ml-auto" />
                  <SkeletonBlock className="h-3 w-14 ml-auto" />
                </div>
              </div>
            </motion.div>
            {[1,2,3].map((i) => (
              <motion.div key={i} variants={iv} className="bg-cm-surface rounded-xl border border-cm-border p-4 space-y-3">
                <div className="flex justify-between">
                  <SkeletonBlock className="h-4 w-24" />
                  <SkeletonBlock className="h-4 w-20" />
                </div>
                <SkeletonBlock className="h-3 w-36" />
                <div className="flex gap-1">
                  {[1,2].map(j => <SkeletonBlock key={j} className="h-5 w-16" />)}
                </div>
                <div className="flex justify-between pt-1 border-t border-cm-border/50">
                  <SkeletonBlock className="h-3 w-10" />
                  <SkeletonBlock className="h-4 w-16" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Results */}
        {data && !loading && (
          <motion.div variants={cv} initial="hidden" animate="show" className="space-y-4">
            {/* Customer info */}
            {data.customer && (
              <motion.div variants={iv}
                className="bg-cm-surface rounded-xl border border-cm-border p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-cm-text">
                      {data.customer.name || 'Cliente'}
                    </p>
                    <p className="text-xs text-cm-text-secondary">{data.customer.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-cm-accent tabular-nums">
                      <AnimCounter value={data.orders.length} /> pedido{data.orders.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-[10px] text-cm-text-tertiary">
                      {data.customer.points || 0} puntos
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Order list */}
            {data.orders.length > 0 ? (
              <div className="space-y-3">
                <motion.h3 variants={iv}
                  className="text-xs font-bold text-cm-text uppercase tracking-wider">
                  Historial de pedidos
                </motion.h3>
                <AnimatePresence mode="popLayout">
                {data.orders.map(order => (
                  <motion.div key={`${order.branchId}-${order.id}`} layout
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
                    <OrderCard
                      order={order}
                      onReorder={handleReorder}
                      onTrack={handleTrack}
                    />
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
            ) : data.customer && (
              <motion.div variants={iv}
                className="text-center py-12 text-cm-text-tertiary">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-semibold">Todavía no tenés pedidos</p>
                <p className="text-xs mt-1">Hacé tu primer pedido desde la carta</p>
                <button
                  onClick={() => navigate(ROUTES.CARTA)}
                  className="mt-4 px-4 py-2 bg-cm-accent text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all"
                >
                  Ver Carta
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Initial state */}
        {!searched && !loading && (
          <div className="text-center py-12 text-cm-text-tertiary">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">Buscá tus pedidos anteriores</p>
            <p className="text-xs mt-1">Ingresá el email que usaste al hacer tu pedido</p>
          </div>
        )}
      </div>
    </div>
  );
}
