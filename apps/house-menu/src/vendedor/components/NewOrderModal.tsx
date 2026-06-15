import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Minus, Plus, Save, Loader2, Calendar, MapPin } from 'lucide-react';
import { ordersService } from '../../lib/ordersService';
import type { VendedorCuenta } from '../vendedorTypes';

interface NewOrderModalProps {
  cuenta: VendedorCuenta;
  activeBranchId: string;
  userEmail: string;
  catalog: { products?: Record<string, any>; variations?: Record<string, any>; modifiers?: Record<string, any> };
  onClose: () => void;
  onCreated: () => void;
}

export default function NewOrderModal({ cuenta, activeBranchId, userEmail, catalog, onClose, onCreated }: NewOrderModalProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [deliveryAddressId, setDeliveryAddressId] = useState(cuenta.deliveryAddresses?.[0]?.id || '');
  const [scheduledDate, setScheduledDate] = useState('');

  const products = useMemo(() => {
    const all = Object.entries(catalog.products || {})
      .map(([id, p]) => ({ ...(p as any), id }))
      .filter((p: any) => p.available !== false);
    let filtered = all;
    if (category) filtered = filtered.filter((p: any) => p.category === category);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((p: any) => p.name?.toLowerCase().includes(q));
    }
    return filtered;
  }, [catalog, search, category]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    Object.entries(catalog.products || {}).forEach(([, p]) => (p as any).category && set.add((p as any).category));
    return Array.from(set);
  }, [catalog]);

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.productId === item.productId && JSON.stringify(i.details) === JSON.stringify(item.details)
      );
      if (existing) {
        return prev.map((i) => (i === existing ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, id: crypto.randomUUID() }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const total = cart.reduce((s: number, i: any) => s + i.price * i.quantity, 0);

  const selectedAddress = cuenta.deliveryAddresses?.find((a) => a.id === deliveryAddressId);

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setSaving(true);

    const items = cart.map((i: any) => ({
      productId: i.productId,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      details: i.details || [],
    }));

    const orderData: any = {
      customerName: cuenta.name,
      items,
      financials: { subtotal: total, total },
      total,
      order_type: 'cuenta',
      cuentaId: cuenta.id,
      observaciones: observaciones.trim() || undefined,
      cuentaLegalName: cuenta.legalName,
      cuentaTaxId: cuenta.taxId,
    };

    if (selectedAddress) {
      orderData.location = selectedAddress.address;
      orderData.deliveryAddress = selectedAddress;
    }

    if (scheduledDate) {
      orderData.deliveryDate = scheduledDate;
      orderData.isScheduled = true;
    }

    const result = await ordersService.createOrder(activeBranchId, orderData, userEmail);
    if (result.success) {
      onCreated();
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-cm-surface rounded-xl shadow-cm-lg w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-cm-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-cm-text">Nuevo Pedido</h2>
            <p className="text-xs text-cm-text-secondary">{cuenta.name}{cuenta.taxId ? ` · RUC ${cuenta.taxId}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            {cuenta.deliveryAddresses && cuenta.deliveryAddresses.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1.5">
                  <MapPin className="w-3 h-3 inline mr-1" />Dirección de entrega
                </label>
                <select value={deliveryAddressId} onChange={(e) => setDeliveryAddressId(e.target.value)}
                  className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:border-cm-accent">
                  {cuenta.deliveryAddresses.map((addr) => (
                    <option key={addr.id} value={addr.id}>{addr.label}: {addr.address}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />Programar entrega
              </label>
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:border-cm-accent" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1.5">Observaciones</label>
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
              className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-sm text-cm-text focus:outline-none focus:border-cm-accent resize-none"
              rows={2} placeholder="Notas para el pedido..." />
          </div>

          <div>
            <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1.5">Buscar producto</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-cm-bg-alt border border-cm-border rounded-lg text-sm text-cm-text focus:outline-none focus:border-cm-accent"
                placeholder="Buscar..." />
            </div>
          </div>

          {categories.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-1">
              <button onClick={() => setCategory('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${!category ? 'bg-cm-accent text-white' : 'bg-cm-bg-alt border border-cm-border text-cm-text-secondary'}`}>
                Todos
              </button>
              {categories.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${category === c ? 'bg-cm-accent text-white' : 'bg-cm-bg-alt border border-cm-border text-cm-text-secondary'}`}>
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {products.map((p: any) => (
              <button key={p.id} onClick={() => addToCart({ productId: p.id, name: p.name, price: p.base_price ?? p.price ?? 0, quantity: 1, details: [] })}
                className="bg-cm-bg-alt border border-cm-border rounded-lg p-3 text-left hover:border-cm-accent transition-colors text-xs">
                <p className="font-bold text-cm-text truncate">{p.name}</p>
                <p className="text-cm-text-secondary mt-0.5">S/ {((p.base_price ?? p.price ?? 0)).toFixed(2)}</p>
              </button>
            ))}
            {products.length === 0 && (
              <p className="col-span-full text-center text-sm text-cm-text-secondary py-4">Sin resultados</p>
            )}
          </div>

          {cart.length > 0 && (
            <div className="bg-cm-bg-alt rounded-xl border border-cm-border p-4">
              <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-3">Pedido actual</p>
              <div className="space-y-2">
                {cart.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <p className="flex-1 text-sm font-semibold text-cm-text truncate">{item.name}</p>
                    {item.details?.length > 0 && (
                      <p className="text-[0.55rem] text-cm-text-tertiary truncate max-w-[100px]">{item.details.join(', ')}</p>
                    )}
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.productId, -1)} className="p-0.5 text-cm-text-secondary hover:text-cm-accent"><Minus className="w-3 h-3" /></button>
                      <span className="w-5 text-center text-sm font-bold text-cm-text">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, 1)} className="p-0.5 text-cm-text-secondary hover:text-cm-accent"><Plus className="w-3 h-3" /></button>
                    </div>
                    <p className="text-sm font-bold text-cm-text w-16 text-right">S/ {(item.price * item.quantity).toFixed(2)}</p>
                    <button onClick={() => removeFromCart(item.productId)} className="p-0.5 text-cm-error/60 hover:text-cm-error"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
              <div className="border-t border-cm-border mt-3 pt-3 flex justify-between items-center">
                <span className="text-xs font-semibold text-cm-text-secondary">Total</span>
                <span className="text-lg font-black text-cm-text">S/ {total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-cm-border flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-cm-border rounded-lg text-sm font-semibold text-cm-text-secondary hover:bg-cm-surface-hover transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={cart.length === 0 || saving}
            className="flex-1 py-2.5 bg-cm-accent text-white rounded-lg text-sm font-bold hover:bg-cm-accent/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Creando...' : `Crear Pedido — S/ ${total.toFixed(2)}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
