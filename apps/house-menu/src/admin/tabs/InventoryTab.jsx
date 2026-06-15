export default function InventoryTab({ catalog }) {
  const products = Object.entries(catalog.products || {}).map(([id, p]) => ({ ...p, id }));
  const tracked = products.filter(p => p.trackStock);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-cm-text">Inventario</h2>
        <p className="text-xs text-cm-text-secondary font-medium">{tracked.length} productos con stock</p>
      </div>
      <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cm-border bg-cm-bg-alt">
              <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Producto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Categoria</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Stock</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Precio</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Disponible</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cm-border">
            {tracked.map(p => (
              <tr key={p.id || p.name} className="hover:bg-cm-accent/5 transition-colors">
                <td className="px-4 py-3 font-semibold text-cm-text">{p.name}</td>
                <td className="px-4 py-3 text-cm-text-secondary">{p.category || 'Sin categoria'}</td>
                <td className={`px-4 py-3 text-right font-semibold ${(p.stock || 0) <= 0 ? 'text-cm-error' : (p.stock || 0) <= 5 ? 'text-cm-accent' : 'text-cm-success'}`}>{p.stock || 0}</td>
                <td className="px-4 py-3 text-right font-semibold">S/ {Number(p.base_price || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${p.available !== false ? 'bg-cm-success' : 'bg-cm-error'}`} />
                </td>
              </tr>
            ))}
            {!tracked.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-cm-text-secondary">No hay productos con control de stock</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
