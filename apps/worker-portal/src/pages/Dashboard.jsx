import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Award, CheckCircle2, Clock, Zap, Inbox, AlertTriangle } from 'lucide-react'

const KPI_CARDS = [
  { label: 'Pedidos Hoy', value: '12', icon: CheckCircle2, accent: 'bg-cm-accent-light text-cm-accent' },
  { label: 'En Preparación', value: '3', icon: Clock, accent: 'bg-[--cm-warning]/10 text-[--cm-warning]' },
  { label: 'Puntos 26Play', value: '1,450', icon: Zap, accent: 'bg-[#EA580C]/10 text-[#EA580C]' },
  { label: 'Rango Actual', value: 'Oro III', icon: Award, accent: 'bg-yellow-400/10 text-yellow-400' },
]

const TASKS = [
  { id: 1, title: 'Preparar Arma Tu Causa (Mesa 4)', time: 'hace 5 min', status: 'pending' },
  { id: 2, title: 'Limpieza de estación', time: '12:00 PM', status: 'scheduled' },
]

const ALERTS = [
  { message: 'Faltan insumos de Palta para Arma Tu Causa.', type: 'warning' },
  { message: 'Sorteo semanal mañana a las 18:00 hrs.', type: 'info' },
]

function SkeletonKpi() {
  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl p-4 animate-pulse">
      <div className="h-3 w-16 bg-cm-border rounded mb-3" />
      <div className="h-7 w-20 bg-cm-border rounded" />
    </div>
  )
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-cm-accent" />
      </div>
      <h2 className="text-lg font-semibold text-cm-text">{title}</h2>
      <p className="text-sm text-cm-text-secondary mt-1 max-w-sm">{description}</p>
      {action}
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-cm-error/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-cm-error" />
      </div>
      <h2 className="text-lg font-semibold text-cm-text">Error al cargar</h2>
      <p className="text-sm text-cm-text-secondary mt-1">{message}</p>
      <button onClick={onRetry} className="mt-6 px-5 py-2.5 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-medium hover:bg-cm-accent-hover transition-colors">
        Reintentar
      </button>
    </div>
  )
}

export default function Dashboard() {
  const [state, setState] = useState('populated')
  const activeTasks = TASKS.filter(t => t.status === 'pending')
  const completedCount = TASKS.filter(t => t.status === 'scheduled').length

  if (state === 'loading') {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonKpi key={i} />)}
        </div>
        <div className="h-64 bg-cm-surface border border-cm-border rounded-xl animate-pulse" />
      </div>
    )
  }

  if (state === 'empty') {
    return (
      <div className="p-4 md:p-8">
        <EmptyState
          icon={Inbox}
          title="Sin actividad hoy"
          description="No hay pedidos ni tareas asignadas por ahora."
        />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="p-4 md:p-8">
        <ErrorState
          message="No se pudieron cargar los datos del panel."
          onRetry={() => setState('populated')}
        />
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="dashboard"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-4 md:p-8 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Bienvenido, Operador</p>
            <h1 className="text-xl font-semibold text-cm-text mt-0.5">
              Turno <span className="text-cm-accent">Mañana</span>
            </h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-cm-text-secondary uppercase tracking-wider font-medium">Estado</p>
            <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cm-success/10 text-cm-success text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-cm-success" />
              Activo
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_CARDS.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="bg-cm-surface border border-cm-border rounded-xl p-4 flex items-center gap-4 transition-shadow hover:shadow-cm-sm">
                <div className={`w-10 h-10 rounded-[--cm-radius-sm] flex items-center justify-center shrink-0 ${kpi.accent}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-cm-text-secondary uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-2xl font-semibold text-cm-text mt-0.5">{kpi.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks */}
          <div className="lg:col-span-2 bg-cm-surface border border-cm-border rounded-xl p-6">
            <h2 className="text-sm font-medium text-cm-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cm-accent" /> Próximas Tareas
            </h2>
            {activeTasks.length === 0 ? (
              <p className="text-sm text-cm-text-tertiary text-center py-8">No hay tareas pendientes</p>
            ) : (
              <div className="space-y-3">
                {activeTasks.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-[--cm-radius-sm] bg-cm-bg border border-cm-border hover:border-cm-accent/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-cm-text">{task.title}</p>
                      <p className="text-xs text-cm-text-secondary mt-0.5">{task.time}</p>
                    </div>
                    <button className="px-4 py-2 rounded-[--cm-radius-sm] bg-cm-accent-light text-cm-accent text-xs font-medium hover:bg-cm-accent hover:text-white transition-colors">
                      Iniciar
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
            {completedCount > 0 && (
              <p className="text-xs text-cm-text-tertiary mt-4 text-right">
                {completedCount} tarea{completedCount !== 1 ? 's' : ''} completada{completedCount !== 1 ? 's' : ''} hoy
              </p>
            )}
          </div>

          {/* Alerts */}
          <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
            <h2 className="text-sm font-medium text-cm-text-secondary uppercase tracking-wider mb-4">Avisos</h2>
            <div className="space-y-3">
              {ALERTS.length === 0 ? (
                <p className="text-sm text-cm-text-tertiary text-center py-8">Sin avisos</p>
              ) : (
                ALERTS.map((alert, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`p-3 rounded-[--cm-radius-sm] text-sm ${
                      alert.type === 'warning'
                        ? 'bg-[--cm-warning]/10 border border-[--cm-warning]/20 text-cm-warning'
                        : 'bg-cm-bg border border-cm-border text-cm-text-secondary'
                    }`}
                  >
                    {alert.message}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
