import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { ordersService } from '../lib/ordersService';
import { menuService } from '../lib/menuService';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList, Search, LogOut, Plus, CheckCircle2,
  ChefHat, UtensilsCrossed, ShoppingBag, X, Loader2, User, Printer,
  Minus, Plus as PlusIcon, Save, DollarSign, ArrowLeft,
  Hash, Circle, CheckCircle, ChevronDown, Building2
} from 'lucide-react';
import StatusBadge from '../admin/components/StatusBadge';
import { printTicket } from '../lib/printTicket';

const STATUS_ORDER = ['recibido', 'preparando', 'listo', 'entregado'];
const STATUS_LABELS = {
  recibido: 'Recibido',
  preparando: 'En preparación',
  listo: 'Listo para servir',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};
const DEFAULT_MESAS = Array.from({ length: 12 }, (_, i) => i + 1);

function ProductDetailPanel({ product, catalog, onAdd, onBack }) {
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [wizardSelections, setWizardSelections] = useState({});
  const [wizardStep, setWizardStep] = useState(0);

  const variations = useMemo(() =>
    Object.entries(catalog.variations || {}).map(([id, data]) => ({ id, ...data })),
    [catalog.variations]
  );
  const modifiers = useMemo(() =>
    Object.entries(catalog.modifiers || {}).map(([id, data]) => ({ id, ...data })),
    [catalog.modifiers]
  );

  const steps = product.steps || [];
  const isWizard = product.isWizard;
  const currentStep = steps[wizardStep];

  const itemTotal = useMemo(() => {
    let total = product.base_price || product.price || 0;
    if (isWizard) {
      steps.forEach(step => {
        if (step.type === 'auto') {
          (step.options || []).forEach(opt => { total += opt.price || 0; });
          return;
        }
        const sel = wizardSelections[step.id];
        if (!sel) return;
        if (step.type === 'multiple' && Array.isArray(sel)) {
          sel.forEach(optId => {
            const opt = (step.options || []).find(o => o.id === optId);
            if (opt) total += opt.price || 0;
          });
        } else {
          const opt = (step.options || []).find(o => o.id === sel);
          if (opt) total += opt.price || 0;
        }
      });
    } else {
      if (selectedVariation) {
        const v = variations.find(v => v.id === selectedVariation);
        if (v?.adjustPrice) total += v.adjustPrice;
      }
      selectedModifiers.forEach(mId => {
        const m = modifiers.find(m => m.id === mId);
        if (m?.price) total += m.price;
      });
    }
    return total;
  }, [product, isWizard, steps, wizardSelections, selectedVariation, selectedModifiers, variations, modifiers]);

  const handleWizardToggle = (stepId, optionId, isMultiple) => {
    setWizardSelections(prev => {
      const current = prev[stepId];
      if (isMultiple) {
        const arr = Array.isArray(current) ? current : [];
        return { ...prev, [stepId]: arr.includes(optionId) ? arr.filter(id => id !== optionId) : [...arr, optionId] };
      }
      return { ...prev, [stepId]: current === optionId ? null : optionId };
    });
  };

  const buildDetails = () => {
    const d = [];
    if (isWizard) {
      steps.forEach(step => {
        if (step.type === 'auto') {
          (step.options || []).forEach(opt => d.push(`${step.title}: ${opt.name}`));
          return;
        }
        const sel = wizardSelections[step.id];
        if (!sel) return;
        if (step.type === 'multiple' && Array.isArray(sel)) {
          sel.forEach(optId => {
            const opt = (step.options || []).find(o => o.id === optId);
            if (opt) d.push(`${step.title}: ${opt.name}`);
          });
        } else {
          const opt = (step.options || []).find(o => o.id === sel);
          if (opt) d.push(`${step.title}: ${opt.name}`);
        }
      });
    } else {
      if (selectedVariation) {
        const v = variations.find(v => v.id === selectedVariation);
        if (v) d.push(v.name);
      }
      selectedModifiers.forEach(mId => {
        const m = modifiers.find(m => m.id === mId);
        if (m) d.push(m.name);
      });
    }
    return d;
  };

  const handleAdd = () => {
    const details = buildDetails();
    const wizardPayload = isWizard ? {
      wizardSelections: {
        ...wizardSelections,
        ...Object.fromEntries(
          steps.filter(s => s.type === 'auto').map(s => [s.id, (s.options || []).map(o => o.id)])
        ),
      }
    } : {};
    onAdd({
      productId: product.id,
      name: product.name,
      price: itemTotal,
      quantity: 1,
      details,
      ...wizardPayload,
    });
    onBack();
  };

  const canAdd = !isWizard || steps.every(s =>
    s.type === 'auto' || wizardSelections[s.id]
  );

  const toggleModifier = (modId) => {
    setSelectedModifiers(prev => prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId]);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-cm-text-secondary hover:text-cm-accent transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Volver a productos
      </button>

      <div className="bg-cm-bg-alt rounded-xl border border-cm-border p-4">
        <p className="text-base font-bold text-cm-text">{product.name}</p>
        <p className="text-sm text-cm-text-secondary mt-0.5">S/ {(product.base_price || product.price || 0).toFixed(2)}</p>
      </div>

      {isWizard && steps.length > 0 && (
        <div className="space-y-4">
          <div className="flex gap-1">
            {steps.map((s, idx) => (
              <div key={s.id} className={`h-1 flex-1 rounded-full transition-colors ${idx <= wizardStep ? 'bg-cm-accent' : 'bg-cm-border'}`} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={wizardStep} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              <p className="text-xs font-bold text-cm-text-secondary uppercase tracking-wider mb-3">{currentStep.title}</p>
              <div className="grid grid-cols-2 gap-2">
                {(currentStep.options || []).map(opt => {
                  const isMultiple = currentStep.type === 'multiple';
                  const sel = wizardSelections[currentStep.id];
                  const selected = isMultiple ? (Array.isArray(sel) && sel.includes(opt.id)) : sel === opt.id;
                  return (
                    <button key={opt.id} onClick={() => handleWizardToggle(currentStep.id, opt.id, isMultiple)}
                      className={`p-3 rounded-xl border-2 text-left transition-all text-xs ${selected ? 'bg-cm-accent/10 border-cm-accent text-cm-text' : 'bg-cm-bg-alt border-cm-border text-cm-text-secondary hover:border-cm-accent/50'}`}>
                      <p className="font-bold">{opt.name}</p>
                      {opt.price > 0 && <p className="text-cm-accent mt-0.5">+ S/ {opt.price.toFixed(2)}</p>}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3">
            {wizardStep > 0 && (
              <button onClick={() => setWizardStep(w => w - 1)} className="flex-1 py-2.5 border border-cm-border rounded-lg text-xs font-bold text-cm-text-secondary hover:bg-cm-surface-hover">Anterior</button>
            )}
            {wizardStep < steps.length - 1 ? (
              <button onClick={() => setWizardStep(w => w + 1)} disabled={currentStep.type !== 'multiple' && !wizardSelections[currentStep.id]}
                className="flex-1 py-2.5 bg-cm-accent text-white rounded-lg text-xs font-bold disabled:opacity-50">Siguiente</button>
            ) : null}
          </div>
        </div>
      )}

      {!isWizard && variations.length > 0 && (
        <div>
          <p className="text-xs font-bold text-cm-text-secondary uppercase tracking-wider mb-2">Variación</p>
          <div className="grid grid-cols-2 gap-2">
            {variations.map(v => (
              <button key={v.id} onClick={() => setSelectedVariation(v.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all text-xs ${selectedVariation === v.id ? 'bg-cm-accent/10 border-cm-accent text-cm-text' : 'bg-cm-bg-alt border-cm-border text-cm-text-secondary hover:border-cm-accent/50'}`}>
                <p className="font-bold">{v.name}</p>
                {v.adjustPrice > 0 && <p className="text-cm-accent mt-0.5">+ S/ {v.adjustPrice.toFixed(2)}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isWizard && modifiers.length > 0 && (
        <div>
          <p className="text-xs font-bold text-cm-text-secondary uppercase tracking-wider mb-2">Adicionales</p>
          <div className="grid grid-cols-2 gap-2">
            {modifiers.map(m => (
              <button key={m.id} onClick={() => toggleModifier(m.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all text-xs ${selectedModifiers.includes(m.id) ? 'bg-cm-accent/10 border-cm-accent text-cm-text' : 'bg-cm-bg-alt border-cm-border text-cm-text-secondary hover:border-cm-accent/50'}`}>
                <p className="font-bold">{m.name}</p>
                {m.price > 0 && <p className="text-cm-accent mt-0.5">+ S/ {m.price.toFixed(2)}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleAdd} disabled={!canAdd}
        className="w-full py-3 bg-cm-accent text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Agregar — S/ {itemTotal.toFixed(2)}
      </button>
    </div>
  );
}

function CobrarModal({ order, onClose, onPaid }) {
  const { activeBranchId } = useBranch();
  const { user } = useAuth();
  const [method, setMethod] = useState('Efectivo');
  const [loading, setLoading] = useState(false);

  const handleCobrar = async () => {
    setLoading(true);
    const result = await ordersService.markAsPaid(activeBranchId, order.id, method, user?.email);
    if (result.success) {
      onPaid();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-cm-surface rounded-xl shadow-cm-lg w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="text-lg font-bold text-cm-text mb-2">Cobrar Pedido</h3>
          <p className="text-sm text-cm-text-secondary mb-4">
            #{(order.id || '').slice(-4).toUpperCase()} — S/ {(order.financials?.total || order.total || 0).toFixed(2)}
          </p>
          <p className="text-xs font-semibold text-cm-text-secondary mb-3 uppercase tracking-wider">Método de pago</p>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {['Efectivo', 'Yape/Plin', 'Tarjeta (POS)'].map(m => (
              <button key={m} onClick={() => setMethod(m)}
                className={`py-3 rounded-xl text-xs font-semibold border transition-all ${method === m ? 'bg-cm-accent border-cm-accent text-white' : 'bg-cm-accent/5 border-cm-border text-cm-text-secondary'}`}>
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-cm-border rounded-lg text-xs font-bold text-cm-text-secondary hover:bg-cm-surface-hover transition-colors">Cancelar</button>
            <button onClick={handleCobrar} disabled={loading}
              className="flex-1 py-2.5 bg-cm-success text-white rounded-lg text-xs font-bold hover:bg-cm-success/80 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
              {loading ? 'Procesando...' : 'Cobrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewOrderModal({ activeBranchId, userEmail, catalog, onClose, onCreated, mesas }) {
  const tableList = mesas || DEFAULT_MESAS;
  const [customerName, setCustomerName] = useState('');
  const [mesa, setMesa] = useState(null);
  const [observaciones, setObservaciones] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const products = useMemo(() => {
    const all = Object.values(catalog.products || {}).filter(p => p.available !== false);
    let filtered = all;
    if (category) filtered = filtered.filter(p => p.category === category);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => p.name?.toLowerCase().includes(q));
    }
    return filtered;
  }, [catalog, search, category]);

  const categories = useMemo(() => {
    const set = new Set();
    Object.values(catalog.products || {}).forEach(p => p.category && set.add(p.category));
    return Array.from(set);
  }, [catalog]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === item.productId && JSON.stringify(i.details) === JSON.stringify(item.details));
      if (existing) {
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, id: crypto.randomUUID() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.productId !== productId) return i;
      const newQty = Math.max(1, i.quantity + delta);
      return { ...i, quantity: newQty };
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleSubmit = async () => {
    if (!customerName.trim() || cart.length === 0) return;
    setSaving(true);
    const items = cart.map(i => ({
      productId: i.productId,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      details: i.details || [],
      ...(i.wizardSelections ? { wizardSelections: i.wizardSelections } : {}),
    }));
    const result = await ordersService.createOrder(activeBranchId, {
      customerName: customerName.trim(),
      location: mesa ? `Mesa ${mesa}` : '',
      mesa,
      observaciones: observaciones.trim() || undefined,
      items,
      financials: { subtotal: total, total },
      total,
      order_type: 'mesa',
    }, userEmail);
    if (result.success) {
      onCreated();
      onClose();
    }
    setSaving(false);
  };

  const handleProductClick = (product) => {
    const hasVariations = Object.values(catalog.variations || {}).length > 0;
    const hasModifiers = Object.values(catalog.modifiers || {}).length > 0;
    const isWizard = product.isWizard;
    if (isWizard || hasVariations || hasModifiers) {
      setSelectedProduct(product);
    } else {
      addToCart({ productId: product.id, name: product.name, price: product.price || 0, quantity: 1, details: [] });
    }
  };

  const hasProductOptions = (product) => {
    return product.isWizard ||
      (product.name.includes('Tallarín') && !product.name.includes('Saltado de Pollo')) ||
      Object.values(catalog.variations || {}).length > 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-cm-surface rounded-xl shadow-cm-lg w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-cm-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-cm-text">Nuevo Pedido</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1">Cliente</label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:border-teal-500"
                placeholder="Nombre del cliente" />
            </div>
            <div>
              <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1">Mesa</label>
              <div className="grid grid-cols-6 gap-1.5">
                {tableList.map(n => (
                  <button key={n} onClick={() => setMesa(mesa === n ? null : n)}
                    className={`h-8 rounded-lg text-xs font-bold transition-all ${mesa === n ? 'bg-cm-accent text-white' : 'bg-cm-bg-alt border border-cm-border text-cm-text-secondary hover:border-cm-accent/50'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1">Observaciones</label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
              className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-sm text-cm-text focus:outline-none focus:border-teal-500 resize-none"
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
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-cm-bg-alt border border-cm-border rounded-lg text-sm text-cm-text focus:outline-none focus:border-teal-500"
                    placeholder="Buscar..." />
                </div>
              </div>

              {categories.length > 0 && (
                <div className="flex gap-1 overflow-x-auto pb-1">
                  <button onClick={() => setCategory('')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${!category ? 'bg-teal-500 text-white' : 'bg-cm-bg-alt border border-cm-border text-cm-text-secondary'}`}>
                    Todos
                  </button>
                  {categories.map(c => (
                    <button key={c} onClick={() => setCategory(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${category === c ? 'bg-teal-500 text-white' : 'bg-cm-bg-alt border border-cm-border text-cm-text-secondary'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {products.map(p => (
                  <button key={p.id} onClick={() => handleProductClick(p)}
                    className="bg-cm-bg-alt border border-cm-border rounded-lg p-3 text-left hover:border-teal-500 transition-colors text-xs">
                    <p className="font-bold text-cm-text truncate">{p.name}</p>
                    <p className="text-cm-text-secondary mt-0.5">S/ {((p.price || 0)).toFixed(2)}</p>
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
                {cart.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <p className="flex-1 text-sm font-semibold text-cm-text truncate">{item.name}</p>
                    {item.details?.length > 0 && (
                      <p className="text-[0.55rem] text-cm-text-tertiary truncate max-w-[100px]">{item.details.join(', ')}</p>
                    )}
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.productId, -1)} className="p-0.5 text-cm-text-secondary hover:text-cm-accent"><Minus className="w-3 h-3" /></button>
                      <span className="w-5 text-center text-sm font-bold text-cm-text">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, 1)} className="p-0.5 text-cm-text-secondary hover:text-cm-accent"><PlusIcon className="w-3 h-3" /></button>
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
          <button onClick={handleSubmit} disabled={!customerName.trim() || cart.length === 0 || saving}
            className="flex-1 py-2.5 bg-teal-500 text-white rounded-lg text-sm font-bold hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Creando...' : `Crear Pedido — S/ ${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MozoView() {
  const { branches, activeBranchId, setActiveBranchId } = useBranch();
  const { user, logout, hasBranchAccess } = useAuth();
  const [orders, setOrders] = useState([]);
  const [catalog, setCatalog] = useState({ products: {} });
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('activos');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [cobrarOrder, setCobrarOrder] = useState(null);
  const [tables, setTables] = useState(null);
  const [showBranchSelect, setShowBranchSelect] = useState(false);

  const accessibleBranches = useMemo(() => {
    return branches.filter(b => !hasBranchAccess || hasBranchAccess(b.id));
  }, [branches, hasBranchAccess]);

  useEffect(() => {
    if (accessibleBranches.length > 0 && activeBranchId) {
      const hasAccess = accessibleBranches.some(b => b.id === activeBranchId);
      if (!hasAccess) {
        setActiveBranchId(accessibleBranches[0].id);
      }
    }
  }, [accessibleBranches, activeBranchId, setActiveBranchId]);

  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = ordersService.subscribeToOrders(activeBranchId, setOrders);
    return unsub;
  }, [activeBranchId]);

  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = menuService.subscribeToCatalog(activeBranchId, (data) => {
      setCatalog(data);
    });
    return unsub;
  }, [activeBranchId]);

  useEffect(() => {
    if (!activeBranchId) { setTables(null); return; }
    const tablesRef = ref(db, `branches/${activeBranchId}/tables`);
    const unsub = onValue(tablesRef, (snap) => {
      const data = snap.val();
      if (Array.isArray(data) && data.length > 0) {
        setTables(data);
      } else {
        setTables(null);
      }
    });
    return unsub;
  }, [activeBranchId]);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (filter === 'activos') {
      result = result.filter(o => o.status !== 'entregado' && o.status !== 'cancelado');
    } else if (filter === 'entregados') {
      result = result.filter(o => o.status === 'entregado');
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.id || '').toLowerCase().includes(q) ||
        (o.location || '').toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, filter, searchQuery]);

  const updateStatus = async (orderId, newStatus) => {
    await ordersService.updateOrderStatus(activeBranchId, orderId, newStatus, user?.email);
  };

  const getNextStatus = (status) => {
    const idx = STATUS_ORDER.indexOf(status);
    return idx >= 0 && idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
  };

  const getPrevStatus = (status) => {
    const idx = STATUS_ORDER.indexOf(status);
    return idx > 0 ? STATUS_ORDER[idx - 1] : null;
  };

  const branchName = branches.find(b => b.id === activeBranchId)?.name || activeBranchId;

  return (
    <div className="min-h-screen bg-cm-bg">
      <header className="bg-cm-surface border-b border-cm-border px-4 py-3 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-cm-text">Mozo</h1>
              {accessibleBranches.length > 1 && (
                <div className="relative">
                  <button onClick={() => setShowBranchSelect(!showBranchSelect)}
                    className="flex items-center gap-1 px-2 py-0.5 bg-cm-bg-alt border border-cm-border rounded-md text-[0.6rem] font-bold text-cm-text-secondary hover:text-cm-text transition-colors">
                    <Building2 className="w-3 h-3" />
                    {branchName}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showBranchSelect && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowBranchSelect(false)} />
                      <div className="absolute top-full left-0 mt-1 z-20 bg-cm-surface border border-cm-border rounded-lg shadow-cm-lg py-1 min-w-[140px]">
                        {accessibleBranches.map(b => (
                          <button key={b.id} onClick={() => { setActiveBranchId(b.id); setShowBranchSelect(false); }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-semibold transition-colors ${b.id === activeBranchId ? 'bg-cm-accent/10 text-cm-accent' : 'text-cm-text-secondary hover:bg-cm-bg-alt'}`}>
                            {b.name || b.id}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-cm-text-secondary">{orders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado').length} activos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-cm-text-secondary hidden sm:inline">{user?.name || user?.email}</span>
          <button onClick={() => setShowNewOrder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuevo Pedido
          </button>
          <button onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-error/10 hover:bg-cm-error/20 border border-cm-error/20 rounded-lg text-xs font-bold text-cm-error transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Salir
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente o mesa..."
              className="w-full pl-9 pr-4 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-teal-500" />
          </div>
          <div className="flex gap-1">
            {['activos', 'entregados', 'todos'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  filter === f ? 'bg-teal-500 text-white' : 'bg-cm-surface border border-cm-border text-cm-text-secondary hover:bg-cm-accent/5'
                }`}>
                {f === 'activos' ? 'Activos' : f === 'entregados' ? 'Entregados' : 'Todos'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <ClipboardList className="w-12 h-12 text-cm-text-tertiary mx-auto mb-3" />
              <p className="font-semibold text-cm-text-secondary">No hay pedidos {filter === 'activos' ? 'activos' : filter === 'entregados' ? 'entregados' : ''}</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const nextStatus = getNextStatus(order.status);
              const prevStatus = getPrevStatus(order.status);
              const isPaid = order.payment_status === 'pagado';
              const isActive = order.status !== 'entregado' && order.status !== 'cancelado';
              return (
                <div key={order.id} className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-cm-text-secondary">#{(order.id || '').slice(-4).toUpperCase()}</span>
                        <StatusBadge status={order.status} />
                        {order.createdBy && <span className="text-[0.6rem] text-cm-text-tertiary">por {order.createdBy}</span>}
                        {isPaid && (
                          <span className="text-[0.55rem] font-bold text-cm-success bg-cm-success/10 border border-cm-success/20 px-1.5 py-0.5 rounded-full">Pagado</span>
                        )}
                      </div>
                      <p className="font-bold text-cm-text mt-1">{order.customerName || 'Anónimo'}</p>
                      {order.location && (
                        <p className="text-xs text-cm-text-secondary flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3" /> {order.location}
                        </p>
                      )}
                      {order.observaciones && (
                        <p className="text-[0.6rem] text-cm-warning font-semibold mt-1.5 bg-cm-warning/10 border border-cm-warning/20 rounded-md px-2 py-1 leading-tight inline-block">
                          📝 {order.observaciones}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <p className="text-lg font-black text-cm-text">S/ {(order.financials?.total || order.total || 0).toFixed(2)}</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => printTicket(order)}
                          className="p-1.5 rounded-lg bg-cm-accent/5 border border-cm-border text-cm-text-secondary hover:text-cm-accent hover:border-cm-accent/30 transition-colors"
                          title="Imprimir comanda">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {order.items && order.items.length > 0 && (
                    <div className="bg-cm-bg-alt rounded-lg p-3 mb-3 space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm items-start">
                          <div>
                            <span className="text-cm-text">x{item.quantity || 1} {item.name}</span>
                            {item.details?.length > 0 && (
                              <p className="text-[0.55rem] text-cm-text-tertiary ml-3">{item.details.join(' • ')}</p>
                            )}
                          </div>
                          <span className="text-cm-text-secondary font-medium text-xs whitespace-nowrap ml-2">
                            S/ {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex gap-2 flex-1">
                      {isActive && prevStatus && (
                        <button onClick={() => updateStatus(order.id, prevStatus)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-warning/10 text-cm-warning text-xs font-bold rounded-lg hover:bg-cm-warning/20 transition-colors">
                          ← {STATUS_LABELS[prevStatus]}
                        </button>
                      )}
                      {isActive && nextStatus && (
                        <button onClick={() => updateStatus(order.id, nextStatus)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 text-teal-600 text-xs font-bold rounded-lg hover:bg-teal-500/20 transition-colors">
                          {STATUS_LABELS[nextStatus]} →
                        </button>
                      )}
                      {order.status === 'listo' && (
                        <button onClick={() => updateStatus(order.id, 'entregado')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-success/10 text-cm-success text-xs font-bold rounded-lg hover:bg-cm-success/20 transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Entregar
                        </button>
                      )}
                    </div>

                    {order.status === 'entregado' && !isPaid && (
                      <button onClick={() => setCobrarOrder(order)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-accent/10 text-cm-accent text-xs font-bold rounded-lg hover:bg-cm-accent/20 transition-colors">
                        <DollarSign className="w-3.5 h-3.5" /> Cobrar
                      </button>
                    )}
                  </div>

                  <p className="text-[0.55rem] text-cm-text-tertiary mt-2">
                    {new Date(order.createdAt).toLocaleString('es-PE')}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showNewOrder && (
        <NewOrderModal
          activeBranchId={activeBranchId}
          userEmail={user?.email}
          catalog={catalog}
          mesas={tables}
          onClose={() => setShowNewOrder(false)}
          onCreated={() => setFilter('activos')}
        />
      )}

      {cobrarOrder && (
        <CobrarModal
          order={cobrarOrder}
          onClose={() => setCobrarOrder(null)}
          onPaid={() => setFilter('activos')}
        />
      )}
    </div>
  );
}
