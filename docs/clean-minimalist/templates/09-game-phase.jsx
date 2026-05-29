import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Inbox, AlertTriangle, Star, Clock, RefreshCw } from 'lucide-react'

const PHASES = ['Preparación', 'Jugando', 'Resultados']

export default function GamePhase({ title = 'Juego', state = 'populated' }) {
  const [phase, setPhase] = useState(0)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center mb-4 animate-pulse">
          <RefreshCw className="w-8 h-8 text-cm-accent animate-spin" />
        </div>
        <p className="text-sm text-cm-text-secondary">Preparando juego...</p>
      </div>
    )
  }

  if (state === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-cm-accent" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Sin juegos disponibles</h2>
        <p className="text-sm text-cm-text-secondary mt-1">Vuelve más tarde para nuevas partidas.</p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-error/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-cm-error" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Error de conexión</h2>
        <button onClick={() => window.location.reload()} className="mt-6 px-5 py-2.5 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-medium hover:bg-cm-accent-hover transition-colors">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 text-center">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-cm-text">{title}</h1>
        <div className="flex items-center gap-2 text-sm">
          <Star className="w-4 h-4 text-cm-accent" />
          <span className="font-medium text-cm-text">{score}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        {PHASES.map((p, i) => (
          <div key={i} className={`flex items-center gap-2 ${i < PHASES.length - 1 ? 'flex-1' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              i <= phase ? 'bg-cm-accent text-white' : 'bg-cm-border text-cm-text-tertiary'
            }`}>
              {i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i <= phase ? 'text-cm-text' : 'text-cm-text-tertiary'}`}>
              {p}
            </span>
            {i < PHASES.length - 1 && <div className={`flex-1 h-px ${i < phase ? 'bg-cm-accent' : 'bg-cm-border'}`} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {phase === 0 && (
          <motion.div key="ready" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-12">
            <h2 className="text-2xl font-semibold text-cm-text mb-2">¿Listo?</h2>
            <p className="text-sm text-cm-text-secondary">Prepara tu mente para el desafío.</p>
            <button onClick={() => setPhase(1)} className="mt-8 px-8 py-3 bg-cm-accent text-white rounded-[--cm-radius-sm] text-base font-medium hover:bg-cm-accent-hover transition-colors">
              Empezar
            </button>
          </motion.div>
        )}

        {phase === 1 && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12">
            <div className="flex items-center justify-center gap-2 mb-8">
              <Clock className="w-5 h-5 text-cm-accent" />
              <span className="text-2xl font-semibold text-cm-text">{timeLeft}s</span>
            </div>

            <div className="bg-cm-surface border border-cm-border rounded-xl p-8 mb-8">
              <p className="text-lg text-cm-text">¿Cuál es la capital de Perú?</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {['Lima', 'Bogotá', 'Quito', 'Santiago'].map((opt, i) => (
                <button
                  key={i}
                  onClick={() => { setScore(s => s + 10); setPhase(2) }}
                  className="px-6 py-4 bg-cm-surface border border-cm-border rounded-xl text-sm font-medium text-cm-text hover:border-cm-accent hover:shadow-cm-sm active:scale-[0.98] transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {phase === 2 && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-12">
            <div className="w-20 h-20 rounded-full bg-cm-accent-light flex items-center justify-center mx-auto mb-4">
              <Star className="w-10 h-10 text-cm-accent" />
            </div>
            <h2 className="text-2xl font-semibold text-cm-text mb-2">Puntuación final</h2>
            <p className="text-5xl font-bold text-cm-accent mb-6">{score}</p>
            <button onClick={() => { setPhase(0); setScore(0); setTimeLeft(30) }} className="px-8 py-3 bg-cm-accent text-white rounded-[--cm-radius-sm] text-base font-medium hover:bg-cm-accent-hover transition-colors">
              Jugar otra vez
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
