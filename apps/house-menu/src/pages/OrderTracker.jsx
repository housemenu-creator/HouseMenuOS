import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowLeft, MapPin, Clock, Receipt, User, Navigation,
  MessageCircle, AlertTriangle, ChevronDown, ChevronRight
} from 'lucide-react';
import { ordersService } from '../lib/ordersService';
import { ref, get } from 'firebase/database';
import { realtimeDB as db, getSessionId } from '@house/db';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { slugRoute, ROUTES } from '../lib/routes';
import OrderTimeline, { STATUS_STEPS } from '../components/OrderTimeline';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (hrs < 24) return remaining > 0 ? `hace ${hrs}h ${remaining}min` : `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

const PAYMENT_STATUS = {
  pagado:        { label: 'Pagado',        cls: 'bg-green-400/20 text-green-300' },
  pendiente:     { label: 'Pendiente',     cls: 'bg-yellow-400/20 text-yellow-300' },
  por_verificar: { label: 'Por verificar', cls: 'bg-cm-accent/20 text-cm-accent' },
  reembolsado:   { label: 'Reembolsado',   cls: 'bg-orange-400/20 text-orange-300' },
};

export default function OrderTracker() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { slug } = useTenant();
  const urlId = searchParams.get('id') || '';
  const urlBranch = searchParams.get('branch') || 'monteverde';

  const [query, setQuery] = useState(urlId ? urlId.slice(-4).toUpperCase() : '');
  const [orderData, setOrderData] = useState(null);
  const [foundId, setFoundId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [driverData, setDriverData] = useState(null);
  const [sessionOrders, setSessionOrders] = useState([]);
  const [sessionOrdersLoading, setSessionOrdersLoading] = useState(true);
  const [sessionOrdersOpen, setSessionOrdersOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  const unsubRef = useRef(null);

  // Tick cada 30s para actualizar timeAgo
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Fetch branch config (WhatsApp number)
  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const branchRef = ref(db, `branches_config/${urlBranch}`);
        const snap = await get(branchRef);
        if (snap.exists()) {
          const data = snap.val();
          setWhatsappNumber(data.whatsappNumber || data.phone || '');
        }
      } catch { /* fallback */ }
    };
    fetchBranch();
  }, [urlBranch]);

  // Fetch orders from this session (Mis pedidos)
  useEffect(() => {
    let cancelled = false;
    const fetchSessionOrders = async () => {
      try {
        const sid = getSessionId();
        if (!sid) { setSessionOrdersLoading(false); return; }
        const idxRef = ref(db, `branches/${urlBranch}/orders_by_session/${sid}`);
        const idxSnap = await get(idxRef);
        if (!idxSnap.exists()) { setSessionOrdersLoading(false); return; }
        const orderKeys = Object.keys(idxSnap.val());
        const orders = await Promise.all(
          orderKeys.map(async (key) => {
            const orderRef = ref(db, `branches/${urlBranch}/orders/${key}`);
            const snap = await get(orderRef);
            return snap.exists() ? { id: key, ...snap.val() } : null;
          })
        );
        if (!cancelled) {
          const validOrders = orders.filter(Boolean).sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta; // newest first
          });
          setSessionOrders(validOrders);
          if (validOrders.length > 0) setSessionOrdersOpen(true);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setSessionOrdersLoading(false);
      }
    };
    fetchSessionOrders();
    return () => { cancelled = true; };
  }, [urlBranch]);

  // Fetch driver details when driverId changes
  useEffect(() => {
    if (!orderData?.driverId) { setDriverData(null); return; }
    let cancelled = false;
    const fetchDriver = async () => {
      try {
        const driverRef = ref(db, `branches/${urlBranch}/delivery/drivers/${orderData.driverId}`);
        const snap = await get(driverRef);
        if (!cancelled && snap.exists()) setDriverData(snap.val());
      } catch { /* fallback */ }
    };
    fetchDriver();
    return () => { cancelled = true; };
  }, [orderData?.driverId, urlBranch]);

  const subscribeToFoundOrderByBranch = useCallback((branchId, fullOrderId, normalized) => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    const unsub = ordersService.subscribeToOrder(branchId, fullOrderId, (order) => {
      setLoading(false);
      if (order) {
        setOrderData(order);
        setError('');
      } else {
        setOrderData(null);
        setError(`No se encontró ningún pedido con el código #${normalized}`);
      }
    });
    unsubRef.current = unsub;
  }, []);

  const subscribeToFoundOrder = useCallback((fullOrderId, normalized) => {
    subscribeToFoundOrderByBranch(urlBranch, fullOrderId, normalized);
  }, [urlBranch, subscribeToFoundOrderByBranch]);

  const performSearch = useCallback(async (shortQuery, fullIdHint = null) => {
    setSearchLoading(true);
    setLoading(true);
    setSearched(true);
    setOrderData(null);
    setError('');

    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    const normalized = shortQuery.toUpperCase().replace('#', '').trim();
    if (!normalized) { setSearchLoading(false); setLoading(false); return; }

    if (fullIdHint && fullIdHint.length > 6) {
      setFoundId(fullIdHint);
      subscribeToFoundOrder(fullIdHint, normalized);
      setSearchLoading(false);
      return;
    }

    try {
      // Search across all branches if not found in the specific one
      let matchKey = null;
      let foundBranch = urlBranch;

      // Try specific branch first
      const ordersRef = ref(db, `branches/${urlBranch || 'monteverde'}/orders`);
      const snap = await get(ordersRef);
      if (snap.exists()) {
        const orders = snap.val();
        matchKey = Object.keys(orders).find(
          k => k.slice(-4).toUpperCase() === normalized
        );
      }

      // If not found, search other known branches individually.
      // AVOID reading /branches root — it downloads catalog, config, orders
      // for ALL branches at once (megabytes). Instead, discover branch IDs
      // from /branches_config (lightweight) and search each orders path.
      if (!matchKey) {
        // Get known branch IDs from /branches_config (lightweight)
        const configSnap = await get(ref(db, 'branches_config'));
        const knownBranches = configSnap.exists() ? Object.keys(configSnap.val()) : [];
        // Include the default branch too, always
        const searchBranches = [...new Set([knownBranches, urlBranch || 'monteverde'].flat())];

        for (const bId of searchBranches) {
          if (bId === foundBranch) continue; // already searched
          const snap = await get(ref(db, `branches/${bId}/orders`));
          if (snap.exists()) {
            const orders = snap.val();
            matchKey = Object.keys(orders).find(
              k => k.slice(-4).toUpperCase() === normalized
            );
            if (matchKey) {
              foundBranch = bId;
              break;
            }
          }
        }
      }

      setSearchLoading(false);
      if (matchKey) {
        setFoundId(matchKey);
        subscribeToFoundOrderByBranch(foundBranch, matchKey, normalized);
      } else {
        setLoading(false);
        setError(`No se encontró ningún pedido con el código #${normalized}`);
      }
    } catch {
      setSearchLoading(false);
      setLoading(false);
      setError('Error de conexión. Intenta de nuevo.');
    }
  }, [urlBranch, subscribeToFoundOrder]);

  useEffect(() => {
    if (urlId) {
      const shortId = urlId.slice(-4).toUpperCase();
      setQuery(shortId);
      performSearch(shortId, urlId);
    }
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [urlId, urlBranch, performSearch]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim().toUpperCase();
    if (!q) return;
    performSearch(q);
    const route = slug ? `/r/${slug}/rastreo?id=${q}&branch=${urlBranch}` : rastreoRoute(q, urlBranch);
    navigate(route, { replace: true });
  };

  const isDelivered = orderData?.status === 'entregado';
  const isOnTheWay = orderData?.status === 'en_camino';
  const payCfg = PAYMENT_STATUS[orderData?.payment_status];
  const driverPosition = driverData?.lastPosition;
  const driverPhone = driverData?.phone;

  const cancelMsg = useMemo(() => {
    if (!orderData) return '';
    const code = orderData.id?.slice(-4).toUpperCase() || '';
    return encodeURIComponent(`Hola, quiero cancelar mi pedido #${code}.`);
  }, [orderData]);

  return (
    <div className="min-h-full w-full flex flex-col items-center px-6 py-12 text-cm-text">
      <div className="w-full max-w-xl space-y-8">

          {/* Back */}
          <button
            onClick={() => navigate(slugRoute(slug, ROUTES.HOME))}
            className="flex items-center gap-2 text-cm-muted hover:text-cm-accent transition-colors text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Menú
          </button>

          {/* Mis pedidos — órdenes vinculadas a esta sesión */}
          {!sessionOrdersLoading && sessionOrders.length > 0 && (
            <div className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border overflow-hidden">
              <button
                onClick={() => setSessionOrdersOpen(!sessionOrdersOpen)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-cm-accent/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-cm-accent" />
                  <span className="font-black text-sm text-cm-text">Mis pedidos</span>
                  <span className="text-[10px] font-bold text-cm-muted bg-cm-bg px-1.5 py-0.5 rounded-full">{sessionOrders.length}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-cm-muted transition-transform ${sessionOrdersOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {sessionOrdersOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-cm-border"
                  >
                    <div className="divide-y divide-cm-border">
                      {sessionOrders.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => {
                            const code = o.id.slice(-4).toUpperCase();
                            const route = slug ? `/r/${slug}/rastreo?id=${code}&branch=${urlBranch}` : rastreoRoute(code, urlBranch);
                            navigate(route, { replace: true });
                            performSearch(code, o.id);
                          }}
                          className="w-full flex items-center justify-between p-3 hover:bg-cm-accent/5 transition-colors text-left"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-cm-text truncate">{o.customerName || 'Pedido'}</p>
                            <p className="text-[10px] text-cm-muted font-bold">
                              {o.createdAt ? timeAgo(o.createdAt) : ''} · S/ {(o.financials?.total ?? o.total ?? 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-black uppercase tracking-wider text-cm-accent">
                              #{o.id.slice(-4).toUpperCase()}
                            </span>
                            <ChevronRight className="w-3 h-3 text-cm-muted" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-cm-accent/10 rounded-2xl flex items-center justify-center mx-auto border-2 border-cm-accent/20">
              <Search className="w-7 h-7 text-cm-accent" />
            </div>
            <h1 className="text-3xl text-cm-text">
              RASTREAR <span className="text-cm-accent">PEDIDO</span>
            </h1>
            <p className="text-sm text-cm-muted font-bold">
              Ingresa los <span className="text-cm-accent font-black">últimos 4 dígitos</span> de tu código
            </p>
          </div>

          {/* Search form — hidden once order is found */}
          {!orderData && (
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-cm-accent text-lg">#</span>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="ej: PDE9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value.replace('#', '').toUpperCase())}
                  className="w-full bg-cm-surface border-2 border-cm-border rounded-xl pl-9 pr-4 py-4 focus:outline-none focus:border-cm-accent text-cm-text text-2xl font-black tracking-[0.3em] text-center transition-colors uppercase"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 flex items-center justify-center gap-2 bg-cm-accent text-white font-black rounded-xl hover:bg-cm-accent-hover transition-colors"
              >
                <Search className="w-5 h-5" /> BUSCAR PEDIDO
              </button>
              <p className="text-xs text-cm-muted text-center font-bold">
                Los 4 caracteres que aparecen en tu pantalla de confirmación
              </p>
            </form>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-10">
              <div className="inline-flex items-center gap-2 text-cm-muted animate-pulse font-bold">
                <Clock className="w-4 h-4" />
                Buscando pedido...
              </div>
            </div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && !loading && searched && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-cm-error/10 border-2 border-cm-error/20 rounded-xl text-center space-y-1"
              >
                <p className="font-black text-cm-error text-sm">Pedido no encontrado</p>
                <p className="text-cm-error/70 text-xs font-bold">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          <AnimatePresence>
            {orderData && !loading && (
              <motion.div
                key={orderData.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* ── Order header card ── */}
                <div
                  className={`rounded-xl shadow-cm-sm border border-cm-border p-5 text-white ${isDelivered ? 'bg-cm-success' : 'bg-cm-accent'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white/60 text-[0.6rem] font-bold uppercase tracking-widest">Pedido de</p>
                      <h2 className="text-xl font-black text-white mt-0.5">{orderData.customerName}</h2>
                      <p className="text-white/70 text-sm font-bold mt-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> {orderData.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-white/60 text-xs bg-white/10 px-2 py-1 rounded font-bold">
                        #{orderData.id.slice(-4).toUpperCase()}
                      </span>
                      <p className="text-white font-black text-xl mt-2">
                        S/ {(orderData.financials?.total ?? orderData.total ?? 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Payment status + Elapsed time */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {payCfg && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${payCfg.cls}`}>
                        {orderData.payment_status === 'pagado' ? '✓' : orderData.payment_status === 'por_verificar' ? '⏳' : orderData.payment_status === 'pendiente' ? '⚠' : '↩'} {payCfg.label}
                      </span>
                    )}
                    {orderData.createdAt && (
                      <span className="text-white/50 text-[10px] font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeAgo(orderData.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* Current status */}
                  <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isDelivered ? 'bg-green-300' : orderData.status === 'pendiente_pago' ? 'bg-yellow-300' : 'bg-yellow-300 animate-pulse'}`} />
                      <span className="text-white font-black text-sm uppercase tracking-wide">
                        {orderData.status === 'pendiente_pago'
                          ? 'PAGO PENDIENTE'
                          : STATUS_STEPS.find(s => s.key === orderData.status)?.title ?? orderData.status}
                      </span>
                    </div>
                    {orderData.updatedAt && (
                      <span className="text-white/50 text-[0.6rem] font-bold">
                        {new Date(orderData.updatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Pending payment banner ── */}
                {orderData.status === 'pendiente_pago' && (
                  <div className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-accent/30 border-l-4 border-cm-accent p-5">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💳</span>
                      <div>
                        <p className="font-black text-cm-text text-sm">Pago por verificar</p>
                        <p className="text-xs text-cm-muted font-bold mt-1 leading-relaxed">
                          Tu pago con Yape/Plin está pendiente de verificación. 
                          El local confirmará el pago en breve y tu pedido pasará a la cocina.
                          Te notificaremos cuando esté aprobado.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <OrderTimeline currentStatus={orderData.status} />

                {/* ── Driver info ── */}
                {orderData.driverName && (
                  <div className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border p-5 border-l-4 border-cm-info">
                    <p className="text-[0.6rem] font-bold text-cm-muted uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Repartidor asignado
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cm-info/20 rounded-full flex items-center justify-center border-2 border-cm-info/30 shrink-0">
                        <User className="w-5 h-5 text-cm-info" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-cm-text">{orderData.driverName}</p>
                        <p className="text-xs text-cm-info font-bold flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          {isOnTheWay ? 'En camino hacia ti' : 'Asignado a tu pedido'}
                        </p>
                      </div>
                    </div>

                    {/* Driver actions row */}
                    <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-cm-border">
                      {driverPosition?.latitude && driverPosition?.longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${driverPosition.latitude},${driverPosition.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-accent/10 text-cm-accent text-xs font-bold rounded-xl hover:bg-cm-accent/20 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" /> Ver en mapa
                        </a>
                      )}
                      {driverPhone && (
                        <a
                          href={`https://wa.me/${driverPhone.replace(/^\+/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-600 text-xs font-bold rounded-xl hover:bg-green-500/20 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Contactar repartidor
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Items + Observaciones ── */}
                {orderData.items?.length > 0 && (
                  <div className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border p-5">
                    <p className="text-[0.6rem] font-bold text-cm-muted uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5" /> Tu pedido
                    </p>
                    <ul className="space-y-2">
                      {orderData.items.map((item, i) => (
                        <li key={i} className="flex justify-between items-start text-sm">
                          <div>
                            <span className="font-bold text-cm-text">{item.name}</span>
                            {item.details?.length > 0 && (
                              <span className="block text-xs text-cm-muted">{item.details.join(', ')}</span>
                            )}
                          </div>
                          {item.price != null && (
                            <span className="font-bold text-cm-accent shrink-0 ml-3">S/ {Number(item.price).toFixed(2)}</span>
                          )}
                        </li>
                      ))}
                    </ul>

                    {/* Observaciones del cliente */}
                    {orderData.observaciones && (
                      <div className="mt-3 pt-3 border-t border-cm-border">
                        <p className="text-[10px] font-bold text-cm-muted uppercase tracking-wider mb-1">Observaciones</p>
                        <p className="text-sm text-cm-text italic">&ldquo;{orderData.observaciones}&rdquo;</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Support + Cancel actions ── */}
                {!isDelivered && (
                  <div className="space-y-2">
                    <div className="bg-cm-surface rounded-xl border border-cm-border p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-cm-text">¿Necesitas ayuda?</p>
                        <p className="text-[10px] text-cm-muted font-bold">Contacta al restaurante si hay algún problema</p>
                      </div>
                      <a
                        href={`https://wa.me/${whatsappNumber ? whatsappNumber.replace(/^\+/, '') : ''}?text=${cancelMsg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white text-xs font-black rounded-xl hover:bg-green-600 transition-colors shrink-0"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    </div>

                    {/* Cancel request */}
                    {orderData.status !== 'cancelado' && (
                      <a
                        href={`https://wa.me/${whatsappNumber ? whatsappNumber.replace(/^\+/, '') : ''}?text=${cancelMsg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-cm-error/5 border-2 border-cm-error/20 text-cm-error text-xs font-black rounded-xl hover:bg-cm-error/10 transition-colors"
                      >
                        <AlertTriangle className="w-4 h-4" /> Solicitar cancelación del pedido
                      </a>
                    )}
                  </div>
                )}

                {/* ── Delivered celebration ── */}
                {isDelivered && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-6 space-y-2"
                  >
                    <p className="text-3xl">🎉</p>
                    <p className="font-black text-cm-success text-lg">¡Buen provecho!</p>
                    <button
                      onClick={() => navigate(slugRoute(slug, ROUTES.HOME))}
                      className="mt-2 px-6 py-2.5 bg-cm-accent text-white font-bold rounded-xl text-sm hover:bg-cm-accent/90 transition-colors"
                    >
                      Hacer otro pedido
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

      </div>
    </div>
  );
}
