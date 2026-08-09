import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db, auth } from '@house/db';
import {
  ShoppingCart, Minus, Plus, X, Check, Send, Smartphone, Lock,
  Loader2, Clock, UtensilsCrossed, AlertCircle, RefreshCw,
  ClipboardList, Hash, User, Printer, Search, Star, Navigation,
  Wallet, Banknote, CreditCard, Truck, Zap, Sparkles,
} from 'lucide-react';
import { useBranch } from '../../context/BranchContext';
import { ordersService } from '../../lib/ordersService';
import { initAnonymousAuth } from '../../lib/anonymousAuth';
import { getMethodsForRole } from '../../lib/paymentMethods';
import { playSuccessSound } from '../utils/kitchenSound';
import { flashOfferService } from '../../lib/flashOfferService';
import { subscribeActivePromotions } from '../../lib/customerPromoService';

const IDLE_TIMEOUT = 60000;
const CART_KEY = 'kiosk_cart';

// DIAGNÓSTICO: wrapper que detecta QUÉ useEffect retorna valor inválido
let _effectId = 0;
let _renderCount = 0;
function useSafeEffect(name, fn, deps) {
  const renderAt = ++_renderCount;
  console.log(`📋 useSafeEffect REGISTRADO [${name}] en render #${renderAt}, deps:`, deps);
  useEffect(() => {
    const id = ++_effectId;
    console.log(`🏃 useSafeEffect EJECUTANDO [${id}:${name}] en render #${renderAt}`);
    let result, threw = null;
    try {
      result = fn();
    } catch (e) {
      threw = e;
      console.error(`💥 useSafeEffect[${id}:${name}] LANZÓ EXCEPCIÓN:`, e);
      console.error(`   Código fuente:\n${fn.toString().slice(0, 500)}`);
      return undefined;
    }
    if (threw) return undefined;
    if (result !== undefined && typeof result !== 'function') {
      console.error(`❌ useSafeEffect[${id}:${name}] retornó tipo inválido:`, typeof result, result);
      console.error(`   Código fuente:\n${fn.toString().slice(0, 500)}`);
    } else {
      console.log(`✅ useSafeEffect[${id}:${name}] retornó:`, result === undefined ? 'undefined' : typeof result);
    }
    return result;
  }, deps);
}

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {}
}

export default function KioskMode({ onExit }) {
  const { activeBranchId, activeBranch } = useBranch();
  const [catalog, setCatalog] = useState(null);
  const [cartItems, setCartItems] = useState(loadCart);
  const [activeCategory, setActiveCategory] = useState('');
  const [step, setStep] = useState('menu');
  const [customerName, setCustomerName] = useState(() => new URLSearchParams(window.location.search).get('name') || '');
  const [mesa, setMesa] = useState(() => new URLSearchParams(window.location.search).get('mesa') || '');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pendiente');
  const [deliveryMode, setDeliveryMode] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [doneOrderId, setDoneOrderId] = useState('');
  const [orderStatus, setOrderStatus] = useState(null); // real-time status after placing
  const [kioskEnabled, setKioskEnabled] = useState(null);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [wizardProduct, setWizardProduct] = useState(null);
  const [wizardSelections, setWizardSelections] = useState({});
  const [wizardStepIndex, setWizardStepIndex] = useState(0);
  const idleRef = useRef(null);
  const [idleTickRef] = useState(() => ({ current: null }));
  const paymentMethods = useMemo(() => getMethodsForRole('customer', false), []);

  // ── Flash offers ──
  const [activeOffer, setActiveOffer] = useState(null); // null=loading, false=none, object=offer
  const [offerTimeLeft, setOfferTimeLeft] = useState(0);
  const [flashAdded, setFlashAdded] = useState(false);

  // ── Promos ──
  const [activePromos, setActivePromos] = useState([]);
  const [appliedPromo, setAppliedPromo] = useState(null); // null | promo object

  // ── Reset por inactividad (excepto en success) ──
  const resetIdleTimer = useCallback(() => {
    setIdleSeconds(0);
    if (idleRef.current) clearTimeout(idleRef.current);
    if (idleTickRef.current) clearInterval(idleTickRef.current);
    if (step === 'success') return;
    idleRef.current = setTimeout(() => {
      if (step !== 'success') {
        setCartItems([]);
        setCustomerName('');
        setMesa('');
        setNotes('');
        setError('');
        setStep('menu');
        setShowCartDrawer(false);
        setIdleSeconds(0);
      }
    }, IDLE_TIMEOUT);
    idleTickRef.current = setInterval(() => {
      setIdleSeconds(s => Math.min(s + 1, IDLE_TIMEOUT / 1000));
    }, 1000);
  }, [step]);

  useSafeEffect('idleTimer', () => {
    resetIdleTimer();
    function cleanup() {
      if (idleRef.current) clearTimeout(idleRef.current);
      if (idleTickRef.current) clearInterval(idleTickRef.current);
    }
    return cleanup;
  }, [cartItems, step, resetIdleTimer]);

  // ── Init anonymous auth (kiosk visitors are not staff) ──
  useSafeEffect('anonAuth', () => {
    if (!auth?.currentUser) {
      initAnonymousAuth();
    }
    return undefined;
  }, []);

  // ── Check kiosk enabled ──
  useSafeEffect('kioskEnabled', () => {
    if (!activeBranchId) return undefined;
    const enabledRef = ref(db, `branches/${activeBranchId}/config/kioskEnabled`);
    const unsub = onValue(enabledRef, (snap) => setKioskEnabled(!!snap.val()));
    function cleanup() { if (typeof unsub === 'function') unsub(); }
    return cleanup;
  }, [activeBranchId]);

  // ── Subscribe to catalog ──
  useSafeEffect('catalog', () => {
    if (!activeBranchId) return undefined;
    const productsRef = ref(db, `branches/${activeBranchId}/catalog/products`);
    const unsub = onValue(productsRef, (snap) => {
      const data = snap.val();
      if (data) setCatalog(data);
    });
    function cleanup() { if (typeof unsub === 'function') unsub(); }
    return cleanup;
  }, [activeBranchId]);

  // ── Subscribe to flash offers ──
  useSafeEffect('flashOffers', () => {
    if (!activeBranchId) return undefined;
    const unsub = flashOfferService.subscribeToActiveFlashOffers(activeBranchId, (offers) => {
      setActiveOffer(offers && offers.length > 0 ? offers[0] : false);
    }, () => setActiveOffer(false));
    function cleanup() { if (typeof unsub === 'function') unsub(); }
    return cleanup;
  }, [activeBranchId]);

  // ── Flash offer timer ──
  useSafeEffect('flashTimer', () => {
    if (!activeOffer || !activeOffer.endTime) { setOfferTimeLeft(0); return undefined; }
    const calc = () => Math.max(0, Math.floor((activeOffer.endTime - Date.now()) / 1000));
    setOfferTimeLeft(calc());
    const id = setInterval(() => {
      const r = calc();
      setOfferTimeLeft(r);
      if (r <= 0) clearInterval(id);
    }, 1000);
    function cleanup() { clearInterval(id); }
    return cleanup;
  }, [activeOffer?.endTime]);

  // ── Subscribe to promos ──
  useSafeEffect('promos', () => {
    if (!activeBranchId) return undefined;
    const unsub = subscribeActivePromotions('all', activeBranchId, setActivePromos);
    function cleanup() { if (typeof unsub === 'function') unsub(); }
    return cleanup;
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

  // ── Cart helpers ──
  const getQty = useCallback((productId) =>
    cartItems.filter(i => i.productId === productId).reduce((s, i) => s + i.quantity, 0),
  [cartItems]);

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = useMemo(() =>
    cartItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
  [cartItems]);
  const bestPromo = useMemo(() => {
    const pct = activePromos.filter(p => p.type === 'discount_percent').sort((a, b) => b.value - a.value);
    return pct[0] || null;
  }, [activePromos]);
  const promoDiscount = bestPromo ? Math.round(cartTotal * (bestPromo.value / 100) * 100) / 100 : 0;
  const finalTotal = cartTotal - promoDiscount;

  // ── Persist cart ──
  useSafeEffect('saveCart', () => { saveCart(cartItems); return undefined; }, [cartItems]);

  // ── Order tracking (real-time status) ──
  useSafeEffect('orderTracking', () => {
    if (!doneOrderId || !activeBranchId) return undefined;
    const unsub = ordersService.subscribeToOrder(activeBranchId, doneOrderId, (data) => {
      if (data) setOrderStatus(data.status || 'pendiente');
    });
    function cleanup() { if (typeof unsub === 'function') unsub(); }
    return cleanup;
  }, [doneOrderId, activeBranchId]);

  // ── Memos required for render (must be before early returns!) ──
  const allVisible = useMemo(() => {
    if (!catalog) return [];
    return Object.entries(catalog)
      .filter(([, p]) => isVisibleInKiosko(p))
      .map(([id, p]) => ({ id, ...p }));
  }, [catalog]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return allVisible.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  }, [allVisible, searchQuery]);

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

  // ── Cart key helpers ──
  const cartKey = (productId, selections) => {
    if (!selections || Object.keys(selections).length === 0) return productId;
    return `${productId}@${btoa(JSON.stringify(selections))}`;
  };

  // ── Cart actions ──
  const addToCart = (productId, name, unitPrice, wizardSelections) => {
    const key = cartKey(productId, wizardSelections);
    setCartItems(prev => {
      const idx = prev.findIndex(i => i.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { key, productId, name, quantity: 1, unitPrice, wizardSelections }];
    });
    setShowCartDrawer(false);
  };
  const removeFromCart = (productId, wizardSelections) => {
    const key = cartKey(productId, wizardSelections);
    setCartItems(prev => {
      const idx = prev.findIndex(i => i.key === key);
      if (idx < 0) return prev;
      if (prev[idx].quantity <= 1) return prev.filter((_, i) => i !== idx);
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity - 1 };
      return next;
    });
  };
  const clearCart = () => {
    setCartItems([]);
    setCustomerName('');
    setMesa('');
    setNotes('');
    setError('');
    setDeliveryMode(false);
    setDeliveryAddress('');
  };

  // ── Claim flash offer ──
  const claimFlashOffer = () => {
    if (!activeOffer) return;
    const key = `flash-${activeOffer.id}`;
    const fp = activeOffer.flashPrice ?? activeOffer.price ?? 0;
    setCartItems(prev => {
      if (prev.find(i => i.key === key)) return prev;
      return [...prev, { key, productId: activeOffer.productIds?.[0] || activeOffer.id, name: activeOffer.title, quantity: 1, unitPrice: fp }];
    });
    setFlashAdded(true);
    setTimeout(() => setFlashAdded(false), 2000);
  };

  // ── Wizard actions ──
  const startWizard = (product) => {
    const defaults = {};
    (product.steps || []).forEach(step => {
      if (step.type === 'single') defaults[step.id] = '';
      else defaults[step.id] = [];
    });
    setWizardSelections(defaults);
    setWizardStepIndex(0);
    setWizardProduct(product);
  };
  const closeWizard = () => {
    setWizardProduct(null);
    setWizardSelections({});
    setWizardStepIndex(0);
  };
  const handleWizardComplete = () => {
    if (!wizardProduct) return;
    const base = wizardProduct.base_price ?? wizardProduct.price ?? 0;
    const extra = Object.entries(wizardSelections).reduce((sum, [stepId, val]) => {
      const step = (wizardProduct.steps || []).find(s => s.id === stepId);
      if (!step) return sum;
      if (Array.isArray(val)) {
        return sum + val.reduce((s, oid) => {
          const opt = (step.options || []).find(o => o.id === oid);
          return s + (opt?.price ?? 0);
        }, 0);
      }
      const opt = (step.options || []).find(o => o.id === val);
      return sum + (opt?.price ?? 0);
    }, 0);
    addToCart(wizardProduct.id, wizardProduct.name, base + extra, { ...wizardSelections });
    closeWizard();
  };
  const updateWizardSelection = (stepId, optionId, multiple) => {
    setWizardSelections(prev => {
      if (multiple) {
        const arr = prev[stepId] || [];
        return { ...prev, [stepId]: arr.includes(optionId) ? arr.filter(o => o !== optionId) : [...arr, optionId] };
      }
      return { ...prev, [stepId]: optionId };
    });
  };
  const nextWizardStep = () => setWizardStepIndex(i => i + 1);
  const prevWizardStep = () => setWizardStepIndex(i => Math.max(0, i - 1));

  // ── Place order ──
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    setPlacing(true);
    setError('');
    const items = cartItems.map(item => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.unitPrice,
      ...(item.wizardSelections ? { wizardSelections: item.wizardSelections } : {}),
    }));
    const result = await ordersService.createOrder(activeBranchId, {
      customerName: customerName.trim() || `Mesa ${mesa || '—'}`,
      mesa: deliveryMode ? null : (mesa.trim() || null),
      notes: notes.trim() || null,
      items,
      total: finalTotal,
      subtotal: cartTotal,
      discount: promoDiscount,
      promoId: bestPromo?.id || null,
      promoTitle: bestPromo?.title || null,
      source: deliveryMode ? 'delivery' : 'kiosko',
      deliveryAddress: deliveryMode ? deliveryAddress.trim() : null,
      payment_method: paymentMethod === 'pendiente' ? 'Pendiente' : paymentMethod,
      payment_status: paymentMethod === 'pendiente' ? 'pendiente' : 'pagado',
    });
    setPlacing(false);
    if (result.success) {
      playSuccessSound();
      setDoneOrderId(result.orderId);
      setShowCartDrawer(false);
      setStep('success');
    } else {
      setError(result.message || 'Error al crear el pedido. Intentá de nuevo.');
    }
  };

  // ── Search ──
  // ── Badges ──
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const getBadges = (p) => {
    const badges = [];
    if (p.stock != null && p.stock <= 0) badges.push({ label: 'Agotado', cls: 'bg-cm-danger/90 text-white' });
    if (p.metadata?.orderCount > 50) badges.push({ label: 'Popular', cls: 'bg-cm-accent text-white' });
    if (p.createdAt && Date.now() - new Date(p.createdAt).getTime() < SEVEN_DAYS) badges.push({ label: 'Nuevo', cls: 'bg-cm-success text-white' });
    return badges;
  };

  // ── Active category default ──
  const displayCat = activeCategory || categories[0] || '';
  const currentProducts = productsByCat[displayCat] || [];

  const fmtOfferTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // ── Render: MENU ──
  if (step === 'menu') {
    return (
      <div className="min-h-screen flex flex-col bg-cm-bg" data-theme="dark"
        onClick={resetIdleTimer} onTouchStart={resetIdleTimer}
      >
        {/* ── Idle countdown bar ── */}
        {idleSeconds > 30 && (
          <div className="h-1 bg-cm-bg-alt relative">
            <motion.div
              className="absolute inset-y-0 left-0 bg-cm-accent/40"
              style={{ width: `${((IDLE_TIMEOUT / 1000 - idleSeconds) / (IDLE_TIMEOUT / 1000)) * 100}%` }}
            />
          </div>
        )}
        {idleSeconds > IDLE_TIMEOUT / 1000 - 10 && (
          <div className="px-4 py-1 bg-cm-warning/10 border-b border-cm-warning/20 flex items-center gap-2">
            <Clock className="w-3 h-3 text-cm-warning shrink-0" />
            <span className="text-[10px] font-bold text-cm-warning">
              La pantalla se reiniciará en {IDLE_TIMEOUT / 1000 - idleSeconds}s por inactividad
            </span>
          </div>
        )}

        {/* ── Header ── */}
        <header className="sticky top-0 z-20 bg-cm-bg/70 backdrop-blur-xl border-b border-cm-accent/10 px-4 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {onExit && (
                <button onClick={onExit} className="p-2 rounded-xl hover:bg-cm-surface text-cm-muted hover:text-cm-text transition-colors" title="Volver a la carta">
                  <X className="w-5 h-5" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-black text-cm-text flex items-center gap-2 tracking-tight">
                  <span className="w-8 h-8 rounded-xl bg-cm-accent/15 flex items-center justify-center">
                    <UtensilsCrossed className="w-4 h-4 text-cm-accent" />
                  </span>
                  {activeBranch?.name || 'Menú'}
                </h1>
                <p className="text-xs text-cm-text-secondary font-medium mt-0.5">Tocá un producto para agregarlo al pedido</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeBranchId && (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => window.open(`/rastreo?branch=${activeBranchId}`, '_blank')}
                  className="p-2.5 rounded-xl bg-cm-surface border border-cm-border text-cm-text-secondary hover:text-cm-text hover:border-cm-accent/30 transition-colors" title="Mis pedidos">
                  <ClipboardList size={20} />
                </motion.button>
              )}
              <motion.button
              onClick={() => setShowCartDrawer(true)}
              className="relative p-3.5 rounded-2xl bg-cm-accent text-white shadow-lg shadow-cm-accent/30"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}
            >
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <motion.span key={cartCount} initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 min-w-[24px] h-[24px] bg-cm-error text-white text-[11px] font-black rounded-full flex items-center justify-center px-1.5 ring-2 ring-cm-bg">
                  {cartCount}
                </motion.span>
              )}
            </motion.button>
            </div>
          </div>

          {/* ── Search ── */}
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
            <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setActiveCategory(''); }}
              placeholder="Buscar producto..."
              className="w-full pl-10 pr-10 py-3 rounded-2xl bg-cm-surface/80 border-2 border-cm-border/60 text-sm text-cm-text placeholder:text-cm-text-tertiary outline-none focus:border-cm-accent/50 focus:bg-cm-surface focus:shadow-lg focus:shadow-cm-accent/5 transition-all duration-300"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-cm-text-tertiary hover:text-cm-text hover:bg-cm-bg-alt transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* ── Category tabs (hidden when searching) ── */}
          {!searchQuery && (
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {categories.map(cat => (
                <motion.button
                  key={cat}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-4 py-2.5 rounded-2xl text-xs font-bold tracking-wide transition-all ${
                    displayCat === cat
                      ? 'bg-cm-accent text-white shadow-lg shadow-cm-accent/25'
                      : 'bg-cm-surface/60 border border-cm-border/50 text-cm-muted hover:bg-cm-surface hover:border-cm-accent/20'
                  }`}
                >
                  {cat}
                  {productsByCat[cat]?.reduce((s, p) => s + getQty(p.id), 0) > 0 && (
                    <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 rounded-full">
                      {productsByCat[cat].reduce((s, p) => s + getQty(p.id), 0)}
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </header>

        {/* ── Products Grid ── */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
          {/* ── Flash offer banner ── */}
          {activeOffer && activeOffer.endTime && offerTimeLeft > 0 && (
            <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-cm-error/[0.07] to-cm-bg border-2 border-cm-error/30 relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-cm-error/10 rounded-full blur-[40px] pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-cm-error/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-cm-error" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-cm-text truncate">{activeOffer.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-cm-text-secondary">
                      <span className="line-through">S/ {Number(activeOffer.originalPrice ?? activeOffer.regularPrice ?? 0).toFixed(2)}</span>
                      <span className="font-bold text-cm-error">S/ {Number(activeOffer.flashPrice ?? activeOffer.price ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="flex items-center gap-1 text-xs font-bold text-cm-error"><Clock className="w-3.5 h-3.5 animate-pulse" />{fmtOfferTime(offerTimeLeft)}</span>
                  <button onClick={claimFlashOffer} disabled={flashAdded}
                    className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all ${
                      flashAdded ? 'bg-cm-success text-white' : 'bg-cm-error hover:brightness-110 text-white shadow-md shadow-cm-error/20'
                    }`}>
                    {flashAdded ? <><Check className="w-3.5 h-3.5 inline mr-1" />Agregado</> : 'Aprovechar'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* ── Promo banner ── */}
          {bestPromo && (
            <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-cm-accent/[0.08] to-cm-bg border border-cm-accent/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 text-xs font-black text-cm-accent bg-cm-accent/10 px-2 py-1 rounded-lg">{bestPromo.value}% OFF</span>
                <p className="text-xs font-semibold text-cm-text truncate">{bestPromo.title}</p>
              </div>
              {appliedPromo?.id === bestPromo.id ? (
                <span className="shrink-0 text-[10px] font-bold text-cm-success flex items-center gap-1"><Check className="w-3 h-3" />Aplicado</span>
              ) : (
                <button onClick={() => setAppliedPromo(bestPromo)} className="shrink-0 px-3 py-1.5 rounded-lg bg-cm-accent text-white text-[10px] font-black tracking-wider uppercase hover:brightness-110 transition-all">
                  Aplicar
                </button>
              )}
            </div>
          )}
          {!catalog ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
            </div>
          ) : (
            (() => {
              const displayProducts = filteredProducts || currentProducts;
              if (displayProducts.length === 0) {
                return (
                  <p className="text-center text-cm-muted py-20 text-sm">
                    {searchQuery ? `Sin resultados para "${searchQuery}"` : 'No hay productos disponibles en esta categoría.'}
                  </p>
                );
              }
              return (
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
                  variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                  initial="hidden"
                  animate="visible"
                >
                  {displayProducts.map((p) => {
                    const qty = getQty(p.id);
                    const badges = getBadges(p);
                    const hasWizard = p.steps?.length > 0;
                    const outOfStock = p.trackStock && (p.stock ?? 0) <= 0 && qty === 0;
                    return (
                      <motion.div
                        key={p.id}
                        layout
                        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                        onClick={() => { if (!outOfStock) { hasWizard ? startWizard(p) : setQuickViewProduct(p); } }}
                        className={`relative rounded-3xl border overflow-hidden transition-all duration-300 cursor-pointer group ${
                          outOfStock ? 'opacity-40 border-cm-border/30' :
                          qty > 0
                            ? 'border-cm-accent/60 bg-cm-accent/[0.04] shadow-lg shadow-cm-accent/10'
                            : 'border-cm-border/40 bg-cm-surface/90 hover:border-cm-accent/30 hover:shadow-xl hover:shadow-cm-accent/5 hover:-translate-y-1'
                        }`}
                      >
                        {/* Badges */}
                        {badges.length > 0 && (
                          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                            {badges.map((b, i) => (
                              <motion.span key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
                                className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-lg ${b.cls}`}>
                                {b.label}
                              </motion.span>
                            ))}
                          </div>
                        )}

                        {/* Image */}
                        {p.image ? (
                          <div className="w-full aspect-[4/3] overflow-hidden bg-cm-bg-alt">
                            <img src={p.image} alt={p.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="w-full aspect-[4/3] bg-gradient-to-br from-cm-accent/5 to-cm-bg-alt flex items-center justify-center">
                            <UtensilsCrossed className="w-10 h-10 text-cm-muted/20" />
                          </div>
                        )}

                        {/* Overlay gradient at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-cm-bg/70 to-transparent pointer-events-none" />

                        <div className="p-4 relative" onClick={e => e.stopPropagation()}>
                          <h3 className="text-base font-bold text-cm-text leading-tight line-clamp-2 group-hover:text-cm-accent transition-colors">{p.name}</h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <p className="text-lg font-black text-cm-accent">
                              S/ {(p.base_price ?? p.price ?? 0).toFixed(2)}
                            </p>
                            {p.compareAtPrice > (p.base_price ?? p.price ?? 0) && (
                              <span className="text-[11px] text-cm-text-tertiary line-through">S/ {p.compareAtPrice.toFixed(2)}</span>
                            )}
                          </div>

                          {p.description && (
                            <p className="text-[11px] text-cm-text-secondary mt-1.5 line-clamp-2 leading-relaxed">{p.description}</p>
                          )}

                          {/* Quantity controls */}
                          <div onClick={e => e.stopPropagation()}>
                            {outOfStock ? (
                              <button disabled
                                className="mt-3 w-full py-3 rounded-2xl bg-cm-bg-alt text-cm-text-tertiary text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed"
                              >
                                <Lock size={12} /> AGOTADO
                              </button>
                            ) : qty === 0 ? (
                              <motion.button
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                                onClick={hasWizard ? () => startWizard(p) : () => addToCart(p.id, p.name, p.base_price ?? p.price ?? 0)}
                                className="mt-3 w-full py-3 rounded-2xl bg-cm-accent text-white text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-cm-accent/20 hover:shadow-xl hover:shadow-cm-accent/30 transition-shadow"
                              >
                                <Plus size={16} /> {hasWizard ? 'PERSONALIZAR' : 'AGREGAR'}
                              </motion.button>
                            ) : (
                              <div className="mt-3 flex items-center justify-between bg-cm-accent/[0.08] rounded-2xl p-1.5 border border-cm-accent/10">
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => removeFromCart(p.id)}
                                  className="w-10 h-10 rounded-xl bg-cm-accent text-white flex items-center justify-center shadow-md"
                                >
                                  <Minus size={18} />
                                </motion.button>
                                <motion.span key={qty} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="font-black text-cm-text text-lg w-10 text-center">{qty}</motion.span>
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => addToCart(p.id, p.name, p.base_price ?? p.price ?? 0)}
                                  className="w-10 h-10 rounded-xl bg-cm-accent text-white flex items-center justify-center shadow-md"
                                >
                                  <Plus size={18} />
                                </motion.button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              );
            })()
          )}
        </div>

        {/* ── Wizard Modal ── */}
        <AnimatePresence>
          {wizardProduct && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center"
              onClick={closeWizard}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="bg-cm-surface w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-5 pb-2 shrink-0">
                  <div>
                    <h2 className="text-lg font-black text-cm-text">{wizardProduct.name}</h2>
                    <p className="text-xs text-cm-muted">Paso {wizardStepIndex + 1} de {(wizardProduct.steps || []).length}</p>
                  </div>
                  <button onClick={closeWizard} className="p-2 rounded-xl hover:bg-cm-bg-alt transition-colors">
                    <X className="w-5 h-5 text-cm-muted" />
                  </button>
                </div>

                {/* Progress bar */}
                {(wizardProduct.steps || []).length > 1 && (
                  <div className="flex gap-1 px-5 pb-3">
                    {(wizardProduct.steps || []).map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= wizardStepIndex ? 'bg-cm-accent' : 'bg-cm-border'}`} />
                    ))}
                  </div>
                )}

                {/* Step content */}
                <div className="flex-1 overflow-y-auto px-5 py-2">
                  {(wizardProduct.steps || []).map((step, si) => {
                    if (si !== wizardStepIndex) return null;
                    return (
                      <div key={step.id} className="space-y-4">
                        {step.title && <h3 className="text-sm font-bold text-cm-text">{step.title}</h3>}
                        {(step.options || []).map(opt => {
                          const selected = wizardSelections[step.id];
                          const isSelected = Array.isArray(selected) ? selected.includes(opt.id) : selected === opt.id;
                          return (
                            <motion.button
                              key={opt.id}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => updateWizardSelection(step.id, opt.id, step.type === 'multiple')}
                              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                                isSelected
                                  ? 'border-cm-accent bg-cm-accent/[0.06]'
                                  : 'border-cm-border bg-cm-bg-alt'
                              }`}
                            >
                              {opt.image && (
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-cm-surface shrink-0">
                                  <img src={opt.image} alt={opt.name} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-cm-text">{opt.name}</p>
                                {opt.price > 0 && (
                                  <p className="text-xs text-cm-accent font-bold">+S/ {opt.price.toFixed(2)}</p>
                                )}
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                isSelected ? 'border-cm-accent bg-cm-accent' : 'border-cm-muted'
                              }`}>
                                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="p-5 pt-3 shrink-0 border-t border-cm-border flex items-center justify-between gap-3">
                  <button onClick={wizardStepIndex > 0 ? prevWizardStep : closeWizard}
                    className="px-6 py-3 rounded-xl bg-cm-bg-alt text-cm-text font-bold text-sm">
                    {wizardStepIndex > 0 ? 'Atrás' : 'Cancelar'}
                  </button>
                  {wizardStepIndex < (wizardProduct.steps || []).length - 1 ? (
                    <button onClick={nextWizardStep}
                      className="flex-1 py-3 rounded-2xl bg-cm-accent text-white font-bold text-sm shadow-lg shadow-cm-accent/20 active:scale-95 transition-transform">
                      Siguiente
                    </button>
                  ) : (
                    <button onClick={handleWizardComplete}
                      className="flex-1 py-3 rounded-2xl bg-cm-accent text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cm-accent/20 active:scale-95 transition-transform">
                      <Plus size={16} /> Agregar al pedido
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {quickViewProduct && (
            <QuickViewModal
              product={quickViewProduct}
              qty={getQty(quickViewProduct.id)}
              unitPrice={quickViewProduct.base_price ?? quickViewProduct.price ?? 0}
              onAdd={() => addToCart(quickViewProduct.id, quickViewProduct.name, quickViewProduct.base_price ?? quickViewProduct.price ?? 0)}
              onRemove={() => removeFromCart(quickViewProduct.id)}
              onClose={() => setQuickViewProduct(null)}
            />
          )}
        </AnimatePresence>

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
                {promoDiscount > 0 ? (
                  <>
                    <span className="text-xs line-through text-cm-muted">S/ {cartTotal.toFixed(2)}</span>
                    <span className="text-lg font-bold text-cm-success">S/ {finalTotal.toFixed(2)}</span>
                  </>
                ) : (
                  <span className="text-lg">S/ {cartTotal.toFixed(2)}</span>
                )}
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
              cartTotal={cartTotal}
              finalTotal={finalTotal}
              promoDiscount={promoDiscount}
              bestPromo={bestPromo}
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
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              paymentMethods={paymentMethods}
              deliveryMode={deliveryMode}
              setDeliveryMode={setDeliveryMode}
              deliveryAddress={deliveryAddress}
              setDeliveryAddress={setDeliveryAddress}
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
        branchId={activeBranchId}
        branchName={activeBranch?.name}
        mesa={mesa}
        customerName={customerName}
        items={cartItems}
        orderStatus={orderStatus}
        onNewOrder={() => {
          setCartItems([]);
          setCustomerName('');
          setMesa('');
          setNotes('');
          setError('');
          setDoneOrderId('');
          setOrderStatus(null);
          setStep('menu');
        }}
      />
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════
function CartDrawer({
  cartItems, cartTotal, finalTotal, promoDiscount, bestPromo,
  customerName, setCustomerName,
  mesa, setMesa,
  notes, setNotes,
  addToCart, removeFromCart, clearCart,
  placing, error, onPlaceOrder, onClose,
  paymentMethod, setPaymentMethod, paymentMethods,
  deliveryMode, setDeliveryMode, deliveryAddress, setDeliveryAddress,
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
          {cartItems.map(item => (
            <div key={item.key} className="flex flex-col bg-cm-bg-alt rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-cm-text truncate">{item.name}</p>
                  <p className="text-xs text-cm-muted">S/ {item.unitPrice.toFixed(2)}</p>
                  {item.wizardSelections && getWizardSummary(item.wizardSelections) && (
                    <p className="text-[10px] text-cm-accent/70 mt-0.5 truncate">{getWizardSummary(item.wizardSelections)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <button onClick={() => removeFromCart(item.productId, item.wizardSelections)}
                    className="w-8 h-8 rounded-lg bg-cm-surface border border-cm-border flex items-center justify-center active:scale-90 transition-transform">
                    <Minus size={14} className="text-cm-muted" />
                  </button>
                  <span className="w-6 text-center font-black text-cm-text">{item.quantity}</span>
                  <button onClick={() => addToCart(item.productId, item.name, item.unitPrice, item.wizardSelections)}
                    className="w-8 h-8 rounded-lg bg-cm-accent text-white flex items-center justify-center active:scale-90 transition-transform">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Delivery / Pickup toggle ── */}
        <div className="mt-4">
          <label className="text-[10px] font-bold text-cm-muted uppercase tracking-wider mb-2 block">Modalidad</label>
          <div className="flex gap-2">
            <button onClick={() => { setDeliveryMode(false); setDeliveryAddress(''); }}
              className={`flex-1 py-3 rounded-xl border-2 text-xs font-bold transition-all ${
                !deliveryMode
                  ? 'border-cm-accent bg-cm-accent/[0.06] text-cm-accent'
                  : 'border-cm-border bg-cm-bg-alt text-cm-muted'
              }`}>
              <UtensilsCrossed className="w-4 h-4 mx-auto mb-1" />
              Recojo Local
            </button>
            <button onClick={() => setDeliveryMode(true)}
              className={`flex-1 py-3 rounded-xl border-2 text-xs font-bold transition-all ${
                deliveryMode
                  ? 'border-cm-accent bg-cm-accent/[0.06] text-cm-accent'
                  : 'border-cm-border bg-cm-bg-alt text-cm-muted'
              }`}>
              <Truck className="w-4 h-4 mx-auto mb-1" />
              Delivery
            </button>
          </div>
        </div>

        {/* ── Delivery address ── */}
        {deliveryMode && (
          <div className="mt-3">
            <label className="text-[10px] font-bold text-cm-muted uppercase tracking-wider mb-1 block">Dirección de entrega</label>
            <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
              placeholder="Ej: Av. Principal 123, Miraflores — ref: ..."
              className="w-full px-4 py-3 rounded-xl bg-cm-bg text-cm-text text-sm outline-none border-2 border-cm-border focus:border-cm-accent transition-colors"
            />
          </div>
        )}

        {/* ── Payment method ── */}
        <div className="mt-4">
          <label className="text-[10px] font-bold text-cm-muted uppercase tracking-wider mb-2 block">Método de pago</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPaymentMethod('pendiente')}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                paymentMethod === 'pendiente'
                  ? 'border-cm-accent bg-cm-accent/[0.06] text-cm-accent'
                  : 'border-cm-border bg-cm-bg-alt text-cm-muted'
              }`}
            >
              <Wallet className="w-5 h-5" />
              Pagar después
            </button>
            {paymentMethods.map(pm => (
              <button
                key={pm.id}
                onClick={() => setPaymentMethod(pm.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                  paymentMethod === pm.id
                    ? 'border-cm-accent bg-cm-accent/[0.06] text-cm-accent'
                    : 'border-cm-border bg-cm-bg-alt text-cm-muted'
                }`}
              >
                <pm.icon className="w-5 h-5" />
                {pm.label.split(' ')[0]}
              </button>
            ))}
          </div>
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
        <div className="mt-5 pt-4 border-t border-cm-border space-y-3">
          {promoDiscount > 0 && bestPromo && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-cm-success font-semibold">Descuento ({bestPromo.value}% {bestPromo.title})</span>
              <span className="text-cm-success font-bold">-S/ {promoDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <button onClick={clearCart} className="px-3 py-2 text-xs font-bold text-cm-muted hover:text-cm-danger transition-colors">
              Vaciar
            </button>
            <div className="flex items-center gap-4">
              <div className="text-right">
                {promoDiscount > 0 && <div className="text-[10px] text-cm-muted line-through">S/ {cartTotal.toFixed(2)}</div>}
                <span className="text-xl font-black text-cm-text">S/ {finalTotal.toFixed(2)}</span>
              </div>
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
        </div>
      </motion.div>
    </motion.div>
  );
}

function getWizardSummary(selections) {
  if (!selections) return '';
  return Object.values(selections).flat().filter(Boolean).join(', ');
}

// ═══════════════════════════════════════════════════
function QuickViewModal({ product, qty, unitPrice, onAdd, onRemove, onClose }) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: '100%', scale: 0.95 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="bg-cm-surface w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        {product.image && !imgError ? (
          <div className="w-full aspect-[16/9] overflow-hidden bg-cm-bg-alt">
            <img src={product.image} alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-full aspect-[16/9] bg-cm-accent/5 flex items-center justify-center">
            <UtensilsCrossed className="w-12 h-12 text-cm-muted/20" />
          </div>
        )}

        <div className="p-6 pt-5 space-y-4">
          <div>
            <h2 className="text-xl font-black text-cm-text">{product.name}</h2>
            {product.description && (
              <p className="text-sm text-cm-muted mt-2 leading-relaxed">{product.description}</p>
            )}
          </div>

          {/* Price row */}
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-cm-accent">
              S/ {(product.base_price ?? product.price ?? 0).toFixed(2)}
            </span>
            {product.compareAtPrice > (product.base_price ?? product.price ?? 0) && (
              <span className="text-sm text-cm-muted line-through">
                S/ {product.compareAtPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Extra info if available */}
          <div className="flex flex-wrap gap-3 text-xs text-cm-muted border-t border-cm-border pt-4">
            {product.stock != null && (
              <span className={product.stock > 0 ? 'text-cm-success' : 'text-cm-danger'}>
                {product.stock > 0 ? `${product.stock} en stock` : 'Agotado'}
              </span>
            )}
            {product.category && (
              <span className="bg-cm-bg-alt px-2 py-1 rounded-lg">{product.category}</span>
            )}
            {product.metadata?.orderCount > 0 && (
              <span>🔥 {product.metadata.orderCount} pedidos</span>
            )}
          </div>

          {/* Quantity selector */}
          <div className="flex items-center gap-4 pt-2">
            {qty === 0 ? (
              <button onClick={() => { onAdd(); onClose(); }}
                className="flex-1 py-3.5 rounded-2xl bg-cm-accent text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cm-accent/20 active:scale-95 transition-transform">
                <Plus size={18} /> AGREGAR AL PEDIDO
              </button>
            ) : (
              <>
                <div className="flex items-center bg-cm-accent/10 rounded-2xl p-1">
                  <button onClick={() => onRemove()}
                    className="w-11 h-11 rounded-xl bg-cm-accent text-white flex items-center justify-center active:scale-90 transition-transform">
                    <Minus size={18} />
                  </button>
                  <span className="font-black text-cm-text text-lg w-12 text-center">{qty}</span>
                  <button onClick={() => onAdd()}
                    className="w-11 h-11 rounded-xl bg-cm-accent text-white flex items-center justify-center active:scale-90 transition-transform">
                    <Plus size={18} />
                  </button>
                </div>
                <button onClick={onClose}
                  className="flex-1 py-3.5 rounded-2xl bg-cm-accent/10 text-cm-accent font-bold text-sm active:scale-95 transition-transform">
                  Listo
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════
function SuccessScreen({ orderId, branchId, branchName, mesa, customerName, items, orderStatus, onNewOrder }) {
  const [countdown, setCountdown] = useState(60);

  useSafeEffect('successCountdown', () => {
    if (countdown <= 0) { onNewOrder(); return undefined; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    function cleanup() { clearTimeout(t); }
    return cleanup;
  }, [countdown, onNewOrder]);

  const orderTotal = (items || []).reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const statusConfig = {
    pendiente: { label: 'Pendiente', color: 'text-cm-warning', bg: 'bg-cm-warning/10', pulse: true },
    preparando: { label: 'Preparando', color: 'text-cm-accent', bg: 'bg-cm-accent/10', pulse: true },
    listo: { label: 'Listo', color: 'text-cm-success', bg: 'bg-cm-success/10', pulse: false },
    entregado: { label: 'Entregado', color: 'text-cm-success', bg: 'bg-cm-success/10', pulse: false },
  };
  const status = statusConfig[orderStatus] || statusConfig.pendiente;

  return (
    <div className="min-h-screen bg-cm-bg flex flex-col p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
          className="w-20 h-20 bg-cm-success/10 rounded-full flex items-center justify-center mx-auto border-4 border-cm-success/20"
        >
          <Check className="w-10 h-10 text-cm-success" />
        </motion.div>

        <div className="text-center">
          <h1 className="text-2xl font-black text-cm-text">¡Pedido Enviado!</h1>
          <p className="text-xs text-cm-muted mt-1">
            Mesa <strong className="text-cm-text">{mesa || 'mostrador'}</strong>
            {customerName ? ` — ${customerName}` : ''}
          </p>
        </div>

        {/* Real-time order status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`${status.bg} border border-cm-border rounded-2xl p-5 text-center space-y-2`}
        >
          <p className="text-[10px] font-bold text-cm-muted uppercase tracking-widest">Estado del pedido</p>
          <div className="flex items-center justify-center gap-2">
            {status.pulse && (
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            )}
            <p className={`text-lg font-black ${status.color}`}>{status.label}</p>
          </div>
        </motion.div>

        <div className="bg-cm-surface border-2 border-cm-border rounded-2xl p-5 space-y-3">
          <div className="text-center">
            <p className="text-[10px] font-bold text-cm-muted uppercase tracking-widest">Código de seguimiento</p>
            <p className="font-mono text-2xl font-black text-cm-accent tracking-widest mt-1">
              #{orderId?.slice(-6).toUpperCase()}
            </p>
          </div>

          {/* Items ordered */}
          {items?.length > 0 && (
            <div className="border-t border-cm-border pt-3 space-y-1.5">
              {items.map(item => (
                <div key={item.key} className="flex flex-col text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-cm-text font-medium truncate mr-2">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="text-cm-muted shrink-0">
                      S/ {(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  {item.wizardSelections && getWizardSummary(item.wizardSelections) && (
                    <span className="text-[9px] text-cm-accent/60 ml-3">{getWizardSummary(item.wizardSelections)}</span>
                  )}
                </div>
              ))}
              <div className="border-t border-cm-border pt-1.5 flex justify-between text-sm font-bold text-cm-text">
                <span>Total</span>
                <span>S/ {orderTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-cm-muted text-center">
          Reinicio en <span className="font-black text-cm-text">{countdown}</span>s
        </p>

        <div className="flex gap-3">
          {orderId && branchId && (
            <button onClick={() => window.open(`/rastreo?id=${orderId}&branch=${branchId}`, '_blank')}
              className="flex-1 py-3 rounded-2xl bg-cm-surface border-2 border-cm-border text-cm-text font-bold text-sm flex items-center justify-center gap-2 hover:border-cm-accent/40 transition-all active:scale-95">
              <Navigation size={16} /> RASTREAR
            </button>
          )}
          <button onClick={() => window.print()}
            className="flex-1 py-3 rounded-2xl bg-cm-surface border-2 border-cm-border text-cm-text font-bold text-sm flex items-center justify-center gap-2 hover:border-cm-accent/40 transition-all active:scale-95">
            <Printer size={16} /> IMPRIMIR
          </button>
        </div>

        <button onClick={onNewOrder}
          className="w-full py-4 rounded-2xl bg-cm-accent text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cm-accent/20 active:scale-95 transition-transform">
          <RefreshCw size={16} /> NUEVO PEDIDO
        </button>
      </motion.div>
    </div>
  );
}
