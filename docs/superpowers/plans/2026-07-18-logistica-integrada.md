# Plan de Implementación: Sistema Integrado Logística + Proveedores + Finanzas

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar proveedores → insumos → recetas → productos → pedidos → finanzas en un flujo unificado con OC por WhatsApp, COGS automático y visibilidad cross-module.

**Architecture:** Capas nuevas sobre el sistema existente — no se modifican flujos de pedidos existentes (solo se agregan hooks post-confirmación). Los datos viven en Firebase RTDB bajo `branches/{branchId}/logistics/` y `branches/{branchId}/finanzas/`. El event-bus (`@house/event-bus`) comunica cambios entre módulos.

**Tech Stack:** Firebase RTDB, React (JSX/TSX), Framer Motion, Tailwind CSS (Clean Minimalist tokens), WhatsApp API vía `wa.me` links.

**Sucursal:** `monteverde` (hardcoded, sede única)

## Global Constraints

- Todos los datos en Firebase RTDB bajo `branches/{branchId}/logistics/` y `branches/{branchId}/finanzas/`
- UI usa Clean Minimalist tokens (`cm-*` classes), no hex hardcodeados
- Formato moneda: `S/ X.XX` (función `fmtCurrency` existente en LogisticsTab)
- Sin agregar dependencias npm nuevas
- Sin modificar flujos existentes de pedidos (solo hooks después de confirmación)
- Sin migración de datos existentes

---
---

## Fase 1: Proveedores Extendidos + Precios

### Task 1: Extender Supplier CRUD (tipo doc, plazo, categorías)

**Files:**
- Modify: `apps/house-menu/src/lib/logisticsService.js` (lines 221-253)
- Modify: `apps/house-menu/src/admin/tabs/LogisticsTab.jsx` (SuppliersSection, lines 572-654)

**Interfaces:**
- Consumes: `createSupplier(branchId, data)`, `updateSupplier(branchId, id, data)`, `subscribeSuppliers(branchId, cb)`
- Produces: Supplier object now includes `tipoDocumento`, `numDocumento`, `plazoPago`, `categorias` (string[]), `activo`

- [ ] **Step 1: Extend service functions**

En `logisticsService.js`, actualizar `createSupplier` para incluir nuevos campos:

```javascript
// Reemplazar createSupplier (lines 221-233)
export async function createSupplier(branchId, data) {
  const ref_ = ref(db, `${LOG(branchId)}/suppliers`);
  const newRef = push(ref_);
  const supplier = {
    name: data.name,
    contacto: data.contacto || '',
    telefono: data.telefono || '',
    email: data.email || '',
    direccion: data.direccion || '',
    tipoDocumento: data.tipoDocumento || 'informal',
    numDocumento: data.numDocumento || '',
    plazoPago: data.plazoPago || 'contado',
    categorias: data.categorias || [],
    activo: data.activo !== false,
    createdAt: nowISO(),
  };
  await set(newRef, supplier);
  return { success: true, id: newRef.key };
}
```

```javascript
// Reemplazar updateSupplier (lines 236-239)
export async function updateSupplier(branchId, supplierId, data) {
  const { id, createdAt, ...safe } = data;
  await update(ref(db, `${LOG(branchId)}/suppliers/${supplierId}`), safe);
  return { success: true };
}
```

- [ ] **Step 2: Actualizar SuppliersSection UI**

En `LogisticsTab.jsx`, SuppliersSection, actualizar el form inicial y `handleSave`:

```javascript
// Reemplazar useState form (line 578)
const [form, setForm] = useState({
  name: '', contacto: '', telefono: '', email: '', direccion: '',
  tipoDocumento: 'informal', numDocumento: '', plazoPago: 'contado',
  categorias: [], activo: true, notes: ''
});
```

```javascript
// Reemplazar resetForm (line 585)
const resetForm = () => {
  setForm({
    name: '', contacto: '', telefono: '', email: '', direccion: '',
    tipoDocumento: 'informal', numDocumento: '', plazoPago: 'contado',
    categorias: [], activo: true, notes: ''
  });
  setEditing(null);
};
```

- [ ] **Step 3: Reemplazar el form grid en SuppliersSection**

Reemplazar el grid del form (lines 611-619) con:

```jsx
<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
  <input type="text" placeholder="Nombre *" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
    className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
  <input type="text" placeholder="Contacto" value={form.contacto} onChange={e => setForm({...form, contacto: e.target.value})}
    className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
  <input type="tel" placeholder="Teléfono" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})}
    className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
  <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
    className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
  <input type="text" placeholder="Dirección" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})}
    className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
  <select value={form.tipoDocumento} onChange={e => setForm({...form, tipoDocumento: e.target.value})}
    className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text">
    <option value="ruc">RUC (Factura)</option>
    <option value="dni">DNI (Boleta)</option>
    <option value="informal">Informal (Recibo simple)</option>
  </select>
  {form.tipoDocumento !== 'informal' && (
    <input type="text" placeholder={form.tipoDocumento === 'ruc' ? 'RUC' : 'DNI'} value={form.numDocumento}
      onChange={e => setForm({...form, numDocumento: e.target.value})}
      className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text" />
  )}
  <select value={form.plazoPago} onChange={e => setForm({...form, plazoPago: e.target.value})}
    className="bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text">
    <option value="contado">Contado</option>
    <option value="7d">7 días</option>
    <option value="15d">15 días</option>
    <option value="30d">30 días</option>
  </select>
</div>
```

- [ ] **Step 4: Actualizar tarjetas de proveedor para mostrar nuevos campos**

Reemplazar las líneas 633-651 con:

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
  {suppliers.map(s => {
    const docLabel = { ruc: 'RUC', dni: 'DNI', informal: 'Informal' }[s.tipoDocumento] || '—';
    return (
      <div key={s.id} className="bg-cm-surface border border-cm-border rounded-xl p-4 space-y-2 relative">
        {!s.activo && <span className="absolute top-2 right-2 text-[0.5rem] font-semibold text-cm-error bg-cm-error/10 px-1.5 py-0.5 rounded">Inactivo</span>}
        <div className="flex items-start justify-between">
          <h4 className="text-sm font-bold text-cm-text">{s.name}</h4>
          <div className="flex gap-1">
            <button onClick={() => { setForm({...s, categorias: s.categorias || []}); setEditing(s.id); setShowForm(true); }}
              className="p-1 rounded hover:bg-cm-accent/10 text-cm-text-secondary"><Edit3 className="w-3.5 h-3.5" /></button>
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
```

- [ ] **Step 5: Verificar build**

Run: `npx vite build` en `apps/house-menu/`
Expected: Build exitoso sin errores

---

### Task 2: Precios por Proveedor + Historial

**Files:**
- Create: `apps/house-menu/src/lib/pricingService.js`
- Modify: `apps/house-menu/src/admin/tabs/LogisticsTab.jsx` (SuppliersSection + nueva sección)

**Interfaces:**
- Consumes: supplier data, ingredient data
- Produces: `setIngredientPrice(branchId, ingredientId, supplierId, cost, poId?)`
- Produces: `getPriceHistory(branchId, ingredientId, supplierId)`

- [ ] **Step 1: Crear pricingService.js**

```javascript
import { ref, get, set, push, update, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { nowISO } from './format';

const LOG = (branchId) => `branches/${branchId}/logistics`;

export async function setIngredientPrice(branchId, ingredientId, supplierId, cost, { poId, note } = {}) {
  const priceRef = ref(db, `${LOG(branchId)}/prices/${ingredientId}/${supplierId}`);
  const existing = await get(priceRef);
  const prev = existing.val();
  const historyEntry = { cost: Number(cost), date: nowISO(), poId: poId || null, note: note || '' };

  const data = {
    cost: Number(cost),
    updatedAt: nowISO(),
    history: prev ? [...(prev.history || []), historyEntry] : [historyEntry],
  };
  await set(priceRef, data);

  // Actualizar costo del insumo solo si este proveedor es el actual
  const ingRef = ref(db, `${LOG(branchId)}/ingredients/${ingredientId}`);
  const ingSnap = await get(ingRef);
  const ing = ingSnap.val();
  if (ing && ing.supplierId === supplierId) {
    await update(ingRef, { cost: Number(cost), updatedAt: nowISO() });
  }

  return { success: true };
}

export async function getIngredientPrice(branchId, ingredientId, supplierId) {
  const snap = await get(ref(db, `${LOG(branchId)}/prices/${ingredientId}/${supplierId}`));
  if (!snap.exists()) return null;
  return { id: snap.key, ...snap.val() };
}

export function subscribeIngredientPrices(branchId, ingredientId, callback) {
  return onValue(ref(db, `${LOG(branchId)}/prices/${ingredientId}`), (snap) => {
    const data = snap.val();
    if (!data) { callback({}); return; }
    callback(data);
  });
}
```

- [ ] **Step 2: Agregar modal de precios en card de proveedor**

En SuppliersSection, agregar estado y modal inline:

```jsx
// Después de resetForm (line 585+)
const [priceModal, setPriceModal] = useState({ open: false, supplierId: null, supplierName: '' });
const [priceForm, setPriceForm] = useState({ ingredientId: '', cost: '' });

// En el JSX, antes del div grid de cards (antes de line 632):
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
              <option key={i.id} value={i.id}>{i.name} (actual: S/ {i.cost || 0})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase block mb-1">Nuevo costo x unidad</label>
          <input type="number" step="0.01" value={priceForm.cost} onChange={e => setPriceForm({...priceForm, cost: e.target.value})}
            className="w-full bg-cm-surface border border-cm-border rounded-lg px-3 py-2 text-xs text-cm-text" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPriceModal({...priceModal, open: false})}
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
```

Y agregar botón "Precios" en cada card de proveedor:

```jsx
// En la card, junto a los otros botones (antes del Edit3):
<button onClick={() => setPriceModal({ open: true, supplierId: s.id, supplierName: s.name })}
  className="p-1 rounded hover:bg-cm-info/10 text-cm-text-secondary" title="Gestionar precios">
  <DollarSign className="w-3.5 h-3.5" />
</button>

// Agregar DollarSign a los imports (line 9):
import { ..., DollarSign } from 'lucide-react';
```

- [ ] **Step 3: Importar pricingService en LogisticsTab**

```javascript
// Agregar a los imports (después de line 18):
import { setIngredientPrice } from '../../lib/pricingService';
```

- [ ] **Step 4: Verificar build**

Run: `npx vite build` en `apps/house-menu/`
Expected: Build exitoso

---

### Task 3: Dashboard Logística (KPIs + Alertas)

**Files:**
- Modify: `apps/house-menu/src/admin/tabs/LogisticsTab.jsx` (nueva sección Dashboard)

- [ ] **Step 1: Agregar DashboardSection a SECTIONS**

```javascript
// En SECTIONS (line 20-27), agregar al inicio:
const SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  // ...existing
];
```

```javascript
// Agregar BarChart3 a imports de lucide-react (line 8):
import { ..., BarChart3 } from 'lucide-react';
```

- [ ] **Step 2: Crear DashboardSection function**

```jsx
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
      {/* KPIs */}
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

      {/* Alertas */}
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

      {/* Pendientes */}
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

      {/* Productos sin receta */}
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
```

```javascript
// Agregar imports faltantes:
import { ..., BarChart3, Clock, CheckCircle } from 'lucide-react';
```

- [ ] **Step 3: Agregar al SECTION_MAP**

```javascript
const SECTION_MAP = {
  dashboard: DashboardSection,
  ingredients: IngredientsSection,
  // ...existing
};
```

- [ ] **Step 4: Verificar build**

Run: `npx vite build`
Expected: Build exitoso

---

## Fase 2: Menú + COGS + Recetas

### Task 4: COGS + Margen visible en MenuBuilder

**Files:**
- Modify: `apps/house-menu/src/admin/tabs/MenuTab.tsx` (agregar columnas COGS/margen)

**Interfaces:**
- Consumes: `subscribeCOGS(branchId, callback)` from logisticsService

- [ ] **Step 1: Importar subscribeCOGS y agregar estado**

En MenuTab.tsx:

```typescript
import { subscribeCOGS } from '../../lib/logisticsService';
```

```typescript
// Dentro del componente MenuTab (después de useMenuStats):
const [cogsData, setCogsData] = useState<Record<string, { costPerPortion: number; recipeId: string }>>({});

useEffect(() => {
  if (!activeBranchId) return;
  return subscribeCOGS(activeBranchId, (data) => {
    setCogsData(data);
  });
}, [activeBranchId]);
```

- [ ] **Step 2: Agregar columna COGS en la tabla de productos**

Buscar donde se renderiza la tabla/list de productos en MenuTab.tsx (alrededor de lines 300-500) y agregar columna:

```tsx
{/* Después del precio */}
<td className="py-3 px-3 text-right">
  <span className="text-xs text-cm-text-secondary">
    {cogsData[product.id] ? fmtCurrency(cogsData[product.id].costPerPortion) : '-'}
  </span>
</td>
<td className="py-3 px-3 text-right">
  {cogsData[product.id]?.costPerPortion ? (
    <span className={`text-xs font-bold ${
      (product.base_price - cogsData[product.id].costPerPortion) / product.base_price * 100 >= 40
        ? 'text-cm-success' : 'text-cm-warning'
    }`}>
      {((product.base_price - cogsData[product.id].costPerPortion) / product.base_price * 100).toFixed(1)}%
    </span>
  ) : (
    <span className="text-xs text-cm-text-tertiary">—</span>
  )}
</td>
```

Y agregar headers: "COGS" y "Margen" en el `<thead>`.

- [ ] **Step 3: Agregar badge "Con/Sin receta"**

```tsx
{/* Primera columna, junto al nombre */}
{cogsData[product.id] ? (
  <span className="ml-2 text-[0.5rem] font-semibold bg-cm-success/10 text-cm-success px-1 py-0.5 rounded">🧾</span>
) : (
  <span className="ml-2 text-[0.5rem] font-semibold bg-cm-warning/10 text-cm-warning px-1 py-0.5 rounded">⚠</span>
)}
```

- [ ] **Step 4: Verificar build**

Run: `npx vite build`
Expected: Build exitoso

---

### Task 5: Porciones Disponibles desde Recetas

**Files:**
- Modify: `apps/house-menu/src/lib/logisticsService.js` (nuevo helper)

- [ ] **Step 1: Agregar función getAvailableServings**

```javascript
// Al final de logisticsService.js, después de subscribeCOGS
export async function getAvailableServings(branchId, productId) {
  // Find recipe for this product
  const recipesSnap = await get(ref(db, `${LOG(branchId)}/recipes`));
  const recipes = recipesSnap.val();
  if (!recipes) return { servings: 0, limitingIngredient: null };

  let recipe = null;
  for (const [id, r] of Object.entries(recipes)) {
    if (r.productId === productId) { recipe = { id, ...r }; break; }
  }
  if (!recipe || !recipe.ingredients) return { servings: 0, limitingIngredient: null };

  // Get current stock for all ingredients
  const ingredientsSnap = await get(ref(db, `${LOG(branchId)}/ingredients`));
  const ingredients = ingredientsSnap.val();
  if (!ingredients) return { servings: 0, limitingIngredient: null };

  let minServings = Infinity;
  let limiting = null;

  for (const [ingId, ingData] of Object.entries(recipe.ingredients)) {
    const ing = ingredients[ingId];
    if (!ing) { minServings = 0; limiting = ingData.name; break; }
    const qtyNeeded = Number(ingData.quantity);
    if (qtyNeeded <= 0) continue;
    const possible = Math.floor(Number(ing.stock) / qtyNeeded);
    if (possible < minServings) { minServings = possible; limiting = ingData.name; }
  }

  return {
    servings: minServings === Infinity ? 0 : minServings * (recipe.yield || 1),
    limitingIngredient: limiting,
  };
}
```

- [ ] **Step 2: Verificar build**

Run: `npx vite build`
Expected: Build exitoso

---

## Fase 3: Auto-consumo + Event Bus

### Task 6: Auto-consumo de Insumos al Confirmar Pedido

**Files:**
- Modify: `apps/house-menu/src/lib/ordersService.js` (hook after confirm)
- Modify: `apps/house-menu/src/lib/logisticsService.js` (nueva función `consumeRecipeIngredients`)

- [ ] **Step 1: Agregar consumeRecipeIngredients en logisticsService**

```javascript
// En logisticsService.js
export async function consumeRecipeIngredients(branchId, orderId, items, userEmail) {
  // Get all recipes
  const recipesSnap = await get(ref(db, `${LOG(branchId)}/recipes`));
  const recipes = recipesSnap.val();
  if (!recipes) return { success: true, consumed: [] }; // no recipes = nothing to consume

  const consumed = [];
  const errors = [];

  for (const item of (items || [])) {
    const prodId = item.productId || item.id;
    const qty = Number(item.quantity || 1);

    // Find recipe for this product
    let recipe = null;
    for (const [id, r] of Object.entries(recipes)) {
      if (r.productId === prodId) { recipe = { id, ...r }; break; }
    }
    if (!recipe || !recipe.ingredients) continue; // no recipe, skip (uses product.stock as before)

    // Consume each ingredient
    for (const [ingId, ing] of Object.entries(recipe.ingredients)) {
      const totalQty = Number(ing.quantity) * qty;
      const costTotal = Number(ing.unitCost) * totalQty;
      try {
        await registerMovement(branchId, {
          ingredientId: ingId,
          type: 'salida',
          quantity: totalQty,
          unit: ing.unit,
          reason: 'Consumo en pedido',
          reference: `ORDER-${orderId.slice(-6)}`,
          cost: costTotal,
          createdBy: userEmail || 'system',
        });
        consumed.push({ ingredientId: ingId, name: ing.name, quantity: totalQty, cost: costTotal });
      } catch (e) {
        errors.push({ ingredientId: ingId, error: e.message });
      }
    }
  }

  // Publish event for finanzas
  try {
    const { pub } = await import('@house/event-bus');
    await pub('inventory.consumed', { orderId, items: consumed }, {
      branchId, userEmail: userEmail || 'system', userRole: 'system',
    });
  } catch (e) {
    console.warn('[logistics] Failed to publish inventory.consumed:', e.message);
  }

  return { success: errors.length === 0, consumed, errors };
}
```

- [ ] **Step 2: Hook en ordersService.createOrder**

En `ordersService.js`, dentro de `createOrder`, después de que se confirma el pedido (status `recibido`):

```javascript
// En createOrder, después de line 226 (await set(newOrderRef, order)):
// ── Auto-consumo de insumos desde recetas ──
if (initialStatus === 'recibido' && orderData.items?.length > 0) {
  try {
    const { consumeRecipeIngredients } = await import('./logisticsService');
    consumeRecipeIngredients(branchId, newOrderRef.key, orderData.items, userEmail)
      .catch(e => console.warn('[orders] Auto-consumo falló (no crítico):', e.message));
  } catch (e) {
    // No crítico — el pedido ya se creó
    console.warn('[orders] No se pudo importar consumeRecipeIngredients:', e.message);
  }
}
```

- [ ] **Step 3: También en updateOrderStatus al cancelar**

En `updateOrderStatus`, cuando se cancela (`newStatus === 'cancelado'`), después de revertir el product stock (lines 347-399), también revertir el consumo de insumos:
Esto es más complejo. Simplificamos: al cancelar, NO revertimos consumo de insumos por ahora (el producto ya se usó o se perdió). Es decisión deliberada. Agregamos ponytail comment:

```javascript
// ponytail: cancel doesn't revert ingredient consumption
// Reverting would need to know if ingredients were actually consumed
```

- [ ] **Step 4: Verificar build**

Run: `npx vite build`
Expected: Build exitoso

---

### Task 7: Consumidor de Event Bus + Dashboard Alerts

**Files:**
- Modify: `apps/house-menu/src/admin/tabs/LogisticsTab.jsx` (DashboardSection escucha eventos)

- [ ] **Step 1: Suscribir DashboardSection a inventory.consumed**

```javascript
// Dentro de DashboardSection, agregar useEffect:
useEffect(() => {
  try {
    const { sub } = await import('@house/event-bus');
    const unsub = sub('inventory.consumed', (payload, meta) => {
      console.log('[Dashboard] Consumo detectado:', payload);
      // Refrescar ingredientes automáticamente (ya están en tiempo real por onValue)
    });
    return unsub;
  } catch (e) {
    console.warn('[Dashboard] No se pudo suscribir a event-bus:', e.message);
  }
}, [branchId]);
```

Nota: `sub` no está documentado como función exportada. Verificar `@house/event-bus`. Si solo tiene `pub`, usar refetch periódico o depender de `onValue` (ya en tiempo real).

- [ ] **Step 2: Verificar build**

Run: `npx vite build`
Expected: Build exitoso

---

## Fase 4: OC por WhatsApp

### Task 8: Enviar OC por WhatsApp

**Files:**
- Modify: `apps/house-menu/src/admin/tabs/LogisticsTab.jsx` (PurchaseOrdersSection)

- [ ] **Step 1: Agregar función para generar link WhatsApp**

```javascript
// En PurchaseOrdersSection, antes del return:
const whatsappUrl = (order) => {
  if (!order.supplierName || !suppliers.length) return null;
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
```

- [ ] **Step 2: Agregar botón WhatsApp en las cards de OC**

```jsx
// Después del botón "Recibir" (line 805-808), agregar:
{o.status === 'pendiente' && whatsappUrl(o) && (
  <a href={whatsappUrl(o)} target="_blank" rel="noopener noreferrer"
    className="px-2 py-1 bg-cm-success/10 text-cm-success text-[0.55rem] font-semibold rounded-lg hover:bg-cm-success/20 transition-colors flex items-center gap-1"
    onClick={async () => {
      await update(ref(db, `${LOG(branchId)}/purchase_orders/${o.id}`), {
        sentVia: 'whatsapp', sentAt: nowISO()
      });
    }}>
    <MessageCircle className="w-3 h-3" /> WhatsApp
  </a>
)}
```

```javascript
// Agregar MessageCircle a imports:
import { ..., MessageCircle } from 'lucide-react';
```

- [ ] **Step 3: Verificar build**

Run: `npx vite build`
Expected: Build exitoso

---

### Task 9: Manejo de Cambio de Precio al Recibir OC

**Files:**
- Modify: `apps/house-menu/src/lib/logisticsService.js` (receivePurchaseOrder)
- Modify: `apps/house-menu/src/admin/tabs/LogisticsTab.jsx` (PurchaseOrdersSection)

- [ ] **Step 1: Modificar receivePurchaseOrder para detectar cambios**

```javascript
// Reemplazar receivePurchaseOrder en logisticsService.js (lines 290-313):
export async function receivePurchaseOrder(branchId, orderId) {
  const snap = await get(ref(db, `${LOG(branchId)}/purchase_orders/${orderId}`));
  const order = snap.val();
  if (!order || order.status !== 'pendiente') return { success: false, error: 'Orden no encontrada o ya recibida' };

  const priceChanges = [];

  for (const item of Object.values(order.items)) {
    await registerMovement(branchId, {
      ingredientId: item.ingredientId,
      type: 'entrada',
      quantity: item.quantity,
      unit: item.unit,
      reason: 'Compra',
      reference: `PO-${orderId.slice(-6)}`,
      cost: item.total,
      createdBy: 'system',
    });

    // Detectar cambio de precio
    const ingSnap = await get(ref(db, `${LOG(branchId)}/ingredients/${item.ingredientId}`));
    const ing = ingSnap.val();
    if (ing && Math.abs(Number(ing.cost || 0) - Number(item.unitCost)) > 0.01) {
      priceChanges.push({
        ingredientId: item.ingredientId,
        name: item.name,
        oldCost: ing.cost || 0,
        newCost: Number(item.unitCost),
      });
    }
  }

  await update(ref(db, `${LOG(branchId)}/purchase_orders/${orderId}`), {
    status: 'recibido',
    receivedAt: nowISO(),
  });

  return { success: true, priceChanges };
}
```

- [ ] **Step 2: Mostrar modal de cambios de precio en UI**

```javascript
// En PurchaseOrdersSection, agregar estado:
const [priceChanges, setPriceChanges] = useState([]);

// Modificar el handler de receivePurchaseOrder existente (line 805):
const handleReceive = async (orderId) => {
  const result = await receivePurchaseOrder(branchId, orderId);
  if (result.priceChanges?.length > 0) {
    setPriceChanges(result.priceChanges);
  }
};
```

```jsx
// En el JSX, antes del return:
{priceChanges.length > 0 && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPriceChanges([])}>
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
          for (const pc of priceChanges) {
            const { setIngredientPrice } = await import('../../lib/pricingService');
            await setIngredientPrice(branchId, pc.ingredientId, order.supplierId, pc.newCost, { poId: orderId });
          }
          setPriceChanges([]);
        }} className="flex-1 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg">Actualizar todos</button>
        <button onClick={() => setPriceChanges([])} className="px-4 py-2 border border-cm-border text-xs font-semibold text-cm-text rounded-lg">Ignorar</button>
      </div>
    </div>
  </div>
)}
```

Necesitamos pasar `order.supplierId`. Mejor guardar el orderId en el estado también:

```javascript
const [priceChanges, setPriceChanges] = useState([]);
const [priceChangeOrderId, setPriceChangeOrderId] = useState(null);

const handleReceive = async (orderId) => {
  const result = await receivePurchaseOrder(branchId, orderId);
  if (result.priceChanges?.length > 0) {
    setPriceChanges(result.priceChanges);
    setPriceChangeOrderId(orderId);
  }
};
```

Y cambiar `order.supplierId` por el supplierId guardado o buscarlo.

- [ ] **Step 3: Verificar build**

Run: `npx vite build`
Expected: Build exitoso

---

## Fase 5: Finanzas Automáticas

### Task 10: COGS + OC → Gastos Automáticos en Finanzas

**Files:**
- Create: `apps/house-menu/src/lib/finanzasAutoService.js`
- Modify: `apps/house-menu/src/lib/logisticsService.js` (publish events)
- Modify: `apps/house-menu/src/admin/tabs/FinanzasTab.jsx` (auto-import)

- [ ] **Step 1: Crear finanzasAutoService.js**

```javascript
import { ref, push, set, get, query, orderByChild, equalTo } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { nowISO } from './format';
import { pub } from '@house/event-bus';

const FIN = (branchId) => `branches/${branchId}/finanzas`;

export async function recordCOGSExpense(branchId, { orderId, totalCost, items, date }) {
  const gasto = {
    description: `COGS - Pedido #${orderId.slice(-6)}`,
    amount: totalCost,
    category: 'Insumos',
    date: date || nowISO().split('T')[0],
    type: 'automático',
    source: {
      type: 'cogs',
      refId: orderId,
      refDescription: `Consumo de ${items.length} insumos en pedido`,
    },
    createdAt: nowISO(),
  };
  const ref_ = ref(db, `${FIN(branchId)}/gastos`);
  const newRef = push(ref_);
  await set(newRef, gasto);
  return { success: true, id: newRef.key };
}

export async function recordPOExpense(branchId, { poId, supplierName, totalAmount, date }) {
  const gasto = {
    description: `Compra - ${supplierName} (OC #${poId.slice(-6)})`,
    amount: totalAmount,
    category: 'Insumos',
    date: date || nowISO().split('T')[0],
    type: 'automático',
    source: {
      type: 'purchase',
      refId: poId,
      refDescription: `OC a ${supplierName}`,
    },
    createdAt: nowISO(),
  };
  const ref_ = ref(db, `${FIN(branchId)}/gastos`);
  const newRef = push(ref_);
  await set(newRef, gasto);
  return { success: true, id: newRef.key };
}

export async function recordWasteExpense(branchId, { wasteId, ingredientName, quantity, unitCost, totalCost, reason, date }) {
  const gasto = {
    description: `Merma: ${ingredientName} (${quantity}) - ${reason}`,
    amount: totalCost,
    category: 'Otros',
    date: date || nowISO().split('T')[0],
    type: 'automático',
    source: {
      type: 'waste',
      refId: wasteId,
      refDescription: `Merma de ${ingredientName} por ${reason}`,
    },
    createdAt: nowISO(),
  };
  const ref_ = ref(db, `${FIN(branchId)}/gastos`);
  const newRef = push(ref_);
  await set(newRef, gasto);
  return { success: true, id: newRef.key };
}
```

- [ ] **Step 2: Publicar evento al recibir OC**

En `receivePurchaseOrder` en `logisticsService.js`, después de actualizar estado:

```javascript
// Publicar evento para finanzas
try {
  const { default: eventBus } = await import('@house/event-bus');
  // usar pub(
  await pub('po.received', {
    poId: orderId,
    supplierName: order.supplierName,
    totalAmount: order.total,
    items: Object.values(order.items || {}),
  }, { branchId, userEmail: 'system', userRole: 'system' });
} catch (e) {
  console.warn('[logistics] Failed to publish po.received:', e.message);
}
```

- [ ] **Step 3: Filtrar gastos automáticos en FinanzasTab**

En `FinanzasTab.jsx`, modificar la sección de gastos para mostrar tipo (manual/automático):

```jsx
// En el list item (around line 410-412), agregar badge tipo:
{e.source ? (
  <span className="text-[0.5rem] font-semibold bg-cm-info/10 text-cm-info px-1 py-0.5 rounded ml-1">
    auto
  </span>
) : (
  <span className="text-[0.5rem] font-semibold bg-cm-bg-alt text-cm-text-secondary px-1 py-0.5 rounded ml-1">
    manual
  </span>
)}
```

Y en el detalle, mostrar source:

```jsx
// After category+date line (412):
{e.source && (
  <p className="text-[0.5rem] text-cm-info">Fuente: {e.source.refDescription}</p>
)}
```

- [ ] **Step 4: Verificar build**

Run: `npx vite build`
Expected: Build exitoso

---

### Task 11: Mermas (CRUD + Aprobación + Gasto Automático)

**Files:**
- Create: `apps/house-menu/src/lib/wasteService.js`
- Modify: `apps/house-menu/src/admin/tabs/LogisticsTab.jsx` (nueva sección)

- [ ] **Step 1: Crear wasteService.js**

```javascript
import { ref, push, set, update, get, onValue, remove } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { nowISO } from './format';
import { registerMovement } from './logisticsService';
import { pub } from '@house/event-bus';

const LOG = (branchId) => `branches/${branchId}/logistics`;

export async function createWaste(branchId, data) {
  const ref_ = ref(db, `${LOG(branchId)}/waste`);
  const newRef = push(ref_);
  const waste = {
    ingredientId: data.ingredientId,
    ingredientName: data.ingredientName,
    quantity: Number(data.quantity),
    unit: data.unit,
    unitCost: Number(data.unitCost) || 0,
    totalCost: Number(data.quantity) * (Number(data.unitCost) || 0),
    reason: data.reason || '',
    requiresApproval: Number(data.totalCost || 0) > 50, // autofill
    approvedBy: null,
    approvedAt: null,
    createdBy: data.createdBy || 'system',
    createdAt: nowISO(),
  };
  await set(newRef, waste);

  // Si no requiere aprobación, aplicar inmediatamente
  if (!waste.requiresApproval) {
    await applyWaste(branchId, newRef.key, waste);
  }

  return { success: true, id: newRef.key };
}

async function applyWaste(branchId, wasteId, waste) {
  // Registrar movimiento en Kardex
  await registerMovement(branchId, {
    ingredientId: waste.ingredientId,
    type: 'salida',
    quantity: waste.quantity,
    unit: waste.unit,
    reason: `Merma: ${waste.reason}`,
    reference: `WASTE-${wasteId.slice(-6)}`,
    cost: waste.totalCost,
    createdBy: waste.createdBy || 'system',
  });

  // Publicar evento
  try {
    await pub('inventory.waste', { wasteId, ingredientId: waste.ingredientId, quantity: waste.quantity, totalCost: waste.totalCost }, {
      branchId, userEmail: waste.createdBy || 'system', userRole: 'admin',
    });
  } catch (e) {
    console.warn('[waste] Failed to publish event:', e.message);
  }
}

export async function approveWaste(branchId, wasteId, approvedBy) {
  const snap = await get(ref(db, `${LOG(branchId)}/waste/${wasteId}`));
  const waste = snap.val();
  if (!waste) return { success: false, error: 'Merma no encontrada' };

  await update(ref(db, `${LOG(branchId)}/waste/${wasteId}`), {
    approvedBy, approvedAt: nowISO(),
  });

  await applyWaste(branchId, wasteId, waste);
  return { success: true };
}

export function subscribeWaste(branchId, callback) {
  return onValue(ref(db, `${LOG(branchId)}/waste`), (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    callback(Object.entries(data).map(([id, w]) => ({ id, ...w }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  });
}
```

- [ ] **Step 2: Agregar sección Mermas en LogisticsTab**

```jsx
/* ─── MERMAS ─── */
function WasteSection({ branchId, userEmail }) {
  const [waste, setWaste] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loaded, setLoaded] = useState({});
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ingredientId: '', quantity: '', unit: 'kg', reason: '' });

  useEffect(() => {
    try { return subscribeWaste(branchId, (d) => { setWaste(d); setLoaded(p => ({...p, w: true})); }); }
    catch (e) { setError(e.message); }
  }, [branchId]);
  useEffect(() => {
    try { return subscribeIngredients(branchId, (d) => { setIngredients(d); setLoaded(p => ({...p, i: true})); }); }
    catch (e) { setError(e.message); }
  }, [branchId]);

  const allLoaded = loaded.w && loaded.i;
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
    setForm({ ingredientId: '', quantity: '', unit: 'kg', reason: '' });
    setShowForm(false);
  };

  if (error) return <SectionContainer error={error} loading={false} data={[]} />;
  if (!allLoaded) return <SectionContainer loading error={null} data={[]} />;

  return (
    <div className="space-y-4">
      {pendientes.length > 0 && (
        <div className="bg-cm-warning/5 border border-cm-warning/20 rounded-xl p-3">
          <p className="text-xs font-bold text-cm-warning mb-2">{pendientes.length} merma(s) pendiente(s) de aprobación</p>
          {pendientes.map(w => (
            <div key={w.id} className="flex items-center justify-between text-xs py-1">
              <span>{w.ingredientName} — {w.quantity} {w.unit} ({fmtCurrency(w.totalCost)})</span>
              <button onClick={() => approveWaste(branchId, w.id, userEmail)}
                className="px-2 py-0.5 bg-cm-accent text-white text-[0.55rem] font-semibold rounded">Aprobar</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <span className="text-xs text-cm-text-secondary">{waste.length} registro(s)</span>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg">
          <Plus className="w-3.5 h-3.5" /> Registrar merma
        </button>
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

      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
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
            {waste.map(w => (
              <tr key={w.id} className="border-b border-cm-border/50 hover:bg-cm-accent/5">
                <td className="py-3 pl-4 pr-4 text-cm-text-secondary">{w.createdAt ? new Date(w.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }) : '-'}</td>
                <td className="py-3 px-3 font-medium text-cm-text">{w.ingredientName}</td>
                <td className="py-3 px-3 text-right text-cm-text">{w.quantity} {w.unit}</td>
                <td className="py-3 px-3 text-right text-cm-error">{fmtCurrency(w.totalCost || 0)}</td>
                <td className="py-3 px-3 text-cm-text-secondary">{w.reason}</td>
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
```

- [ ] **Step 2: Agregar WasteSection a SECTIONS y SECTION_MAP**

```javascript
// En SECTIONS, agregar:
{ key: 'waste', label: 'Mermas', icon: Trash2 }

// En SECTION_MAP:
waste: WasteSection,
```

No olvidar importar: `import { subscribeWaste, createWaste, approveWaste } from '../../lib/wasteService';`

- [ ] **Step 3: Verificar build**

Run: `npx vite build`
Expected: Build exitoso

---

### Task 12: Valor Inventario + Ganancia Real en Finanzas

**Files:**
- Modify: `apps/house-menu/src/admin/tabs/FinanzasTab.jsx`
- Modify: `apps/house-menu/src/lib/logisticsService.js`

- [ ] **Step 1: Agregar KPI valor inventario en FinanzasTab**

```javascript
// En FinanzasTab, agregar state y effect:
import { subscribeIngredients } from '../../lib/logisticsService';

const [ingredients, setIngredients] = useState([]);

useEffect(() => {
  if (!activeBranchId) return;
  return subscribeIngredients(activeBranchId, (data) => setIngredients(data || []));
}, [activeBranchId]);

const valorInventario = useMemo(() =>
  ingredients.reduce((s, i) => s + (Number(i.stock) * Number(i.cost) || 0), 0), [ingredients]);
```

Agregar card en KPIs:

```jsx
// Después del card de Margen (line 339):
<div className="bg-cm-surface rounded-xl border border-cm-border p-4">
  <div className="flex items-center gap-2 mb-1">
    <Package className="w-4 h-4 text-cm-info" />
    <span className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Valor inventario</span>
  </div>
  <p className="text-2xl font-bold text-cm-text">S/ <AnimatedCounter value={valorInventario} /></p>
</div>
```

Agregar `Package` a los imports de lucide-react.

- [ ] **Step 2: Agregar ganancia real en sección de ingresos/gastos (descontando COGS)**

```javascript
// COGS automático del período (desde gastos con source.type === 'cogs')
const autoCOGS = useMemo(() =>
  filteredExpenses
    .filter(e => e.source?.type === 'cogs')
    .reduce((s, e) => s + (e.amount || 0), 0), [filteredExpenses]);

const gananciaReal = revenue - totalExpenses;
```

Mostrar debajo de los KPIs:

```jsx
<div className="bg-cm-surface border border-cm-border rounded-xl p-4">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Ganancia real (Ingresos - Gastos totales)</p>
      <p className={`text-lg font-bold mt-1 ${gananciaReal >= 0 ? 'text-cm-success' : 'text-cm-error'}`}>
        S/ {gananciaReal.toFixed(2)}
      </p>
    </div>
    <div className="text-right text-[0.55rem] text-cm-text-secondary">
      <p>Ingresos: S/ {revenue.toFixed(2)}</p>
      <p>Gastos: S/ {totalExpenses.toFixed(2)}</p>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Verificar build**

Run: `npx vite build`
Expected: Build exitoso

---

## Checkpoints

### Checkpoint: After Phase 1 (Tasks 1-3)
- [ ] Supplier form incluye tipoDocumento, plazoPago
- [ ] Precios por proveedor guardan y muestran historial
- [ ] Dashboard Logística muestra KPIs correctos
- [ ] Build pasa sin errores

### Checkpoint: After Phase 2 (Tasks 4-5)
- [ ] MenuBuilder muestra COGS y margen por producto
- [ ] Badge receta aparece en productos
- [ ] getAvailableServings funciona correctamente
- [ ] Build pasa sin errores

### Checkpoint: After Phase 3 (Task 6-7)
- [ ] Al crear pedido, se registran movimientos de consumo en Kardex
- [ ] No se rompen pedidos existentes (sin receta)
- [ ] Build pasa sin errores

### Checkpoint: After Phase 4 (Tasks 8-9)
- [ ] Botón WhatsApp abre wa.me con texto formateado
- [ ] Al recibir OC, detecta cambios de precio y pregunta
- [ ] Build pasa sin errores

### Checkpoint: After Phase 5 (Tasks 10-12)
- [ ] COGS aparece como gasto automático en Finanzas
- [ ] OC recibida genera gasto automático
- [ ] Mermas se registran y generan gasto
- [ ] Valor inventario visible en Finanzas
- [ ] Build pasa sin errores

---

## Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| `@house/event-bus` no exporta `sub()` | Medio | Usar `onValue` directamente (ya está en tiempo real) |
| Auto-consumo lento al crear pedido | Bajo | Import dinámico post-confirmación + try/catch |
| Precios por proveedor duplican datos | Bajo | `prices/{ingredientId}/{supplierId}` es el source of truth; `ingredient.cost` es cache |
| WhatsApp no funciona en desktop | Bajo | wa.me funciona en cualquier browser; fallback a copiar texto |
