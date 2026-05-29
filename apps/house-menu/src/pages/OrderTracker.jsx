import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChefHat, PackageCheck, Search, ArrowLeft, Truck, MapPin, Clock, Receipt, User, Phone, Navigation, MessageCircle } from 'lucide-react';
import { ordersService } from '../lib/ordersService';
import { ref, get } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { useNavigate, useSearchParams } from 'react-router-dom';
import HouseMenuNav from '../components/HouseMenuNav';

const STATUS_STEPS = [
  { key: 'recibido',   step: 1, title: 'Recibido',   desc: 'Tu pedido ingresó al sistema.',         icon: CheckCircle2 },
  { key: 'preparando', step: 2, title: 'Preparando', desc: 'La cocina está armando tu platillo.',   icon: ChefHat      },
  { key: 'listo',      step: 3, title: 'Listo',      desc: 'Esperando a tu repartidor.',            icon: PackageCheck },
  { key: 'en_camino',  step: 4, title: 'En Camino',  desc: 'Tu pedido está en ruta hacia ti.',      icon: Truck        },
  { key: 'entregado',  step: 5, title: 'Entregado',  desc: '¡Que disfrutes tu comida! 🎉',          icon: MapPin       },
];

export default function OrderTracker() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlId = searchParams.get('id') || '';
  const urlBranch = searchParams.get('branch') || 'hq';

  const [query, setQuery] = useState(urlId ? urlId.slice(-4).toUpperCase() : '');
  const [orderData, setOrderData] = useState(null);
  const [foundId, setFoundId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const unsubRef = useRef(null);

  const subscribeToFoundOrder = useCallback((fullOrderId, normalized) => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    const unsub = ordersService.subscribeToOrder(urlBranch, fullOrderId, (order) => {
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
  }, [urlBranch]);

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

    // Full ID provided — subscribe directly
    if (fullIdHint && fullIdHint.length > 6) {
      setFoundId(fullIdHint);
      subscribeToFoundOrder(fullIdHint, normalized);
      setSearchLoading(false);
      return;
    }

    // Short code — find order by last-4 via one-time read
    try {
      const ordersRef = ref(db, `branches/${urlBranch || 'hq'}/orders`);
      const snap = await get(ordersRef);
      setSearchLoading(false);
      if (!snap.exists()) {
        setLoading(false);
        setError(`No se encontró ningún pedido con el código #${normalized}`);
        return;
      }
      const orders = snap.val();
      const matchKey = Object.keys(orders).find(
        k => k.slice(-4).toUpperCase() === normalized
      );
      if (matchKey) {
        setFoundId(matchKey);
        subscribeToFoundOrder(matchKey, normalized);
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

  // Auto-search when URL has an id param
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
    navigate(`/rastreo?id=${q}&branch=${urlBranch}`, { replace: true });
  };

  const getStep = (status) => STATUS_STEPS.find(s => s.key === status)?.step ?? 0;
  const currentStep = orderData ? getStep(orderData.status) : 0;
  const isDelivered = orderData?.status === 'entregado';
  const isOnTheWay = orderData?.status === 'en_camino';

  return (
    <div className="min-h-screen bg-cm-bg flex overflow-x-hidden">
      <HouseMenuNav />

      <div className="flex-1 md:pl-64 pt-16 md:pt-0 flex flex-col items-center px-6 py-12 text-cm-text">
        <div className="w-full max-w-md space-y-8">

          {/* Back */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-cm-muted hover:text-cm-accent transition-colors text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Menú
          </button>

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

          {/* Search form */}
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
              className="btn-culinary w-full py-4 flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" /> BUSCAR PEDIDO
            </button>
            <p className="text-xs text-cm-muted text-center font-bold">
              Los 4 caracteres que aparecen en tu pantalla de confirmación
            </p>
          </form>

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
                {/* Order header card */}
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

                  {/* Current status badge */}
                  <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isDelivered ? 'bg-green-300' : 'bg-yellow-300 animate-pulse'}`} />
                      <span className="text-white font-black text-sm uppercase tracking-wide">
                        {STATUS_STEPS.find(s => s.key === orderData.status)?.title ?? orderData.status}
                      </span>
                    </div>
                    {orderData.updatedAt && (
                      <span className="text-white/50 text-[0.6rem] font-bold">
                        {new Date(orderData.updatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress timeline */}
                <div className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border p-5">
                  <p className="text-[0.6rem] font-bold text-cm-muted uppercase tracking-widest mb-4">Seguimiento</p>

                  {/* En Camino animated card */}
                  <AnimatePresence>
                    {isOnTheWay && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="mb-5 p-3 bg-cm-accent/10 border-2 border-cm-accent/30 rounded-xl flex items-center gap-3"
                      >
                        <motion.div
                          animate={{ x: [0, 6, 0] }}
                          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                          className="text-2xl"
                        >
                          🛵
                        </motion.div>
                        <div>
                          <p className="font-black text-cm-accent text-sm">¡Tu pedido viene en camino!</p>
                          <p className="text-xs text-cm-muted font-bold">El repartidor ya salió hacia tu ubicación</p>
                        </div>
                        <motion.span
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="ml-auto w-2.5 h-2.5 rounded-full bg-cm-accent shrink-0"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="relative space-y-5">
                    {/* Background line */}
                    <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-cm-border z-0" />
                    {/* Animated progress fill */}
                    <motion.div
                      className="absolute left-4 top-2 w-0.5 bg-cm-accent z-0 origin-top"
                      initial={{ height: 0 }}
                      animate={{
                        height: currentStep === 0
                          ? '0%'
                          : `${Math.min(((currentStep - 1) / (STATUS_STEPS.length - 1)) * 100, 100)}%`
                      }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />

                    {STATUS_STEPS.map(({ key, step, title, desc, icon: Icon }) => {
                      const isActive = currentStep >= step;
                      const isCurrent = getStep(orderData.status) === step;
                      return (
                        <div key={key} className="flex items-start gap-4 relative z-10">
                          <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: isActive ? 1 : 0.85, opacity: isActive ? 1 : 0.5 }}
                            transition={{ duration: 0.4 }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-all ${
                              isActive
                                ? 'bg-cm-accent border-cm-accent text-white'
                                : 'bg-cm-surface border-cm-border text-cm-muted'
                            } ${isCurrent ? 'ring-4 ring-cm-accent/20 scale-110' : ''}`}
                          >
                            <Icon className="w-4 h-4" />
                          </motion.div>
                          <div className={`pt-1 transition-opacity ${isActive ? 'opacity-100' : 'opacity-35'}`}>
                            <p className={`font-black text-sm ${isActive ? 'text-cm-text' : 'text-cm-muted'}`}>
                              {title}
                              {isCurrent && <span className="ml-2 text-[0.6rem] bg-cm-accent/10 text-cm-accent px-1.5 py-0.5 rounded-full font-bold">AHORA</span>}
                            </p>
                            <p className="text-xs text-cm-muted font-bold mt-0.5">{desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Driver info */}
                {orderData.driverName && (
                  <div className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border p-5 border-l-4 border-cm-info">
                    <p className="text-[0.6rem] font-bold text-cm-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" /> Repartidor asignado
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cm-info/20 rounded-full flex items-center justify-center border-2 border-cm-info/30">
                        <User className="w-5 h-5 text-cm-info" />
                      </div>
                      <div>
                        <p className="font-black text-cm-text">{orderData.driverName}</p>
                        <p className="text-xs text-cm-info font-bold flex items-center gap-1">
                          <Navigation className="w-3 h-3" /> En camino hacia ti
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Items */}
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
                  </div>
                )}

                {/* Support button — show when order not yet delivered */}
                {!isDelivered && (
                  <div className="bg-cm-surface rounded-xl border border-cm-border p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-cm-text">¿Necesitas ayuda?</p>
                      <p className="text-[10px] text-cm-muted font-bold">Contacta al restaurante si hay algún problema</p>
                    </div>
                    <a
                      href="https://wa.me/?text=Hola%2C+tengo+una+consulta+sobre+mi+pedido"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white text-xs font-black rounded-xl hover:bg-green-600 transition-colors shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  </div>
                )}

                {/* Delivered celebration */}
                {isDelivered && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-6 space-y-2"
                  >
                    <p className="text-3xl">🎉</p>
                    <p className="font-black text-cm-success text-lg">¡Buen provecho!</p>
                    <button
                      onClick={() => navigate('/')}
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
    </div>
  );
}
