import { motion } from 'framer-motion'
import { Inbox, AlertTriangle } from 'lucide-react'

function GridCard({ item, onClick }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => onClick?.(item)}
      className="bg-cm-surface border border-cm-border rounded-xl p-6 text-left w-full hover:shadow-cm-sm hover:border-cm-border-hover transition-all active:scale-[0.98]"
    >
      {item.icon && (
        <div className="w-10 h-10 rounded-[--cm-radius-sm] bg-cm-accent-light flex items-center justify-center mb-4">
          <span className="text-cm-accent text-lg">{item.icon}</span>
        </div>
      )}
      <h3 className="text-sm font-semibold text-cm-text">{item.title}</h3>
      {item.description && (
        <p className="text-xs text-cm-text-secondary mt-1.5 line-clamp-2">{item.description}</p>
      )}
      {item.meta && (
        <p className="text-xs text-cm-text-tertiary mt-3">{item.meta}</p>
      )}
    </motion.button>
  )
}

export default function CardGrid({ title = 'Galería', items = [], onCardClick, state = 'populated' }) {
  if (state === 'loading') {
    return (
      <div className="space-y-6">
        <div className="h-6 w-40 bg-cm-border rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-36 bg-cm-surface border border-cm-border rounded-xl animate-pulse" />
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
        <h2 className="text-lg font-semibold text-cm-text">Sin elementos</h2>
        <p className="text-sm text-cm-text-secondary mt-1">No hay tarjetas para mostrar.</p>
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
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-cm-text">{title}</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-cm-text-tertiary">Sin resultados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <GridCard key={item.id || i} item={item} onClick={onCardClick} />
          ))}
        </div>
      )}
    </div>
  )
}
