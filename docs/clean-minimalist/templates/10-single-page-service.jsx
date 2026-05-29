import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Inbox, AlertTriangle, RefreshCw } from 'lucide-react'

export default function SinglePageService({ title = 'Servicio', state = 'populated' }) {
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center mb-4 animate-pulse">
          <RefreshCw className="w-8 h-8 text-cm-accent animate-spin" />
        </div>
        <p className="text-sm text-cm-text-secondary">Cargando...</p>
      </div>
    )
  }

  if (state === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-cm-accent" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Sin contenido</h2>
        <p className="text-sm text-cm-text-secondary mt-1">Esta sección está vacía.</p>
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
        <p className="text-sm text-cm-text-secondary mt-1">Algo salió mal. Intenta de nuevo.</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-5 py-2.5 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-medium hover:bg-cm-accent-hover transition-colors">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="text-center py-8">
        <h1 className="text-2xl font-semibold text-cm-text">{title}</h1>
        <p className="text-sm text-cm-text-secondary mt-2">Descripción breve del servicio.</p>
      </div>

      <div className="bg-cm-surface border border-cm-border rounded-xl p-8 text-center">
        <p className="text-sm text-cm-text">Contenido principal del servicio.</p>
      </div>

      <button className="w-full py-3 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-medium hover:bg-cm-accent-hover transition-colors">
        Acción principal
      </button>
    </motion.div>
  )
}
