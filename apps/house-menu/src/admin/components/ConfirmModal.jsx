import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function PromptModal({ open, title, label, initialValue = '', placeholder, onConfirm, onCancel }) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initialValue]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') onConfirm?.(value);
    if (e.key === 'Escape') onCancel?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-cm-surface rounded-2xl shadow-2xl border border-cm-border w-[360px] overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-cm-border">
              <h3 className="text-sm font-black text-cm-text uppercase tracking-wider">{title}</h3>
              <button onClick={onCancel} className="p-1 text-cm-muted hover:text-cm-text rounded-lg hover:bg-cm-bg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              {label && <p className="text-xs font-bold text-cm-muted mb-2">{label}</p>}
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-cm-border bg-cm-bg text-sm font-bold text-cm-text focus:border-cm-accent focus:outline-none transition-colors placeholder:text-cm-muted"
              />
              <div className="flex items-center gap-2 mt-4">
                <button onClick={onCancel}
                  className="flex-1 py-2.5 rounded-xl border-2 border-cm-border text-sm font-black text-cm-muted hover:bg-cm-bg transition-all">
                  Cancelar
                </button>
                <button onClick={() => onConfirm?.(value)}
                  className="flex-1 py-2.5 rounded-xl bg-cm-accent text-white text-sm font-black hover:bg-cm-accent-hover transition-all shadow-cm-md">
                  Confirmar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmModal({ open, title, message, confirmLabel = 'Eliminar', onConfirm, onCancel, danger = true }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-cm-surface rounded-2xl shadow-2xl border border-cm-border w-[360px] overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-cm-border">
              <h3 className="text-sm font-black text-cm-text uppercase tracking-wider">{title}</h3>
              <button onClick={onCancel} className="p-1 text-cm-muted hover:text-cm-text rounded-lg hover:bg-cm-bg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-cm-muted font-medium">{message}</p>
              <div className="flex items-center gap-2 mt-4">
                <button onClick={onCancel}
                  className="flex-1 py-2.5 rounded-xl border-2 border-cm-border text-sm font-black text-cm-muted hover:bg-cm-bg transition-all">
                  Cancelar
                </button>
                <button onClick={onConfirm}
                  className={`flex-1 py-2.5 rounded-xl text-white text-sm font-black transition-all shadow-cm-md ${
                    danger ? 'bg-cm-error hover:bg-cm-error/80' : 'bg-cm-accent hover:bg-cm-accent-hover'
                  }`}>
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
