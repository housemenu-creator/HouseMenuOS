import { useState } from 'react'
import { motion, Reorder } from 'framer-motion'
import { Plus, Inbox, AlertTriangle } from 'lucide-react'

const COLUMNS = [
  { id: 'todo', label: 'Por hacer', color: 'border-l-cm-text-secondary' },
  { id: 'doing', label: 'En progreso', color: 'border-l-cm-accent' },
  { id: 'done', label: 'Completado', color: 'border-l-cm-success' },
]

function Ticket({ item, onStatusChange }) {
  return (
    <Reorder.Item value={item} id={item.id} style={{ listStyle: 'none' }}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-cm-surface border border-cm-border rounded-xl p-4 cursor-grab active:cursor-grabbing hover:shadow-cm-sm transition-shadow mb-3"
      >
        <p className="text-sm font-medium text-cm-text">{item.title}</p>
        {item.description && (
          <p className="text-xs text-cm-text-secondary mt-1 line-clamp-2">{item.description}</p>
        )}
      </motion.div>
    </Reorder.Item>
  )
}

export default function KanbanBoard({ title = 'Tablero', state = 'populated' }) {
  const [columns, setColumns] = useState({
    todo: [
      { id: '1', title: 'Configurar menú', description: 'Agregar items al catálogo' },
      { id: '2', title: 'Revisar precios', description: 'Actualizar lista de precios' },
    ],
    doing: [
      { id: '3', title: 'Diseñar landing', description: 'Nueva página de bienvenida' },
    ],
    done: [],
  })

  const moveTicket = (ticketId, fromCol, toCol) => {
    const ticket = columns[fromCol].find(t => t.id === ticketId)
    if (!ticket) return
    setColumns(prev => ({
      ...prev,
      [fromCol]: prev[fromCol].filter(t => t.id !== ticketId),
      [toCol]: [...prev[toCol], ticket],
    }))
  }

  if (state === 'loading') {
    return (
      <div className="flex gap-6 overflow-x-auto pb-4">
        {[1,2,3].map(col => (
          <div key={col} className="flex-1 min-w-[280px] space-y-3">
            <div className="h-5 w-24 bg-cm-border rounded animate-pulse" />
            {[1,2].map(i => (
              <div key={i} className="h-24 bg-cm-surface border border-cm-border rounded-xl animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (state === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-cm-accent" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Tablero vacío</h2>
        <p className="text-sm text-cm-text-secondary mt-1">No hay tickets. Crea el primero.</p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-error/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-cm-error" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Error</h2>
        <button onClick={() => window.location.reload()} className="mt-6 px-5 py-2.5 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-medium hover:bg-cm-accent-hover transition-colors">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-cm-text">{title}</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-medium hover:bg-cm-accent-hover transition-colors">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4">
        {COLUMNS.map(col => (
          <div
            key={col.id}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              const data = JSON.parse(e.dataTransfer.getData('text/plain'))
              moveTicket(data.id, data.from, col.id)
            }}
            className="flex-1 min-w-[280px]"
          >
            <h3 className={`text-xs font-medium text-cm-text-secondary uppercase tracking-wider mb-4 border-l-2 ${col.color} pl-3`}>
              {col.label} <span className="text-cm-text-tertiary">({columns[col.id].length})</span>
            </h3>

            <Reorder.Group axis="y" values={columns[col.id]} onReorder={ids => setColumns(p => ({ ...p, [col.id]: ids }))}>
              {columns[col.id].map(item => (
                <Ticket
                  key={item.id}
                  item={item}
                  onStatusChange={status => moveTicket(item.id, col.id, status)}
                />
              ))}
            </Reorder.Group>
          </div>
        ))}
      </div>
    </div>
  )
}
