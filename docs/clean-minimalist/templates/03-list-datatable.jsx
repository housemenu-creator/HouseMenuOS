import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronDown, ArrowUpDown, Inbox, AlertTriangle } from 'lucide-react'

const COLUMNS = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Nombre', sortable: true },
  { key: 'status', label: 'Estado', sortable: true },
  { key: 'date', label: 'Fecha', sortable: true },
]

export default function ListDataTable({ title = 'Listado', data = [], columns = COLUMNS, onRowClick, onNew }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [state, setState] = useState('populated') // loading | empty | error | populated

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter(row => columns.some(col => String(row[col.key] || '').toLowerCase().includes(q)))
  }, [data, search, columns])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] || '', bv = b[sortKey] || ''
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [filtered, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  if (state === 'loading') {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 bg-cm-surface border border-cm-border rounded-[--cm-radius-sm] animate-pulse" />
        <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex gap-4 p-4 border-b border-cm-border last:border-0 animate-pulse">
              <div className="h-4 w-16 bg-cm-border rounded" />
              <div className="h-4 w-32 bg-cm-border rounded" />
              <div className="h-4 w-20 bg-cm-border rounded" />
              <div className="h-4 w-24 bg-cm-border rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (state === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-cm-accent" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Sin registros</h2>
        <p className="text-sm text-cm-text-secondary mt-1">No hay elementos para mostrar.</p>
        {onNew && (
          <button onClick={onNew} className="mt-6 px-5 py-2.5 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-medium hover:bg-cm-accent-hover transition-colors">
            Crear nuevo
          </button>
        )}
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-error/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-cm-error" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Error al cargar</h2>
        <button onClick={() => window.location.reload()} className="mt-6 px-5 py-2.5 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-medium hover:bg-cm-accent-hover transition-colors">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-cm-text">{title}</h1>
        {onNew && (
          <button onClick={onNew} className="px-4 py-2 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-medium hover:bg-cm-accent-hover transition-colors">
            + Nuevo
          </button>
        )}
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full pl-9 pr-3 py-2 bg-cm-surface border border-cm-border rounded-[--cm-radius-sm] text-sm text-cm-text placeholder:text-cm-text-tertiary focus:outline-none focus:border-cm-accent transition-colors"
        />
      </div>

      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cm-border">
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                    className={`px-4 py-3 text-left text-xs font-medium text-cm-text-secondary uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:text-cm-text select-none' : ''}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && <ArrowUpDown className={`w-3 h-3 ${sortKey === col.key ? 'text-cm-accent' : ''}`} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-cm-text-tertiary">
                      {search ? 'Sin resultados para esta búsqueda' : 'Sin datos'}
                    </td>
                  </tr>
                ) : (
                  sorted.map((row, i) => (
                    <motion.tr
                      key={row.id || i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => onRowClick?.(row)}
                      className={`border-b border-cm-border last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-cm-surface-hover transition-colors' : ''}`}
                    >
                      {columns.map(col => (
                        <td key={col.key} className="px-4 py-3 text-cm-text whitespace-nowrap">
                          {row[col.key]}
                        </td>
                      ))}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-cm-text-tertiary text-right">{sorted.length} resultado{sorted.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
