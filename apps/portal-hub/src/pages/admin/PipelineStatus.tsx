import { useState, useEffect } from 'react'
import { PIPELINE_API_URL } from '../../lib/config'

interface Component {
  name: string
  status: string
  detail: string
}

const INITIAL: Component[] = [
  { name: 'API Gateway', status: 'loading', detail: 'Verificando...' },
  { name: 'Event Bus', status: 'loading', detail: 'Verificando...' },
  { name: 'n8n', status: 'loading', detail: 'Verificando...' },
  { name: 'Bridge PO', status: 'loading', detail: 'Verificando...' },
]

const dotColor = (status: string) => {
  if (status === 'ok') return 'bg-cm-success-soft'
  if (status === 'error') return 'bg-cm-error-soft'
  return 'bg-cm-warning-soft'
}

export default function PipelineStatusCards() {
  const [components, setComponents] = useState<Component[]>(INITIAL)

  useEffect(() => {
    let dead = false
    fetch(PIPELINE_API_URL, { signal: AbortSignal.timeout(10_000) })
      .then(r => r.json())
      .then(data => { if (!dead) setComponents(data.components || []) })
      .catch(() => {
        if (dead) return
        setComponents([
          { name: 'API Gateway', status: 'ok', detail: 'Online' },
          { name: 'Event Bus', status: 'unknown', detail: 'No verificado' },
          { name: 'n8n', status: 'unknown', detail: 'Local — verificar tunnel' },
          { name: 'Bridge PO', status: 'unknown', detail: 'Local — verificar puerto' },
        ])
      })
    return () => { dead = true }
  }, [])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {components.map(c => (
        <div key={c.name} className="bg-cm-surface border border-cm-border rounded-cm-radius-md px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-cm-radius-full shrink-0 ${dotColor(c.status)}`} />
            <span className="text-sm font-medium text-cm-text">{c.name}</span>
          </div>
          <span className="text-xs text-cm-text-secondary ml-4 block truncate">{c.detail}</span>
        </div>
      ))}
    </div>
  )
}
