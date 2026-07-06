import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES, rastreoRoute, slugRoute } from '../lib/routes';
import { useCustomerAuth, getTierInfo, getNextTier } from '../context/CustomerAuthContext';
import { useTenant } from '../context/TenantContext';
import { subscribeActivePromotions } from '../lib/customerPromoService';
import {
  ArrowLeft, User, Mail, Phone, LogOut, Settings, Gift, History,
  Medal, Copy, Check, ShoppingBag, Store, Calendar, Navigation,
  RefreshCw, Loader2, ChevronRight, Star, TrendingUp, Award,
  Sparkles, Package, Clock, AlertTriangle, ExternalLink, BadgePercent, Zap,
  Cake, Flame,
} from 'lucide-react';
import { ref, onValue, update } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { useAppStore } from '@house/store';

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
      <div className="flex items-center gap-1.5 text-xs text-cm-text-secondary">
        <Calendar className="w-3.5 h-3.5" />
        <span>{date}</span>
      </div>
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
      <div className="flex items-center justify-between pt-1 border-t border-cm-border/50">
        <span className="text-xs text-cm-text-secondary">Total</span>
        <span className="text-sm font-black text-cm-accent">{formatCurrency(total)}</span>
      </div>
      <div className="flex items-center gap-2 pt-1">
        {order.status !== 'cancelado' && (
          <button onClick={() => onTrack(order)}
            className="flex items-center gap-1 px-3 py-1.5 bg-cm-accent/10 hover:bg-cm-accent text-cm-accent hover:text-white rounded-lg text-xs font-bold transition-all">
            <Navigation className="w-3.5 h-3.5" /> Rastrear
          </button>
        )}
        {order.items?.length > 0 && (
          <button onClick={() => onReorder(order)}
            className="flex items-center gap-1 px-3 py-1.5 bg-cm-surface border border-cm-border hover:border-cm-accent/30 text-cm-text-secondary hover:text-cm-accent rounded-lg text-xs font-bold transition-all">
            <RefreshCw className="w-3.5 h-3.5" /> Re-ordenar
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function CustomerProfileView() {
  const navigate = useNavigate();
  const { slug } = useTenant();
  const { isAuthenticated, isLoading: authLoading, customerProfile, points, tier, tierInfo, nextTier, nextTierInfo, progressToNext, logout, firebaseUser } = useCustomerAuth();
  const clearCart = useAppStore(s => s.clearCart);
  const addToCart = useAppStore(s => s.addToCart);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [birthDate, setBirthDate] = useState('');
  const [birthSaving, setBirthSaving] = useState(false);
  const [birthSaved, setBirthSaved] = useState(false);

  const referralCode = useMemo(() => {
    if (!customerProfile?.id) return '';
    const short = customerProfile.id.slice(0, 6).toUpperCase();
    return `HOUSE-${short}`;
  }, [customerProfile]);

  // ── Load orders from all branches ──
  useEffect(() => {
    if (!customerProfile?.email) { setOrdersLoading(false); return; }

    const branchesRef = ref(db, 'branches');
    const unsub = onValue(branchesRef, (snap) => {
      const branches = snap.val();
      if (!branches) { setOrders([]); setOrdersLoading(false); return; }

      const allOrders = [];
      let pending = Object.keys(branches).length;
      if (pending === 0) { setOrders([]); setOrdersLoading(false); return; }

      Object.entries(branches).forEach(([branchId, branchData]) => {
        const branchName = branchData.name || branchId;
        const ordersRef = ref(db, `branches/${branchId}/orders`);
        onValue(ordersRef, (oSnap) => {
          const branchOrders = oSnap.val();
          if (branchOrders) {
            Object.entries(branchOrders).forEach(([orderId, order]) => {
              if (order.customerEmail?.toLowerCase() === customerProfile.email.toLowerCase()) {
                allOrders.push({ ...order, id: orderId, branchId, branchName });
              }
            });
          }
          pending--;
          if (pending <= 0) {
            allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setOrders(allOrders);
            setOrdersLoading(false);
          }
        }, { onlyOnce: true });
      });
    }, { onlyOnce: true });

    return () => unsub?.();
  }, [customerProfile?.email]);

  const handleCopyCode = () => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}${slugRoute(slug, ROUTES.CARTA)}?ref=${referralCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Subscribe to promotions ──
  useEffect(() => {
    if (!tier) return;
    const unsub = subscribeActivePromotions(tier, setPromotions);
    return unsub;
  }, [tier]);

  // ── Init birthDate from profile ──
  useEffect(() => {
    if (customerProfile?.birthDate) {
      setBirthDate(customerProfile.birthDate);
    }
  }, [customerProfile?.birthDate]);

  const handleSaveBirthDate = async () => {
    if (!firebaseUser?.uid || !birthDate) return;
    setBirthSaving(true);
    try {
      await update(ref(db, `customers/${firebaseUser.uid}`), { birthDate });
      setBirthSaved(true);
      setTimeout(() => setBirthSaved(false), 2000);
    } catch (err) {
      console.error('Error saving birth date:', err);
    }
    setBirthSaving(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate(slugRoute(slug, ROUTES.HOME));
  };

  const handleTrack = (order) => {
    navigate(rastreoRoute(order.id, order.branchId));
  };

  const handleReorder = (order) => {
    if (!order.items?.length) return;
    clearCart?.();
    order.items.forEach(item => {
      addToCart?.({
        productId: item.productId || item.id,
        name: item.name,
        price: item.price || 0,
        quantity: item.quantity || 1,
        details: item.details || [],
        categoryId: item.categoryId || '',
      });
    });
    navigate(slugRoute(slug, ROUTES.CARTA));
  };

  // ── Redirect if not authenticated ──
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-cm-bg flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-cm-accent/10 rounded-2xl flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-cm-accent" />
        </div>
        <h2 className="text-lg font-black text-cm-text mb-2">Iniciá sesión para ver tu perfil</h2>
        <p className="text-sm text-cm-muted text-center mb-6 max-w-xs">
          Creá una cuenta para acumular puntos, acceder a promos y ver tu historial.
        </p>
        <button
          onClick={() => navigate(slugRoute(slug, ROUTES.LOGIN))}
          className="px-6 py-3 bg-cm-accent text-white rounded-xl text-sm font-bold"
        >
          Iniciar Sesión
        </button>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
      </div>
    );
  }

  const pointsToNext = nextTierInfo ? nextTierInfo.minSpent - (customerProfile?.totalSpent || 0) : 0;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-cm-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-cm-bg/80 backdrop-blur-xl border-b border-cm-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(slugRoute(slug, ROUTES.HOME))} className="p-1.5 -ml-1.5 rounded-lg hover:bg-cm-surface transition-colors">
              <ArrowLeft className="w-5 h-5 text-cm-text" />
            </button>
            <div>
              <h1 className="text-sm font-black text-cm-text tracking-wider">Mi Cuenta</h1>
              <p className="text-[10px] text-cm-text-tertiary">Tus puntos, pedidos y beneficios</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-cm-surface text-cm-text-secondary hover:text-red-400 transition-all" title="Cerrar sesión">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* ── Points + Tier Hero Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-cm-surface to-cm-bg-alt border border-cm-border rounded-3xl p-6 shadow-cm-md overflow-hidden relative"
        >
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10"
            style={{ backgroundColor: tierInfo.color }} />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full opacity-10"
            style={{ backgroundColor: tierInfo.color }} />

          <div className="flex items-start justify-between relative">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Medal className="w-4 h-4" style={{ color: tierInfo.color }} />
                <span className="text-xs font-black uppercase tracking-widest"
                  style={{ color: tierInfo.color }}>
                  {tierInfo.label}
                </span>
              </div>
              <p className="text-4xl font-black text-cm-text tracking-tight">{points}</p>
              <p className="text-xs text-cm-muted font-semibold mt-0.5">puntos disponibles</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-cm-text tracking-tight">
                {formatCurrency(customerProfile?.totalSpent || 0)}
              </p>
              <p className="text-[10px] text-cm-muted font-semibold">gastado</p>
            </div>
          </div>

          {/* Tier progress */}
          {nextTierInfo && (
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-cm-text-secondary">Próximo nivel: {nextTierInfo.label}</span>
                <span className="text-cm-text-secondary">
                  Faltan {formatCurrency(pointsToNext)}
                </span>
              </div>
              <div className="h-2 bg-cm-bg rounded-full overflow-hidden border border-cm-border/30">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, progressToNext)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: tierInfo.color }}
                />
              </div>
              <p className="text-[10px] text-cm-muted text-center">
                Gastá {formatCurrency(pointsToNext)} más para llegar a {nextTierInfo.label}
                {' · '} {nextTierInfo.multiplier}x puntos
              </p>
            </div>
          )}
        </motion.div>

        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: ShoppingBag, label: 'Pedidos', value: customerProfile?.orderCount || 0 },
            { icon: Gift, label: 'Puntos Ganados', value: customerProfile?.lifetimePoints || 0 },
            { icon: TrendingUp, label: 'Ticket Prom.', value: formatCurrency(customerProfile?.avgTicket || 0) },
          ].map((stat) => (
            <div key={stat.label} className="bg-cm-surface border border-cm-border rounded-2xl p-4 text-center">
              <stat.icon className="w-4 h-4 text-cm-accent mx-auto mb-1.5" />
              <p className="text-lg font-black text-cm-text">{stat.value}</p>
              <p className="text-[9px] font-bold text-cm-muted uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate(slugRoute(slug, ROUTES.MIS_PEDIDOS))}
            className="flex items-center gap-3 p-4 bg-cm-surface border border-cm-border rounded-2xl hover:border-cm-accent/30 transition-all group text-left">
            <div className="p-2.5 rounded-xl bg-cm-accent/10 text-cm-accent group-hover:bg-cm-accent group-hover:text-white transition-colors">
              <History className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-cm-text">Historial</p>
              <p className="text-[9px] text-cm-muted mt-0.5">Ver pedidos</p>
            </div>
            <ChevronRight className="w-4 h-4 text-cm-text-secondary shrink-0" />
          </button>

          <button
            className="flex items-center gap-3 p-4 bg-cm-surface border border-cm-border rounded-2xl hover:border-cm-accent/30 transition-all group text-left opacity-60"
            disabled
            title="Próximamente">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Gift className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-cm-text">Canjear</p>
              <p className="text-[9px] text-cm-muted mt-0.5">Usar puntos</p>
            </div>
            <ChevronRight className="w-4 h-4 text-cm-text-secondary shrink-0" />
          </button>
        </div>

        {/* ── Referral ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-cm-surface to-cm-bg-alt border border-cm-border rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cm-accent" />
            <h3 className="text-xs font-black text-cm-text uppercase tracking-wider">Invitá y ganá puntos</h3>
          </div>
          <p className="text-xs text-cm-muted">
            Compartí tu código con amigos. Cuando hagan su primer pedido, ambos ganan puntos extra.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-cm-bg border border-cm-border rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-cm-accent tracking-wider">
              {referralCode}
            </div>
            <button
              onClick={handleCopyCode}
              className="p-2.5 bg-cm-accent/10 hover:bg-cm-accent text-cm-accent hover:text-white rounded-xl transition-all"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          {(customerProfile?.referralsCount > 0 || customerProfile?.referralBonusEarned > 0) && (
            <div className="flex gap-4 pt-1">
              <div className="flex-1 text-center">
                <p className="text-lg font-black text-cm-text">{customerProfile.referralsCount}</p>
                <p className="text-[9px] text-cm-muted uppercase tracking-wider">Referidos</p>
              </div>
              <div className="w-px bg-cm-border self-stretch" />
              <div className="flex-1 text-center">
                <p className="text-lg font-black text-cm-text">{customerProfile.referralBonusEarned}</p>
                <p className="text-[9px] text-cm-muted uppercase tracking-wider">Pts ganados</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Promotions ── */}
        {promotions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 px-1">
              <BadgePercent className="w-3.5 h-3.5 text-cm-accent" />
              <h3 className="text-xs font-black text-cm-text uppercase tracking-wider">Promos activas</h3>
            </div>
            {promotions.map((p) => (
              <div key={p.id} className="bg-gradient-to-r from-cm-accent/5 to-cm-surface border border-cm-accent/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cm-accent/10 text-cm-accent shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-cm-text">{p.title}</p>
                    <p className="text-xs text-cm-muted mt-0.5">{p.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold text-cm-accent bg-cm-accent/10 px-2 py-0.5 rounded-full">
                        {p.type === 'bonus_points' ? `+${p.value} pts` : p.type === 'discount_percent' ? `${p.value}% OFF` : p.value}
                      </span>
                      <span className="text-[10px] text-cm-muted">
                        {p.terms || ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Gamification Stats ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cm-surface border border-cm-border rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-cm-accent" />
            <h3 className="text-xs font-black text-cm-text uppercase tracking-wider">Logros</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-black text-cm-text">{customerProfile?.currentStreak || 0}</p>
              <p className="text-[9px] text-cm-muted uppercase tracking-wider">Racha actual</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-cm-text">{customerProfile?.bestStreak || 0}</p>
              <p className="text-[9px] text-cm-muted uppercase tracking-wider">Mejor racha</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-cm-text">{customerProfile?.welcomeBonusAwarded ? '✅' : '—'}</p>
              <p className="text-[9px] text-cm-muted uppercase tracking-wider">Bienvenida</p>
            </div>
          </div>
        </motion.div>

        {/* ── Birthday ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cm-surface border border-cm-border rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Cake className="w-4 h-4 text-cm-accent" />
            <h3 className="text-xs font-black text-cm-text uppercase tracking-wider">Cumpleaños</h3>
          </div>
          <p className="text-xs text-cm-muted">
            Registrá tu fecha de cumpleaños y recibí <strong className="text-cm-accent">100 pts</strong> de regalo cada año.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="flex-1 px-3 py-2 bg-cm-bg border border-cm-border rounded-xl text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
            />
            <button
              onClick={handleSaveBirthDate}
              disabled={birthSaving || !birthDate}
              className="px-4 py-2 bg-cm-accent text-white text-xs font-bold rounded-xl hover:bg-cm-accent-hover transition-colors disabled:opacity-50"
            >
              {birthSaving ? '...' : birthSaved ? '✅' : 'Guardar'}
            </button>
          </div>
          {customerProfile?.lastBirthdayBonusAwarded && (
            <p className="text-[10px] text-cm-muted">
              🎂 Bonus de cumpleaños recibido en {customerProfile.lastBirthdayBonusAwarded}
            </p>
          )}
        </motion.div>

        {/* ── Profile Info ── */}
        <div className="bg-cm-surface border border-cm-border rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-black text-cm-text uppercase tracking-wider flex items-center gap-2">
            <User className="w-3.5 h-3.5" /> Tus datos
          </h3>
          <div className="space-y-3">
            {customerProfile?.name && (
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-cm-text-secondary shrink-0" />
                <span className="text-sm font-semibold text-cm-text">{customerProfile.name}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-cm-text-secondary shrink-0" />
              <span className="text-sm font-medium text-cm-text-secondary">{firebaseUser?.email || customerProfile?.email}</span>
            </div>
            {customerProfile?.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-cm-text-secondary shrink-0" />
                <span className="text-sm font-medium text-cm-text-secondary">{customerProfile.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Orders ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-cm-text uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Pedidos recientes
            </h3>
            {orders.length > 0 && (
              <button onClick={() => navigate(slugRoute(slug, ROUTES.MIS_PEDIDOS))}
                className="text-[10px] font-bold text-cm-accent hover:underline">
                Ver todos
              </button>
            )}
          </div>

          {ordersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-cm-accent animate-spin" />
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-3">
              {orders.slice(0, 5).map(order => (
                <OrderCard key={`${order.branchId}-${order.id}`} order={order} onReorder={handleReorder} onTrack={handleTrack} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-cm-text-tertiary">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">Todavía no tenés pedidos</p>
              <button
                onClick={() => navigate(slugRoute(slug, ROUTES.CARTA))}
                className="mt-3 px-4 py-2 bg-cm-accent text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all"
              >
                Hacé tu primer pedido
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
