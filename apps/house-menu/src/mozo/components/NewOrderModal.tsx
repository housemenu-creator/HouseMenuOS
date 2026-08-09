import { useState, useMemo } from 'react';
import { Search, X, Minus, Plus as PlusIcon, Save, Loader2, Wallet, Banknote, Smartphone, CreditCard, Clock, Truck } from 'lucide-react';
import { ordersService } from '../../lib/ordersService';
import ProductDetailPanel from './ProductDetailPanel';
import { isRequired } from '@house/validation';

const PAYMENT_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente', icon: Clock, desc: 'Pagar después en caja', status: 'pendiente' },
  { value: 'efectivo', label: 'Efectivo', icon: Banknote, desc: 'Pago en efectivo', status: 'pagado' },
  { value: 'yape', label: 'Yape', icon: Smartphone, desc: 'Yape — pendiente de verificar', status: 'por_verificar' },
  { value: 'plin', label: 'Plin', icon: Smartphone, desc: 'Plin — pendiente de verificar', status: 'por_verificar' },
  { value: 'tarjeta', label: 'Tarjeta POS', icon: CreditCard, desc: 'Pago con tarjeta', status: 'pagado' },
  { value: 'contraentrega', label: 'Contraentrega', icon: Truck, desc: 'Paga al recibir el pedido', status: 'contraentrega' },
] as const;

interface NewOrderModalProps {
  activeBranchId: string;
  userEmail: string;
  catalog: { products?: Record<string, any>; variations?: Record<string, any>; modifiers?: Record<string, any> };
  onClose: () => void;
  onCreated: () => void;
  /** Optional — recibe el orderId al crear, para encadenar pago */
  onCreatedWithId?: (orderId: string, data: { customerName: string; total: number; mesa?: number | null }) => void;
  mesas: number[] | null;
}

export default function NewOrderModal({ activeBranchId, userEmail, catalog, onClose, onCreated, onCreatedWithId, mesas }: NewOrderModalProps) {
  const tableList = mesas;
  const [customerName, setCustomerName] = useState('');
  const [mesa, setMesa] = useState<number | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [nameError, setNameError] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('pendiente');

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
      return [...prev, { ...item, id: crypto.randomUUID() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.id !== id ? i : { ...i, quantity: Math.max(1, i.quantity + delta) }
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const total = cart.reduce((s: number, i: any) => s + i.price * i.quantity, 0);

  const handleSubmit = async () => {
    // Validate
    const nameCheck = isRequired(customerName, 'El nombre del cliente');
    setNameError(nameCheck.valid ? '' : (nameCheck.error ?? ''));
    setCreateError(null);
    if (!nameCheck.valid) return;
    if (cart.length === 0) return;
    setSaving(true);
    const items = cart.map((i: any) => ({
      productId: i.productId,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      details: i.details || [],
      ...(i.wizardSelections ? { wizardSelections: i.wizardSelections } : {}),
    }));
    const payOption = PAYMENT_OPTIONS.find(p => p.value === paymentMethod)!;
    const result = await ordersService.createOrder(activeBranchId, {
      customerName: customerName.trim(),
      location: mesa ? `Mesa ${mesa}` : '',
      mesa,
      observaciones: observaciones.trim() || undefined,
      items,
      financials: { subtotal: total, total },
      total,
      order_type: 'mesa',
      payment_method: payOption.label,
      payment_status: payOption.status,
    }, userEmail);
    setSaving(false);
    if (result.success) {
      onCreatedWithId?.(result.orderId, { customerName: customerName.trim(), total, mesa });
      onCreated();
      onClose();
    } else {
      setCreateError(result.message || 'Error al crear el pedido. Intenta de nuevo.');
    }
  };

  const productHasVariations = (product: any) =>
    Object.values(catalog.variations || {}).some((v: any) => v.productId === product.id);
  const productHasModifiers = (product: any) =>
    Object.values(catalog.modifiers || {}).some((m: any) => m.productId === product.id);

  const handleProductClick = (product: any) => {
    if (product.isWizard || productHasVariations(product) || productHasModifiers(product)) {
      setSelectedProduct(product);
    } else {
      addToCart({ productId: product.id, name: product.name, price: product.base_price ?? product.price ?? 0, quantity: 1, details: [] });
    }
  };

  const hasProductOptions = (product: any) => {
    return product.isWizard || productHasVariations(product) || productHasModifiers(product);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-cm-surface rounded-xl shadow-cm-lg w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-cm-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-cm-text">Nuevo Pedido</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1">Cliente</label>
              <input type="text" value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); if (nameError) setNameError(''); }}
                onBlur={() => { const c = isRequired(customerName, 'El nombre del cliente'); setNameError(c.valid ? '' : (c.error ?? '')); }}
                className={`w-full bg-cm-bg-alt border rounded-lg px-3 py-2.5 text-sm text-cm-text focus:outline-none ${nameError ? 'border-cm-error' : 'border-cm-border focus:border-cm-accent'}`}
                placeholder="Nombre del cliente" />
              {nameError && <p className="text-[0.6rem] font-bold text-cm-error mt-1">{nameError}</p>}
            </div>
                <div>
              <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1">Mesa</label>
              {tableList ? (
                <div className="grid grid-cols-6 gap-1.5">
                  {tableList.map((n: number) => (
                    <button key={n} onClick={() => setMesa(mesa === n ? null : n)}
                      className={`h-8 rounded-lg text-xs font-bold transition-all ${mesa === n ? 'bg-cm-accent text-white' : 'bg-cm-bg-alt border border-cm-border text-cm-text-secondary hover:border-cm-accent/50'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-cm-text-secondary italic">Cargando mesas...</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1">Observaciones</label>
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
              className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-sm text-cm-text focus:outline-none focus:border-cm-accent resize-none"
              rows={2} placeholder="Notas para la cocina..." />
          </div>

          {selectedProduct ? (
            <ProductDetailPanel product={selectedProduct} catalog={catalog} onAdd={addToCart} onBack={() => setSelectedProduct(null)} />
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1">Buscar producto</label>
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

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {products.map((p: any) => (
                  <button key={p.id} onClick={() => handleProductClick(p)}
                    className="bg-cm-bg-alt border border-cm-border rounded-lg p-3 text-left hover:border-cm-accent transition-colors text-xs">
                    <p className="font-bold text-cm-text truncate">{p.name}</p>
                    <p className="text-cm-text-secondary mt-0.5">S/ {((p.base_price ?? p.price ?? 0)).toFixed(2)}</p>
                    {hasProductOptions(p) && <p className="text-[0.55rem] text-cm-accent font-semibold mt-1">✦ Personalizar</p>}
                  </button>
                ))}
                {products.length === 0 && (
                  <p className="col-span-full text-center text-sm text-cm-text-secondary py-4">Sin resultados</p>
                )}
              </div>
            </>
          )}

              {cart.length > 0 && (
            <div className="bg-cm-bg-alt rounded-xl border border-cm-border p-4">
              <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-3">Pedido actual</p>
              <div className="space-y-2">
                {cart.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <p className="flex-1 text-sm font-semibold text-cm-text truncate">{item.name}</p>
                    {item.details?.length > 0 && (
                      <div className="text-[0.5rem] text-cm-text-tertiary ml-1 space-y-0.5">
                        {item.details.map((d: string, dIdx: number) => <p key={dIdx} className="border-l-2 border-cm-border pl-1.5">{d}</p>)}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.id, -1)} className="p-0.5 text-cm-text-secondary hover:text-cm-accent"><Minus className="w-3 h-3" /></button>
                      <span className="w-5 text-center text-sm font-bold text-cm-text">{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="p-0.5 text-cm-text-secondary hover:text-cm-accent"><PlusIcon className="w-3 h-3" /></button>
                    </div>
                    <p className="text-sm font-bold text-cm-text w-16 text-right">S/ {(item.price * item.quantity).toFixed(2)}</p>
                    <button onClick={() => removeFromCart(item.id)} className="p-0.5 text-cm-error/60 hover:text-cm-error"><X className="w-3 h-3" /></button>
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

        {cart.length > 0 && (
          <div className="px-5">
            <p className="text-[0.55rem] font-bold text-cm-muted uppercase tracking-widest mb-2">Medio de pago</p>
            <div className="grid grid-cols-5 gap-1.5">
              {PAYMENT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setPaymentMethod(opt.value)}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-all ${
                    paymentMethod === opt.value
                      ? 'border-cm-accent bg-cm-accent/10 ring-1 ring-cm-accent/30'
                      : 'border-cm-border bg-cm-bg-alt hover:border-cm-text-tertiary'
                  }`}>
                  <opt.icon className={`w-4 h-4 ${paymentMethod === opt.value ? 'text-cm-accent' : 'text-cm-text-tertiary'}`} />
                  <span className={`text-[0.5rem] font-bold leading-tight text-center ${paymentMethod === opt.value ? 'text-cm-accent' : 'text-cm-text-secondary'}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {createError && (
          <div className="px-5 pb-0 pt-2">
            <p className="text-[0.6rem] font-bold text-cm-error bg-cm-error/10 border border-cm-error/30 rounded-lg px-3 py-2 text-center">{createError}</p>
          </div>
        )}
        <div className="p-5 border-t border-cm-border flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-cm-border rounded-lg text-sm font-semibold text-cm-text-secondary hover:bg-cm-surface-hover transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={!customerName.trim() || cart.length === 0 || saving}
            className="flex-1 py-2.5 bg-cm-accent text-white rounded-lg text-sm font-bold hover:bg-cm-accent-hover disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Creando...' : `Crear Pedido — S/ ${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
