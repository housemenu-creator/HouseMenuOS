import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Plus, Edit3, Trash2, Search, ClipboardList, Truck, TrendingUp,
  ArrowUpDown, AlertTriangle, CheckCircle, X, Loader2, Save, History, DollarSign, Store,
  BarChart3, Clock,
} from 'lucide-react';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { ref as dbRef, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import {
  subscribeIngredients, createIngredient, updateIngredient, deleteIngredient,
  subscribeRecipes, createRecipe, updateRecipe, deleteRecipe,
  subscribeSuppliers, createSupplier, updateSupplier, deleteSupplier,
  subscribePurchaseOrders, createPurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder,
  subscribeMovements, registerMovement,
  subscribeCOGS,
} from '../../lib/logisticsService';
import { setIngredientPrice } from '../../lib/pricingService';

const SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'ingredients', label: 'Insumos', icon: Package },
  { key: 'recipes', label: 'Recetas', icon: ClipboardList },
  { key: 'movements', label: 'Kardex', icon: History },
  { key: 'suppliers', label: 'Proveedores', icon: Truck },
  { key: 'orders', label: 'Compras', icon: ArrowUpDown },
  { key: 'cogs', label: 'COGS', icon: DollarSign },
];

function fmtCurrency(n) { return `S/ ${Number(n).toFixed(2)}`; }

const INGREDIENT_CATEGORIES = [
  'Verduras y Hortalizas', 'Carnes y Aves', 'Lácteos y Huevos',
  'Secos y Abarrotes', 'Congelados', 'Bebidas', 'Limpieza', 'Otros',
];

// ── Simple hook to track loading/error for real-time subs ──
function useData(subscribeFn, branchId, deps = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const key = `${branchId}-${deps.join('-')}`;

  useEffect(() => {
    if (!branchId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    let unsub;
    try {
      unsub = subscribeFn(branchId, (d) => { setData(d); setLoading(false); });
    } catch (e) { setError(e.message); setLoading(false); }
    return () => { if (unsub) unsub(); };
  }, [branchId, ...deps]);

  return { data, loading, error };
}

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
          <SectionComponent key={section} branchId={activeBranchId} userEmail={user?.email} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─── INSUMOS ─── */
function IngredientsSection({ branchId, userEmail }) {
  const [ingredients, setIngredients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loaded, setLoaded] = useState({ ing: false, sup: false });
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', unit: 'kg', stock: 0, minStock: 0, cost: 0, supplierId: '', category: '' });

  const allLoaded = loaded.ing && loaded.sup;

  useEffect(() => {
    try { return subscribeIngredients(branchId, (d) => { setIngredients(d); setLoaded(p => ({ ...p, ing: true })); }); }
    catch (e) { setError(e.message); setLoaded(p => ({ ...p, ing: true })); }
  }, [branchId]);
  useEffect(() => {
    try { return subscribeSuppliers(branchId, (d) => { setSuppliers(d); setLoaded(p => ({ ...p, sup: true })); }); }
    catch (e) { setError(e.message); setLoaded(p => ({ ...p, sup: true })); }
  }, [branchId]);

  const supplierMap = {};
  suppliers.forEach(s => { supplierMap[s.id] = s.name; });

  const filtered = useMemo(() => {
    let result = ingredients;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i => i.name?.toLowerCase().includes(q));
    }
    if (supplierFilter) {
      result = result.filter(i => i.supplierId === supplierFilter);
    }
    if (categoryFilter) {
      result = result.filter(i => i.category === categoryFilter);
    }
    return result;
  }, [ingredients, search, supplierFilter, categoryFilter]);

  const resetForm = () => { setForm({ name: '', unit: 'kg', stock: 0, minStock: 0, cost: 0, supplierId: '', category: '' }); setEditing(null); };

  const handleSave = async () => {
    if (!form.name) return;
    if (editing) {
      await updateIngredient(branchId, editing, form);
    } else {
      await createIngredient(branchId, form);
    }
    resetForm(); setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este insumo?')) return;
    await deleteIngredient(branchId, id);
  };

  const lowStock = ingredients.filter(i => i.minStock > 0 && i.stock <= i.minStock);

  if (error) return <SectionContainer error={error} loading={false} data={[]} />;
  if (!allLoaded) return <SectionContainer loading error={null} data={[]} />;

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
            {INGREDIENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {lowStock.length > 0 && (
            <div className="flex items-center gap-1.5 text-cm-warning text-xs font-semibold">
              <AlertTriangle className="w-4 h-4" /> {lowStock.length} con stock bajo
            </div>
          )}
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nuevo insumo
        </button>
      </div>

      {showForm && (
        <div className="bg-cm-bg-alt border border-cm-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            <input type="text" placeholder="Nombre del insumo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
            <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text">
              <option value="kg">kg</option><option value="gr">gr</option><option value="litro">litro</option>
              <option value="ml">ml</option><option value="unidad">unidad</option><option value="docena">docena</option>
            </select>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text">
              <option value="">Sin categoría</option>
              {INGREDIENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text">
              <option value="">Sin proveedor</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="number" placeholder="Stock" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
            <input type="number" placeholder="Stock mínimo" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
            <input type="number" step="0.01" placeholder="Costo x unidad" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-3 py-1.5 text-xs font-semibold text-cm-text-secondary hover:text-cm-text transition-colors">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-1.5 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> {editing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
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
                <tr key={i.id} className="border-b border-cm-border/50 hover:bg-cm-accent/5 transition-colors">
                  <td className="py-3 pl-4 pr-4 font-medium text-cm-text">{i.name}</td>
                  <td className="py-3 px-3 text-cm-text-secondary">{i.category || '—'}</td>
                  <td className="py-3 px-3 text-cm-text-secondary">{supplierMap[i.supplierId] || '—'}</td>
                  <td className={`py-3 px-3 text-center font-bold ${isLow ? 'text-cm-error' : 'text-cm-text'}`}>{i.stock ?? 0}</td>
                  <td className="py-3 px-3 text-center text-cm-text-secondary">{i.minStock || 0}</td>
                  <td className="py-3 px-3 text-center text-cm-text-secondary">{i.unit}</td>
                  <td className="py-3 px-3 text-right text-cm-text">{fmtCurrency(i.cost || 0)}</td>
                  <td className="py-3 pl-3 pr-4 text-right">
                    <button onClick={() => { setForm({ name: i.name, unit: i.unit, category: i.category || '', supplierId: i.supplierId || '', stock: i.stock, minStock: i.minStock, cost: i.cost }); setEditing(i.id); setShowForm(true); }}
                      className="p-1.5 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(i.id)} className="p-1.5 rounded-lg hover:bg-cm-error/10 text-cm-text-secondary transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── RECETAS ─── */
function RecipesSection({ branchId }) {
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState({ r: false, i: false, p: false });
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ productId: '', productName: '', yield: 1, ingredients: [] });

  const allLoaded = loaded.r && loaded.i && loaded.p;

  useEffect(() => {
    try { return subscribeRecipes(branchId, (d) => { setRecipes(d); setLoaded(p => ({ ...p, r: true })); }); }
    catch (e) { setError(e.message); }
  }, [branchId]);
  useEffect(() => {
    try { return subscribeIngredients(branchId, (d) => { setIngredients(d); setLoaded(p => ({ ...p, i: true })); }); }
    catch (e) { setError(e.message); }
  }, [branchId]);
  useEffect(() => {
    const productsRef = dbRef(db, `branches/${branchId}/catalog/products`);
    const u = onValue(productsRef, (snap) => {
      const data = snap.val();
      if (!data) { setProducts([]); setLoaded(p => ({ ...p, p: true })); return; }
      setProducts(Object.entries(data).map(([id, p]) => ({ id, ...p })));
      setLoaded(p => ({ ...p, p: true }));
    });
    return u;
  }, [branchId]);

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
      await updateRecipe(branchId, editing, data);
    } else {
      await createRecipe(branchId, data);
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
    // Auto-fill name and unitCost when ingredientId changes
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

  if (error) return <SectionContainer error={error} loading={false} data={[]} />;
  if (!allLoaded) return <SectionContainer loading error={null} data={[]} rows={3} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
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

      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
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
            {recipes.map(r => (
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
                  <button onClick={() => deleteRecipe(branchId, r.id).then(() => {})} className="p-1.5 rounded-lg hover:bg-cm-error/10 text-cm-text-secondary"><Trash2 className="w-3.5 h-3.5" /></button>
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
function MovementsSection({ branchId }) {
  const [movements, setMovements] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loaded, setLoaded] = useState({ m: false, i: false });
  const [error, setError] = useState(null);
  const allLoaded = loaded.m && loaded.i;

  useEffect(() => {
    try { return subscribeMovements(branchId, (d) => { setMovements(d); setLoaded(p => ({ ...p, m: true })); }); }
    catch (e) { setError(e.message); }
  }, [branchId]);
  useEffect(() => {
    try { return subscribeIngredients(branchId, (d) => { setIngredients(d); setLoaded(p => ({ ...p, i: true })); }); }
    catch (e) { setError(e.message); }
  }, [branchId]);

  const ingMap = {};
  ingredients.forEach(i => { ingMap[i.id] = i; });

  if (error) return <SectionContainer error={error} loading={false} data={[]} />;
  if (!allLoaded) return <SectionContainer loading error={null} data={[]} rows={5} />;

  return (
    <div className="space-y-4">
      <p className="text-xs text-cm-text-secondary">{movements.length} movimiento(s)</p>
      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden max-h-96 overflow-y-auto">
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
            {movements.map(m => {
              const ing = ingMap[m.ingredientId];
              return (
                <tr key={m.id} className="border-b border-cm-border/50 hover:bg-cm-accent/5 transition-colors">
                  <td className="py-2 pl-4 pr-4 text-cm-text-secondary">{m.createdAt ? new Date(m.createdAt).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
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
                  <td className="py-2 px-3 text-right text-cm-text-secondary">{m.stockAfter}</td>
                  <td className="py-2 px-3 text-cm-text-secondary">{m.reason}</td>
                  <td className="py-2 pl-3 pr-4 text-cm-text-secondary">{m.reference}</td>
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
function DashboardSection({ branchId }) {
  const [ingredients, setIngredients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    try { return subscribeIngredients(branchId, (d) => { setIngredients(d); setLoaded(p => ({...p, i: true})); }); }
    catch (e) { setError(e.message); }
  }, [branchId]);
  useEffect(() => {
    try { return subscribeSuppliers(branchId, (d) => { setSuppliers(d); setLoaded(p => ({...p, s: true})); }); }
    catch (e) { setError(e.message); }
  }, [branchId]);
  useEffect(() => {
    try { return subscribePurchaseOrders(branchId, (d) => { setOrders(d); setLoaded(p => ({...p, o: true})); }); }
    catch (e) { setError(e.message); }
  }, [branchId]);
  useEffect(() => {
    try { return subscribeRecipes(branchId, (d) => { setRecipes(d); setLoaded(p => ({...p, r: true})); }); }
    catch (e) { setError(e.message); }
  }, [branchId]);
  useEffect(() => {
    const ref_ = dbRef(db, `branches/${branchId}/catalog/products`);
    return onValue(ref_, (snap) => {
      const d = snap.val();
      setProducts(d ? Object.entries(d).map(([id, p]) => ({ id, ...p })) : []);
      setLoaded(p => ({...p, p: true}));
    });
  }, [branchId]);

  const allLoaded = loaded.i && loaded.s && loaded.o && loaded.r && loaded.p;

  const valorInventario = ingredients.reduce((s, i) => s + (Number(i.stock) * Number(i.cost) || 0), 0);
  const stockBajo = ingredients.filter(i => i.minStock > 0 && i.stock <= i.minStock);
  const pendientes = orders.filter(o => o.status === 'pendiente');
  const productsWithRecipe = new Set(recipes.filter(r => r.productId).map(r => r.productId));
  const sinReceta = products.filter(p => p.id && !productsWithRecipe.has(p.id));

  if (error) return <SectionContainer error={error} loading={false} data={[]} />;
  if (!allLoaded) return <SectionContainer loading error={null} data={[]} rows={6} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
function SuppliersSection({ branchId }) {
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loaded, setLoaded] = useState({ s: false, i: false });
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', contacto: '', telefono: '', email: '', direccion: '',
    tipoDocumento: 'informal', numDocumento: '', plazoPago: 'contado',
    categorias: [], activo: true, notes: '',
  });
  const [priceModal, setPriceModal] = useState({ open: false, supplierId: null, supplierName: '' });
  const [priceForm, setPriceForm] = useState({ ingredientId: '', cost: '' });

  useEffect(() => {
    try { return subscribeSuppliers(branchId, (d) => { setSuppliers(d); setLoaded(p => ({...p, s: true})); }); }
    catch (e) { setError(e.message); }
  }, [branchId]);
  useEffect(() => {
    try { return subscribeIngredients(branchId, (d) => { setIngredients(d); setLoaded(p => ({...p, i: true})); }); }
    catch (e) { setError(e.message); }
  }, [branchId]);

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
      await updateSupplier(branchId, editing, form);
    } else {
      await createSupplier(branchId, form);
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
  if (!loaded.s || !loaded.i) return <SectionContainer loading error={null} data={[]} rows={3} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs text-cm-text-secondary">{suppliers.length} proveedor(es)</span>
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
                  {ingredients.filter(i => i.supplierId === priceModal.supplierId).map(i => (
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
                  setPriceModal({...priceModal, open: false});
                  setPriceForm({ ingredientId: '', cost: '' });
                }} className="flex-1 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg">Guardar precio</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {suppliers.map(s => {
          const docLabel = { ruc: 'RUC', dni: 'DNI', informal: 'Informal' }[s.tipoDocumento] || '—';
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
                  <button onClick={() => deleteSupplier(branchId, s.id)} className="p-1 rounded hover:bg-cm-error/10 text-cm-text-secondary"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {s.contacto && <div className="text-xs text-cm-text-secondary">Contacto: {s.contacto}</div>}
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
function PurchaseOrdersSection({ branchId }) {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loaded, setLoaded] = useState({ o: false, s: false, i: false });
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState('');
  const allLoaded = loaded.o && loaded.s && loaded.i;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ supplierId: '', items: [], notes: '' });
  const [ingFilterSupplier, setIngFilterSupplier] = useState('');

  useEffect(() => {
    try { return subscribePurchaseOrders(branchId, (d) => { setOrders(d); setLoaded(p => ({ ...p, o: true })); }); }
    catch (e) { setError(e.message); }
  }, [branchId]);
  useEffect(() => {
    try { return subscribeSuppliers(branchId, (d) => { setSuppliers(d); setLoaded(p => ({ ...p, s: true })); }); }
    catch (e) { setError(e.message); }
  }, [branchId]);
  useEffect(() => {
    try { return subscribeIngredients(branchId, (d) => { setIngredients(d); setLoaded(p => ({ ...p, i: true })); }); }
    catch (e) { setError(e.message); }
  }, [branchId]);

  const filteredIngredients = useMemo(() => {
    if (!ingFilterSupplier) return ingredients;
    return ingredients.filter(i => i.supplierId === ingFilterSupplier);
  }, [ingredients, ingFilterSupplier]);

  const resetForm = () => { setForm({ supplierId: '', items: [], notes: '' }); setFormError(''); setIngFilterSupplier(''); };

  const addItem = () => {
    const first = ingredients[0];
    setForm({ ...form, items: [...form.items, { ingredientId: first?.id || '', name: first?.name || '', quantity: 0, unit: first?.unit || 'kg', unitCost: first?.cost || 0 }] });
  };

  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === 'ingredientId') {
      const ing = ingredients.find(i => i.id === value);
      if (ing) { items[idx].name = ing.name; items[idx].unit = ing.unit; items[idx].unitCost = ing.cost || 0; }
    }
    setForm({ ...form, items });
  };

  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const handleCreate = async () => {
    setFormError('');
    if (!form.supplierId) { setFormError('Debés seleccionar un proveedor.'); return; }
    if (form.items.length === 0) { setFormError('Agregá al menos un insumo a la orden.'); return; }
    const supplier = suppliers.find(s => s.id === form.supplierId);
    await createPurchaseOrder(branchId, {
      supplierId: form.supplierId,
      supplierName: supplier?.name || '',
      items: form.items,
      notes: form.notes,
    });
    resetForm(); setShowForm(false);
  };

  if (error) return <SectionContainer error={error} loading={false} data={[]} />;
  if (!allLoaded) return <SectionContainer loading error={null} data={[]} rows={4} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs text-cm-text-secondary">{orders.length} orden(es)</span>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nueva orden
        </button>
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
          <label className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase block mb-1">Proveedor <span className="text-cm-error">*</span></label>
          <select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}
            className="w-full bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text">
            <option value="">Seleccionar proveedor...</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-cm-text-secondary font-medium">Filtrar insumos por proveedor:</span>
            <select value={ingFilterSupplier} onChange={e => setIngFilterSupplier(e.target.value)}
              className="bg-cm-surface border border-cm-border rounded-lg px-2 py-1.5 text-xs font-medium text-cm-text">
              <option value="">Todos</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <span className="text-cm-muted">{filteredIngredients.length} insumos</span>
          </div>
          {form.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select value={item.ingredientId} onChange={e => updateItem(idx, 'ingredientId', e.target.value)}
                className="flex-[2] bg-cm-surface border border-cm-border rounded-lg px-2 py-1.5 text-xs text-cm-text">
                <option value="">Seleccionar...</option>
                {filteredIngredients.map(i => <option key={i.id} value={i.id}>{i.name}{i.category ? ` (${i.category})` : ''}</option>)}
              </select>
              <input type="number" placeholder="Cant." value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)}
                className="w-16 bg-cm-surface border border-cm-border rounded-lg px-2 py-1.5 text-xs text-cm-text" />
              <input type="number" step="0.01" placeholder="Costo/u" value={item.unitCost} onChange={e => updateItem(idx, 'unitCost', e.target.value)}
                className="w-20 bg-cm-surface border border-cm-border rounded-lg px-2 py-1.5 text-xs text-cm-text" />
              <button onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-cm-error/10 text-cm-text-secondary"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <button onClick={addItem} className="text-xs font-semibold text-cm-accent hover:underline">+ Agregar insumo</button>
          <textarea placeholder="Notas (opcional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
            className="w-full bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs text-cm-text" />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-3 py-1.5 text-xs text-cm-text-secondary">Cancelar</button>
            <button onClick={handleCreate} className="px-4 py-1.5 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> Crear orden
            </button>
          </div>
          </>
          )}
        </div>
      )}

      <div className="space-y-2">
        {orders.map(o => {
          const itemCount = o.items ? Object.keys(o.items).length : 0;
          return (
            <div key={o.id} className="bg-cm-surface border border-cm-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-cm-text">{o.supplierName}</span>
                    <span className={`text-[0.55rem] font-semibold px-1.5 py-0.5 rounded-full ${
                      o.status === 'recibido' ? 'bg-cm-success/10 text-cm-success' :
                      o.status === 'cancelado' ? 'bg-cm-error/10 text-cm-error' :
                      'bg-cm-warning/10 text-cm-warning'
                    }`}>{o.status}</span>
                  </div>
                  <div className="text-[0.6rem] text-cm-text-secondary">{o.orderedAt ? new Date(o.orderedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-cm-text">{fmtCurrency(o.total || 0)}</span>
                  {o.status === 'pendiente' && (
                    <button onClick={() => receivePurchaseOrder(branchId, o.id)} className="px-2 py-1 bg-cm-success/10 text-cm-success text-[0.55rem] font-semibold rounded-lg hover:bg-cm-success/20 transition-colors">
                      Recibir
                    </button>
                  )}
                </div>
              </div>
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
    </div>
  );
}

/* ─── COGS ─── */
function COGSSection({ branchId }) {
  const [cogs, setCogs] = useState({});
  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState({ c: false, p: false });
  const [error, setError] = useState(null);
  const allLoaded = loaded.c && loaded.p;

  useEffect(() => {
    try { return subscribeCOGS(branchId, (d) => { setCogs(d); setLoaded(p => ({ ...p, c: true })); }); }
    catch (e) { setError(e.message); }
  }, [branchId]);
  useEffect(() => {
    const productsRef = dbRef(db, `branches/${branchId}/catalog/products`);
    const u = onValue(productsRef, (snap) => {
      const data = snap.val();
      if (!data) { setProducts([]); return; }
      setProducts(Object.entries(data).map(([id, p]) => ({ id, ...p })));
      setLoaded(p => ({ ...p, p: true }));
    }, (err) => setError(err.message));
    return u;
  }, [branchId]);

  const entries = products.map(p => ({
    ...p,
    cost: cogs[p.id]?.costPerPortion || 0,
    margin: p.base_price > 0 ? ((p.base_price - (cogs[p.id]?.costPerPortion || 0)) / p.base_price * 100) : 0,
  })).sort((a, b) => b.margin - a.margin);

  if (error) return <SectionContainer error={error} loading={false} data={[]} />;
  if (!allLoaded) return <SectionContainer loading error={null} data={[]} rows={6} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.55rem] text-cm-text-secondary uppercase font-semibold">Productos con receta</div>
          <div className="text-lg font-bold text-cm-text mt-1">{Object.keys(cogs).length}</div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.55rem] text-cm-text-secondary uppercase font-semibold">Sin receta</div>
          <div className="text-lg font-bold text-cm-warning mt-1">{products.filter(p => !cogs[p.id]).length}</div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.55rem] text-cm-text-secondary uppercase font-semibold">Margen promedio</div>
          <div className="text-lg font-bold text-cm-success mt-1">{entries.length > 0 ? (entries.reduce((s, e) => s + e.margin, 0) / entries.length).toFixed(1) : 0}%</div>
        </div>
      </div>

      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
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
            {entries.map(p => (
              <tr key={p.id} className="border-b border-cm-border/50 hover:bg-cm-accent/5 transition-colors">
                <td className="py-3 pl-4 pr-4 font-medium text-cm-text">{p.name}</td>
                <td className="py-3 px-3 text-right text-cm-text">{fmtCurrency(p.base_price || 0)}</td>
                <td className={`py-3 px-3 text-right ${p.cost > 0 ? 'text-cm-text' : 'text-cm-text-tertiary'}`}>{p.cost > 0 ? fmtCurrency(p.cost) : '-'}</td>
                <td className="py-3 px-3 text-right text-cm-text">{fmtCurrency((p.base_price || 0) - p.cost)}</td>
                <td className="py-3 pl-3 pr-4 text-right">
                  <span className={`text-xs font-bold ${p.margin >= 40 ? 'text-cm-success' : p.margin >= 20 ? 'text-cm-warning' : 'text-cm-error'}`}>
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

const SECTION_MAP = {
  dashboard: DashboardSection,
  ingredients: IngredientsSection,
  recipes: RecipesSection,
  movements: MovementsSection,
  suppliers: SuppliersSection,
  orders: PurchaseOrdersSection,
  cogs: COGSSection,
};
