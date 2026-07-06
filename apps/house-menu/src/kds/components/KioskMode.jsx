import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db, auth } from '@house/db';
import {
  ShoppingCart, Minus, Plus, X, Check, Send, Smartphone, Lock,
  Loader2, Clock, UtensilsCrossed, AlertCircle, RefreshCw,
  ClipboardList, Hash, User, Printer,
} from 'lucide-react';
import { useBranch } from '../../context/BranchContext';
import { ordersService } from '../../lib/ordersService';
import { initAnonymousAuth } from '../../lib/anonymousAuth';

const IDLE_TIMEOUT = 60000;

export default function KioskMode() {
  const { activeBranchId, activeBranch } = useBranch();
  const [catalog, setCatalog] = useState(null);
  const [cart, setCart] = useState({});
  const [activeCategory, setActiveCategory] = useState('');
  const [step, setStep] = useState('menu');
  const [customerName, setCustomerName] = useState('');
  const [mesa, setMesa] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [doneOrderId, setDoneOrderId] = useState('');
  const [kioskEnabled, setKioskEnabled] = useState(null);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const idleRef = useRef(null);
  const lastActionRef = useRef(Date.now());

  // ── Reset por inactividad (excepto en success) ──
  const resetIdleTimer = useCallback(() => {
    lastActionRef.current = Date.now();
    if (idleRef.current) clearTimeout(idleRef.current);
    if (step === 'success') return;
    idleRef.current = setTimeout(() => {
      if (step !== 'success') {
        setCart({});
        setCustomerName('');
        setMesa('');
        setNotes('');
        setError('');
        setStep('menu');
        setShowCartDrawer(false);
      }
    }, IDLE_TIMEOUT);
  }, [step]);

  useEffect(() => {
    resetIdleTimer();
    return () => { if (idleRef.current) clearTimeout(idleRef.current); };
  }, [cart, step, resetIdleTimer]);

  // ── Init anonymous auth (kiosk visitors are not staff) ──
  useEffect(() => {
    if (!auth?.currentUser) {
      initAnonymousAuth();
    }
  }, []);

  // ── Check kiosk enabled ──
  useEffect(() => {
    if (!activeBranchId) return;
    const enabledRef = ref(db, `branches/${activeBranchId}/config/kioskEnabled`);
    const unsub = onValue(enabledRef, (snap) => setKioskEnabled(!!snap.val()));
    return unsub;
  }, [activeBranchId]);

  // ── Subscribe to catalog ──
  useEffect(() => {
    if (!activeBranchId) return;
    const productsRef = ref(db, `branches/${activeBranchId}/catalog/products`);
    const unsub = onValue(productsRef, (snap) => {
      const data = snap.val();
      if (data) setCatalog(data);
    });
    return unsub;
  }, [activeBranchId]);

  // ── Derived data (hooks SIEMPRE antes de early returns) ──
  const isVisibleInKiosko = (p) => {
    if (p.available === false) return false;
    if (p.status === 'draft') return false;
    const ch = p.channels || {};
    return ch.kiosko !== false;
  };

  const categories = useMemo(() => {
    if (!catalog) return [];
    const seen = new Set();
    const cats = [];
    Object.values(catalog).forEach(p => {
      if (!isVisibleInKiosko(p)) return;
      const cat = p.category || 'General';
      if (!seen.has(cat)) { seen.add(cat); cats.push(cat); }
    });
    return cats;
  }, [catalog]);

  const productsByCat = useMemo(() => {
    if (!catalog) return {};
    const groups = {};
    Object.entries(catalog).forEach(([id, p]) => {
      if (!isVisibleInKiosko(p)) return;
      const cat = p.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ id, ...p });
    });
    return groups;
  }, [catalog]);

  const cartItems = useMemo(() =>
    Object.entries(cart).filter(([_, q]) => q > 0),
  [cart]);

  const cartCount = cartItems.reduce((s, [_, q]) => s + q, 0);
  const cartTotal = useMemo(() =>
    cartItems.reduce((s, [id, q]) => {
      const p = catalog?.[id];
      return s + ((p?.base_price ?? p?.price ?? 0)) * q;
    }, 0),
  [cartItems, catalog]);

  // ── Loading / Disabled states ──
  if (kioskEnabled === null) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
      </div>
    );
  }

  if (!kioskEnabled) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-16 h-16 bg-cm-muted/10 rounded-2xl flex items-center justify-center mx-auto border-2 border-cm-muted/20">
            <Lock className="w-8 h-8 text-cm-muted" />
          </div>
          <h1 className="text-2xl font-black text-cm-text">Auto-pedido desactivado</h1>
          <p className="text-sm text-cm-muted font-medium">
            El kiosko de auto-pedido no está habilitado para esta sucursal.
          </p>
        </div>
      </div>
    );
  }

  // ── Cart actions ──
  const addToCart = (id) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setShowCartDrawer(false); // keep menu visible
  };
  const removeFromCart = (id) => {
    setCart(prev => {
      const next = { ...prev };
      if (next[id] <= 1) delete next[id];
      else next[id]--;
      return next;
    });
  };
  const clearCart = () => {
    setCart({});
    setCustomerName('');
    setMesa('');
    setNotes('');
    setError('');
  };

  // ── Place order ──
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    setPlacing(true);
    setError('');
    const items = cartItems.map(([id, qty]) => ({
      productId: id,
      name: catalog?.[id]?.name || id,
      quantity: qty,
      price: catalog?.[id]?.base_price ?? catalog?.[id]?.price ?? 0,
    }));
    const result = await ordersService.createOrder(activeBranchId, {
      customerName: customerName.trim() || `Mesa ${mesa || '—'}`,
      mesa: mesa.trim() || null,
      notes: notes.trim() || null,
      items,
      total: cartTotal,
      source: 'kiosko',
      payment_method: 'Pendiente',
      payment_status: 'pendiente',
    });
    setPlacing(false);
    if (result.success) {
      setDoneOrderId(result.orderId);
      setShowCartDrawer(false);
      setStep('success');
    } else {
      setError(result.message || 'Error al crear el pedido. Intentá de nuevo.');
    }
  };

  // ── Active category default ──
  const displayCat = activeCategory || categories[0] || '';
  const currentProducts = productsByCat[displayCat] || [];

  // ── Render: MENU ──
  if (step === 'menu') {
    return (
      <div className="min-h-screen flex flex-col bg-cm-bg"
        onClick={resetIdleTimer} onTouchStart={resetIdleTimer}
      >
        {/* ── Header ── */}
        <header className="sticky top-0 z-20 bg-cm-bg/90 backdrop-blur-lg border-b border-cm-border/50 px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-black text-cm-text flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-cm-accent shrink-0" />
                {activeBranch?.name || 'Menú'}
              </h1>
              <p className="text-xs text-cm-muted font-medium">Tocá un producto para agregarlo</p>
            </div>
            <motion.button
              onClick={() => setShowCartDrawer(true)}
              className="relative p-3 rounded-2xl bg-cm-accent text-white shadow-lg shadow-cm-accent/20"
              whileTap={{ scale: 0.9 }}
            >
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] bg-cm-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-cm-bg">
                  {cartCount}
                </span>
              )}
            </motion.button>
          </div>

          {/* ── Category tabs ── */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  displayCat === cat
                    ? 'bg-cm-accent text-white shadow-md'
                    : 'bg-cm-surface border border-cm-border text-cm-muted hover:border-cm-accent/30'
                }`}
              >
                {cat}
                {productsByCat[cat]?.reduce((s, p) => s + (cart[p.id] || 0), 0) > 0 && (
                  <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 rounded-full">
                    {productsByCat[cat].reduce((s, p) => s + (cart[p.id] || 0), 0)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        {/* ── Products Grid ── */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
          {!catalog ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
            </div>
          ) : currentProducts.length === 0 ? (
            <p className="text-center text-cm-muted py-20 text-sm">
              No hay productos disponibles en esta categoría.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {currentProducts.map((p) => {
                const qty = cart[p.id] || 0;
                return (
                  <motion.div
                    key={p.id}
                    layout
                    className={`relative rounded-2xl border-2 overflow-hidden transition-all ${
                      qty > 0
                        ? 'border-cm-accent bg-cm-accent/[0.06] shadow-md shadow-cm-accent/10'
                        : 'border-cm-border bg-cm-surface hover:border-cm-accent/40'
                    }`}
                  >
                    {/* Image */}
                    {p.image && (
                      <div className="w-full h-24 overflow-hidden bg-cm-bg-alt">
                        <img src={p.image} alt={p.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="p-3">
                      <h3 className="text-sm font-bold text-cm-text leading-tight line-clamp-2">{p.name}</h3>
                      <p className="text-base font-black text-cm-accent mt-1">
                        S/ {(p.base_price ?? p.price ?? 0).toFixed(2)}
                      </p>

                      {p.description && (
                        <p className="text-[10px] text-cm-muted mt-1 line-clamp-2">{p.description}</p>
                      )}

                      {/* Quantity controls */}
                      {qty === 0 ? (
                        <button
                          onClick={() => addToCart(p.id)}
                          className="mt-3 w-full py-2.5 rounded-xl bg-cm-accent text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                        >
                          <Plus size={14} /> AGREGAR
                        </button>
                      ) : (
                        <div className="mt-3 flex items-center justify-between bg-cm-accent/10 rounded-xl p-1">
                          <button
                            onClick={() => removeFromCart(p.id)}
                            className="w-9 h-9 rounded-lg bg-cm-accent text-white flex items-center justify-center active:scale-90 transition-transform"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="font-black text-cm-text text-base w-8 text-center">{qty}</span>
                          <button
                            onClick={() => addToCart(p.id)}
                            className="w-9 h-9 rounded-lg bg-cm-accent text-white flex items-center justify-center active:scale-90 transition-transform"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Cart FAB (floating bottom) ── */}
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 z-30 p-4 pb-6 bg-gradient-to-t from-cm-bg via-cm-bg/95 to-transparent"
          >
            <button
              onClick={() => setShowCartDrawer(true)}
              className="w-full py-4 rounded-2xl bg-cm-accent text-white font-black text-base flex items-center justify-between px-6 shadow-2xl shadow-cm-accent/30 active:scale-[0.97] transition-transform"
            >
              <span className="flex items-center gap-2">
                <ShoppingCart size={18} />
                {cartCount} {cartCount === 1 ? 'item' : 'items'}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-lg">S/ {cartTotal.toFixed(2)}</span>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-lg font-bold">VER</span>
              </span>
            </button>
          </motion.div>
        )}

        {/* ── Cart Drawer ── */}
        <AnimatePresence>
          {showCartDrawer && (
            <CartDrawer
              cartItems={cartItems}
              catalog={catalog}
              cartTotal={cartTotal}
              customerName={customerName}
              setCustomerName={setCustomerName}
              mesa={mesa}
              setMesa={setMesa}
              notes={notes}
              setNotes={setNotes}
              addToCart={addToCart}
              removeFromCart={removeFromCart}
              clearCart={clearCart}
              placing={placing}
              error={error}
              onPlaceOrder={handlePlaceOrder}
              onClose={() => setShowCartDrawer(false)}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Render: SUCCESS ──
  if (step === 'success') {
    return (
      <SuccessScreen
        orderId={doneOrderId}
        branchName={activeBranch?.name}
        mesa={mesa}
        customerName={customerName}
        onNewOrder={() => {
          setCart({});
          setCustomerName('');
          setMesa('');
          setNotes('');
          setError('');
          setDoneOrderId('');
          setStep('menu');
        }}
      />
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════
function CartDrawer({
  cartItems, catalog, cartTotal,
  customerName, setCustomerName,
  mesa, setMesa,
  notes, setNotes,
  addToCart, removeFromCart, clearCart,
  placing, error, onPlaceOrder, onClose,
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-cm-surface w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-black text-cm-text flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-cm-accent" />
            Tu Pedido
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-cm-bg-alt transition-colors">
            <X className="w-5 h-5 text-cm-muted" />
          </button>
        </div>
        <p className="text-xs text-cm-muted mb-4">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</p>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
          {cartItems.map(([id, qty]) => {
            const p = catalog?.[id];
            return (
              <div key={id} className="flex items-center justify-between bg-cm-bg-alt rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-cm-text truncate">{p?.name || id}</p>
                  <p className="text-xs text-cm-muted">S/ {(p?.base_price ?? p?.price ?? 0).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <button onClick={() => removeFromCart(id)}
                    className="w-8 h-8 rounded-lg bg-cm-surface border border-cm-border flex items-center justify-center active:scale-90 transition-transform">
                    <Minus size={14} className="text-cm-muted" />
                  </button>
                  <span className="w-6 text-center font-black text-cm-text">{qty}</span>
                  <button onClick={() => addToCart(id)}
                    className="w-8 h-8 rounded-lg bg-cm-accent text-white flex items-center justify-center active:scale-90 transition-transform">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Mesa + Name + Notes ── */}
        <div className="mt-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-cm-muted uppercase tracking-wider mb-1 block">Mesa</label>
              <input value={mesa} onChange={e => setMesa(e.target.value)}
                placeholder="N°"
                inputMode="numeric"
                className="w-full px-4 py-3 rounded-xl bg-cm-bg text-cm-text text-sm font-bold outline-none border-2 border-cm-border focus:border-cm-accent transition-colors"
              />
            </div>
            <div className="flex-[2]">
              <label className="text-[10px] font-bold text-cm-muted uppercase tracking-wider mb-1 block">Nombre</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="Tu nombre (opcional)"
                className="w-full px-4 py-3 rounded-xl bg-cm-bg text-cm-text text-sm outline-none border-2 border-cm-border focus:border-cm-accent transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-cm-muted uppercase tracking-wider mb-1 block">Notas</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Algún detalle (opcional)"
              className="w-full px-4 py-3 rounded-xl bg-cm-bg text-cm-text text-sm outline-none border-2 border-cm-border focus:border-cm-accent transition-colors"
            />
          </div>
        </div>

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-3 p-3 bg-cm-danger/10 border border-cm-danger/30 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-cm-danger shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-cm-danger">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Actions ── */}
        <div className="mt-5 flex items-center justify-between pt-4 border-t border-cm-border">
          <button onClick={clearCart} className="px-3 py-2 text-xs font-bold text-cm-muted hover:text-cm-danger transition-colors">
            Vaciar
          </button>
          <div className="flex items-center gap-4">
            <span className="text-xl font-black text-cm-text">S/ {cartTotal.toFixed(2)}</span>
            <button onClick={onPlaceOrder} disabled={placing}
              className="px-8 py-3.5 rounded-2xl bg-cm-accent text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-cm-accent/20 disabled:opacity-50 active:scale-95 transition-transform">
              {placing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              ) : (
                <><Send size={16} /> Enviar Pedido</>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════
function SuccessScreen({ orderId, branchName, mesa, customerName, onNewOrder }) {
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (countdown <= 0) { onNewOrder(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onNewOrder]);

  return (
    <div className="min-h-screen bg-cm-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center max-w-sm w-full space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
          className="w-24 h-24 bg-cm-success/10 rounded-full flex items-center justify-center mx-auto border-4 border-cm-success/20"
        >
          <Check className="w-12 h-12 text-cm-success" />
        </motion.div>

        <div>
          <h1 className="text-3xl font-black text-cm-text">¡Pedido Enviado!</h1>
          <p className="text-sm text-cm-muted mt-2">
            {branchName && `${branchName} — `}Mesa {mesa || 'mostrador'}
            {customerName ? ` — ${customerName}` : ''}
          </p>
        </div>

        <div className="bg-cm-surface border-2 border-cm-border rounded-2xl p-6 space-y-2">
          <p className="text-[10px] font-bold text-cm-muted uppercase tracking-widest">Código de seguimiento</p>
          <p className="font-mono text-3xl font-black text-cm-accent tracking-widest">
            #{orderId?.slice(-6).toUpperCase()}
          </p>
          <p className="text-xs text-cm-muted break-all font-mono">{orderId}</p>
          <div className="flex items-center justify-center gap-1.5 text-xs text-cm-info font-bold mt-2">
            <Clock size={14} />
            <span>Mostrale este código al mozo para identificar tu pedido</span>
          </div>
        </div>

        <p className="text-xs text-cm-muted">
          La pantalla se reiniciará en <span className="font-black text-cm-text">{countdown}</span> segundos
        </p>

        <button onClick={onNewOrder}
          className="w-full py-4 rounded-2xl bg-cm-accent text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cm-accent/20 active:scale-95 transition-transform">
          <RefreshCw size={16} /> NUEVO PEDIDO
        </button>
      </motion.div>
    </div>
  );
}
