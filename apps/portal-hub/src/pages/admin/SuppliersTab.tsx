import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { Plus, User, Phone, Mail, Building2 } from 'lucide-react'
import { Modal, EmptyState, ErrorBanner, SearchInput, Table } from '@house/ui'
import { listSuppliers, createSupplier, updateSupplier, deactivateSupplier } from '../../lib/adminService'
import type { Supplier, Employee } from '../../types'

interface Props { canEdit: boolean; employee: Employee }

const COLUMNS = [
  { key: 'name', label: 'Nombre', sortable: true },
  { key: 'contactName', label: 'Contacto', sortable: true },
  { key: 'phone', label: 'Teléfono', sortable: false },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'active', label: 'Estado', sortable: true },
]

export default function SuppliersTab({ canEdit, employee }: Props) {
  const by = employee.name || employee.role || 'admin'
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState('asc')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let dead = false
    setLoading(true); setError('')
    listSuppliers()
      .then(d => { if (!dead) setSuppliers(d) })
      .catch(() => { if (!dead) setError('Error al cargar') })
      .finally(() => { if (!dead) setLoading(false) })
    return () => { dead = true }
  }, [])

  const filtered = useMemo(() => {
    let r = search.trim()
      ? suppliers.filter(s => [s.name, s.contactName, s.phone, s.email].some(v => v?.toLowerCase().includes(search.toLowerCase())))
      : suppliers
    if (sortKey) {
      r = [...r].sort((a, b) => {
        const av = String(a[sortKey as keyof Supplier] || '')
        const bv = String(b[sortKey as keyof Supplier] || '')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }
    return r
  }, [suppliers, search, sortKey, sortDir])

  function toggleSort(k: string) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  function openCreate() { setEditingId(null); setForm({ name: '', contactName: '', phone: '', email: '', notes: '' }); setModalOpen(true) }
  function openEdit(s: Supplier) {
    setEditingId(s.id)
    setForm({ name: s.name || '', contactName: s.contactName || '', phone: s.phone || '', email: s.email || '', notes: s.notes || '' })
    setModalOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await updateSupplier(editingId, form, by)
        setSuppliers(prev => prev.map(s => s.id === editingId ? { ...s, ...form } : s))
      } else {
        const id = await createSupplier(form, by)
        setSuppliers(prev => [...prev, { id, ...form, active: true, createdAt: new Date().toISOString() }])
      }
      setModalOpen(false)
    } catch { setError('Error al guardar') } finally { setSaving(false) }
  }

  async function handleDeactivate(s: Supplier) {
    if (!confirm(`Desactivar ${s.name}?`)) return
    try {
      await deactivateSupplier(s.id, by)
      setSuppliers(prev => prev.map(p => p.id === s.id ? { ...p, active: false } : p))
    } catch { setError('Error al desactivar') }
  }

  if (loading) return <SuppliersSkeleton />
  if (!loading && !suppliers.length)
    return (
      <EmptyState
        icon={Building2}
        title="Sin proveedores"
        description="Agregá tu primer proveedor para empezar."
        action={canEdit ? { label: '+ Nuevo Proveedor', onClick: openCreate } : undefined}
      />
    )

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onClose={() => setError('')} />}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar proveedor..." />
        {canEdit && (
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 bg-cm-accent text-white rounded-cm-radius-sm text-sm font-medium hover:bg-cm-accent-hover transition-colors">
            <Plus className="w-4 h-4" />Nuevo
          </button>
        )}
      </div>

      <Table
        columns={COLUMNS}
        rows={filtered}
        sortKey={sortKey}
        sortDir={sortDir}
        onToggleSort={toggleSort}
        search={search}
        total={suppliers.length}
        renderRow={(s: Supplier) => (
          <>
            <td className="px-4 py-3 font-medium text-cm-text">{s.name}</td>
            <td className="px-4 py-3 text-cm-text-secondary">{s.contactName || '—'}</td>
            <td className="px-4 py-3 text-cm-text-secondary">
              {s.phone ? <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span> : '—'}
            </td>
            <td className="px-4 py-3 text-cm-text-secondary">
              {s.email ? <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span> : '—'}
            </td>
            <td className="px-4 py-3">
              <StatusBadge active={s.active !== false} />
            </td>
            {canEdit && (
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <TinyButton label="Editar" onClick={() => openEdit(s)} />
                  {s.active !== false && <TinyButton label="Desactivar" onClick={() => handleDeactivate(s)} danger />}
                </div>
              </td>
            )}
          </>
        )}
        extraCols={canEdit ? 1 : 0}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre *">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Nombre del proveedor" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contacto">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
                <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} className="input pl-9" placeholder="Nombre" />
              </div>
            </Field>
            <Field label="Teléfono">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input pl-9" placeholder="+51999..." />
              </div>
            </Field>
          </div>
          <Field label="Email">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input pl-9" placeholder="correo@proveedor.com" type="email" />
            </div>
          </Field>
          <Field label="Notas">
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input resize-none" rows={2} placeholder="Observaciones..." />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-cm-text-secondary hover:text-cm-text">Cancelar</button>
            <button type="submit" disabled={saving || !form.name.trim()} className="px-5 py-2 bg-cm-accent text-white rounded-cm-radius-sm text-sm font-medium hover:bg-cm-accent-hover disabled:opacity-50">
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── Sub-components ──

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-cm-radius-full ${active ? 'bg-cm-success-soft text-cm-success' : 'bg-cm-border text-cm-text-tertiary'}`}>
      {active ? 'Activo' : 'Inactivo'}
    </span>
  )
}

function TinyButton({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 text-xs font-medium rounded-cm-radius-sm transition-colors ${danger ? 'text-cm-error hover:bg-cm-error-soft' : 'text-cm-text-secondary hover:text-cm-text hover:bg-cm-surface-hover'}`}
    >
      {label}
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-cm-text">{label}</label>
      {children}
    </div>
  )
}

function SuppliersSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-64 bg-cm-surface border border-cm-border rounded-cm-radius-sm" />
      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex gap-4 p-4 border-b border-cm-border last:border-0">
            {[32, 24, 28, 36, 16].map(w => (
              <div key={w} className="h-4 rounded" style={{ width: `${w}px`, background: 'var(--cm-border)' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
