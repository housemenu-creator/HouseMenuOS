import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { ShoppingCart, Minus, Plus, X, Check, Send, Smartphone, Lock, Loader2 } from 'lucide-react';
import { useBranch } from '../../context/BranchContext';
import { ordersService } from '../../lib/ordersService';

export default function KioskMode() {
  const { activeBranchId, activeBranch } = useBranch();
  const [catalog, setCatalog] = useState(null);
  const [cart, setCart] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState(false);
  const [kioskEnabled, setKioskEnabled] = useState(null); // null = loading

  // Check if kiosk is enabled
  useEffect(() => {
    if (!activeBranchId) return;
    const enabledRef = ref(db, `branches/${activeBranchId}/config/kioskEnabled`);
    const unsub = onValue(enabledRef, (snap) => setKioskEnabled(!!snap.val()));
    return unsub;
  }, [activeBranchId]);

  // Subscribe to catalog
  useEffect(() => {
    if (!activeBranchId) return;
    const productsRef = ref(db, `branches/${activeBranchId}/catalog/products`);
    const unsub = onValue(productsRef, (snap) => {
      const data = snap.val();
      if (data) setCatalog(data);
    });
    return unsub;
  }, [activeBranchId]);

  // Kiosk disabled / loading state
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
            Consultá con el encargado para activarlo.
          </p>
        </div>
      </div>
    );
  }

  // Group by category
  const categories = useMemo(() => {
    if (!catalog) return {};
    const groups = {};
    Object.entries(catalog).forEach(([id, p]) => {
      if (p.available === false) return;
      const cat = p.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ id, ...p });
    });
    return groups;
  }, [catalog]);

  const cartItems = useMemo(() => {
    return Object.entries(cart).filter(([_, q]) => q > 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((acc, [id, q]) => {
      const p = catalog?.[id];
      return acc + ((p?.base_price ?? p?.price ?? 0)) * q;
    }, 0);
  }, [cartItems, catalog]);

  const addToCart = (productId) => {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[productId] <= 1) delete next[productId];
      else next[productId]--;
      return next;
    });
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    setPlacing(true);
    const items = cartItems.map(([id, qty]) => ({
      productId: id,
      id,
      name: catalog[id]?.name || id,
      quantity: qty,
      price: catalog[id]?.base_price ?? catalog[id]?.price ?? 0,
    }));
    const result = await ordersService.createOrder(activeBranchId, {
      customerName: customerName.trim() || 'Cliente Kiosko',
      items,
      total: cartTotal,
      source: 'kiosko',
    });
    setPlacing(false);
    if (result.success) {
      setDone(true);
      setCart({});
      setCustomerName('');
      setTimeout(() => setDone(false), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cm-accent/5 to-cm-accent/5 p-4 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-cm-text flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-cm-accent" />
            Auto-Pedido
          </h1>
          <p className="text-sm text-cm-muted">{activeBranch?.name || 'Menú Digital'}</p>
        </div>
        <motion.button
          onClick={() => setShowCart(!showCart)}
          className="relative p-3 rounded-full bg-cm-accent text-white shadow-lg"
          whileTap={{ scale: 0.9 }}
          aria-label="Ver carrito"
        >
          <ShoppingCart size={22} />
          {cartItems.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-cm-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartItems.length}
            </span>
          )}
        </motion.button>
      </header>

      {/* Success banner */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 p-4 bg-cm-success text-white rounded-xl text-center font-bold"
          >
            <Check className="w-5 h-5 inline mr-2" />
            Pedido enviado a la cocina
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu */}
      {!catalog ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-cm-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(categories).map(([cat, products]) => (
            <div key={cat}>
              <h2 className="text-lg font-extrabold text-cm-text mb-3 capitalize">{cat}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.map((p) => {
                  const inCart = cart[p.id] || 0;
                  return (
                    <motion.button
                      key={p.id}
                      onClick={() => addToCart(p.id)}
                      className={`relative p-4 rounded-2xl text-left border-2 transition-all ${
                        inCart > 0
                          ? 'bg-cm-accent/10 border-cm-accent'
                          : 'bg-cm-surface border-cm-border hover:border-cm-accent/30'
                      }`}
                      whileTap={{ scale: 0.95 }}
                      aria-label={`Agregar ${p.name} al carrito`}
                    >
                      {p.image && (
                        <img src={p.image} alt={p.name} className="w-full h-20 object-cover rounded-lg mb-2" />
                      )}
                      <h3 className="text-sm font-bold text-cm-text">{p.name}</h3>
                      <p className="text-xs text-cm-muted mt-0.5">S/ {(p.base_price ?? p.price ?? 0).toFixed(2)}</p>
                      {inCart > 0 && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-cm-accent text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {inCart}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart Modal */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowCart(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-cm-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold text-cm-text">Tu Pedido</h2>
                <button onClick={() => setShowCart(false)} aria-label="Cerrar carrito">
                  <X className="w-5 h-5 text-cm-muted" />
                </button>
              </div>

              {cartItems.length === 0 ? (
                <p className="text-center text-cm-muted py-10">Carrito vacío</p>
              ) : (
                <div className="space-y-3">
                  {cartItems.map(([id, qty]) => {
                    const p = catalog?.[id];
                    return (
                      <div key={id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-cm-text">{p?.name || id}</p>
                          <p className="text-xs text-cm-muted">S/ {((p?.price || 0)).toFixed(2)} c/u</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(id)}
                            className="p-1.5 rounded-full bg-cm-border text-cm-muted"
                            aria-label="Reducir cantidad"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center font-bold text-cm-text">{qty}</span>
                          <button
                            onClick={() => addToCart(id)}
                            className="p-1.5 rounded-full bg-cm-accent/10 text-cm-accent"
                            aria-label="Aumentar cantidad"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {cartItems.length > 0 && (
                <>
                  <div className="mt-4 pt-4 border-t border-cm-border">
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Tu nombre (opcional)"
                      className="w-full px-4 py-3 rounded-xl bg-cm-bg text-cm-text text-sm outline-none border-2 border-cm-border focus:border-cm-accent transition-colors"
                      aria-label="Nombre del cliente"
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-extrabold text-cm-text">S/ {cartTotal.toFixed(2)}</span>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={placing}
                      className="px-6 py-3 bg-cm-accent text-white rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {placing ? 'Enviando...' : <><Send size={16} /> Enviar Pedido</>}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
