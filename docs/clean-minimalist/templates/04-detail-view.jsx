import { motion } from 'framer-motion'
import { ArrowLeft, AlertTriangle, Inbox } from 'lucide-react'

function DetailSection({ label, children }) {
  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
      <h3 className="text-xs font-medium text-cm-text-secondary uppercase tracking-wider mb-4">{label}</h3>
      {children}
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-cm-border last:border-0">
      <span className="text-sm text-cm-text-secondary">{label}</span>
      <span className="text-sm font-medium text-cm-text text-right">{value || '—'}</span>
    </div>
  )
}

export default function DetailView({ title, onBack, state = 'populated', children }) {
  if (state === 'loading') {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-cm-border rounded animate-pulse" />
        <div className="h-48 bg-cm-surface border border-cm-border rounded-xl animate-pulse" />
        <div className="h-32 bg-cm-surface border border-cm-border rounded-xl animate-pulse" />
      </div>
    )
  }

  if (state === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-cm-accent" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Sin información</h2>
        <p className="text-sm text-cm-text-secondary mt-1">No se encontraron datos para este elemento.</p>
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
        <p className="text-sm text-cm-text-secondary mt-1">No se pudo cargar el detalle.</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-5 py-2.5 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-medium hover:bg-cm-accent-hover transition-colors">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-cm-text-secondary hover:text-cm-text transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-semibold text-cm-text">{title}</h1>
      </motion.div>

      {children || (
        <div className="space-y-6">
          <DetailSection label="Información General">
            <DetailRow label="ID" value="#001" />
            <DetailRow label="Estado" value="Activo" />
            <DetailRow label="Fecha" value="23 May 2026" />
          </DetailSection>

          <DetailSection label="Detalles">
            <DetailRow label="Descripción" value="Lorem ipsum dolor sit amet" />
            <DetailRow label="Monto" value="S/ 1,280.00" />
            <DetailRow label="Responsable" value="Carlos" />
          </DetailSection>
        </div>
      )}
    </div>
  )
}

export { DetailSection, DetailRow }
