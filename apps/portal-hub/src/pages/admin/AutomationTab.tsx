import { useState, useEffect } from 'react'
import { Settings, Play, Square, ExternalLink } from 'lucide-react'
import { EmptyState, ErrorBanner } from '@house/ui'
import { getPipelineConfig } from '../../lib/adminService'
import type { Employee } from '../../types'
import { PIPELINE_API_URL } from '../../lib/config'

interface Props { branchId: string; employee: Employee }

export default function AutomationTab({ branchId }: Props) {
  const [config, setConfig] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let dead = false
    getPipelineConfig(branchId)
      .then(c => { if (!dead) setConfig(c) })
      .catch(() => { if (!dead) setError('No se pudo cargar configuración del pipeline') })
      .finally(() => { if (!dead) setLoading(false) })
    return () => { dead = true }
  }, [branchId])

  if (loading) return <AutomationSkeleton />

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onClose={() => setError('')} />}

      <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-cm-text-tertiary" />
          <h3 className="font-semibold text-cm-text text-base">Pipeline Automatizado</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatusCard label="Estado del pipeline" value={config?.pipeline?.status || 'Desconocido'} />
          <StatusCard label="Último trigger" value={config?.pipeline?.lastTrigger || '—'} />
          <StatusCard label="n8n webhook" value={config?.n8n?.webhookUrl ? 'Configurado' : 'No configurado'} />
          <StatusCard label="Forwards" value={String(config?.pipeline?.forwardCount ?? 0)} />
        </div>
      </div>

      <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-cm-text-tertiary" />
          <h3 className="font-semibold text-cm-text text-base">Acciones</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.open(PIPELINE_API_URL, '_blank')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-cm-accent text-white rounded-cm-radius-sm hover:bg-cm-accent-hover transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Abrir pipeline
          </button>
          <button
            onClick={() => window.open(`${PIPELINE_API_URL}/health`, '_blank')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-cm-bg-alt text-cm-text-secondary border border-cm-border rounded-cm-radius-sm hover:bg-cm-surface-hover transition-colors"
          >
            <Play className="w-4 h-4" /> Health check
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cm-bg-alt border border-cm-border rounded-lg p-4">
      <p className="text-xs font-medium text-cm-text-secondary uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-semibold text-cm-text">{value}</p>
    </div>
  )
}

function AutomationSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
        <div className="h-5 w-40 rounded bg-cm-border mb-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-cm-bg-alt border border-cm-border rounded-lg p-4">
              <div className="h-3 w-24 rounded bg-cm-border mb-2" />
              <div className="h-4 w-20 rounded bg-cm-border" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
