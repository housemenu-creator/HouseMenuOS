import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, AlertTriangle, Inbox } from 'lucide-react'

function KpiCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl p-4 flex items-center gap-4 transition-shadow hover:shadow-cm-sm">
      {Icon && (
        <div className={`w-10 h-10 rounded-[--cm-radius-sm] flex items-center justify-center shrink-0 ${accent || 'bg-cm-accent-light text-cm-accent'}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-cm-text-secondary uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-semibold text-cm-text mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default function Dashboard({ title = 'Dashboard', onAction }) {
  const [state, setState] = useState('loading') // loading | empty | error | populated
  const [kpis, setKpis] = useState([])
  const [recentItems, setRecentItems] = useState([])

  useEffect(() => {
    // Simular carga
    const timer = setTimeout(() => setState('populated'), 800)
    return () => clearTimeout(timer)
  }, [])

  const kpiData = [
    { label: 'Total Hoy', value: 'S/ 1,280', icon: RefreshCw },
    { label: 'Pedidos', value: '24', icon: Inbox },
    { label: 'Activos', value: '8', icon: RefreshCw },
    { label: 'Completados', value: '16', icon: RefreshCw },
  ]

  if (state === 'loading') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-cm-surface border border-cm-border rounded-xl p-4 animate-pulse">
              <div className="h-3 w-16 bg-cm-border rounded mb-3" />
              <div className="h-7 w-20 bg-cm-border rounded" />
            </div>
          ))}
        </div>
        <div className="h-64 bg-cm-surface border border-cm-border rounded-xl animate-pulse" />
      </div>
    )
  }

  if (state === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-cm-accent" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">No hay datos todavía</h2>
        <p className="text-sm text-cm-text-secondary mt-1 max-w-sm">Los datos aparecerán aquí cuando haya actividad.</p>
        <button onClick={() => setState('populated')} className="mt-6 px-5 py-2.5 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-medium hover:bg-cm-accent-hover transition-colors">
          Crear primer registro
        </button>
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
        <p className="text-sm text-cm-text-secondary mt-1">No se pudieron obtener los datos. Intenta de nuevo.</p>
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
        {onAction && (
          <button onClick={onAction} className="px-4 py-2 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-medium hover:bg-cm-accent-hover transition-colors">
            Nueva acción
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <KpiCard {...kpi} />
          </motion.div>
        ))}
      </div>

      <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
        <h2 className="text-sm font-medium text-cm-text-secondary uppercase tracking-wider mb-4">Actividad Reciente</h2>
        {recentItems.length === 0 ? (
          <p className="text-sm text-cm-text-tertiary text-center py-8">Sin actividad reciente</p>
        ) : (
          <div className="space-y-3">
            {recentItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-cm-border last:border-0">
                <span className="text-sm text-cm-text">{item.label}</span>
                <span className="text-xs text-cm-text-secondary">{item.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
