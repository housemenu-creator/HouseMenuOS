import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

function Modal({ open, onClose, title, children, className, ...props }) {
  const contentRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={cn(
              'relative bg-[var(--cm-surface)] rounded-[var(--cm-radius-xl)] w-full max-w-md overflow-hidden shadow-[var(--cm-shadow-lg)] border border-[var(--cm-border)]',
              className
            )}
            {...props}
          >
            {title && (
              <div className="flex items-center justify-between p-6 border-b border-[var(--cm-border)]">
                <h2 className="text-lg font-bold text-[var(--cm-text)]">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-[var(--cm-radius-sm)] hover:bg-[var(--cm-accent-light)] text-[var(--cm-text-secondary)] hover:text-[var(--cm-accent)] transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default Modal
