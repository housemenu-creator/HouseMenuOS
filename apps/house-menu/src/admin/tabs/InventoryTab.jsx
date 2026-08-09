import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Package, AlertTriangle, CheckCircle, TrendingDown, X } from 'lucide-react';

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } };
const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

function StockBadge({ stock }) {
  if (stock <= 0) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cm-error/10 text-cm-error"><X className="w-3 h-3" /> Sin stock</span>;
  if (stock <= 5) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cm-warning/10 text-cm-warning"><AlertTriangle className="w-3 h-3" /> Crítico</span>;
  if (stock <= 15) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cm-accent/10 text-cm-accent"><TrendingDown className="w-3 h-3" /> Bajo</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cm-success/10 text-cm-success"><CheckCircle className="w-3 h-3" /> OK</span>;
}

export default function InventoryTab({ catalog }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const products = useMemo(() => {
    if (!catalog?.products) return [];
    return Object.entries(catalog.products)
      .map(([id, p]) => ({ ...p, id }))
      .filter(p => p.trackStock);
  }, [catalog]);

  const filtered = useMemo(() => {
    let list = products;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => (p.name || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [products, search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const stats = useMemo(() => {
    const total = products.length;
    const outOfStock = products.filter(p => (p.stock || 0) <= 0).length;
    const critical = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 5).length;
    const low = products.filter(p => (p.stock || 0) > 5 && (p.stock || 0) <= 15).length;
    const ok = products.filter(p => (p.stock || 0) > 15).length;
    return { total, outOfStock, critical, low, ok };
  }, [products]);

  const SortIcon = ({ col }) => sortKey === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  if (!catalog) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-cm-accent/10 flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-cm-accent" />
        </div>
        <h2 className="text-lg font-bold text-cm-text">Cargando inventario...</h2>
        <p className="text-sm text-cm-muted font-medium mt-1">Esperando datos del catálogo.</p>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-cm-text">Inventario</h2>
          <p className="text-[10px] text-cm-muted font-medium">{products.length} productos con control de stock</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-muted" />
          <input
            type="text"
            placeholder="Buscar producto o categoría..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-cm-surface border border-cm-border rounded-xl text-sm text-cm-text focus:outline-none focus:border-cm-accent"
          />
        </div>
      </motion.div>

      {/* ── Stats Bar ── */}
      {products.length > 0 && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: 'Total', value: stats.total, color: 'text-cm-text' },
            { label: 'Sin stock', value: stats.outOfStock, color: 'text-cm-error' },
            { label: 'Crítico', value: stats.critical, color: 'text-cm-warning' },
            { label: 'Bajo', value: stats.low, color: 'text-cm-accent' },
            { label: 'OK', value: stats.ok, color: 'text-cm-success' },
          ].map(s => (
            <div key={s.label} className="bg-cm-surface rounded-xl border border-cm-border p-3 text-center">
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-[9px] font-semibold text-cm-muted uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Table (desktop) / Cards (mobile) ── */}
      {filtered.length === 0 ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="w-10 h-10 text-cm-muted mb-3" />
          <p className="text-sm font-medium text-cm-text-secondary">
            {search ? 'No se encontraron productos para esta búsqueda' : 'No hay productos con control de stock'}
          </p>
        </motion.div>
      ) : (
        <>
          {/* Desktop table */}
          <motion.div variants={itemVariants} className="hidden md:block bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cm-border bg-cm-bg-alt">
                  {[
                    { key: 'name', label: 'Producto' },
                    { key: 'category', label: 'Categoria' },
                    { key: 'stock', label: 'Stock' },
                    { key: 'base_price', label: 'Precio' },
                    { key: 'available', label: 'Estado' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className={`text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider cursor-pointer hover:text-cm-accent select-none ${
                        col.key === 'stock' || col.key === 'base_price' ? 'text-right' : col.key === 'available' ? 'text-center' : ''
                      }`}
                    >
                      {col.label}<SortIcon col={col.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cm-border">
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.id || p.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.01 }}
                    className="hover:bg-cm-accent/5 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-cm-text">{p.name}</td>
                    <td className="px-4 py-3 text-cm-text-secondary">{p.category || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{p.stock ?? 0}</td>
                    <td className="px-4 py-3 text-right font-semibold">S/ {Number(p.base_price || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <StockBadge stock={p.stock ?? 0} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          {/* Mobile cards */}
          <motion.div variants={itemVariants} className="md:hidden space-y-2">
            {filtered.map((p, i) => (
              <motion.div
                key={p.id || p.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="bg-cm-surface rounded-xl border border-cm-border p-4 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-cm-text truncate">{p.name}</p>
                  <p className="text-[10px] text-cm-muted">{p.category || '—'} · S/ {Number(p.base_price || 0).toFixed(2)}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className={`text-lg font-black ${(p.stock || 0) <= 0 ? 'text-cm-error' : (p.stock || 0) <= 5 ? 'text-cm-warning' : (p.stock || 0) <= 15 ? 'text-cm-accent' : 'text-cm-success'}`}>
                    {p.stock ?? 0}
                  </p>
                  <StockBadge stock={p.stock ?? 0} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
