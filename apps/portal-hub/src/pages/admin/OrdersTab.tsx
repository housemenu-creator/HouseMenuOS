import { useState, useEffect } from 'react'
import { Search, ShoppingCart, CheckCircle, XCircle } from 'lucide-react'
import { EmptyState, ErrorBanner } from '@house/ui'
import { listPurchaseOrders, listSuppliers, updatePurchaseOrderStatus } from '../../lib/adminService'
import type { Employee, Supplier, PurchaseOrder } from '../../types'
import { STATUS_COLORS } from './constants'

interface Props { branchId: string; canEdit: boolean; employee: Employee }

export default function OrdersTab({ branchId, canEdit, employee }: Props) {
  const by = employee.name || employee.role || 'admin'
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let dead = false
    setLoading(true)
    Promise.all([
      listPurchaseOrders(branchId).catch(() => []),
      listSuppliers().catch(() => []),
    ]).then(([pos, sups]) => { if (!dead) { setOrders(pos); setSuppliers(sups) } })
      .catch(() => { if (!dead) setError('Error al cargar') })
      .finally(() => { if (!dead) setLoading(false) })
    return () => { dead = true }
  }, [branchId])

  const filtered = orders.filter(o =>
    !search.trim() || o.id?.toLowerCase().includes(search.toLowerCase()) || o.supplierId?.toLowerCase().includes(search.toLowerCase())
  )
  const supplierName = (id: string) => suppliers.find(s => s.id === id)?.name || id

  async function handleStatus(poId: string, status: string) {
    try {
      await updatePurchaseOrderStatus(branchId, poId, status, by)
      setOrders(prev => prev.map(o => o.id === poId ? { ...o, status } : o))
    } catch { setError('Error al actualizar') }
  }

  if (loading) return <OrdersSkeleton />
  if (!loading && !orders.length)
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Sin órdenes de compra"
        description="Las órdenes aparecerán aquí cuando se automaticen o se creen manualmente."
      />
    )

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onClose={() => setError('')} />}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar orden..."
          className="w-full pl-9 pr-3 py-2 bg-cm-surface border border-cm-border rounded-cm-radius-sm text-sm text-cm-text placeholder:text-cm-text-tertiary focus:outline-none focus:border-cm-accent"
        />
      </div>
      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cm-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-cm-text-secondary uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Proveedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Fecha</th>
                {canEdit && <th className="px-4 py-3 text-right text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Acción</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={canEdit ? 6 : 5} className="px-4 py-12 text-center text-sm text-cm-text-tertiary">{search ? 'Sin resultados' : 'Sin órdenes'}</td></tr>
              ) : (
                filtered.map(po => {
                  const statusClass = STATUS_COLORS[po.status] || 'bg-cm-bg-alt text-cm-text-secondary'
                  return (
                    <tr key={po.id} className="border-b border-cm-border last:border-0 hover:bg-cm-surface-hover transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-cm-text-secondary">{po.id.slice(0, 12)}…</td>
                      <td className="px-4 py-3 font-medium text-cm-text">{supplierName(po.supplierId)}</td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-cm-radius-full ${statusClass}`}>{po.status}</span></td>
                      <td className="px-4 py-3 text-right font-mono text-cm-text">S/. {po.total.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-cm-text-secondary text-xs whitespace-nowrap">{po.createdAt ? new Date(po.createdAt).toLocaleDateString() : '—'}</td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          {po.status === 'pending' && (
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleStatus(po.id, 'approved')} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-cm-success-soft text-cm-success rounded-cm-radius-sm hover:opacity-80 transition-colors"><CheckCircle className="w-3 h-3" />Aprobar</button>
                              <button onClick={() => handleStatus(po.id, 'rejected')} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-cm-error-soft text-cm-error rounded-cm-radius-sm hover:opacity-80 transition-colors"><XCircle className="w-3 h-3" />Rechazar</button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-cm-text-tertiary text-right">{filtered.length} orden{filtered.length !== 1 ? 'es' : ''}</p>
    </div>
  )
}

function OrdersSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-64 bg-cm-surface border border-cm-border rounded-cm-radius-sm" />
      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4 p-4 border-b border-cm-border last:border-0">
            {[32, 20, 16, 16, 24].map(w => (
              <div key={w} className="h-4 rounded" style={{ width: `${w}px`, background: 'var(--cm-border)' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
