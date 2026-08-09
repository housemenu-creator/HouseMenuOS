import { useState, useEffect } from 'react'
import { Search, Package, AlertCircle, ToggleRight, ToggleLeft } from 'lucide-react'
import { EmptyState, ErrorBanner } from '@house/ui'
import { listProducts, listSuppliers, updateProduct } from '../../lib/adminService'
import type { Employee, Supplier, AdminProduct } from '../../types'

interface Props { branchId: string; canEdit: boolean; employee: Employee }

export default function ProductsTab({ branchId, canEdit, employee }: Props) {
  const by = employee.name || employee.role || 'admin'
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, { minStock: string; supplierId: string; trackStock: boolean }>>({})

  useEffect(() => {
    let dead = false
    setLoading(true)
    Promise.all([
      listProducts(branchId).catch(() => [] as AdminProduct[]),
      listSuppliers().catch(() => [] as Supplier[]),
    ]).then(([prods, sups]) => {
        if (dead) return
        setProducts(prods)
        setSuppliers(sups)
        const vals: Record<string, { minStock: string; supplierId: string; trackStock: boolean }> = {}
        for (const p of prods) {
          vals[p.id] = {
            minStock: String(p.minStock ?? ''),
            supplierId: p.supplierId || '',
            trackStock: p.trackStock || false,
          }
        }
        setEditValues(vals)
      })
      .catch(() => { if (!dead) setError('Error al cargar productos') })
      .finally(() => { if (!dead) setLoading(false) })
    return () => { dead = true }
  }, [branchId])

  const filtered = products.filter(p =>
    !search.trim() || [p.name, p.category, p.supplierId].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  async function handleSave(productId: string) {
    const v = editValues[productId]
    if (!v) return
    setSavingId(productId)
    try {
      await updateProduct(branchId, productId, {
        minStock: v.minStock ? Number(v.minStock) : undefined,
        supplierId: v.supplierId || undefined,
        trackStock: v.trackStock,
      }, by)
      setProducts(prev => prev.map(p => p.id === productId ? {
        ...p,
        minStock: v.minStock ? Number(v.minStock) : undefined,
        supplierId: v.supplierId || undefined,
        trackStock: v.trackStock,
      } : p))
    } catch { setError('Error al guardar') }
    finally { setSavingId(null) }
  }

  const supplierMap = Object.fromEntries(suppliers.filter(s => s.active !== false).map(s => [s.id, s.name]))

  if (loading) return <ProductsSkeleton />
  if (!loading && !products.length)
    return <EmptyState icon={Package} title="Sin productos" description="No hay productos en el catálogo." />

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onClose={() => setError('')} />}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full pl-9 pr-3 py-2 bg-cm-surface border border-cm-border rounded-cm-radius-sm text-sm text-cm-text placeholder:text-cm-text-tertiary focus:outline-none focus:border-cm-accent"
        />
      </div>

      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cm-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Categoría</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Stock</th>
                {canEdit && <th className="px-4 py-3 text-center text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Stock Mín</th>}
                {canEdit && <th className="px-4 py-3 text-left text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Proveedor</th>}
                {canEdit && <th className="px-4 py-3 text-center text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Auto</th>}
                {canEdit && <th className="px-4 py-3 text-right text-xs font-medium text-cm-text-secondary uppercase tracking-wider" />}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={canEdit ? 7 : 3} className="px-4 py-12 text-center text-sm text-cm-text-tertiary">{search ? 'Sin resultados' : 'Sin productos'}</td></tr>
              ) : (
                filtered.map(p => {
                  const v = editValues[p.id]
                  return (
                    <tr key={p.id} className="border-b border-cm-border last:border-0 hover:bg-cm-surface-hover transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-cm-text">{p.name}</span>
                        <span className="text-xs text-cm-text-tertiary ml-2">S/. {p.base_price.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 text-cm-text-secondary whitespace-nowrap">{p.category}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-cm-radius-full ${
                          p.stock !== undefined && p.minStock && p.stock < p.minStock
                            ? 'bg-cm-error-soft text-cm-error'
                            : 'bg-cm-bg-alt text-cm-text-secondary'
                        }`}>
                          {p.stock ?? '—'}
                          {p.stock !== undefined && p.minStock && p.stock < p.minStock && <AlertCircle className="w-3 h-3" />}
                        </span>
                      </td>
                      {canEdit && v && (
                        <>
                          <td className="px-4 py-3 text-center">
                            <input
                              value={v.minStock}
                              onChange={e => setEditValues(prev => ({ ...prev, [p.id]: { ...prev[p.id], minStock: e.target.value.replace(/\D/g, '') } }))}
                              className="w-16 text-center input py-1.5 text-xs"
                              placeholder="—"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={v.supplierId}
                              onChange={e => setEditValues(prev => ({ ...prev, [p.id]: { ...prev[p.id], supplierId: e.target.value } }))}
                              className="input py-1.5 text-xs max-w-[180px]"
                            >
                              <option value="">Sin proveedor</option>
                              {suppliers.filter(s => s.active !== false).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setEditValues(prev => ({ ...prev, [p.id]: { ...prev[p.id], trackStock: !prev[p.id].trackStock } }))}
                              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-cm-radius-full transition-colors ${
                                v.trackStock ? 'bg-cm-success-soft text-cm-success' : 'bg-cm-border text-cm-text-tertiary'
                              }`}
                            >
                              {v.trackStock ? <><ToggleRight className="w-3 h-3" /> Sí</> : <><ToggleLeft className="w-3 h-3" /> No</>}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleSave(p.id)}
                              disabled={savingId === p.id}
                              className="px-3 py-1.5 text-xs font-medium bg-cm-accent text-white rounded-cm-radius-sm hover:bg-cm-accent-hover disabled:opacity-50 transition-colors"
                            >
                              {savingId === p.id ? '...' : 'Guardar'}
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-cm-text-tertiary text-right">{filtered.length} producto{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  )
}

function ProductsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-64 bg-cm-surface border border-cm-border rounded-cm-radius-sm" />
      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex gap-4 p-4 border-b border-cm-border last:border-0">
            {[40, 16, 16, 24, 12].map(w => (
              <div key={w} className="h-4 rounded" style={{ width: `${w}px`, background: 'var(--cm-border)' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
