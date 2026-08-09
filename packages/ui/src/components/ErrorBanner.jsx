import { motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * Dismissible error banner with icon and close button.
 * Uses --cm-error tokens.
 */
export default function ErrorBanner({ message, onClose, className }) {
  if (!message) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        'flex items-center gap-2 text-sm text-[var(--cm-error)] bg-[var(--cm-error-soft)] rounded-[var(--cm-radius-md)] px-4 py-2.5',
        className
      )}
    >
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="p-0.5 hover:opacity-70 transition-opacity" aria-label="Cerrar">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  )
}
