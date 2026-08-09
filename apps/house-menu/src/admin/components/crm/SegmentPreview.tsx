import { motion, AnimatePresence } from 'framer-motion';
import { Users, AlertTriangle, RefreshCw } from 'lucide-react';

export default function SegmentPreview({
  count = 0,
  customers = [],
  loading = false,
  error = null,
  onRetry = null,
}) {
  // ── Loading ──
  if (loading) {
    return (
      <div className="rounded-xl border border-cm-border bg-cm-surface p-4 shadow-cm-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-cm-accent" />
          <h4 className="text-xs font-bold uppercase tracking-widest text-cm-text-secondary">Vista previa</h4>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-cm-border" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-32 rounded bg-cm-border" />
                <div className="h-2.5 w-20 rounded bg-cm-border" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="rounded-xl border border-cm-border bg-cm-surface p-4 shadow-cm-sm">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <AlertTriangle className="h-8 w-8 text-cm-error" />
          <p className="text-xs text-cm-text-secondary">{error}</p>
          {onRetry && (
            <button onClick={onRetry} className="flex items-center gap-1.5 rounded-lg bg-cm-accent px-3 py-1.5 text-[10px] font-bold text-white">
              <RefreshCw className="h-3 w-3" /> Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Empty (no filters applied) ──
  if (count === 0 && !customers.length) {
    return (
      <div className="rounded-xl border border-cm-border bg-cm-surface p-4 shadow-cm-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-cm-accent" />
          <h4 className="text-xs font-bold uppercase tracking-widest text-cm-text-secondary">Vista previa</h4>
        </div>
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Users className="h-8 w-8 text-cm-text-tertiary" />
          <p className="text-xs text-cm-text-secondary">Ajustá los filtros para ver una vista previa del segmento</p>
        </div>
      </div>
    );
  }

  // ── Populated ──
  return (
    <div className="rounded-xl border border-cm-border bg-cm-surface p-4 shadow-cm-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-cm-accent" />
          <h4 className="text-xs font-bold uppercase tracking-widest text-cm-text-secondary">Vista previa</h4>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-cm-accent/10 px-2.5 py-0.5 text-[10px] font-bold text-cm-accent">
          {count} cliente{count !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
        <AnimatePresence>
          {customers.slice(0, 20).map((customer, idx) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-cm-accent/5"
            >
              {/* Avatar */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cm-accent/10 text-[11px] font-bold text-cm-accent">
                {(customer.name || '?')[0].toUpperCase()}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-cm-text">{customer.name || 'Sin nombre'}</p>
                <p className="truncate text-[10px] text-cm-text-secondary">
                  {(customer.orderCount ?? 0)} pedidos · S/ {(customer.totalSpent ?? 0).toFixed(2)}
                  {customer.tier && <span className="ml-1.5 uppercase text-cm-accent">· {customer.tier}</span>}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {count > 20 && (
          <p className="pt-2 text-center text-[10px] text-cm-text-tertiary">
            Mostrando 20 de {count} clientes
          </p>
        )}
      </div>
    </div>
  );
}
