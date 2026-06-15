import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Medal, Flame, Star, Zap, ChevronUp, ChevronDown, Minus, Sparkles, Search, ArrowUpDown, Inbox, AlertTriangle } from 'lucide-react'

const RANK_TIERS = [
  { name: 'Inti Diamante', minPts: 5000, color: 'text-[--cm-info]', border: 'border-[--cm-info]' },
  { name: 'Oro Sagrado', minPts: 3000, color: 'text-yellow-400', border: 'border-yellow-400' },
  { name: 'Plata Andina', minPts: 1500, color: 'text-slate-400', border: 'border-slate-400' },
  { name: 'Bronce Ayni', minPts: 500, color: 'text-amber-600', border: 'border-amber-600' },
  { name: 'Aprendiz', minPts: 0, color: 'text-cm-accent', border: 'border-cm-accent' },
]

function getRank(pts) {
  for (const tier of RANK_TIERS) {
    if (pts >= tier.minPts) return tier
  }
  return RANK_TIERS[RANK_TIERS.length - 1]
}

const COLUMNS = [
  { key: 'name', label: 'Operador', sortable: true },
  { key: 'rank', label: 'Rango', sortable: true },
  { key: 'pts', label: 'KPI Pts', sortable: true },
  { key: 'pedidos', label: 'Pedidos', sortable: true },
  { key: 'limpieza', label: 'Limpieza %', sortable: true },
  { key: 'streak', label: 'Racha', sortable: true },
  { key: 'weeklyDelta', label: 'Semanal', sortable: true },
]

const WORKERS = [
  { id: 'w1', name: 'Chaski_Digital', avatar: '🦅', pts: 4820, pedidos: 312, limpieza: 95, streak: 14, trend: 'up', weeklyDelta: 180 },
  { id: 'w2', name: 'Illapa_Stitch', avatar: '⚡', pts: 3650, pedidos: 245, limpieza: 88, streak: 7, trend: 'up', weeklyDelta: 95 },
  { id: 'w3', name: 'Kuntur_AI', avatar: '🤖', pts: 2900, pedidos: 198, limpieza: 92, streak: 3, trend: 'down', weeklyDelta: -40 },
  { id: 'w4', name: 'Ayni_Master', avatar: '🌿', pts: 1450, pedidos: 134, limpieza: 78, streak: 0, trend: 'stable', weeklyDelta: 0 },
  { id: 'w5', name: 'Pachamama_Ops', avatar: '🌎', pts: 980, pedidos: 87, limpieza: 82, streak: 5, trend: 'up', weeklyDelta: 60 },
  { id: 'w6', name: 'Wiracocha_Dev', avatar: '🔥', pts: 520, pedidos: 45, limpieza: 70, streak: 1, trend: 'down', weeklyDelta: -15 },
]

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-9 w-24 bg-cm-surface border border-cm-border rounded-[--cm-radius-sm] animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-56 bg-cm-surface border border-cm-border rounded-xl animate-pulse" />)}
      </div>
      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex gap-4 p-4 border-b border-cm-border last:border-0 animate-pulse">
            <div className="h-4 w-12 bg-cm-border rounded" />
            <div className="h-4 w-32 bg-cm-border rounded" />
            <div className="h-4 w-20 bg-cm-border rounded" />
            <div className="h-4 w-16 bg-cm-border rounded" />
            <div className="h-4 w-16 bg-cm-border rounded" />
            <div className="h-4 w-16 bg-cm-border rounded" />
            <div className="h-4 w-16 bg-cm-border rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

function PodiumCard({ worker, idx }) {
  const rank = getRank(worker.pts)
  const pos = [
    { label: '1°', border: 'border-yellow-400/50', scale: 'md:scale-105' },
    { label: '2°', border: 'border-slate-400/30', scale: '' },
    { label: '3°', border: 'border-amber-600/30', scale: '' },
  ][idx]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.1 }}
      className={`bg-cm-surface border-2 rounded-xl p-6 text-center relative overflow-hidden ${pos.border} ${pos.scale}`}
    >
      <div className="absolute top-3 left-3 text-lg font-bold text-cm-text-secondary">{pos.label}</div>

      <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center text-3xl border-2 rounded-full border-cm-border bg-cm-bg">
        {worker.avatar}
      </div>

      <h3 className="font-semibold text-cm-text text-sm">{worker.name}</h3>

      <div className={`inline-block px-3 py-0.5 text-[10px] font-bold uppercase mt-1.5 border rounded-[--cm-radius-sm] ${rank.color} ${rank.border} bg-cm-bg`}>
        {rank.name}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center border-t border-cm-border pt-4">
        <div>
          <p className="text-[9px] text-cm-text-secondary uppercase font-medium">KPI</p>
          <p className={`font-bold text-sm ${rank.color}`}>{worker.pts.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[9px] text-cm-text-secondary uppercase font-medium">Pedidos</p>
          <p className="font-bold text-sm text-cm-text">{worker.pedidos}</p>
        </div>
        <div>
          <p className="text-[9px] text-cm-text-secondary uppercase font-medium">Racha</p>
          <p className="font-bold text-sm text-cm-text flex items-center justify-center gap-0.5">
            <Flame className="w-3 h-3 text-orange-400" /> {worker.streak}d
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1 text-xs font-medium">
        {worker.trend === 'up' && <ChevronUp className="w-3.5 h-3.5 text-cm-success" />}
        {worker.trend === 'down' && <ChevronDown className="w-3.5 h-3.5 text-cm-error" />}
        {worker.trend === 'stable' && <Minus className="w-3.5 h-3.5 text-cm-text-tertiary" />}
        <span className={
          worker.trend === 'up' ? 'text-cm-success' : worker.trend === 'down' ? 'text-cm-error' : 'text-cm-text-tertiary'
        }>
          {worker.weeklyDelta > 0 ? '+' : ''}{worker.weeklyDelta} esta semana
        </span>
      </div>
    </motion.div>
  )
}

export default function Ranking() {
  const [activeFilter, setActiveFilter] = useState('general')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [state, setState] = useState('populated')

  const sorted = useMemo(() => {
    let result = [...WORKERS]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(w =>
        w.name.toLowerCase().includes(q) ||
        getRank(w.pts).name.toLowerCase().includes(q)
      )
    }

    if (activeFilter === 'pedidos') result.sort((a, b) => b.pedidos - a.pedidos)
    else if (activeFilter === 'limpieza') result.sort((a, b) => b.limpieza - a.limpieza)
    else if (activeFilter === 'streak') result.sort((a, b) => b.streak - a.streak)
    else result.sort((a, b) => b.pts - a.pts)

    return result
  }, [search, activeFilter])

  const podium = sorted.slice(0, 3)
  const rest = sorted.slice(3)

  const tableData = useMemo(() => {
    if (!sortKey) return rest
    return [...rest].sort((a, b) => {
      const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rest, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  if (state === 'loading') return <div className="p-4 md:p-8"><LoadingSkeleton /></div>

  if (state === 'empty') {
    return (
      <div className="p-4 md:p-8">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 text-cm-accent" />
          </div>
          <h2 className="text-lg font-semibold text-cm-text">Sin operadores</h2>
          <p className="text-sm text-cm-text-secondary mt-1">No hay operadores registrados esta temporada.</p>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="p-4 md:p-8">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-cm-error/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-cm-error" />
          </div>
          <h2 className="text-lg font-semibold text-cm-text">Error al cargar</h2>
          <p className="text-sm text-cm-text-secondary mt-1">No se pudo obtener el ranking.</p>
          <button onClick={() => setState('populated')} className="mt-6 px-5 py-2.5 bg-cm-accent text-white rounded-[--cm-radius-sm] text-sm font-medium hover:bg-cm-accent-hover transition-colors">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="ranking"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-4 md:p-8 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Competencia Semanal</p>
            <h1 className="text-xl font-semibold text-cm-text mt-0.5 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              Ranking <span className="text-cm-accent">Ayni</span>
            </h1>
            <p className="text-xs text-cm-text-secondary mt-1 max-w-lg">
              Puntos KPI calculados por pedidos, limpieza y rachas de asistencia.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-cm-text-secondary uppercase tracking-wider font-medium">Temporada</p>
            <p className="text-sm font-bold text-cm-accent mt-0.5">S3 — MAYO 2026</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <nav className="flex gap-2 flex-wrap">
          {[
            { key: 'general', label: 'KPI General', icon: Star },
            { key: 'pedidos', label: 'Pedidos', icon: Zap },
            { key: 'limpieza', label: 'Limpieza', icon: Sparkles },
            { key: 'streak', label: 'Racha', icon: Flame },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-[--cm-radius-sm] transition-all border ${
                activeFilter === f.key
                  ? 'bg-cm-accent-light text-cm-accent border-cm-accent/40'
                  : 'bg-transparent text-cm-text-secondary border-cm-border hover:text-cm-text hover:border-cm-border-hover'
              }`}
            >
              <f.icon className="w-3.5 h-3.5" /> {f.label}
            </button>
          ))}
        </nav>

        {/* Podium - Top 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {podium.map((worker, idx) => (
            <PodiumCard key={worker.id} worker={worker} idx={idx} />
          ))}
        </div>

        {/* Full Leaderboard */}
        <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-3 p-4 border-b border-cm-border">
            <h3 className="text-sm font-semibold text-cm-text flex items-center gap-2">
              <Medal className="w-4 h-4 text-cm-accent" /> Tabla Completa
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cm-text-tertiary pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-40 pl-8 pr-2.5 py-1.5 bg-cm-bg border border-cm-border rounded-[--cm-radius-sm] text-xs text-cm-text placeholder:text-cm-text-tertiary focus:outline-none focus:border-cm-accent transition-colors"
                />
              </div>
              <span className="text-[10px] text-cm-text-tertiary uppercase font-medium tracking-wider">
                {sorted.length} operador{sorted.length !== 1 ? 'es' : ''}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cm-border">
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                      className={`px-4 py-3 text-left text-xs font-medium text-cm-text-secondary uppercase tracking-wider ${
                        col.sortable ? 'cursor-pointer hover:text-cm-text select-none' : ''
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.sortable && (
                          <ArrowUpDown className={`w-3 h-3 ${sortKey === col.key ? 'text-cm-accent' : ''}`} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {tableData.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-sm text-cm-text-tertiary">
                        {search ? 'Sin resultados para esta búsqueda' : 'Sin datos'}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {sorted.map((worker, idx) => {
                        const rank = getRank(worker.pts)
                        return (
                          <motion.tr
                            key={worker.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            layout
                            className="border-b border-cm-border last:border-0 hover:bg-cm-surface-hover transition-colors"
                          >
                            <td className="px-4 py-3 text-sm font-bold text-cm-text-secondary">
                              {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `#${idx + 1}`}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{worker.avatar}</span>
                                <span className="font-medium text-cm-text text-sm">{worker.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 border rounded-[--cm-radius-sm] ${rank.color} ${rank.border} bg-cm-bg`}>
                                {rank.name}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-bold font-mono text-sm ${rank.color}`}>
                                {worker.pts.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-sm text-cm-text">{worker.pedidos}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-cm-border rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${worker.limpieza}%`,
                                      background: worker.limpieza >= 90 ? 'var(--cm-success)' : worker.limpieza >= 75 ? 'var(--cm-warning)' : 'var(--cm-error)',
                                    }}
                                  />
                                </div>
                                <span className="font-mono text-xs text-cm-text-secondary">{worker.limpieza}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-0.5 font-mono text-xs text-cm-text">
                                <Flame className="w-3 h-3 text-orange-400" /> {worker.streak}d
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`flex items-center gap-0.5 text-xs font-medium ${
                                worker.weeklyDelta > 0 ? 'text-cm-success' : worker.weeklyDelta < 0 ? 'text-cm-error' : 'text-cm-text-tertiary'
                              }`}>
                                {worker.trend === 'up' && <ChevronUp className="w-3 h-3" />}
                                {worker.trend === 'down' && <ChevronDown className="w-3 h-3" />}
                                {worker.weeklyDelta > 0 ? '+' : ''}{worker.weeklyDelta}
                              </span>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tier Legend */}
        <div className="bg-cm-surface border border-cm-border rounded-xl p-5">
          <h4 className="text-xs font-bold uppercase text-cm-text-secondary tracking-wider mb-3">
            Sistema de Rangos — Temporada S3
          </h4>
          <div className="flex flex-wrap gap-4">
            {RANK_TIERS.map(tier => (
              <div key={tier.name} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-[--cm-radius-sm] ${tier.color.replace('text-', 'bg-')}`} />
                <span className={`text-xs font-bold ${tier.color}`}>{tier.name}</span>
                <span className="text-[10px] text-cm-text-tertiary font-mono">≥{tier.minPts}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
