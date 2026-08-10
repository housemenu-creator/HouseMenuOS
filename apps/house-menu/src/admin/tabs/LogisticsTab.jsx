import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Plus, Edit3, Trash2, Search, ClipboardList, Truck, TrendingUp,
  ArrowUpDown, AlertTriangle, CheckCircle, X, Loader2, Save, History, DollarSign, Store,
  BarChart3, Clock, MessageCircle, ShoppingCart, Copy, Download, Settings2, Upload,
} from 'lucide-react';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { ref as dbRef, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import {
  subscribeIngredients, createIngredient, updateIngredient, deleteIngredient,
  subscribeRecipes, createRecipe, updateRecipe, deleteRecipe,
  subscribeSuppliers, createSupplier, updateSupplier, deleteSupplier,
  subscribeCategories, createCategory, renameCategory, deleteCategory,
  subscribePurchaseOrders, createPurchaseOrder, updatePurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder,
  createPreOrder, confirmPreOrder, attachVoucher,
  subscribeMovements, registerMovement,
} from '../../lib/logisticsService';
import { setIngredientPrice } from '../../lib/pricingService';
import { subscribeWaste, createWaste, approveWaste } from '../../lib/wasteService';
import { storageService, validateVoucherFile } from '../../lib/storageService';
import { nowISO } from '../../lib/format';
import { extractVoucher, AI_STEPS_EXTRACT_VOUCHER } from '../../lib/aiService';
import { fuzzyMatch } from '../../lib/voucherMatch';
import { downscaleImage } from '../../lib/imageUtils';
import InlineEdit from '../components/InlineEdit';
import DirectVoucherModal from '../components/logistics/DirectVoucherModal';

const SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'ingredients', label: 'Insumos', icon: Package },  { key: 'recipes', label: 'Recetas', icon: ClipboardList },
  { key: 'movements', label: 'Kardex', icon: History },
  { key: 'suppliers', label: 'Proveedores', icon: Truck },
  { key: 'orders', label: 'Compras', icon: ArrowUpDown },
  { key: 'cogs', label: 'COGS', icon: DollarSign },
  { key: 'waste', label: 'Mermas', icon: Trash2 },
];

function fmtCurrency(n) { return `S/ ${Number(n).toFixed(2)}`; }

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// 8.1 — Rollout gradual: la UI de voucher OCR solo se muestra con VITE_ENABLE_VOUCHER_OCR=true.
// Se lee en cada render para permitir pruebas con stubEnv.
const voucherOcrEnabled = () => import.meta.env.VITE_ENABLE_VOUCHER_OCR === 'true';

// Fallback categories while DB config loads (kept in sync by migration)
const DEFAULT_CATEGORIES = [
  'Verduras', 'Abarrotes', 'Condimentos', 'Frutas', 'Proteinas',
  'Embutidos', 'Locales', 'Energeticos', 'Servicios', 'Secos y Abarrotes',
];

// ── Loading skeleton ──
function SectionSkeleton({ rows = 4 }) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-8 w-48 bg-cm-border rounded" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-cm-surface border border-cm-border rounded-xl" />
      ))}
    </div>
  );
}

// ── State wrapper ──
function SectionContainer({ loading, error, data, emptyMsg, onRetry, children }) {
  if (error) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="w-10 h-10 text-cm-error mb-3" />
      <p className="text-sm font-medium text-cm-text-secondary">{error}</p>
      {onRetry && <button onClick={onRetry} className="mt-3 px-4 py-2 bg-cm-accent text-white text-xs font-bold rounded-lg hover:bg-cm-accent-hover">Reintentar</button>}
    </div>
  );
  if (loading) return <SectionSkeleton />;
  if (!data?.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Package className="w-10 h-10 text-cm-muted mb-3" />
      <p className="text-sm font-medium text-cm-text-secondary">{emptyMsg || 'Sin registros'}</p>
    </div>
  );
  return children;
}

const sectionVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function LogisticsTab() {
  const { activeBranchId } = useBranch();
  const { user } = useAuth();
  const [section, setSection] = useState('ingredients');

  // ── Centralized real-time data (shared across all sections) ──
  const [ingredients, setIngredients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [movements, setMovements] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [waste, setWaste] = useState([]);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState({});

  useEffect(() => {
    if (!activeBranchId) return;
    setLoaded({});
    setError(null);
    const mark = (k) => setLoaded(p => ({ ...p, [k]: true }));
    const subs = [
      subscribeIngredients(activeBranchId, (d) => { setIngredients(d); mark('ing'); }),
      subscribeSuppliers(activeBranchId, (d) => { setSuppliers(d); mark('sup'); }),
      subscribeCategories(activeBranchId, (d) => { setCategories(d); mark('cat'); }),
      subscribeRecipes(activeBranchId, (d) => { setRecipes(d); mark('rec'); }),
      subscribeMovements(activeBranchId, (d) => { setMovements(d); mark('mov'); }),
      subscribePurchaseOrders(activeBranchId, (d) => { setPurchaseOrders(d); mark('ord'); }),
      subscribeWaste(activeBranchId, (d) => { setWaste(d); mark('wst'); }),
    ];
    const prodRef = dbRef(db, `branches/${activeBranchId}/catalog/products`);
    const unsubProd = onValue(prodRef, (snap) => {
      const d = snap.val();
      setProducts(d ? Object.entries(d).map(([id, p]) => ({ id, ...p })) : []);
      mark('prd');
    }, (e) => setError(e.message));

    return () => { subs.forEach(u => u?.()); unsubProd(); };
  }, [activeBranchId]);

  // Derive COGS from recipes (avoids duplicate /recipes listener)
  const cogs = useMemo(() => {
    const map = {};
    recipes.forEach(r => {
      if (r.productId) map[r.productId] = { recipeId: r.id, productName: r.productName, costPerPortion: r.costPerPortion || 0 };
    });
    return map;
  }, [recipes]);

  const loading = !loaded.ing || !loaded.sup || !loaded.cat || !loaded.rec || !loaded.mov || !loaded.ord || !loaded.prd || !loaded.wst;

  // ── Toast ──
  const [toastMsg, setToastMsg] = useState(null);
  useEffect(() => { if (toastMsg) { const t = setTimeout(() => setToastMsg(null), 2500); return () => clearTimeout(t); } }, [toastMsg]);
  const toast = useCallback((msg) => setToastMsg(msg), []);

  if (!activeBranchId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-cm-accent/10 flex items-center justify-center mb-4">
          <Store className="w-8 h-8 text-cm-accent" />
        </div>
        <h2 className="text-lg font-bold text-cm-text">Seleccioná una sucursal</h2>
        <p className="text-sm text-cm-muted font-medium mt-1">Necesitás una sucursal activa para gestionar logística.</p>
      </div>
    );
  }

  const SectionComponent = SECTION_MAP[section];
  const sharedProps = {
    branchId: activeBranchId, userEmail: user?.email,
    loading, error, toast,
    ingredients, suppliers, categories,
    recipes, movements, purchaseOrders, products, waste, cogs,
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="w-5 h-5 text-cm-accent" />
        <h2 className="text-lg font-bold text-cm-text">Logística</h2>
      </div>

      <nav className="segmented overflow-x-auto w-full">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.key} onClick={() => setSection(s.key)}
              className={`${section === s.key ? 'active' : ''} whitespace-nowrap`}>
              <Icon className="w-4 h-4" /> {s.label}
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          variants={sectionVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          <SectionComponent key={section} {...sharedProps} />
        </motion.div>
      </AnimatePresence>

      {toastMsg && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]">
          <div className="bg-cm-text text-cm-bg text-xs font-semibold px-4 py-2.5 rounded-xl shadow-cm-lg flex items-center gap-2 whitespace-nowrap">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            {toastMsg}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ─── MULTI CHIP SELECT (toggle chips for supplierIds/categories) ─── */
function MultiChip({ options, selected, onChange, placeholder = 'Ninguno', size = 'sm' }) {
  const [open, setOpen] = useState(false);
  const toggle = (v) => {
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  };
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex flex-wrap items-center gap-1 bg-cm-surface border border-cm-border rounded-lg px-2 py-1.5 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text hover:border-cm-accent/40 transition-colors text-left min-h-[2rem]">
        {selected.length === 0 && <span className="text-cm-text-tertiary">{placeholder}</span>}
        {selected.map(v => {
          const opt = options.find(o => o.value === v);
          return <span key={v} className="inline-flex items-center gap-1 bg-cm-accent/10 text-cm-accent text-[0.65rem] font-semibold px-1.5 py-0.5 rounded-full">
            {opt?.label ?? v}
            <button type="button" onClick={(e) => { e.stopPropagation(); toggle(v); }} className="hover:text-cm-error"><X className="w-2.5 h-2.5" /></button>
          </span>;
        })}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto bg-cm-surface border border-cm-border rounded-lg shadow-cm-lg py-1">
            {options.map(o => (
              <button type="button" key={o.value} onClick={() => toggle(o.value)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-cm-accent/5 ${selected.includes(o.value) ? 'text-cm-accent font-semibold' : 'text-cm-text'}`}>
                {o.label}
                {selected.includes(o.value) && <CheckCircle className="w-3.5 h-3.5" />}
              </button>
            ))}
            {options.length === 0 && <p className="px-3 py-2 text-xs text-cm-text-tertiary">Sin opciones</p>}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── INLINE SELECT (same UX as InlineEdit, but for options) ─── */
function InlineSelect({ value, options, onSave, placeholder = '—' }) {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setVal(value); }, [value]);

  useEffect(() => {
    if (isEditing && ref.current) ref.current.focus();
  }, [isEditing]);

  const handleSave = async () => {
    if (val !== value) {
      setSaving(true);
      try { await onSave(val); } catch { setVal(value); }
      setSaving(false);
    } else { setVal(value); }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setVal(value); setIsEditing(false); }
  };

  if (isEditing) {
    return (
      <div className="relative inline-flex items-center">
        <select
          ref={ref}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className="bg-cm-surface border-2 border-cm-accent/40 rounded px-1 py-0.5 outline-none focus:border-cm-accent focus:ring-2 focus:ring-cm-accent/20 disabled:opacity-50 text-xs"
        >
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {saving && <Loader2 className="w-3 h-3 ml-1 animate-spin text-cm-accent shrink-0" />}
      </div>
    );
  }

  return (
    <span onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-cm-accent/10 rounded px-1 -ml-1 transition-colors group/edit ${value ? '' : 'text-cm-text-tertiary'}`}
      title="Clic para editar">
      {value ? (options.find(o => o.value === value)?.label ?? value) : placeholder}
    </span>
  );
}

/* ─── INSUMOS ─── */
function IngredientsSection({ branchId, userEmail, ingredients, suppliers, categories, loading, error, toast }) {
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', unit: 'kg', stock: 0, minStock: 0, cost: 0, supplierIds: [], categories: [] });
  const [adjustIng, setAdjustIng] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', editingId: null });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Categories from DB, falling back to defaults until they load
  const categoryNames = useMemo(() => {
    if (categories.length > 0) return categories.map(c => c.name);
    return DEFAULT_CATEGORIES;
  }, [categories]);

  const supplierMap = useMemo(() => {
    const map = {};
    suppliers.forEach(s => { map[s.id] = s.name; });
    return map;
  }, [suppliers]);

  // Inline field save — same UX as menu builder
  const saveField = async (ing, field, value) => {
    await updateIngredient(branchId, ing.id, { [field]: value }, userEmail);
    toast('Insumo actualizado');
  };

  const filtered = useMemo(() => {
    let result = ingredients;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i => i.name?.toLowerCase().includes(q));
    }
    if (supplierFilter) {
      result = result.filter(i => (i.supplierIds || []).includes(supplierFilter));
    }
    if (categoryFilter) {
      result = result.filter(i => (i.categories || []).includes(categoryFilter));
    }
    if (lowOnly) {
      result = result.filter(i => i.minStock > 0 && i.stock <= i.minStock);
    }
    return result;
  }, [ingredients, search, supplierFilter, categoryFilter, lowOnly]);

  const resetForm = () => { setForm({ name: '', unit: 'kg', stock: 0, minStock: 0, cost: 0, supplierIds: [], categories: [] }); setEditing(null); setFormError(''); };

  const handleSave = async () => {
    setFormError('');
    const name = form.name.trim();
    if (!name) { setFormError('El nombre del insumo es obligatorio.'); return; }
    if (Number(form.cost) < 0 || Number(form.minStock) < 0 || Number(form.stock) < 0) {
      setFormError('Stock, stock mínimo y costo no pueden ser negativos.');
      return;
    }
    if (form.supplierIds.length > 0 && Number(form.cost) <= 0) {
      setFormError('Asigná un costo mayor a 0 cuando el insumo tiene proveedor.');
      return;
    }
    const dup = ingredients.find(i => i.id !== editing && (i.name || '').trim().toLowerCase() === name.toLowerCase());
    if (dup) { setFormError(`Ya existe un insumo llamado "${dup.name}".`); return; }
    const payload = { ...form, name };
    setSaving(true);
    try {
      if (editing) {
        await updateIngredient(branchId, editing, payload, userEmail);
        toast('Insumo actualizado');
      } else {
        const result = await createIngredient(branchId, payload, userEmail);
        toast('Insumo creado');
        // Mostrar el insumo nuevo en la tabla (limpia búsqueda y scrollea hasta él)
        setSearch('');
        if (result?.id) {
          setTimeout(() => document.getElementById(`ing-row-${result.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
        }
      }
      resetForm(); setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este insumo?')) return;
    await deleteIngredient(branchId, id, userEmail);
    toast('Insumo eliminado');
  };

  const lowStock = ingredients.filter(i => i.minStock > 0 && i.stock <= i.minStock);

  if (error) return <SectionContainer error={error} loading={false} data={[]} />;
  if (loading) return <SectionContainer loading error={null} data={[]} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
            <input type="text" placeholder="Buscar insumo..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-64 bg-cm-bg-alt border border-cm-border rounded-lg pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
          </div>
          <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}
            className="w-36 bg-cm-surface border border-cm-border rounded-lg px-2 py-2 text-xs font-medium text-cm-text">
            <option value="">Todos los proveedores</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="w-36 bg-cm-surface border border-cm-border rounded-lg px-2 py-2 text-xs font-medium text-cm-text">
            <option value="">Todas las categorías</option>
            {categoryNames.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => { setCatForm({ name: '', editingId: null }); setShowCatManager(true); }}
            className="flex items-center gap-1 px-2 py-2 text-xs font-semibold text-cm-accent hover:bg-cm-accent/10 rounded-lg transition-colors" title="Gestionar categorías">
            <Settings2 className="w-3.5 h-3.5" /> Categorías
          </button>
          {lowStock.length > 0 && (
            <button onClick={() => setLowOnly(!lowOnly)}
              className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                lowOnly ? 'text-cm-warning bg-cm-warning/10 px-2 py-1 rounded-lg' : 'text-cm-warning hover:opacity-80'
              }`}>
              <AlertTriangle className="w-4 h-4" /> {lowStock.length} con stock bajo
            </button>
          )}
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nuevo insumo
        </button>
      </div>

      {showForm && (
        <div className="bg-cm-bg-alt border border-cm-border rounded-xl p-4 space-y-3"
          onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); handleSave(); } }}>
          {formError && <p className="text-xs font-semibold text-cm-error bg-cm-error/5 px-3 py-1.5 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            <div>
              <label htmlFor="ing-name" className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase block mb-1">Nombre <span className="text-cm-error">*</span></label>
              <input id="ing-name" type="text" placeholder="Ej: Tomate" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
            </div>
            <div>
              <label htmlFor="ing-unit" className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase block mb-1">Unidad</label>
              <select id="ing-unit" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text">
                <option value="kg">kg</option><option value="gr">gr</option><option value="litro">litro</option>
                <option value="ml">ml</option><option value="unidad">unidad</option><option value="docena">docena</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase block mb-1">Categorías</label>
              <MultiChip options={categoryNames.map(c => ({ value: c, label: c }))} selected={form.categories}
                onChange={cats => setForm({ ...form, categories: cats })} placeholder="Elegir" />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase block mb-1">Proveedores</label>
              <MultiChip options={suppliers.map(s => ({ value: s.id, label: s.name }))} selected={form.supplierIds}
                onChange={ids => setForm({ ...form, supplierIds: ids })} placeholder="Elegir" />
            </div>
            <div>
              <label htmlFor="ing-stock" className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase block mb-1">Stock inicial</label>
              <input id="ing-stock" type="number" placeholder="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
                className="w-full bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
            </div>
            <div>
              <label htmlFor="ing-min" className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase block mb-1">Stock mínimo</label>
              <input id="ing-min" type="number" placeholder="0" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })}
                className="w-full bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
            </div>
            <div>
              <label htmlFor="ing-cost" className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase block mb-1">Costo x unidad</label>
              <input id="ing-cost" type="number" step="0.01" placeholder="0.00" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })}
                className="w-full bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-3 py-1.5 text-xs font-semibold text-cm-text-secondary hover:text-cm-text transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {editing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-clip">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-cm-text-secondary border-b border-cm-border bg-cm-bg-alt/50">
              <th className="text-left font-semibold py-3 pl-4 pr-4">Insumo</th>
              <th className="text-left font-semibold py-3 px-3">Categoría</th>
              <th className="text-left font-semibold py-3 px-3">Proveedor</th>
              <th className="text-center font-semibold py-3 px-3">Stock</th>
              <th className="text-center font-semibold py-3 px-3">Mín.</th>
              <th className="text-center font-semibold py-3 px-3">Ud.</th>
              <th className="text-right font-semibold py-3 px-3">Costo x ud.</th>
              <th className="text-right font-semibold py-3 pl-3 pr-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => {
              const isLow = i.minStock > 0 && i.stock <= i.minStock;
              return (
                <tr key={i.id} id={`ing-row-${i.id}`} className="border-b border-cm-border/50 hover:bg-cm-accent/5 transition-colors">
                  <td className="py-3 pl-4 pr-4 font-medium text-cm-text">
                    <InlineEdit value={i.name} onSave={v => saveField(i, 'name', v)} className="font-medium" />
                  </td>
                  <td className="py-3 px-3 min-w-[8rem]">
                    <MultiChip options={categoryNames.map(c => ({ value: c, label: c }))} selected={i.categories || []}
                      onChange={cats => saveField(i, 'categories', cats)} placeholder="Sin categoría" />
                  </td>
                  <td className="py-3 px-3 min-w-[10rem]">
                    <MultiChip options={suppliers.map(s => ({ value: s.id, label: s.name }))} selected={i.supplierIds || []}
                      onChange={ids => saveField(i, 'supplierIds', ids)} placeholder="Sin proveedor" />
                  </td>
                  <td className={`py-3 px-3 text-center font-bold ${isLow ? 'text-cm-error' : 'text-cm-text'}`}>
                    <button onClick={() => { setAdjustIng(i); const deficit = Math.max(0, (i.minStock || 0) - (i.stock || 0)); setAdjustQty(deficit > 0 ? String(deficit) : ''); setAdjustReason(deficit > 0 ? 'Reponer stock mínimo' : ''); }}
                      className="hover:text-cm-accent transition-colors" title="Ajustar stock">{i.stock ?? 0}</button>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <InlineEdit value={i.minStock ?? 0} type="number" onSave={v => saveField(i, 'minStock', Number(v))} className="text-center" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <InlineSelect value={i.unit || ''} onSave={v => saveField(i, 'unit', v)}
                      options={['kg', 'gr', 'litro', 'ml', 'unidad', 'docena'].map(u => ({ value: u, label: u }))} placeholder="—" />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <InlineEdit value={i.cost ?? 0} type="number" step="0.01" onSave={v => saveField(i, 'cost', Number(v))} className="text-right w-16" />
                  </td>
                  <td className="py-3 pl-3 pr-4 text-right">
                    <button onClick={() => { setForm({ name: i.name, unit: i.unit, categories: i.categories || [], supplierIds: i.supplierIds || [], stock: i.stock, minStock: i.minStock, cost: i.cost }); setEditing(i.id); setFormError(''); setShowForm(true); }}
                      className="p-1.5 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(i.id)} className="p-1.5 rounded-lg hover:bg-cm-error/10 text-cm-text-secondary transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adjustIng && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setAdjustIng(null)}>
          <div className="bg-cm-surface rounded-xl shadow-cm-lg p-5 w-full max-w-xs mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-cm-text mb-1">Ajustar stock</h3>
            <p className="text-xs text-cm-text-secondary mb-3">{adjustIng.name} (actual: {adjustIng.stock} {adjustIng.unit})</p>
            <div className="flex gap-2 mb-3">
              <input type="number" placeholder="Cantidad" value={adjustQty} onChange={e => setAdjustQty(e.target.value)}
                className="flex-1 bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs text-cm-text" />
            </div>
            <input type="text" placeholder="Motivo del ajuste" value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
              className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs text-cm-text mb-3" />
            <div className="flex gap-2">
                <button onClick={async () => {
                const qty = Number(adjustQty);
                if (!qty || !adjustReason) return;
                await registerMovement(branchId, {
                  ingredientId: adjustIng.id,
                  type: qty > 0 ? 'entrada' : 'salida',
                  quantity: Math.abs(qty),
                  unit: adjustIng.unit,
                  reason: `Ajuste: ${adjustReason}`,
                  cost: 0,
                  createdBy: userEmail || 'system',
                });
                toast('Stock ajustado');
                setAdjustIng(null);
              }} className="flex-1 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover">
                Aplicar
              </button>
              <button onClick={() => setAdjustIng(null)} className="px-4 py-2 border border-cm-border text-xs font-semibold text-cm-text rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category Manager Modal ── */}
      {showCatManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCatManager(false)}>
          <div className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-cm-text mb-1">Categorías de insumos</h3>
            <p className="text-xs text-cm-text-secondary mb-4">Se usan para organizar y filtrar insumos. Renombrar actualiza todos los insumos de esa categoría.</p>

            <div className="flex gap-2 mb-4">
              <input type="text" placeholder={catForm.editingId ? 'Nuevo nombre...' : 'Nueva categoría...'} value={catForm.name}
                onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                onKeyDown={async (e) => {
                  if (e.key !== 'Enter' || !catForm.name.trim()) return;
                  if (catForm.editingId) {
                    const old = categories.find(c => c.id === catForm.editingId);
                    await renameCategory(branchId, catForm.editingId, old?.name, catForm.name, userEmail);
                    toast('Categoría renombrada');
                  } else {
                    await createCategory(branchId, catForm.name, userEmail);
                    toast('Categoría creada');
                  }
                  setCatForm({ name: '', editingId: null });
                }}
                className="flex-1 bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text placeholder:text-cm-text-tertiary" />
              <button onClick={async () => {
                if (!catForm.name.trim()) return;
                if (catForm.editingId) {
                  const old = categories.find(c => c.id === catForm.editingId);
                  await renameCategory(branchId, catForm.editingId, old?.name, catForm.name, userEmail);
                  toast('Categoría renombrada');
                } else {
                  await createCategory(branchId, catForm.name, userEmail);
                  toast('Categoría creada');
                }
                setCatForm({ name: '', editingId: null });
              }} className="px-3 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover">
                <Save className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {categoryNames.map(c => {
                const cat = categories.find(x => x.name === c);
                const count = ingredients.filter(i => (i.categories || []).includes(c)).length;
                return (
                  <div key={c} className="flex items-center gap-2 bg-cm-bg-alt rounded-lg px-3 py-2">
                    {catForm.editingId === cat?.id ? (
                      <span className="text-xs text-cm-accent font-semibold flex-1">Editando...</span>
                    ) : (
                      <span className="text-xs font-medium text-cm-text flex-1">{c} <span className="text-cm-text-tertiary">({count})</span></span>
                    )}
                    <button onClick={() => { setCatForm({ name: c, editingId: cat?.id || null }); }}
                      className="p-1 rounded hover:bg-cm-accent/10 text-cm-text-secondary transition-colors" title="Renombrar">
                      <Edit3 className="w-3 h-3" />
                    </button>
                    {cat && (
                      <button onClick={async () => {
                        if (!confirm(`¿Eliminar la categoría "${c}"? Los insumos conservan su categoría como texto libre.`)) return;
                        await deleteCategory(branchId, cat.id, c, userEmail);
                        toast('Categoría eliminada');
                      }} className="p-1 rounded hover:bg-cm-error/10 text-cm-text-secondary transition-colors" title="Eliminar">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={() => setShowCatManager(false)} className="mt-4 w-full py-2 border border-cm-border text-xs font-semibold text-cm-text rounded-lg hover:bg-cm-bg-alt transition-colors">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── RECETAS ─── */
function RecipesSection({ branchId, userEmail, recipes, ingredients, products, loading, error, toast }) {
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ productId: '', productName: '', yield: 1, ingredients: [] });

  const resetForm = () => { setForm({ productId: '', productName: '', yield: 1, ingredients: [] }); setEditing(null); setFormError(''); };

  const handleSave = async () => {
    setFormError('');
    if (!form.productId) { setFormError('Debés seleccionar un producto para la receta.'); return; }
    if (form.ingredients.length === 0) { setFormError('Agregá al menos un ingrediente.'); return; }
    const data = {
      productId: form.productId || null,
      productName: form.productName || products.find(p => p.id === form.productId)?.name || '',
      yield: Number(form.yield) || 1,
      ingredients: form.ingredients,
    };
    if (editing) {
      await updateRecipe(branchId, editing, data, userEmail);
      toast('Receta actualizada');
    } else {
      await createRecipe(branchId, data, userEmail);
      toast('Receta creada');
    }
    resetForm(); setShowForm(false);
  };

  const addIngredientLine = () => {
    const firstIng = ingredients[0];
    setForm({ ...form, ingredients: [...form.ingredients, { ingredientId: firstIng?.id || '', name: firstIng?.name || '', quantity: 0, unit: firstIng?.unit || 'kg', unitCost: firstIng?.cost || 0 }] });
  };

  const updateIngredientLine = (idx, field, value) => {
    const ings = [...form.ingredients];
    ings[idx] = { ...ings[idx], [field]: value };
    if (field === 'ingredientId') {
      const ing = ingredients.find(i => i.id === value);
      if (ing) { ings[idx].name = ing.name; ings[idx].unit = ing.unit; ings[idx].unitCost = ing.cost || 0; }
    }
    setForm({ ...form, ingredients: ings });
  };

  const removeIngredientLine = (idx) => {
    setForm({ ...form, ingredients: form.ingredients.filter((_, i) => i !== idx) });
  };

  const totalCost = form.ingredients.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitCost) || 0), 0);
  const filtered = useMemo(() => {
    if (!searchQuery) return recipes;
    const q = searchQuery.toLowerCase();
    return recipes.filter(r => (r.productName || '').toLowerCase().includes(q));
  }, [recipes, searchQuery]);

  if (error) return <SectionContainer error={error} loading={false} data={[]} />;
  if (loading) return <SectionContainer loading error={null} data={[]} rows={3} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-cm-text-tertiary" />
          <input type="text" placeholder="Buscar receta..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 bg-cm-surface border border-cm-border rounded-lg text-xs text-cm-text placeholder:text-cm-text-tertiary" />
        </div>
        <span className="text-xs text-cm-text-secondary">{recipes.length} receta(s)</span>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nueva receta
        </button>
      </div>

      {showForm && (
        <div className="bg-cm-bg-alt border border-cm-border rounded-xl p-4 space-y-4">
          {products.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-cm-text-secondary mb-2">No hay productos en el catálogo.</p>
              <p className="text-[0.6rem] text-cm-text-secondary">Creá productos en la sección Productos primero.</p>
            </div>
          ) : (
          <>  
          {formError && <p className="text-xs font-semibold text-cm-error bg-cm-error/5 px-3 py-1.5 rounded-lg">{formError}</p>}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase block mb-1">Producto <span className="text-cm-error">*</span></label>
              <select value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value, productName: products.find(p => p.id === e.target.value)?.name || '' })}
                className="w-full bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text">
                <option value="">Seleccionar producto...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase block mb-1">Rinde (porciones)</label>
              <input type="number" min="1" value={form.yield} onChange={e => setForm({ ...form, yield: e.target.value })}
                className="w-full bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
            </div>
            <div>
              <label className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase block mb-1">Costo x porción</label>
              <div className="px-3 py-2 text-xs font-bold text-cm-accent bg-cm-surface border border-cm-border rounded-lg">{fmtCurrency(form.yield > 0 ? totalCost / Number(form.yield) : 0)}</div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase">Ingredientes</label>
              <button onClick={addIngredientLine} className="text-xs font-semibold text-cm-accent hover:underline">+ Agregar insumo</button>
            </div>
            {form.ingredients.length === 0 && <p className="text-xs text-cm-text-secondary py-2">Agrega ingredientes a la receta</p>}
            {form.ingredients.map((ing, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <select value={ing.ingredientId} onChange={e => updateIngredientLine(idx, 'ingredientId', e.target.value)}
                  className="flex-[2] bg-cm-surface border border-cm-border rounded-lg px-2 py-1.5 text-xs font-medium text-cm-text">
                  <option value="">Seleccionar...</option>
                  {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({fmtCurrency(i.cost || 0)}/{i.unit})</option>)}
                </select>
                <input type="number" step="0.01" placeholder="Cant." value={ing.quantity} onChange={e => updateIngredientLine(idx, 'quantity', e.target.value)}
                  className="w-16 bg-cm-surface border border-cm-border rounded-lg px-2 py-1.5 text-xs font-medium text-cm-text" />
                <span className="text-[0.6rem] text-cm-text-secondary w-8">{ing.unit}</span>
                <span className="text-xs text-cm-text-secondary w-14 text-right">{(Number(ing.quantity) * Number(ing.unitCost)).toFixed(2)}</span>
                <button onClick={() => removeIngredientLine(idx)} className="p-1 rounded hover:bg-cm-error/10 text-cm-text-secondary"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-3 py-1.5 text-xs font-semibold text-cm-text-secondary hover:text-cm-text">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-1.5 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> {editing ? 'Guardar' : 'Crear'}
            </button>
          </div>
          </>
          )}
        </div>
      )}

      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-clip">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-cm-text-secondary border-b border-cm-border bg-cm-bg-alt/50">
              <th className="text-left font-semibold py-3 pl-4 pr-4">Producto</th>
              <th className="text-center font-semibold py-3 px-3">Porciones</th>
              <th className="text-center font-semibold py-3 px-3">Ingredientes</th>
              <th className="text-right font-semibold py-3 px-3">Costo x porción</th>
              <th className="text-right font-semibold py-3 pl-3 pr-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan="5" className="text-center py-8 text-xs text-cm-text-secondary">Sin resultados</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-cm-border/50 hover:bg-cm-accent/5 transition-colors">
                <td className="py-3 pl-4 pr-4 font-medium text-cm-text">{r.productName}</td>
                <td className="py-3 px-3 text-center text-cm-text">{r.yield}</td>
                <td className="py-3 px-3 text-center text-cm-text-secondary">{r.ingredients ? Object.keys(r.ingredients).length : 0}</td>
                <td className="py-3 px-3 text-right font-bold text-cm-accent">{fmtCurrency(r.costPerPortion || 0)}</td>
                <td className="py-3 pl-3 pr-4 text-right">
                  <button onClick={() => {
                    const ings = r.ingredients ? Object.entries(r.ingredients).map(([id, ing]) => ({ ingredientId: id, ...ing })) : [];
                    setForm({ productId: r.productId || '', productName: r.productName, yield: r.yield, ingredients: ings });
                    setEditing(r.id);
                    setShowForm(true);
                  }} className="p-1.5 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => {
                    const ings = r.ingredients ? Object.entries(r.ingredients).map(([id, ing]) => ({ ingredientId: id, ...ing })) : [];
                    setForm({ productId: '', productName: '', yield: r.yield, ingredients: ings });
                    setEditing(null);
                    setShowForm(true);
                    toast('Receta duplicada — ajustá el producto');
                  }} className="p-1.5 rounded-lg hover:bg-cm-info/10 text-cm-text-secondary" title="Duplicar"><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteRecipe(branchId, r.id, userEmail).then(() => toast('Receta eliminada'))} className="p-1.5 rounded-lg hover:bg-cm-error/10 text-cm-text-secondary"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── KARDEX ─── */
function MovementsSection({ branchId, movements, ingredients, loading, error, toast }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [ingFilter, setIngFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('all'); // all, 7d, 30d

  const ingMap = useMemo(() => {
    const map = {};
    ingredients.forEach(i => { map[i.id] = i; });
    return map;
  }, [ingredients]);

  const now = useMemo(() => Date.now(), []);

  const filtered = useMemo(() => {
    let result = movements;
    if (typeFilter !== 'all') result = result.filter(m => m.type === typeFilter);
    if (ingFilter) result = result.filter(m => m.ingredientId === ingFilter);
    if (dateRange === '7d') {
      const cutoff = now - 7 * 86400000;
      result = result.filter(m => new Date(m.createdAt).getTime() >= cutoff);
    } else if (dateRange === '30d') {
      const cutoff = now - 30 * 86400000;
      result = result.filter(m => new Date(m.createdAt).getTime() >= cutoff);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        (ingMap[m.ingredientId]?.name || '').toLowerCase().includes(q) ||
        (m.reason || '').toLowerCase().includes(q) ||
        (m.reference || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [movements, typeFilter, ingFilter, dateRange, searchQuery, ingMap, now]);

  const summary = useMemo(() => {
    const entries = filtered.reduce((s, m) => s + (m.type === 'entrada' ? Number(m.quantity) : 0), 0);
    const exits = filtered.reduce((s, m) => s + (m.type === 'salida' ? Number(m.quantity) : 0), 0);
    return { entries, exits, net: entries - exits, count: filtered.length };
  }, [filtered]);

  const handleCSV = useCallback(() => {
    const header = 'Fecha,Insumo,Tipo,Cantidad,Unidad,Stock Final,Motivo,Referencia';
    const rows = filtered.map(m => {
      const ing = ingMap[m.ingredientId];
      return `"${m.createdAt ? new Date(m.createdAt).toLocaleDateString('es-PE') : ''}","${ing?.name || m.ingredientId}",${m.type},${m.quantity},${m.unit},${m.stockAfter ?? ''},"${m.reason || ''}","${m.reference || ''}"`;
    });
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `kardex-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast('CSV exportado');
  }, [filtered, ingMap, toast]);

  if (error) return <SectionContainer error={error} loading={false} data={[]} />;
  if (loading) return <SectionContainer loading error={null} data={[]} rows={5} />;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.55rem] text-cm-text-secondary uppercase font-semibold">Movimientos</div>
          <div className="text-lg font-bold text-cm-text mt-1">{summary.count}</div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.55rem] text-cm-text-secondary uppercase font-semibold">Entradas</div>
          <div className="text-lg font-bold text-cm-success mt-1">{summary.entries.toFixed(1)}</div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.55rem] text-cm-text-secondary uppercase font-semibold">Salidas</div>
          <div className="text-lg font-bold text-cm-error mt-1">{summary.exits.toFixed(1)}</div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.55rem] text-cm-text-secondary uppercase font-semibold">Neto</div>
          <div className={`text-lg font-bold mt-1 ${summary.net >= 0 ? 'text-cm-success' : 'text-cm-error'}`}>
            {summary.net >= 0 ? '+' : ''}{summary.net.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          {['all', 'entrada', 'salida', 'ajuste'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 text-[0.55rem] font-bold uppercase rounded-lg transition-colors ${
                typeFilter === t
                  ? 'bg-cm-accent text-white'
                  : 'text-cm-text-secondary hover:bg-cm-bg-alt'
              }`}>
              {t === 'all' ? 'Todos' : t}
            </button>
          ))}
        </div>
        <select value={ingFilter} onChange={e => setIngFilter(e.target.value)}
          className="bg-cm-surface border border-cm-border rounded-lg px-2 py-1.5 text-xs text-cm-text">
          <option value="">Todos los insumos</option>
          {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select value={dateRange} onChange={e => setDateRange(e.target.value)}
          className="bg-cm-surface border border-cm-border rounded-lg px-2 py-1.5 text-xs text-cm-text">
          <option value="all">Todo el período</option>
          <option value="30d">Últimos 30 días</option>
          <option value="7d">Últimos 7 días</option>
        </select>
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-cm-text-tertiary" />
          <input type="text" placeholder="Buscar..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 bg-cm-surface border border-cm-border rounded-lg text-xs text-cm-text placeholder:text-cm-text-tertiary" />
        </div>
        <button onClick={handleCSV} className="flex items-center gap-1 px-2 py-1.5 text-[0.55rem] font-bold text-cm-text-secondary hover:text-cm-accent transition-colors">
          <Download className="w-3 h-3" /> CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden max-h-[28rem] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-cm-surface z-10">
            <tr className="text-cm-text-secondary border-b border-cm-border">
              <th className="text-left font-semibold py-3 pl-4 pr-4">Fecha</th>
              <th className="text-left font-semibold py-3 px-3">Insumo</th>
              <th className="text-center font-semibold py-3 px-3">Tipo</th>
              <th className="text-right font-semibold py-3 px-3">Cantidad</th>
              <th className="text-right font-semibold py-3 px-3">Stock final</th>
              <th className="text-left font-semibold py-3 px-3">Motivo</th>
              <th className="text-left font-semibold py-3 pl-3 pr-4">Ref.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan="7" className="text-center py-8 text-xs text-cm-text-secondary">Sin movimientos</td></tr>
            )}
            {filtered.map(m => {
              const ing = ingMap[m.ingredientId];
              return (
                <tr key={m.id} className="border-b border-cm-border/50 hover:bg-cm-accent/5 transition-colors">
                  <td className="py-2 pl-4 pr-4 text-cm-text-secondary whitespace-nowrap">{m.createdAt ? new Date(m.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td className="py-2 px-3 font-medium text-cm-text">{ing?.name || m.ingredientId}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`text-[0.55rem] font-semibold px-1.5 py-0.5 rounded-full ${
                      m.type === 'entrada' ? 'bg-cm-success/10 text-cm-success' :
                      m.type === 'salida' ? 'bg-cm-error/10 text-cm-error' : 'bg-cm-warning/10 text-cm-warning'
                    }`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-cm-text">{m.quantity} {m.unit}</td>
                  <td className="py-2 px-3 text-right text-cm-text-secondary">{m.stockAfter ?? '—'}</td>
                  <td className="py-2 px-3 text-cm-text-secondary max-w-[120px] truncate" title={m.reason}>{m.reason}</td>
                  <td className="py-2 pl-3 pr-4 text-cm-text-secondary">{m.reference || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── DASHBOARD ─── */
function DashboardSection({ branchId, ingredients, suppliers, purchaseOrders, recipes, products, movements, waste, loading, error }) {
  const valorInventario = ingredients.reduce((s, i) => s + (Number(i.stock) * Number(i.cost) || 0), 0);
  const stockBajo = ingredients.filter(i => i.minStock > 0 && i.stock <= i.minStock);
  const stockOk = ingredients.filter(i => i.minStock > 0 && i.stock > i.minStock);
  const pendientes = purchaseOrders.filter(o => o.status === 'pendiente');
  const productsWithRecipe = new Set(recipes.filter(r => r.productId).map(r => r.productId));
  const sinReceta = products.filter(p => p.id && !productsWithRecipe.has(p.id));
  const saludStock = ingredients.length > 0 ? Math.round((stockOk.length / ingredients.filter(i => i.minStock > 0).length) * 100) : 0;

  if (error) return <SectionContainer error={error} loading={false} data={[]} />;
  if (loading) return <SectionContainer loading error={null} data={[]} rows={6} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.55rem] text-cm-text-secondary uppercase font-semibold">Valor inventario</div>
          <div className="text-lg font-bold text-cm-text mt-1">{fmtCurrency(valorInventario)}</div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.55rem] text-cm-text-secondary uppercase font-semibold">Stock bajo</div>
          <div className={`text-lg font-bold mt-1 ${stockBajo.length > 0 ? 'text-cm-error' : 'text-cm-success'}`}>{stockBajo.length}</div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.55rem] text-cm-text-secondary uppercase font-semibold">OC pendientes</div>
          <div className={`text-lg font-bold mt-1 ${pendientes.length > 0 ? 'text-cm-warning' : 'text-cm-text'}`}>{pendientes.length}</div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.55rem] text-cm-text-secondary uppercase font-semibold">Salud stock</div>
          <div className={`text-lg font-bold mt-1 ${saludStock >= 70 ? 'text-cm-success' : saludStock >= 40 ? 'text-cm-warning' : 'text-cm-error'}`}>{saludStock}%</div>
          <div className="mt-1 h-1.5 w-full bg-cm-bg-alt rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${saludStock >= 70 ? 'bg-cm-success' : saludStock >= 40 ? 'bg-cm-warning' : 'bg-cm-error'}`}
              style={{ width: `${saludStock}%` }} />
          </div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.55rem] text-cm-text-secondary uppercase font-semibold">Sin receta</div>
          <div className={`text-lg font-bold mt-1 ${sinReceta.length > 0 ? 'text-cm-warning' : 'text-cm-success'}`}>{sinReceta.length}</div>
        </div>
      </div>

      {stockBajo.length > 0 && (
        <div className="bg-cm-error/5 border border-cm-error/20 rounded-xl p-4">
          <h3 className="text-xs font-bold text-cm-error mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Stock bajo
          </h3>
          <div className="space-y-1">
            {stockBajo.slice(0, 5).map(i => (
              <div key={i.id} className="text-xs text-cm-text-secondary flex justify-between">
                <span>{i.name}</span>
                <span className="font-semibold text-cm-error">{i.stock} / min {i.minStock} {i.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="bg-cm-warning/5 border border-cm-warning/20 rounded-xl p-4">
          <h3 className="text-xs font-bold text-cm-warning mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> OC pendientes de recibir
          </h3>
          {pendientes.map(o => (
            <div key={o.id} className="text-xs text-cm-text-secondary flex justify-between">
              <span>{o.supplierName} — {Object.keys(o.items || {}).length} items</span>
              <span>{fmtCurrency(o.total || 0)}</span>
            </div>
          ))}
        </div>
      )}

      {sinReceta.length > 0 && (
        <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
          <h3 className="text-xs font-bold text-cm-text mb-2">Productos sin receta ({sinReceta.length})</h3>
          <div className="flex flex-wrap gap-1">
            {sinReceta.map(p => (
              <span key={p.id} className="text-[0.55rem] font-medium bg-cm-bg-alt text-cm-text-secondary px-2 py-0.5 rounded-lg">{p.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Proyección de compras ── */}
      {(() => {
        const porComprar = ingredients
          .filter(i => i.minStock > 0 && i.stock <= i.minStock * 2)
          .sort((a, b) => (a.stock / a.minStock) - (b.stock / b.minStock))
          .slice(0, 8);
        if (porComprar.length === 0) return null;
        return (
          <div className="bg-cm-info/5 border border-cm-info/20 rounded-xl p-4">
            <h3 className="text-xs font-bold text-cm-info mb-2 flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5" /> Proyección de compras
            </h3>
            <p className="text-[0.55rem] text-cm-text-secondary mb-2">Insumos próximos a agotarse — sugerencia de compra:</p>
            <div className="space-y-1">
              {porComprar.map(i => {
                const sugerido = Math.max(i.minStock * 2 - i.stock, i.minStock);
                return (
                  <div key={i.id} className="text-xs text-cm-text-secondary flex justify-between">
                    <span>{i.name}</span>
                    <span className="font-semibold text-cm-text">{i.stock} / min {i.minStock} {i.unit} — <span className="text-cm-accent">comprar {sugerido}</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Actividad reciente ── */}
      {(() => {
        const recent = [
          ...(movements || []).slice(0, 4).map(m => ({ ...m, _type: 'mov', _label: m.type === 'entrada' ? 'Entrada' : 'Salida' })),
          ...(waste || []).slice(0, 2).map(w => ({ ...w, _type: 'waste', _label: 'Merma' })),
          ...(purchaseOrders || []).filter(o => o.status === 'pendiente').slice(0, 2).map(o => ({ ...o, _type: 'order', _label: 'OC' })),
        ].sort((a, b) => new Date(b.createdAt || b.orderedAt) - new Date(a.createdAt || a.orderedAt)).slice(0, 6);
        if (recent.length === 0) return null;
        return (
          <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
            <h3 className="text-xs font-bold text-cm-text mb-3">Actividad reciente</h3>
            <div className="space-y-2">
              {recent.map((item, i) => {
                if (item._type === 'mov') {
                  const ing = ingredients.find(x => x.id === item.ingredientId);
                  return (
                    <div key={`mov-${item.id}`} className="flex items-center gap-2 text-xs">
                      <span className={`text-[0.5rem] font-semibold px-1.5 py-0.5 rounded-full ${
                        item.type === 'entrada' ? 'bg-cm-success/10 text-cm-success' : 'bg-cm-error/10 text-cm-error'
                      }`}>{item._label}</span>
                      <span className="text-cm-text-secondary">{new Date(item.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</span>
                      <span className="text-cm-text font-medium">{ing?.name || item.ingredientId}</span>
                      <span className="text-cm-text-secondary ml-auto">{item.quantity} {item.unit}</span>
                    </div>
                  );
                }
                if (item._type === 'waste') {
                  return (
                    <div key={`waste-${item.id}`} className="flex items-center gap-2 text-xs">
                      <span className="text-[0.5rem] font-semibold px-1.5 py-0.5 rounded-full bg-cm-warning/10 text-cm-warning">Merma</span>
                      <span className="text-cm-text-secondary">{new Date(item.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</span>
                      <span className="text-cm-text font-medium">{item.ingredientName}</span>
                      <span className="text-cm-text-secondary ml-auto">{fmtCurrency(item.totalCost || 0)}</span>
                    </div>
                  );
                }
                return (
                  <div key={`order-${item.id}`} className="flex items-center gap-2 text-xs">
                    <span className="text-[0.5rem] font-semibold px-1.5 py-0.5 rounded-full bg-cm-warning/10 text-cm-warning">OC</span>
                    <span className="text-cm-text-secondary">{new Date(item.orderedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</span>
                    <span className="text-cm-text font-medium">{item.supplierName}</span>
                    <span className="text-cm-text-secondary ml-auto">{fmtCurrency(item.total || 0)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {stockBajo.length === 0 && pendientes.length === 0 && sinReceta.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="w-10 h-10 text-cm-success mb-2" />
          <p className="text-sm font-medium text-cm-text-secondary">Todo en orden — no hay alertas</p>
        </div>
      )}
    </div>
  );
}

/* ─── PROVEEDORES ─── */
function SuppliersSection({ branchId, userEmail, suppliers, ingredients, purchaseOrders, loading, error, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState({
    name: '', contacto: '', telefono: '', email: '', direccion: '',
    tipoDocumento: 'informal', numDocumento: '', plazoPago: 'contado',
    categorias: [], activo: true, notes: '',
  });
  const [priceModal, setPriceModal] = useState({ open: false, supplierId: null, supplierName: '' });
  const [priceForm, setPriceForm] = useState({ ingredientId: '', cost: '' });

  const lastOrderMap = useMemo(() => {
    const map = {};
    for (const o of purchaseOrders) {
      if (!map[o.supplierId] || new Date(o.orderedAt) > new Date(map[o.supplierId])) {
        map[o.supplierId] = o.orderedAt;
      }
    }
    return map;
  }, [purchaseOrders]);

  const visibleSuppliers = useMemo(() => {
    if (showInactive) return suppliers;
    return suppliers.filter(s => s.activo !== false);
  }, [suppliers, showInactive]);

  const resetForm = () => {
    setForm({
      name: '', contacto: '', telefono: '', email: '', direccion: '',
      tipoDocumento: 'informal', numDocumento: '', plazoPago: 'contado',
      categorias: [], activo: true, notes: '',
    });
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.name) return;
    if (editing) {
      await updateSupplier(branchId, editing, form, userEmail);
      toast('Proveedor actualizado');
    } else {
      await createSupplier(branchId, form, userEmail);
      toast('Proveedor creado');
    }
    resetForm(); setShowForm(false);
  };

  const editingSupplier = (s) => {
    setForm({
      name: s.name, contacto: s.contacto || '', telefono: s.telefono || '',
      email: s.email || '', direccion: s.direccion || '',
      tipoDocumento: s.tipoDocumento || 'informal', numDocumento: s.numDocumento || '',
      plazoPago: s.plazoPago || 'contado', categorias: s.categorias || [],
      activo: s.activo !== false, notes: s.notes || '',
    });
    setEditing(s.id);
    setShowForm(true);
  };

  if (error) return <SectionContainer error={error} loading={false} data={[]} />;
  if (loading) return <SectionContainer loading error={null} data={[]} rows={3} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-cm-text-secondary">{visibleSuppliers.length} de {suppliers.length} proveedor(es)</span>
          {suppliers.some(s => s.activo === false) && (
            <button onClick={() => setShowInactive(!showInactive)}
              className={`text-[0.55rem] font-semibold px-2 py-0.5 rounded-lg transition-colors ${
                showInactive ? 'bg-cm-accent text-white' : 'text-cm-text-secondary hover:bg-cm-bg-alt'
              }`}>
              Inactivos
            </button>
          )}
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nuevo proveedor
        </button>
      </div>

      {showForm && (
        <div className="bg-cm-bg-alt border border-cm-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <input type="text" placeholder="Nombre *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
            <input type="text" placeholder="Contacto" value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
            <input type="tel" placeholder="Teléfono" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
            <input type="text" placeholder="Dirección" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
            <select value={form.tipoDocumento} onChange={e => setForm({ ...form, tipoDocumento: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text">
              <option value="ruc">RUC (Factura)</option>
              <option value="dni">DNI (Boleta)</option>
              <option value="informal">Informal (Recibo simple)</option>
            </select>
            {form.tipoDocumento !== 'informal' && (
              <input type="text" placeholder={form.tipoDocumento === 'ruc' ? 'RUC' : 'DNI'} value={form.numDocumento}
                onChange={e => setForm({ ...form, numDocumento: e.target.value })}
                className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
            )}
            <select value={form.plazoPago} onChange={e => setForm({ ...form, plazoPago: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text">
              <option value="contado">Contado</option>
              <option value="7d">7 días</option>
              <option value="15d">15 días</option>
              <option value="30d">30 días</option>
            </select>
          </div>
          <textarea placeholder="Notas" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
            className="w-full bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text placeholder:text-cm-text-tertiary" />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-3 py-1.5 text-xs font-semibold text-cm-text-secondary">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-1.5 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> {editing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      )}

      {/* ── Price Modal ── */}
      {priceModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPriceModal({...priceModal, open: false})}>
          <div className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-cm-text mb-3">Precios — {priceModal.supplierName}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase block mb-1">Insumo</label>
                <select value={priceForm.ingredientId} onChange={e => setPriceForm({...priceForm, ingredientId: e.target.value})}
                  className="w-full bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs text-cm-text">
                  <option value="">Seleccionar...</option>
                  {ingredients.filter(i => (i.supplierIds || []).includes(priceModal.supplierId)).map(i => (
                    <option key={i.id} value={i.id}>{i.name} (actual: S/ {Number(i.cost || 0).toFixed(2)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase block mb-1">Nuevo costo x unidad</label>
                <input type="number" step="0.01" value={priceForm.cost} onChange={e => setPriceForm({...priceForm, cost: e.target.value})}
                  className="w-full bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs text-cm-text" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setPriceModal({...priceModal, open: false}); setPriceForm({ ingredientId: '', cost: '' }); }}
                  className="flex-1 py-2 border border-cm-border text-xs font-semibold text-cm-text rounded-lg">Cancelar</button>
                <button onClick={async () => {
                  if (!priceForm.ingredientId || !priceForm.cost) return;
                  await setIngredientPrice(branchId, priceForm.ingredientId, priceModal.supplierId, priceForm.cost);
                  toast('Precio actualizado');
                  setPriceModal({...priceModal, open: false});
                  setPriceForm({ ingredientId: '', cost: '' });
                }} className="flex-1 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg">Guardar precio</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleSuppliers.length === 0 && (
          <div className="col-span-full text-center py-8 text-xs text-cm-text-secondary">No hay proveedores activos</div>
        )}
        {visibleSuppliers.map(s => {
          const docLabel = { ruc: 'RUC', dni: 'DNI', informal: 'Informal' }[s.tipoDocumento] || '—';
          const lastOrder = lastOrderMap[s.id];
          return (
            <div key={s.id} className="bg-cm-surface border border-cm-border rounded-xl p-4 space-y-2 relative">
              {!s.activo && <span className="absolute top-2 right-2 text-[0.5rem] font-semibold text-cm-error bg-cm-error/10 px-1.5 py-0.5 rounded">Inactivo</span>}
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-bold text-cm-text">{s.name}</h4>
                <div className="flex gap-1">
                  <button onClick={() => editingSupplier(s)}
                    className="p-1 rounded hover:bg-cm-accent/10 text-cm-text-secondary"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setPriceModal({ open: true, supplierId: s.id, supplierName: s.name })}
                    className="p-1 rounded hover:bg-cm-info/10 text-cm-text-secondary" title="Gestionar precios"><DollarSign className="w-3.5 h-3.5" /></button>
                  <button onClick={async () => { await deleteSupplier(branchId, s.id, userEmail); toast('Proveedor eliminado'); }} className="p-1 rounded hover:bg-cm-error/10 text-cm-text-secondary"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {s.contacto && <div className="text-xs text-cm-text-secondary">Contacto: {s.contacto}</div>}
              {lastOrder && <div className="text-[0.55rem] text-cm-text-secondary">Última orden: {new Date(lastOrder).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</div>}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.6rem] text-cm-text-secondary">
                {s.telefono && <span>📞 {s.telefono}</span>}
                {s.email && <span>✉ {s.email}</span>}
                <span className={s.tipoDocumento === 'informal' ? 'text-cm-warning' : 'text-cm-text-secondary'}>
                  {docLabel}{s.numDocumento ? `: ${s.numDocumento}` : ''}
                </span>
                <span>Pago: {s.plazoPago === 'contado' ? 'Contado' : `${s.plazoPago}`}</span>
              </div>
              {s.categorias?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {s.categorias.map((c, i) => (
                    <span key={i} className="text-[0.5rem] font-semibold bg-cm-bg-alt text-cm-text-secondary px-1.5 py-0.5 rounded">{c}</span>
                  ))}
                </div>
              )}
              {s.notes && <div className="text-xs text-cm-text-secondary bg-cm-bg-alt rounded-lg px-2 py-1">{s.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── ÓRDENES DE COMPRA ─── */
function PurchaseOrdersSection({ branchId, userEmail, purchaseOrders: orders, suppliers, ingredients, loading, error, toast }) {
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ supplierId: '', notes: '' });
  const [selectedIngs, setSelectedIngs] = useState({});
  const [priceChanges, setPriceChanges] = useState([]);
  const [priceChangeOrderId, setPriceChangeOrderId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ingSearch, setIngSearch] = useState('');
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [showAllIngs, setShowAllIngs] = useState(false);
  const [qtyDrafts, setQtyDrafts] = useState({});
  const [costDrafts, setCostDrafts] = useState({});
  const [quickIng, setQuickIng] = useState(false);
  const [quickForm, setQuickForm] = useState({ name: '', unit: 'kg', cost: '', qty: '1' });
  const [quickErr, setQuickErr] = useState('');
  const [activeRowId, setActiveRowId] = useState(null);
  const qtyInputRefs = useRef({});
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [receiveOrder, setReceiveOrder] = useState(null);
  const [receiveQtys, setReceiveQtys] = useState({});
  const [receiveCosts, setReceiveCosts] = useState({}); // costos editables por línea (prefill OCR / manual)
  const [receiving, setReceiving] = useState(false);
  const [directIntake, setDirectIntake] = useState(false);
  // ── Voucher upload state ──
  const [voucherFile, setVoucherFile] = useState(null); // data URL listo para extracción OCR
  const [voucherUploading, setVoucherUploading] = useState(false);
  const [voucherUploadProgress, setVoucherUploadProgress] = useState(0);
  const [voucherUrl, setVoucherUrl] = useState(null);
  const [voucherFileName, setVoucherFileName] = useState(null);
  const [voucherUploadedAt, setVoucherUploadedAt] = useState(null);
  const [voucherError, setVoucherError] = useState(null);
  // ── OCR extraction state (Phase 3 + 4) ──
  const [extractionState, setExtractionState] = useState('idle'); // idle | extracting | done | error
  const [extractionError, setExtractionError] = useState(null);
  const [matchedItems, setMatchedItems] = useState([]);
  const [unmatchedItems, setUnmatchedItems] = useState([]);
  const [unmatchedEdits, setUnmatchedEdits] = useState({}); // drafts de qty/costo de items sin match
  // Ediciones manuales del usuario: "ganan" sobre cualquier prefill posterior (4.7)
  const touchedRef = useRef(new Set()); // claves "id:qty" | "id:cost"

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (statusFilter !== 'all') result = result.filter(o => o.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        (o.supplierName || '').toLowerCase().includes(q) ||
        (o.id || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, statusFilter, searchQuery]);

  const spendingBySupplier = useMemo(() => {
    const map = {};
    for (const o of orders) {
      if (o.status === 'recibido') {
        map[o.supplierName] = (map[o.supplierName] || 0) + Number(o.total || 0);
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  // Last cost per ingredient from received orders
  const lastCosts = useMemo(() => {
    const map = {};
    const received = [...orders]
      .filter(o => o.status === 'recibido')
      .sort((a, b) => new Date(b.receivedAt || b.orderedAt) - new Date(a.receivedAt || a.orderedAt));
    for (const o of received) {
      for (const item of Object.values(o.items || {})) {
        if (item.ingredientId && map[item.ingredientId] === undefined) {
          map[item.ingredientId] = Number(item.unitCost);
        }
      }
    }
    return map;
  }, [orders]);

  // Proveedor al que va cada insumo: el foco si lo incluye (o si no tiene asignado),
  // si no, el primero que tenga cargado
  const itemSupplier = (ing) => {
    const ids = ing.supplierIds || [];
    if (ids.includes(form.supplierId) || ids.length === 0) return form.supplierId;
    return ids[0];
  };

  // Insumos del form: solo los del proveedor foco (+ sin proveedor) salvo el toggle "ver todos"
  const orderIngredients = useMemo(() => {
    let result = ingredients;
    if (ingSearch.trim()) {
      const q = ingSearch.toLowerCase();
      result = result.filter(i => (i.name || '').toLowerCase().includes(q));
    }
    if (form.supplierId && !showAllIngs) {
      result = result.filter(i => {
        const ids = i.supplierIds || [];
        return ids.includes(form.supplierId) || ids.length === 0;
      });
    }
    // Sort tipo Excel: nombre alfabético, numéricos por valor
    const dir = sortDir === 'asc' ? 1 : -1;
    result = [...result].sort((a, b) => {
      if (sortKey === 'name') return dir * (a.name || '').localeCompare(b.name || '');
      if (sortKey === 'deficit') {
        const da = Math.max(0, (a.minStock || 0) - (a.stock || 0));
        const db = Math.max(0, (b.minStock || 0) - (b.stock || 0));
        return dir * (da - db);
      }
      return dir * ((Number(a[sortKey]) || 0) - (Number(b[sortKey]) || 0));
    });
    return result;
  }, [ingredients, ingSearch, form.supplierId, showAllIngs, sortKey, sortDir]);

  const addAllDeficits = () => {
    setSelectedIngs(prev => {
      const next = { ...prev };
      for (const ing of ingredients) {
        const deficit = Math.max(0, (ing.minStock || 0) - (ing.stock || 0));
        if (deficit > 0) {
          next[ing.id] = {
            quantity: deficit,
            unitCost: lastCosts[ing.id] ?? ing.cost ?? 0,
            name: ing.name,
            unit: ing.unit,
            supplierId: itemSupplier(ing),
          };
        }
      }
      return next;
    });
  };

  const addToCart = (ing, qty, cost) => {
    setSelectedIngs(prev => ({
      ...prev,
      [ing.id]: {
        quantity: Math.max(0, Number(qty) || 0),
        unitCost: Math.max(0, Number(cost) || 0),
        name: ing.name,
        unit: ing.unit,
        supplierId: itemSupplier(ing),
      },
    }));
    setQtyDrafts(prev => { const n = { ...prev }; delete n[ing.id]; return n; });
    setCostDrafts(prev => { const n = { ...prev }; delete n[ing.id]; return n; });
  };

  const removeFromCart = (id) => {
    setSelectedIngs(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  // Excel-like: Enter baja a la fila siguiente (misma columna), Shift+Enter sube
  const handleQtyKeyDown = (e, ingId) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const idx = orderIngredients.findIndex(i => i.id === ingId);
    const next = orderIngredients[e.shiftKey ? idx - 1 : idx + 1];
    const el = next && qtyInputRefs.current[next.id];
    if (el) { el.focus(); el.select(); }
  };

  // Excel-like: pegar una columna de cantidades la distribuye fila a fila desde la fila activa
  const handleQtyPaste = (e, ingId) => {
    const text = e.clipboardData.getData('text');
    const values = (text || '').split(/\r?\n/).map(v => v.trim()).filter(v => v !== '' && !isNaN(Number(v)));
    if (values.length < 2) return; // un solo valor: paste nativo
    e.preventDefault();
    const startIdx = orderIngredients.findIndex(i => i.id === ingId);
    setQtyDrafts(prev => {
      const next = { ...prev };
      values.forEach((v, i) => {
        const ing = orderIngredients[startIdx + i];
        if (ing) next[ing.id] = v;
      });
      return next;
    });
    // foco en la última fila del rango pegado
    const last = orderIngredients[startIdx + values.length - 1];
    const el = last && qtyInputRefs.current[last.id];
    if (el) { el.focus(); el.select(); }
  };

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Crea un insumo rápido desde el form de la orden y lo agrega al carrito
  const quickCreate = async () => {
    const name = quickForm.name.trim();
    if (!name) { setQuickErr('El nombre es obligatorio.'); return; }
    const dup = ingredients.find(i => (i.name || '').trim().toLowerCase() === name.toLowerCase());
    if (dup) { setQuickErr(`Ya existe "${dup.name}" — usalo directo de la lista.`); return; }
    setQuickErr('');
    const qty = Math.max(1, Number(quickForm.qty) || 1);
    const cost = Number(quickForm.cost) || 0;
    const result = await createIngredient(branchId, {
      name,
      unit: quickForm.unit,
      stock: 0,
      minStock: 0,
      cost,
      supplierIds: form.supplierId ? [form.supplierId] : [],
      categories: [],
    }, userEmail);
    toast('Insumo creado y agregado a la orden');
    if (result?.id) {
      addToCart({ id: result.id, name, unit: quickForm.unit, supplierIds: form.supplierId ? [form.supplierId] : [] }, qty, cost);
    }
    setQuickIng(false);
    setQuickForm({ name: '', unit: 'kg', cost: '', qty: '1' });
  };

  const ingTotal = Object.values(selectedIngs).reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const ingCount = Object.keys(selectedIngs).length;

  const resetForm = () => {
    setForm({ supplierId: '', notes: '' });
    setSelectedIngs({});
    setQtyDrafts({});
    setCostDrafts({});
    setShowAllIngs(false);
    setQuickIng(false);
    setQuickForm({ name: '', unit: 'kg', cost: '', qty: '1' });
    setQuickErr('');
    setFormError('');
    setEditingOrderId(null);
  };

  // 2.5 — Limpia el estado del voucher al cerrar/reabrir el modal
  const resetVoucherState = () => {
    setVoucherFile(null);
    setVoucherUploading(false);
    setVoucherUploadProgress(0);
    setVoucherUrl(null);
    setVoucherFileName(null);
    setVoucherUploadedAt(null);
    setVoucherError(null);
  };

  // 3.x/4.x — Limpia TODO el estado OCR (cierre/apertura del modal)
  const clearExtraction = () => {
    setExtractionState('idle');
    setExtractionError(null);
    setMatchedItems([]);
    setUnmatchedItems([]);
    setUnmatchedEdits({});
    setReceiveCosts({});
    touchedRef.current = new Set();
  };

  // Mapea el error de extractVoucher al mensaje del matrix de diseño (Phase 6)
  const extractionErrorMessage = (e) => {
    const msg = String(e?.message || e || '');
    const name = e?.name || '';
    if (msg.includes('VITE_GEMINI_API_KEY')) return 'IA no configurada. Ingresa cantidades manualmente.';
    if (name === 'TimeoutError' || name === 'AbortError' || /timeout|abort/i.test(msg)) return 'Tiempo agotado. Verifica tu conexión.';
    if (e instanceof SyntaxError || /^Unexpected|Respuesta vacía/.test(msg)) return 'Respuesta inválida de IA. Intenta de nuevo.';
    if (msg.includes('Gemini API error')) return 'Error al procesar la boleta. Intenta de nuevo.';
    return `OCR extraction failed: ${msg}`;
  };

  // 3.3 — Ejecuta la extracción OCR y aplica el fuzzy match + prefill
  const handleExtractVoucher = async () => {
    if (!receiveOrder || !voucherFile || extractionState === 'extracting') return;
    setExtractionState('extracting');
    setExtractionError(null);
    setMatchedItems([]);
    setUnmatchedItems([]);
    setUnmatchedEdits({});

    // Items esperados del PO para guiar a la IA (3.3)
    const expectedItems = Object.values(receiveOrder.items || {}).map(it => ({
      name: it.name || '',
      quantity: Number(it.quantity) || 0,
      unit: it.unit || 'unidad',
      unitCost: Number(it.unitCost) || 0,
    }));

    try {
      const result = await extractVoucher(voucherFile, expectedItems);

      if (!result.items || result.items.length === 0) {
        setExtractionState('done');
        toast('No se detectaron productos. Revisa la foto.');
        return;
      }

      // 4.3 — fuzzy match contra los items del PO (one-to-one greedy)
      const { matched, unmatched } = fuzzyMatch(result.items, receiveOrder.items || {});
      setMatchedItems(matched);
      setUnmatchedItems(unmatched);

      // 4.4/4.7 — Prefill solo los campos que el usuario NO editó a mano
      setReceiveQtys(prev => {
        const next = { ...prev };
        for (const m of matched) {
          if (!touchedRef.current.has(`${m.poIngredientId}:qty`)) next[m.poIngredientId] = String(m.quantity);
        }
        return next;
      });
      setReceiveCosts(prev => {
        const next = { ...prev };
        for (const m of matched) {
          if (!touchedRef.current.has(`${m.poIngredientId}:cost`)) next[m.poIngredientId] = m.unitCost;
        }
        return next;
      });

      setExtractionState('done');
    } catch (e) {
      // 3.3/6.2 — Error: toast + estado error; el modal sigue usable manualmente
      const reason = extractionErrorMessage(e);
      setExtractionError(reason);
      setExtractionState('error');
      toast(reason);
      console.error('[voucher-ocr] falló la extracción:', e);
    }
  };

  // 4.8 — Re-escanear / Reintentar: limpia resultados y vuelve a extraer
  const rescanVoucher = () => {
    setExtractionState('idle');
    setExtractionError(null);
    setMatchedItems([]);
    setUnmatchedItems([]);
    setUnmatchedEdits({});
    handleExtractVoucher();
  };

  const openReceive = (o) => {
    resetVoucherState();
    clearExtraction();
    const qtys = {};
    for (const [id, item] of Object.entries(o.items || {})) {
      qtys[id] = String(item.quantity);
    }
    setReceiveQtys(qtys);
    setReceiveOrder(o);
  };

  // 2.3 — Valida (tipo/size) y sube el voucher; persiste en el PO; deja la imagen en base64
  const handleVoucherSelect = (file) => {
    if (!file) return;
    const validationError = validateVoucherFile(file);
    if (validationError) {
      setVoucherError(validationError);
      return;
    }
    setVoucherError(null);
    setVoucherFile(file);
    setVoucherUploading(true);
    setVoucherUploadProgress(0);
    const { id: orderId } = receiveOrder || {};
    storageService.uploadVoucher(branchId, orderId, file, setVoucherUploadProgress)
      .then(async (result) => {
        const uploadedAt = nowISO();
        await attachVoucher(branchId, orderId, {
          voucherUrl: result.url,
          voucherFileName: file.name,
          uploadedAt,
        });
        // data URL listo para el paso de extracción OCR, downscale ≤ 2048px (3.5, NFR-2)
        const dataUrl = await fileToDataURL(file);
        const processed = await downscaleImage(dataUrl, 2048);
        setVoucherFile(processed);
        setVoucherUrl(result.url);
        setVoucherFileName(file.name);
        setVoucherUploadedAt(uploadedAt);
      })
      .catch(() => {
        setVoucherError('No se pudo subir el voucher.');
      })
      .finally(() => {
        setVoucherUploading(false);
      });
  };

  const handleReceive = async () => {
    if (!receiveOrder || receiving) return;
    setReceiving(true);
    const quantities = {};
    for (const [id, v] of Object.entries(receiveQtys)) {
      const n = Number(v);
      if (!isNaN(n) && n > 0) quantities[id] = n;
    }
    const result = await receivePurchaseOrder(branchId, receiveOrder.id, userEmail, quantities, receiveCosts);
    setReceiving(false);
    if (!result?.success) {
      toast(result?.error || 'No se pudo recibir la orden');
      return;
    }
    // 5.4 — Confirmación exitosa, con info del voucher si se subió uno
    toast(voucherFileName
      ? `Orden recibida correctamente · voucher ${voucherFileName}`
      : 'Orden recibida correctamente');
    const orderId = receiveOrder.id;
    setReceiveOrder(null);
    setReceiveQtys({});
    resetVoucherState();
    clearExtraction();
    if (result?.priceChanges?.length > 0) {
      setPriceChanges(result.priceChanges);
      setPriceChangeOrderId(orderId);
    }
  };

  const handleCreate = async () => {
    setFormError('');
    if (!form.supplierId) { setFormError('Debés seleccionar un proveedor.'); return; }
    const items = Object.entries(selectedIngs)
      .map(([ingredientId, v]) => ({ ingredientId, name: v.name, quantity: v.quantity, unit: v.unit, unitCost: v.unitCost, supplierId: v.supplierId }))
      .filter(it => it.quantity > 0);
    if (items.length === 0) { setFormError('Agregá al menos un insumo con cantidad mayor a 0.'); return; }
    const supplier = suppliers.find(s => s.id === form.supplierId);
    const notes = form.notes;
    if (editingOrderId) {
      const existing = orders.find(o => o.id === editingOrderId);
      const isPreOrder = existing?.status === 'pre_pedido';
      if (isPreOrder) {
        await confirmPreOrder(branchId, editingOrderId, { supplierId: form.supplierId, supplierName: supplier?.name || '' }, userEmail);
      }
      await updatePurchaseOrder(branchId, editingOrderId, {
        supplierId: form.supplierId,
        supplierName: supplier?.name || '',
        items: items.map(({ supplierId: _s, ...rest }) => rest),
        notes,
      }, userEmail);
      toast(isPreOrder ? 'Pre-pedido confirmado' : 'Orden actualizada');
    } else {
      // Una OC por proveedor: agrupá por el proveedor de cada insumo
      const groups = {};
      for (const it of items) {
        const sid = it.supplierId || form.supplierId;
        (groups[sid] = groups[sid] || []).push(it);
      }
      for (const [sid, its] of Object.entries(groups)) {
        const sup = suppliers.find(s => s.id === sid);
        await createPurchaseOrder(branchId, { supplierId: sid, supplierName: sup?.name || '', items: its, notes }, userEmail);
      }
      toast(Object.keys(groups).length > 1 ? `${Object.keys(groups).length} órdenes creadas (una por proveedor)` : 'Orden creada');
    }
    resetForm(); setShowForm(false);
  };

  if (error) return <SectionContainer error={error} loading={false} data={[]} />;
  if (loading) return <SectionContainer loading error={null} data={[]} rows={4} />;

  const orderToCSV = (o) => {
    const items = Object.values(o.items || {});
    const header = 'Proveedor,Fecha,Insumo,Cantidad,Unidad,Costo Unit.,Total';
    const rows = items.map(i =>
      `"${o.supplierName || ''}",${o.orderedAt ? new Date(o.orderedAt).toLocaleDateString('es-PE') : ''},"${i.name || ''}",${i.quantity || 0},${i.unit || ''},${Number(i.unitCost || 0).toFixed(2)},${Number(i.total || 0).toFixed(2)}`
    );
    const totalLine = `,,,,,,${items.reduce((s, i) => s + Number(i.total || 0), 0).toFixed(2)}`;
    return [header, ...rows, totalLine].join('\n');
  };

  const downloadCSV = (o) => {
    const csv = orderToCSV(o);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orden-${(o.id || '').slice(-6)}-${(o.supplierName || '').replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const editOrder = (o) => {
    const ings = {};
    for (const item of Object.values(o.items || {})) {
      ings[item.ingredientId] = {
        quantity: item.quantity || 0,
        unitCost: item.unitCost || 0,
        name: item.name,
        unit: item.unit || 'kg',
        supplierId: item.supplierId || o.supplierId,
      };
    }
    setSelectedIngs(ings);
    setForm({ supplierId: o.supplierId || '', notes: o.notes || '' });
    setEditingOrderId(o.id);
    setShowForm(true);
  };

  const duplicateOrder = (o) => {
    const ings = {};
    for (const item of Object.values(o.items || {})) {
      ings[item.ingredientId] = {
        quantity: item.quantity || 0,
        unitCost: item.unitCost || 0,
        name: item.name,
        unit: item.unit || 'kg',
        supplierId: item.supplierId || o.supplierId,
      };
    }
    setSelectedIngs(ings);
    setForm({ supplierId: o.supplierId || '', notes: o.notes || '' });
    setEditingOrderId(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      {/* ── Spending summary ── */}
      {spendingBySupplier.length > 0 && (
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="text-cm-text-secondary font-semibold uppercase text-[0.55rem] tracking-wider self-center">Gastos:</span>
          {spendingBySupplier.map(([name, total]) => (
            <span key={name} className="text-cm-text">
              {name}: <span className="font-bold text-cm-accent">{fmtCurrency(total)}</span>
            </span>
          ))}
        </div>
      )}

      {/* ── Filters bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {['all', 'pre_pedido', 'pendiente', 'recibido', 'cancelado'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 text-[0.55rem] font-bold uppercase rounded-lg transition-colors ${
                statusFilter === s
                  ? 'bg-cm-accent text-white'
                  : 'text-cm-text-secondary hover:bg-cm-bg-alt'
              }`}>
              {s === 'all' ? 'Todas' : s === 'pre_pedido' ? 'Pre-pedidos' : s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-cm-text-tertiary" />
            <input type="text" placeholder="Buscar orden..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-44 pl-7 pr-2 py-1.5 bg-cm-surface border border-cm-border rounded-lg text-xs text-cm-text placeholder:text-cm-text-tertiary" />
          </div>
          <span className="text-xs text-cm-text-secondary">{filteredOrders.length} de {orders.length}</span>
          {voucherOcrEnabled() && (
            <button onClick={() => setDirectIntake(true)} className="flex items-center gap-1.5 px-3 py-2 bg-cm-surface border border-cm-border text-cm-text text-xs font-semibold rounded-lg hover:bg-cm-bg-alt transition-colors">
              <Upload className="w-3.5 h-3.5" /> Ingresar boleta
            </button>
          )}
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nueva orden
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-cm-bg-alt border border-cm-border rounded-xl p-4 space-y-3">
          {suppliers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-cm-text-secondary mb-2">No hay proveedores registrados.</p>
              <p className="text-[0.6rem] text-cm-text-secondary">Creá proveedores en la sección Proveedores primero.</p>
            </div>
          ) : (
          <>
          {formError && <p className="text-xs font-semibold text-cm-error bg-cm-error/5 px-3 py-1.5 rounded-lg">{formError}</p>}

          {/* Supplier selector */}
          <div className="flex items-center gap-3">
            <label className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase shrink-0">Proveedor <span className="text-cm-error">*</span></label>
            <select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}
              className="flex-1 bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text">
              <option value="">Seleccionar proveedor...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Filtro de insumos: solo del proveedor seleccionado (o todos con toggle) */}
          {form.supplierId && (
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setShowAllIngs(v => !v)}
                className={`px-2 py-1 text-[0.55rem] font-bold rounded-lg transition-colors ${
                  showAllIngs
                    ? 'bg-cm-accent text-white'
                    : 'bg-cm-surface border border-cm-border text-cm-text-secondary hover:bg-cm-bg-alt'
                }`}>
                {showAllIngs ? 'Mostrando todos los insumos' : `Solo de ${suppliers.find(s => s.id === form.supplierId)?.name || 'este proveedor'}`}
              </button>
              {!editingOrderId && (
                <button onClick={addAllDeficits}
                  className="px-2 py-1 text-[0.55rem] font-bold rounded-lg bg-cm-warning/10 text-cm-warning hover:bg-cm-warning/20 transition-colors">
                  Agregar todos los faltantes
                </button>
              )}
            </div>
          )}

          {/* Ingredient table */}
          {form.supplierId && ingredients.length === 0 && (
            <p className="text-xs text-cm-text-secondary text-center py-4">No hay insumos registrados. Creá insumos en la sección Insumos.</p>
          )}

          {form.supplierId && ingredients.length > 0 && (
            <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative max-w-xs flex-1 min-w-[10rem]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-cm-text-tertiary" />
                <input type="text" placeholder="Buscar insumo..." value={ingSearch}
                  onChange={e => setIngSearch(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 bg-cm-surface border border-cm-border rounded-lg text-xs text-cm-text placeholder:text-cm-text-tertiary" />
              </div>
              <button onClick={() => setQuickIng(v => !v)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[0.55rem] font-bold rounded-lg bg-cm-surface border border-cm-border text-cm-accent hover:bg-cm-accent/10 transition-colors">
                <Plus className="w-3 h-3" /> Nuevo insumo
              </button>
            </div>
            {quickIng && (
              <div className="flex flex-wrap items-end gap-2 bg-cm-surface border border-cm-border rounded-lg p-2">
                <div>
                  <label className="block text-[0.5rem] font-semibold text-cm-text-secondary uppercase mb-1">Nombre *</label>
                  <input type="text" placeholder="Ej: Tomate" value={quickForm.name} onChange={e => setQuickForm({ ...quickForm, name: e.target.value })}
                    className="w-40 bg-cm-bg-alt border border-cm-border rounded-lg px-2 py-1.5 text-xs text-cm-text" />
                </div>
                <div>
                  <label className="block text-[0.5rem] font-semibold text-cm-text-secondary uppercase mb-1">Unidad</label>
                  <select value={quickForm.unit} onChange={e => setQuickForm({ ...quickForm, unit: e.target.value })}
                    className="bg-cm-bg-alt border border-cm-border rounded-lg px-2 py-1.5 text-xs text-cm-text">
                    {['kg', 'gr', 'litro', 'ml', 'unidad', 'docena'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[0.5rem] font-semibold text-cm-text-secondary uppercase mb-1">Costo/u</label>
                  <input type="number" min="0" step="0.01" value={quickForm.cost} onChange={e => setQuickForm({ ...quickForm, cost: e.target.value })}
                    className="w-20 bg-cm-bg-alt border border-cm-border rounded-lg px-2 py-1.5 text-xs text-cm-text" />
                </div>
                <div>
                  <label className="block text-[0.5rem] font-semibold text-cm-text-secondary uppercase mb-1">Cant. a pedir</label>
                  <input type="number" min="1" placeholder="Cantidad" value={quickForm.qty} onChange={e => setQuickForm({ ...quickForm, qty: e.target.value })}
                    className="w-20 bg-cm-bg-alt border border-cm-border rounded-lg px-2 py-1.5 text-xs text-cm-text" />
                </div>
                <button onClick={quickCreate} className="px-3 py-1.5 bg-cm-accent text-white text-[0.55rem] font-bold rounded-lg hover:bg-cm-accent-hover transition-colors">
                  Crear y agregar
                </button>
                {quickErr && <p className="w-full text-[0.6rem] font-semibold text-cm-error">{quickErr}</p>}
              </div>
            )}
            <p className="text-[0.55rem] text-cm-text-secondary">Poné la cantidad y tocá <span className="font-bold text-cm-accent">Agregar</span> para sumarlo a la orden. Los que faltan se marcan en rojo.</p>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto rounded-lg border border-cm-border/20">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase tracking-wider border-b border-cm-border bg-cm-bg-alt">
                    <th className="text-left py-1.5 pr-2 w-auto">
                      <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-cm-accent transition-colors cursor-pointer">
                        Insumo {sortKey === 'name' && <span className="text-cm-accent">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </th>
                    <th className="text-right py-1.5 pr-2 w-12">
                      <button onClick={() => toggleSort('stock')} className="inline-flex items-center gap-1 hover:text-cm-accent transition-colors cursor-pointer">
                        Stock {sortKey === 'stock' && <span className="text-cm-accent">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </th>
                    <th className="text-right py-1.5 pr-2 w-10">
                      <button onClick={() => toggleSort('minStock')} className="inline-flex items-center gap-1 hover:text-cm-accent transition-colors cursor-pointer">
                        Mín {sortKey === 'minStock' && <span className="text-cm-accent">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </th>
                    <th className="text-right py-1.5 pr-2 w-14">
                      <button onClick={() => toggleSort('deficit')} className="inline-flex items-center gap-1 hover:text-cm-accent transition-colors cursor-pointer">
                        Falta {sortKey === 'deficit' && <span className="text-cm-accent">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </th>
                    <th className="text-right py-1.5 pr-2 w-20">Cant.</th>
                    <th className="text-right py-1.5 pr-2 w-24">
                      <button onClick={() => toggleSort('cost')} className="inline-flex items-center gap-1 hover:text-cm-accent transition-colors cursor-pointer">
                        Costo/u {sortKey === 'cost' && <span className="text-cm-accent">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </th>
                    <th className="text-right py-1.5 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {orderIngredients.map(ing => {
                    const deficit = Math.max(0, (ing.minStock || 0) - (ing.stock || 0));
                    const inCart = !!selectedIngs[ing.id];
                    const active = activeRowId === ing.id;
                    const supId = itemSupplier(ing);
                    const supName = supId !== form.supplierId ? suppliers.find(s => s.id === supId)?.name : null;
                    const qty = qtyDrafts[ing.id] ?? (inCart ? selectedIngs[ing.id].quantity : deficit || 0);
                    const cost = costDrafts[ing.id] ?? selectedIngs[ing.id]?.unitCost ?? lastCosts[ing.id] ?? ing.cost ?? 0;
                    return (
                      <tr key={ing.id} className={`border-b border-cm-border/20 transition-colors ${
                        active
                          ? 'bg-cm-accent/10 shadow-[inset_3px_0_0_0_var(--cm-accent)]'
                          : inCart ? 'bg-cm-surface/40' : 'bg-transparent hover:bg-cm-bg-alt'
                      }`}>
                        <td className="py-1.5 pr-2 font-medium text-cm-text whitespace-nowrap">
                          {ing.name}
                          <span className="text-cm-text-tertiary ml-1 font-normal">({ing.unit})</span>
                          {supName && (
                            <span className="ml-1 text-[0.55rem] text-cm-accent bg-cm-accent/5 px-1 py-0.5 rounded-full">{supName}</span>
                          )}
                        </td>
                        <td className={`py-1.5 pr-2 text-right align-middle ${(ing.stock || 0) <= (ing.minStock || 0) ? 'text-cm-warning font-semibold' : 'text-cm-text-secondary'}`}>
                          {ing.stock ?? '—'}
                        </td>
                        <td className="py-1.5 pr-2 text-right align-middle text-cm-text-secondary">{ing.minStock ?? '—'}</td>
                        <td className={`py-1.5 pr-2 text-right align-middle font-bold ${deficit > 0 ? 'text-cm-error' : 'text-cm-text-tertiary'}`}>
                          {deficit > 0 ? deficit : '—'}
                        </td>
                        <td className="py-1 pr-2 align-middle">
                          <input type="number" min="0" step="1" value={qty}
                            ref={el => { qtyInputRefs.current[ing.id] = el; }}
                            onFocus={() => setActiveRowId(ing.id)}
                            onKeyDown={e => handleQtyKeyDown(e, ing.id)}
                            onPaste={e => handleQtyPaste(e, ing.id)}
                            onChange={e => setQtyDrafts(prev => ({ ...prev, [ing.id]: e.target.value }))}
                            className="w-full max-w-[5rem] px-2 py-1 rounded border text-right text-xs font-medium bg-cm-surface border-cm-border text-cm-text focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30" />
                        </td>
                        <td className="py-1 pr-2 align-middle">
                          <input type="number" step="0.01" min="0" value={cost}
                            onFocus={() => setActiveRowId(ing.id)}
                            onChange={e => setCostDrafts(prev => ({ ...prev, [ing.id]: e.target.value }))}
                            className="w-full max-w-[6rem] px-2 py-1 rounded border text-right text-xs font-medium bg-cm-surface border-cm-border text-cm-text focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30" />
                        </td>
                        <td className="py-1.5 text-right align-middle">
                          {inCart ? (
                            <button onClick={() => removeFromCart(ing.id)}
                              className="px-2 py-1 text-[0.55rem] font-bold rounded-lg bg-cm-error/10 text-cm-error hover:bg-cm-error/20 transition-colors">
                              Quitar
                            </button>
                          ) : (
                            <button onClick={() => addToCart(ing, qty, cost)}
                              className="px-2 py-1 text-[0.55rem] font-bold rounded-lg bg-cm-accent text-white hover:bg-cm-accent-hover transition-colors flex items-center gap-1 ml-auto">
                              <Plus className="w-2.5 h-2.5" /> Agregar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {Object.keys(selectedIngs).length > 0 && (
              <div className="border border-cm-border rounded-xl overflow-clip">
                <div className="bg-cm-surface px-3 py-2 text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary border-b border-cm-border flex items-center justify-between">
                  <span>En la orden ({ingCount} {ingCount === 1 ? 'insumo' : 'insumos'})</span>
                  <span className="text-cm-text font-bold normal-case">{fmtCurrency(ingTotal)}</span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase tracking-wider border-b border-cm-border">
                        <th className="text-left py-1.5 pl-3 pr-2">Insumo</th>
                        {showAllIngs && !editingOrderId && <th className="text-left py-1.5 pr-2">Proveedor</th>}
                        <th className="text-right py-1.5 pr-2 w-16">Cant.</th>
                        <th className="text-right py-1.5 pr-2 w-20">Costo/u</th>
                        <th className="text-right py-1.5 pr-2 w-20">Subtotal</th>
                        <th className="text-right py-1.5 pr-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(selectedIngs).map(([id, v]) => {
                        const supplier = suppliers.find(s => s.id === v.supplierId);
                        return (
                          <tr key={id} className="border-b border-cm-border/20">
                            <td className="py-1.5 pl-3 pr-2 font-medium text-cm-text">{v.name}</td>
                            {showAllIngs && !editingOrderId && (
                              <td className="py-1.5 pr-2 text-cm-text-secondary">{supplier?.name || '—'}</td>
                            )}
                            <td className="py-1 pr-2 align-middle">
                              <input type="number" min="0" step="1" value={v.quantity}
                                onChange={e => setSelectedIngs(prev => ({ ...prev, [id]: { ...prev[id], quantity: Math.max(0, Number(e.target.value)) } }))}
                                className="w-full max-w-[4rem] px-1.5 py-1 rounded border text-right text-xs font-medium bg-cm-surface border-cm-border text-cm-text focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30" />
                            </td>
                            <td className="py-1 pr-2 align-middle">
                              <input type="number" min="0" step="0.01" value={v.unitCost}
                                onChange={e => setSelectedIngs(prev => ({ ...prev, [id]: { ...prev[id], unitCost: Math.max(0, Number(e.target.value)) } }))}
                                className="w-full max-w-[5rem] px-1.5 py-1 rounded border text-right text-xs font-medium bg-cm-surface border-cm-border text-cm-text focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30" />
                            </td>
                            <td className="py-1.5 pr-2 text-right font-semibold text-cm-text">{fmtCurrency(v.quantity * v.unitCost)}</td>
                            <td className="py-1.5 pr-2 text-right">
                              <button onClick={() => removeFromCart(id)} className="p-1 rounded hover:bg-cm-error/10 text-cm-text-tertiary hover:text-cm-error transition-colors" title="Quitar de la orden">
                                <X className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            </>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <textarea placeholder="Notas (opcional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
              className="flex-1 bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs text-cm-text resize-none" />
            <div className="flex gap-2 shrink-0 self-end">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 text-xs font-semibold text-cm-text-secondary border border-cm-border rounded-lg hover:bg-cm-surface transition-colors">Cancelar</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" /> {editingOrderId ? 'Actualizar' : 'Crear orden'}
              </button>
            </div>
          </div>
          </>
          )}
        </div>
      )}

      <div className="space-y-2">
        {filteredOrders.length === 0 && (
          <div className="text-center py-8 text-xs text-cm-text-secondary">No hay órdenes {statusFilter !== 'all' ? statusFilter : ''}</div>
        )}
        {filteredOrders.map(o => {
          const itemCount = o.items ? Object.keys(o.items).length : 0;
          const whatsappUrl = (order) => {
            if (!order.supplierName) return null;
            const supplier = suppliers.find(s => s.id === order.supplierId);
            if (!supplier?.telefono) return null;
            const phone = supplier.telefono.replace(/[^0-9]/g, '');
            if (phone.length < 9) return null;
            const items = Object.values(order.items || {});
            const lines = items.map(i =>
              `• ${i.name}: ${i.quantity} ${i.unit} x S/ ${Number(i.unitCost).toFixed(2)} = S/ ${(i.quantity * i.unitCost).toFixed(2)}`
            ).join('\n');
            const text = encodeURIComponent(
              `🛒 *Pedido N° ${order.id.slice(-4)}*\n` +
              `📅 ${new Date(order.orderedAt).toLocaleDateString('es-PE')}\n` +
              `🏭 *Proveedor: ${order.supplierName}*\n\n` +
              `*Items:*\n${lines}\n\n` +
              `*Total: S/ ${Number(order.total || 0).toFixed(2)}*\n\n` +
              `¿Confirmas disponibilidad?`
            );
            return `https://wa.me/51${phone}?text=${text}`;
          };
          return (
            <div key={o.id} className="bg-cm-surface border border-cm-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-cm-text">{o.supplierName}</span>
                    <span className={`text-[0.55rem] font-semibold px-1.5 py-0.5 rounded-full ${
                      o.status === 'recibido' ? 'bg-cm-success/10 text-cm-success' :
                      o.status === 'cancelado' ? 'bg-cm-error/10 text-cm-error' :
                      o.status === 'pre_pedido' ? 'bg-violet-500/10 text-violet-600' :
                      'bg-cm-warning/10 text-cm-warning'
                    }`}>{o.status === 'pre_pedido' ? 'Pre-pedido' : o.status}</span>
                  </div>
                  <div className="text-[0.6rem] text-cm-text-secondary">{o.orderedAt ? new Date(o.orderedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  <span className="text-sm font-bold text-cm-text">{fmtCurrency(o.total || 0)}</span>
                  {o.status === 'pre_pedido' && (
                    <>
                      <button onClick={() => editOrder(o)} className="px-2 py-1 bg-violet-500/10 text-violet-600 text-[0.55rem] font-semibold rounded-lg hover:bg-violet-500/20 transition-colors">
                        Confirmar
                      </button>
                      <button onClick={async () => {
                        const reason = window.prompt('Motivo del rechazo (visible para cocina):', '');
                        if (reason === null) return;
                        await cancelPurchaseOrder(branchId, o.id, userEmail, reason.trim() || undefined);
                        toast(reason.trim() ? 'Pre-pedido rechazado' : 'Pre-pedido cancelado');
                      }} className="px-2 py-1 bg-cm-error/10 text-cm-error text-[0.55rem] font-semibold rounded-lg hover:bg-cm-error/20 transition-colors">
                        Rechazar
                      </button>
                    </>
                  )}
                  {o.status === 'pendiente' && (
                    <>
                      <button onClick={() => editOrder(o)} className="p-1.5 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary transition-colors" title="Editar">
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button onClick={() => duplicateOrder(o)} className="p-1.5 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary transition-colors" title="Duplicar">
                        <Copy className="w-3 h-3" />
                      </button>
                      <button onClick={() => openReceive(o)} className="px-2 py-1 bg-cm-success/10 text-cm-success text-[0.55rem] font-semibold rounded-lg hover:bg-cm-success/20 transition-colors">
                        Recibir
                      </button>
                      <button onClick={async () => { if (confirm('¿Cancelar esta orden?')) { await cancelPurchaseOrder(branchId, o.id, userEmail); toast('Orden cancelada'); } }} className="px-2 py-1 bg-cm-error/10 text-cm-error text-[0.55rem] font-semibold rounded-lg hover:bg-cm-error/20 transition-colors">
                        Cancelar
                      </button>
                      {whatsappUrl(o) && (
                        <a href={whatsappUrl(o)} target="_blank" rel="noopener noreferrer"
                          className="px-2 py-1 bg-cm-success/10 text-cm-success text-[0.55rem] font-semibold rounded-lg hover:bg-cm-success/20 transition-colors flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                        </a>
                      )}
                    </>
                  )}
                  <button onClick={() => downloadCSV(o)} className="p-1.5 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary transition-colors" title="Exportar CSV">
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {o.status === 'cancelado' && o.cancelReason && (
                <p className="mt-2 text-[0.6rem] text-cm-error bg-cm-error/5 rounded-lg px-2 py-1.5">
                  <span className="font-bold">Motivo de rechazo:</span> {o.cancelReason}
                </p>
              )}
              {o.items && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                  {Object.values(o.items).map((item, i) => (
                    <div key={i} className="bg-cm-bg-alt rounded-lg px-2 py-1 text-[0.6rem]">
                      <span className="text-cm-text font-medium">{item.name}</span>
                      <span className="text-cm-text-secondary ml-1">{item.quantity} {item.unit} x {fmtCurrency(item.unitCost)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {receiveOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" role="dialog" aria-label="Recibir orden" onClick={() => { if (!receiving) { setReceiveOrder(null); resetVoucherState(); clearExtraction(); } }}>
          <div className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-md mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-cm-text mb-1">Recibir orden</h3>
            <p className="text-xs text-cm-text-secondary mb-3">{receiveOrder.supplierName || '—'} · {fmtCurrency(receiveOrder.total || 0)}</p>
            <div className="overflow-y-auto flex-1 space-y-2 mb-4">
              {(() => {
                const matchedIds = new Set(matchedItems.map(m => m.poIngredientId));
                return (
                  <>
                    {Object.entries(receiveOrder.items || {}).map(([id, item]) => {
                      const isMatched = matchedIds.has(id);
                      return (
                        <div key={id} className={`flex items-center gap-2 bg-cm-bg-alt rounded-lg px-3 py-2 ${isMatched ? 'ring-1 ring-cm-success/50' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-cm-text truncate flex items-center gap-1.5">
                              {item.name}
                              {isMatched && (
                                <span className="inline-flex items-center gap-0.5 text-[0.55rem] font-bold text-cm-success bg-cm-success/10 px-1.5 py-0.5 rounded-full shrink-0">
                                  <CheckCircle className="w-2.5 h-2.5" /> Emparejado
                                </span>
                              )}
                            </div>
                            <div className="text-[0.6rem] text-cm-text-secondary">Pedido: {item.quantity} {item.unit} · {fmtCurrency(item.unitCost)}</div>
                          </div>
                          <input
                            type="number" min="0" step="1" value={receiveQtys[id] ?? item.quantity}
                            aria-label={`Cantidad ${item.name}`}
                            onChange={e => { touchedRef.current.add(`${id}:qty`); setReceiveQtys(prev => ({ ...prev, [id]: e.target.value })); }}
                            disabled={receiving}
                            className="w-16 px-2 py-1 rounded border text-right text-xs font-medium bg-cm-surface border-cm-border text-cm-text focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30" />
                          <div className="flex items-center gap-0.5 shrink-0">
                            <span className="text-[0.6rem] text-cm-text-secondary">S/</span>
                            <input
                              type="number" min="0" step="0.01" value={receiveCosts[id] ?? item.unitCost}
                              aria-label={`Costo ${item.name}`}
                              onChange={e => { touchedRef.current.add(`${id}:cost`); setReceiveCosts(prev => ({ ...prev, [id]: e.target.value })); }}
                              disabled={receiving}
                              className="w-16 px-1.5 py-1 rounded border text-right text-[0.6rem] font-medium bg-cm-surface border-cm-border text-cm-text focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30" />
                          </div>
                          <span className="text-[0.6rem] text-cm-text-secondary w-8 shrink-0">{item.unit}</span>
                        </div>
                      );
                    })}
                    {/* 4.5 — Items de la boleta sin match: revisión manual editable */}
                    {unmatchedItems.length > 0 && (
                      <div className="bg-cm-warning/5 border border-cm-warning/20 rounded-lg px-3 py-2 space-y-2">
                        <div className="text-[0.6rem] font-bold text-cm-warning flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Revisar manualmente
                        </div>
                        {unmatchedItems.map((it, idx) => {
                          const draft = unmatchedEdits[idx] || {};
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-cm-text truncate">{it.name}</div>
                                <div className="text-[0.6rem] text-cm-text-secondary">Boleta: {fmtCurrency((Number(draft.quantity ?? it.quantity) || 0) * (Number(draft.unitCost ?? it.unitCost) || 0))}</div>
                              </div>
                              <input
                                type="number" min="0" step="1" value={draft.quantity ?? it.quantity}
                                aria-label={`Cantidad ${it.name}`}
                                onChange={e => setUnmatchedEdits(prev => ({ ...prev, [idx]: { ...prev[idx], quantity: e.target.value } }))}
                                disabled={receiving}
                                className="w-16 px-2 py-1 rounded border text-right text-xs font-medium bg-cm-surface border-cm-border text-cm-text focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30" />
                              <div className="flex items-center gap-0.5 shrink-0">
                                <span className="text-[0.6rem] text-cm-text-secondary">S/</span>
                                <input
                                  type="number" min="0" step="0.01" value={draft.unitCost ?? it.unitCost}
                                  aria-label={`Costo ${it.name}`}
                                  onChange={e => setUnmatchedEdits(prev => ({ ...prev, [idx]: { ...prev[idx], unitCost: e.target.value } }))}
                                  disabled={receiving}
                                  className="w-16 px-1.5 py-1 rounded border text-right text-[0.6rem] font-medium bg-cm-surface border-cm-border text-cm-text focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            {/* Voucher upload — gated por VITE_ENABLE_VOUCHER_OCR (8.1) */}
            {voucherOcrEnabled() && (
            <div className="space-y-2">
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleVoucherSelect(e.dataTransfer.files?.[0]); }}
                className="relative flex flex-col items-center justify-center gap-1 border border-dashed border-cm-border rounded-lg px-3 py-3 text-center">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Subir voucher"
                  onChange={e => handleVoucherSelect(e.target.files?.[0])}
                  disabled={voucherUploading || receiving}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <Upload className="w-4 h-4 text-cm-text-secondary" />
                <span className="text-[0.6rem] text-cm-text-secondary">
                  {voucherUploading ? 'Subiendo...' : 'Subir voucher (JPG/PNG/WebP, máx 5MB)'}
                </span>
                {voucherUploading && (
                  <>
                    <span className="text-[0.6rem] font-semibold text-cm-accent">{Math.round(voucherUploadProgress)}%</span>
                    <div className="w-full h-1.5 bg-cm-bg-alt rounded-full overflow-hidden">
                      <div className="h-full bg-cm-accent rounded-full transition-all" style={{ width: `${voucherUploadProgress}%` }} />
                    </div>
                  </>
                )}
              </div>
              {voucherError && (
                <p role="alert" className="text-[0.6rem] text-cm-error">{voucherError}</p>
              )}
              {voucherUrl && (
                <div className="flex items-center gap-3 bg-cm-bg-alt rounded-lg px-3 py-2">
                  <img src={voucherUrl} alt="Voucher" className="w-16 h-16 object-cover rounded-lg" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-cm-text truncate">{voucherFileName}</div>
                    <div className="text-[0.6rem] text-cm-text-secondary">
                      Subido {voucherUploadedAt ? new Date(voucherUploadedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </div>
              )}
              {/* 3.2/3.4/4.8 — Extracción OCR: Analizar / Reintentar / Re-escanear */}
              {voucherUrl && (
                <div className="space-y-1.5">
                  <button
                    onClick={extractionState === 'extracting' ? undefined : rescanVoucher}
                    disabled={extractionState === 'extracting' || receiving || voucherUploading}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {extractionState === 'extracting' ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analizando boleta...</>
                    ) : extractionState === 'done' ? (
                      'Re-escanear'
                    ) : extractionState === 'error' ? (
                      'Reintentar extracción'
                    ) : (
                      'Analizar boleta'
                    )}
                  </button>
                  {extractionState === 'extracting' && (
                    <div className="space-y-1 px-1">
                      {AI_STEPS_EXTRACT_VOUCHER.map((step, i) => {
                        const status = i === 0 ? 'done' : i === 1 ? 'current' : 'pending';
                        return (
                          <div key={step.label} className="flex items-center gap-1.5 text-[0.6rem]">
                            {status === 'current' ? (
                              <Loader2 className="w-3 h-3 animate-spin text-cm-accent shrink-0" />
                            ) : status === 'done' ? (
                              <CheckCircle className="w-3 h-3 text-cm-success shrink-0" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-cm-border shrink-0" />
                            )}
                            <span className={status === 'pending' ? 'text-cm-text-tertiary' : 'text-cm-text-secondary'}>{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {extractionState === 'done' && (
                    <p className="text-[0.6rem] font-semibold text-cm-success flex items-center gap-1 px-1">
                      <CheckCircle className="w-3 h-3 shrink-0" /> Extracción completada · {matchedItems.length} emparejado(s), {unmatchedItems.length} sin coincidir
                    </p>
                  )}
                  {extractionState === 'error' && (
                    <p role="alert" className="text-[0.6rem] text-cm-error px-1">{extractionError}</p>
                  )}
                </div>
              )}
            </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-cm-text-secondary">Total a recibir</span>
              <span className="text-sm font-bold text-cm-text">
                {fmtCurrency(Object.entries(receiveOrder.items || {}).reduce((s, [id, item]) => {
                  const n = Number(receiveQtys[id] ?? item.quantity);
                  const c = Number(receiveCosts[id] ?? (item.unitCost || 0));
                  return s + (isNaN(n) || n < 0 ? 0 : n) * (isNaN(c) ? 0 : c);
                }, 0))}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { if (!receiving) { setReceiveOrder(null); resetVoucherState(); clearExtraction(); } }}
                className="flex-1 py-2 border border-cm-border text-xs font-semibold text-cm-text rounded-lg hover:bg-cm-bg-alt transition-colors">
                Cancelar
              </button>
              <button onClick={handleReceive} disabled={receiving}
                className="flex-1 py-2 bg-cm-success text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                {receiving ? 'Recibiendo...' : 'Confirmar recepción'}
              </button>
            </div>
          </div>
        </div>
      )}

      {priceChanges.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setPriceChanges([]); setPriceChangeOrderId(null); }}>
          <div className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-cm-text mb-3">Precios actualizados</h3>
            <p className="text-xs text-cm-text-secondary mb-3">Los siguientes insumos cambiaron de precio:</p>
            <div className="space-y-2 mb-4">
              {priceChanges.map((pc, i) => (
                <div key={i} className="flex justify-between text-xs bg-cm-bg-alt rounded-lg px-3 py-2">
                  <span className="text-cm-text">{pc.name}</span>
                  <span className="text-cm-text-secondary">{fmtCurrency(pc.oldCost)} → <span className="text-cm-accent font-bold">{fmtCurrency(pc.newCost)}</span></span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={async () => {
                const order = orders.find(o => o.id === priceChangeOrderId);
                if (!order) return;
                for (const pc of priceChanges) {
                  const { setIngredientPrice } = await import('../../lib/pricingService');
                  await setIngredientPrice(branchId, pc.ingredientId, order.supplierId, pc.newCost, { poId: priceChangeOrderId });
                }
                setPriceChanges([]);
                setPriceChangeOrderId(null);
              }} className="flex-1 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg">Actualizar todos</button>
              <button onClick={() => { setPriceChanges([]); setPriceChangeOrderId(null); }} className="px-4 py-2 border border-cm-border text-xs font-semibold text-cm-text rounded-lg">Ignorar</button>
            </div>
          </div>
        </div>
      )}

      {directIntake && (
        <DirectVoucherModal
          branchId={branchId}
          userEmail={userEmail}
          ingredients={ingredients}
          ingredientsLoading={loading}
          onClose={() => setDirectIntake(false)}
          onDone={(result) => {
            setDirectIntake(false);
            const parts = ['Boleta registrada'];
            if (result?.total) parts.push(fmtCurrency(result.total));
            if (result?.newIngredients?.length) parts.push(`${result.newIngredients.length} insumo(s) nuevo(s)`);
            toast(parts.join(' · '));
          }} />
      )}
    </div>
  );
}

/* ─── COGS ─── */
function COGSSection({ branchId, cogs, products, loading, error }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [marginFilter, setMarginFilter] = useState('all');

  const entries = useMemo(() => {
    let result = products.map(p => ({
      ...p,
      cost: cogs[p.id]?.costPerPortion || 0,
      margin: p.base_price > 0 ? ((p.base_price - (cogs[p.id]?.costPerPortion || 0)) / p.base_price * 100) : 0,
    }));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(q));
    }
    if (marginFilter === 'bajo') result = result.filter(p => p.cost > 0 && p.margin < 20);
    else if (marginFilter === 'medio') result = result.filter(p => p.cost > 0 && p.margin >= 20 && p.margin < 40);
    else if (marginFilter === 'alto') result = result.filter(p => p.cost > 0 && p.margin >= 40);
    else if (marginFilter === 'sin') result = result.filter(p => p.cost === 0);
    return result.sort((a, b) => b.margin - a.margin);
  }, [products, cogs, searchQuery, marginFilter]);

  const totalRevenue = entries.reduce((s, p) => s + Number(p.base_price || 0), 0);
  const totalCost = entries.reduce((s, p) => s + p.cost, 0);

  if (error) return <SectionContainer error={error} loading={false} data={[]} />;
  if (loading) return <SectionContainer loading error={null} data={[]} rows={6} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.55rem] text-cm-text-secondary uppercase font-semibold">Con receta</div>
          <div className="text-lg font-bold text-cm-text mt-1">{Object.keys(cogs).length}</div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.55rem] text-cm-text-secondary uppercase font-semibold">Sin receta</div>
          <div className="text-lg font-bold text-cm-warning mt-1">{products.filter(p => !cogs[p.id]).length}</div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.55rem] text-cm-text-secondary uppercase font-semibold">Margen promedio</div>
          <div className="text-lg font-bold text-cm-success mt-1">{products.length > 0 ? (products.reduce((s, p) => s + ((p.base_price > 0 ? ((p.base_price - (cogs[p.id]?.costPerPortion || 0)) / p.base_price * 100) : 0)), 0) / products.length).toFixed(1) : 0}%</div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.55rem] text-cm-text-secondary uppercase font-semibold">Costo total</div>
          <div className="text-lg font-bold text-cm-text mt-1">{fmtCurrency(totalCost)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          {[{ key: 'all', label: 'Todos' }, { key: 'bajo', label: '< 20%' }, { key: 'medio', label: '20-40%' }, { key: 'alto', label: '> 40%' }, { key: 'sin', label: 'Sin costo' }].map(f => (
            <button key={f.key} onClick={() => setMarginFilter(f.key)}
              className={`px-2 py-1 text-[0.55rem] font-bold uppercase rounded-lg transition-colors ${
                marginFilter === f.key
                  ? 'bg-cm-accent text-white'
                  : 'text-cm-text-secondary hover:bg-cm-bg-alt'
              }`}>{f.label}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-cm-text-tertiary" />
          <input type="text" placeholder="Buscar producto..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 bg-cm-surface border border-cm-border rounded-lg text-xs text-cm-text placeholder:text-cm-text-tertiary" />
        </div>
      </div>

      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-clip">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-cm-text-secondary border-b border-cm-border bg-cm-bg-alt/50">
              <th className="text-left font-semibold py-3 pl-4 pr-4">Producto</th>
              <th className="text-right font-semibold py-3 px-3">Precio venta</th>
              <th className="text-right font-semibold py-3 px-3">Costo</th>
              <th className="text-right font-semibold py-3 px-3">Ganancia</th>
              <th className="text-right font-semibold py-3 pl-3 pr-4">Margen</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr><td colSpan="5" className="text-center py-8 text-xs text-cm-text-secondary">Sin resultados</td></tr>
            )}
            {entries.map(p => (
              <tr key={p.id} className="border-b border-cm-border/50 hover:bg-cm-accent/5 transition-colors">
                <td className="py-3 pl-4 pr-4 font-medium text-cm-text">{p.name}</td>
                <td className="py-3 px-3 text-right text-cm-text">{fmtCurrency(p.base_price || 0)}</td>
                <td className={`py-3 px-3 text-right ${p.cost > 0 ? 'text-cm-text' : 'text-cm-text-tertiary'}`}>{p.cost > 0 ? fmtCurrency(p.cost) : '-'}</td>
                <td className="py-3 px-3 text-right text-cm-text">{fmtCurrency((p.base_price || 0) - p.cost)}</td>
                <td className="py-3 pl-3 pr-4 text-right">
                  <span className={`text-xs font-bold ${p.margin >= 40 ? 'text-cm-success' : p.margin >= 20 ? 'text-cm-warning' : p.margin > 0 ? 'text-cm-error' : 'text-cm-text-tertiary'}`}>
                    {p.cost > 0 ? `${p.margin.toFixed(1)}%` : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── MERMAS ─── */
function WasteSection({ branchId, userEmail, waste, ingredients, loading, error, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ingredientId: '', quantity: '', unit: 'kg', reason: '' });
  const [ingFilter, setIngFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('all');

  const now = useMemo(() => Date.now(), []);

  const filtered = useMemo(() => {
    let result = waste;
    if (ingFilter) result = result.filter(w => w.ingredientId === ingFilter);
    if (dateRange === '7d') {
      const cutoff = now - 7 * 86400000;
      result = result.filter(w => new Date(w.createdAt).getTime() >= cutoff);
    } else if (dateRange === '30d') {
      const cutoff = now - 30 * 86400000;
      result = result.filter(w => new Date(w.createdAt).getTime() >= cutoff);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(w =>
        (w.ingredientName || '').toLowerCase().includes(q) ||
        (w.reason || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [waste, ingFilter, dateRange, searchQuery, now]);

  const totalCost = useMemo(() => filtered.reduce((s, w) => s + Number(w.totalCost || 0), 0), [filtered]);
  const pendientes = waste.filter(w => w.requiresApproval && !w.approvedBy);

  const handleSave = async () => {
    if (!form.ingredientId || !form.quantity) return;
    const ing = ingredients.find(i => i.id === form.ingredientId);
    await createWaste(branchId, {
      ingredientId: form.ingredientId,
      ingredientName: ing?.name || '',
      quantity: form.quantity,
      unit: form.unit || ing?.unit || 'kg',
      unitCost: ing?.cost || 0,
      reason: form.reason,
      createdBy: userEmail,
    });
    toast('Merma registrada');
    setForm({ ingredientId: '', quantity: '', unit: 'kg', reason: '' });
    setShowForm(false);
  };

  if (error) return <SectionContainer error={error} loading={false} data={[]} />;
  if (loading) return <SectionContainer loading error={null} data={[]} />;

  return (
    <div className="space-y-4">
      {pendientes.length > 0 && (
        <div className="bg-cm-warning/5 border border-cm-warning/20 rounded-xl p-3">
          <p className="text-xs font-bold text-cm-warning mb-2">{pendientes.length} merma(s) pendiente(s) de aprobación</p>
          {pendientes.map(w => (
            <div key={w.id} className="flex items-center justify-between text-xs py-1">
              <span>{w.ingredientName} — {w.quantity} {w.unit} ({fmtCurrency(w.totalCost)})</span>
              <button onClick={async () => { await approveWaste(branchId, w.id, userEmail); toast('Merma aprobada'); }}
                className="px-2 py-0.5 bg-cm-accent text-white text-[0.55rem] font-semibold rounded">Aprobar</button>
            </div>
          ))}
        </div>
      )}

      {/* Summary + filters */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-cm-text-secondary">{filtered.length} registro(s)</span>
          <span className="text-xs text-cm-text-secondary">|</span>
          <span className="text-xs text-cm-text-secondary">Total:</span>
          <span className="text-xs font-bold text-cm-error">{fmtCurrency(totalCost)}</span>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg">
          <Plus className="w-3.5 h-3.5" /> Registrar merma
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={ingFilter} onChange={e => setIngFilter(e.target.value)}
          className="bg-cm-surface border border-cm-border rounded-lg px-2 py-1.5 text-xs text-cm-text">
          <option value="">Todos los insumos</option>
          {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select value={dateRange} onChange={e => setDateRange(e.target.value)}
          className="bg-cm-surface border border-cm-border rounded-lg px-2 py-1.5 text-xs text-cm-text">
          <option value="all">Todo el período</option>
          <option value="30d">Últimos 30 días</option>
          <option value="7d">Últimos 7 días</option>
        </select>
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-cm-text-tertiary" />
          <input type="text" placeholder="Buscar..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 bg-cm-surface border border-cm-border rounded-lg text-xs text-cm-text placeholder:text-cm-text-tertiary" />
        </div>
      </div>

      {showForm && (
        <div className="bg-cm-bg-alt border border-cm-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <select value={form.ingredientId} onChange={e => {
              const ing = ingredients.find(i => i.id === e.target.value);
              setForm({...form, ingredientId: e.target.value, unit: ing?.unit || 'kg'});
            }} className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs text-cm-text">
              <option value="">Seleccionar insumo...</option>
              {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} (stock: {i.stock} {i.unit})</option>)}
            </select>
            <input type="number" step="0.01" placeholder="Cantidad" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs text-cm-text" />
            <input type="text" placeholder="Motivo" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs text-cm-text" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-cm-text-secondary">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-1.5 bg-cm-accent text-white text-xs font-semibold rounded-lg">Guardar</button>
          </div>
        </div>
      )}

      {/* Top razones */}
      {filtered.length > 0 && (() => {
        const grouped = {};
        filtered.forEach(w => {
          const r = w.reason || 'Sin motivo';
          if (!grouped[r]) grouped[r] = { count: 0, total: 0 };
          grouped[r].count++;
          grouped[r].total += Number(w.totalCost || 0);
        });
        const top = Object.entries(grouped).sort((a, b) => b[1].total - a[1].total).slice(0, 4);
        if (top.length === 0) return null;
        return (
          <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
            <h3 className="text-[0.55rem] font-bold text-cm-text-secondary uppercase mb-2">Top razones de merma</h3>
            <div className="flex flex-wrap gap-2">
              {top.map(([reason, data]) => (
                <div key={reason} className="bg-cm-bg-alt rounded-lg px-3 py-2 text-xs flex items-center gap-2">
                  <span className="text-cm-text font-medium max-w-[120px] truncate" title={reason}>{reason}</span>
                  <span className="text-cm-text-secondary">{data.count}x</span>
                  <span className="font-bold text-cm-error">{fmtCurrency(data.total)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-clip">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-cm-text-secondary border-b border-cm-border bg-cm-bg-alt/50">
              <th className="text-left font-semibold py-3 pl-4 pr-4">Fecha</th>
              <th className="text-left font-semibold py-3 px-3">Insumo</th>
              <th className="text-right font-semibold py-3 px-3">Cant.</th>
              <th className="text-right font-semibold py-3 px-3">Costo</th>
              <th className="text-left font-semibold py-3 px-3">Motivo</th>
              <th className="text-center font-semibold py-3 px-3">Estado</th>
              <th className="text-left font-semibold py-3 pl-3 pr-4">Aprobado por</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan="7" className="text-center py-8 text-xs text-cm-text-secondary">Sin registros de merma</td></tr>
            )}
            {filtered.map(w => (
              <tr key={w.id} className="border-b border-cm-border/50 hover:bg-cm-accent/5">
                <td className="py-3 pl-4 pr-4 text-cm-text-secondary">{w.createdAt ? new Date(w.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }) : '-'}</td>
                <td className="py-3 px-3 font-medium text-cm-text">{w.ingredientName}</td>
                <td className="py-3 px-3 text-right text-cm-text">{w.quantity} {w.unit}</td>
                <td className="py-3 px-3 text-right text-cm-error">{fmtCurrency(w.totalCost || 0)}</td>
                <td className="py-3 px-3 text-cm-text-secondary max-w-[140px] truncate" title={w.reason}>{w.reason}</td>
                <td className="py-3 px-3 text-center">
                  {w.approvedBy ? (
                    <span className="text-[0.5rem] font-semibold bg-cm-success/10 text-cm-success px-1.5 py-0.5 rounded-full">Aprobada</span>
                  ) : w.requiresApproval ? (
                    <span className="text-[0.5rem] font-semibold bg-cm-warning/10 text-cm-warning px-1.5 py-0.5 rounded-full">Pendiente</span>
                  ) : (
                    <span className="text-[0.5rem] font-semibold bg-cm-info/10 text-cm-info px-1.5 py-0.5 rounded-full">Auto</span>
                  )}
                </td>
                <td className="py-3 pl-3 pr-4 text-cm-text-secondary">{w.approvedBy || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const SECTION_MAP = {
  dashboard: DashboardSection,
  ingredients: IngredientsSection,
  recipes: RecipesSection,
  movements: MovementsSection,
  suppliers: SuppliersSection,
  orders: PurchaseOrdersSection,
  cogs: COGSSection,
  waste: WasteSection,
};
