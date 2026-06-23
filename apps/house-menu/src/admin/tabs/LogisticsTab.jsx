import { useState, useEffect, useMemo } from 'react';
import {
  Package, Plus, Edit3, Trash2, Search, ClipboardList, Truck, TrendingUp,
  ArrowUpDown, AlertTriangle, CheckCircle, X, Loader2, Save, History, DollarSign
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

const SECTIONS = [
  { key: 'ingredients', label: 'Insumos', icon: Package },
  { key: 'recipes', label: 'Recetas', icon: ClipboardList },
  { key: 'movements', label: 'Kardex', icon: History },
  { key: 'suppliers', label: 'Proveedores', icon: Truck },
  { key: 'orders', label: 'Compras', icon: ArrowUpDown },
  { key: 'cogs', label: 'COGS', icon: DollarSign },
];

function fmtCurrency(n) { return `S/ ${Number(n).toFixed(2)}`; }

export default function LogisticsTab() {
  const { activeBranchId } = useBranch();
  const { user } = useAuth();
  const [section, setSection] = useState('ingredients');

  if (!activeBranchId) {
    return <p className="text-sm text-cm-text-secondary text-center py-8">Selecciona una sucursal</p>;
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

      <SectionComponent branchId={activeBranchId} userEmail={user?.email} />
    </div>
  );
}

/* ─── INSUMOS ─── */
function IngredientsSection({ branchId, userEmail }) {
  const [ingredients, setIngredients] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', unit: 'kg', stock: 0, minStock: 0, cost: 0, supplierId: '' });

  useEffect(() => { const u = subscribeIngredients(branchId, setIngredients); return u; }, [branchId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return ingredients;
    const q = search.toLowerCase();
    return ingredients.filter(i => i.name?.toLowerCase().includes(q));
  }, [ingredients, search]);

  const resetForm = () => { setForm({ name: '', unit: 'kg', stock: 0, minStock: 0, cost: 0, supplierId: '' }); setEditing(null); };

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
            <input type="text" placeholder="Buscar insumo..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-64 bg-cm-bg-alt border border-cm-border rounded-lg pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
          </div>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input type="text" placeholder="Nombre del insumo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
            <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text">
              <option value="kg">kg</option><option value="gr">gr</option><option value="litro">litro</option>
              <option value="ml">ml</option><option value="unidad">unidad</option><option value="docena">docena</option>
            </select>
            <input type="number" placeholder="Stock actual" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
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
              <th className="text-center font-semibold py-3 px-3">Stock</th>
              <th className="text-center font-semibold py-3 px-3">Mínimo</th>
              <th className="text-center font-semibold py-3 px-3">Unidad</th>
              <th className="text-right font-semibold py-3 px-3">Costo x unidad</th>
              <th className="text-right font-semibold py-3 pl-3 pr-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => {
              const isLow = i.minStock > 0 && i.stock <= i.minStock;
              return (
                <tr key={i.id} className="border-b border-cm-border/50 hover:bg-cm-accent/5 transition-colors">
                  <td className="py-3 pl-4 pr-4 font-medium text-cm-text">{i.name}</td>
                  <td className={`py-3 px-3 text-center font-bold ${isLow ? 'text-cm-error' : 'text-cm-text'}`}>{i.stock ?? 0}</td>
                  <td className="py-3 px-3 text-center text-cm-text-secondary">{i.minStock || 0}</td>
                  <td className="py-3 px-3 text-center text-cm-text-secondary">{i.unit}</td>
                  <td className="py-3 px-3 text-right text-cm-text">{fmtCurrency(i.cost || 0)}</td>
                  <td className="py-3 pl-3 pr-4 text-right">
                    <button onClick={() => { setForm({ name: i.name, unit: i.unit, stock: i.stock, minStock: i.minStock, cost: i.cost, supplierId: i.supplierId || '' }); setEditing(i.id); setShowForm(true); }}
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
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ productId: '', productName: '', yield: 1, ingredients: [] });
  const [error, setError] = useState('');

  useEffect(() => { const u = subscribeRecipes(branchId, setRecipes); return u; }, [branchId]);
  useEffect(() => { const u = subscribeIngredients(branchId, setIngredients); return u; }, [branchId]);
  useEffect(() => {
    const productsRef = dbRef(db, `branches/${branchId}/catalog/products`);
    const u = onValue(productsRef, (snap) => {
      const data = snap.val();
      if (!data) { setProducts([]); return; }
      setProducts(Object.entries(data).map(([id, p]) => ({ id, ...p })));
    });
    return u;
  }, [branchId]);

  const resetForm = () => { setForm({ productId: '', productName: '', yield: 1, ingredients: [] }); setEditing(null); setError(''); };

  const handleSave = async () => {
    setError('');
    if (!form.productId) { setError('Debés seleccionar un producto para la receta.'); return; }
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
          {error && <p className="text-xs font-semibold text-cm-error bg-cm-error/5 px-3 py-1.5 rounded-lg">{error}</p>}
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
  useEffect(() => { const u = subscribeMovements(branchId, setMovements); return u; }, [branchId]);
  useEffect(() => { const u = subscribeIngredients(branchId, setIngredients); return u; }, [branchId]);

  const ingMap = {};
  ingredients.forEach(i => { ingMap[i.id] = i; });

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

/* ─── PROVEEDORES ─── */
function SuppliersSection({ branchId }) {
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', contact: '', phone: '', email: '', notes: '' });

  useEffect(() => { const u = subscribeSuppliers(branchId, setSuppliers); return u; }, [branchId]);

  const resetForm = () => { setForm({ name: '', contact: '', phone: '', email: '', notes: '' }); setEditing(null); };

  const handleSave = async () => {
    if (!form.name) return;
    if (editing) {
      await updateSupplier(branchId, editing, form);
    } else {
      await createSupplier(branchId, form);
    }
    resetForm(); setShowForm(false);
  };

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input type="text" placeholder="Nombre" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
            <input type="text" placeholder="Contacto" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
            <input type="tel" placeholder="Teléfono" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {suppliers.map(s => (
          <div key={s.id} className="bg-cm-surface border border-cm-border rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-bold text-cm-text">{s.name}</h4>
              <div className="flex gap-1">
                <button onClick={() => { setForm({ name: s.name, contact: s.contact || '', phone: s.phone || '', email: s.email || '', notes: s.notes || '' }); setEditing(s.id); setShowForm(true); }}
                  className="p-1 rounded hover:bg-cm-accent/10 text-cm-text-secondary"><Edit3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => deleteSupplier(branchId, s.id)} className="p-1 rounded hover:bg-cm-error/10 text-cm-text-secondary"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            {s.contact && <div className="text-xs text-cm-text-secondary">Contacto: {s.contact}</div>}
            <div className="flex gap-3 text-xs text-cm-text-secondary">
              {s.phone && <span>📞 {s.phone}</span>}
              {s.email && <span>✉ {s.email}</span>}
            </div>
            {s.notes && <div className="text-xs text-cm-text-secondary bg-cm-bg-alt rounded-lg px-2 py-1">{s.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── ÓRDENES DE COMPRA ─── */
function PurchaseOrdersSection({ branchId }) {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ supplierId: '', items: [], notes: '' });
  const [error, setError] = useState('');

  useEffect(() => { const u = subscribePurchaseOrders(branchId, setOrders); return u; }, [branchId]);
  useEffect(() => { const u = subscribeSuppliers(branchId, setSuppliers); return u; }, [branchId]);
  useEffect(() => { const u = subscribeIngredients(branchId, setIngredients); return u; }, [branchId]);

  const resetForm = () => { setForm({ supplierId: '', items: [], notes: '' }); setError(''); };

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
    setError('');
    if (!form.supplierId) { setError('Debés seleccionar un proveedor.'); return; }
    if (form.items.length === 0) { setError('Agregá al menos un insumo a la orden.'); return; }
    const supplier = suppliers.find(s => s.id === form.supplierId);
    await createPurchaseOrder(branchId, {
      supplierId: form.supplierId,
      supplierName: supplier?.name || '',
      items: form.items,
      notes: form.notes,
    });
    resetForm(); setShowForm(false);
  };

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
          {error && <p className="text-xs font-semibold text-cm-error bg-cm-error/5 px-3 py-1.5 rounded-lg">{error}</p>}
          <label className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase block mb-1">Proveedor <span className="text-cm-error">*</span></label>
          <select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}
            className="w-full bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text">
            <option value="">Seleccionar proveedor...</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {form.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select value={item.ingredientId} onChange={e => updateItem(idx, 'ingredientId', e.target.value)}
                className="flex-[2] bg-cm-surface border border-cm-border rounded-lg px-2 py-1.5 text-xs text-cm-text">
                <option value="">Seleccionar...</option>
                {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
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
  useEffect(() => { const u = subscribeCOGS(branchId, setCogs); return u; }, [branchId]);
  useEffect(() => {
    const productsRef = dbRef(db, `branches/${branchId}/catalog/products`);
    const u = onValue(productsRef, (snap) => {
      const data = snap.val();
      if (!data) { setProducts([]); return; }
      setProducts(Object.entries(data).map(([id, p]) => ({ id, ...p })));
    });
    return u;
  }, [branchId]);

  const entries = products.map(p => ({
    ...p,
    cost: cogs[p.id]?.costPerPortion || 0,
    margin: p.base_price > 0 ? ((p.base_price - (cogs[p.id]?.costPerPortion || 0)) / p.base_price * 100) : 0,
  })).sort((a, b) => b.margin - a.margin);

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
  ingredients: IngredientsSection,
  recipes: RecipesSection,
  movements: MovementsSection,
  suppliers: SuppliersSection,
  orders: PurchaseOrdersSection,
  cogs: COGSSection,
};
