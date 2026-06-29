import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, StickyNote, Loader2 } from 'lucide-react';
import { saveOrderNote } from '../commService';

export default function OrderNoteModal({ order, isOpen, onClose, onSave }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) setText('');
  }, [isOpen]);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    // Note: userId/userName injected by caller via onSave, or we use fallback
    const result = await saveOrderNote(order.id, text.trim(), 'staff', 'Staff');
    setSaving(false);
    if (result.success) {
      onSave?.(order.id, text.trim());
      onClose();
    }
  };

  const handleClose = () => {
    if (!saving) onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  const charCount = text.length;
  const maxChars = 200;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-cm-bg rounded-2xl border border-cm-border shadow-cm-lg overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-cm-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cm-warning/10 border border-cm-warning/20 flex items-center justify-center">
                  <StickyNote className="w-4 h-4 text-cm-warning" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-cm-text">Nota para pedido</h3>
                  <p className="text-[10px] text-cm-text-secondary font-medium">
                    #{order?.id?.slice(-6).toUpperCase()} — {order?.customerName || 'Cliente'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={saving}
                className="p-1.5 hover:bg-cm-surface rounded-lg transition-colors text-cm-text-secondary disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, maxChars))}
                onKeyDown={handleKeyDown}
                placeholder="Ej: Cliente alérgico al maní. Sin cebolla. Necesita Cambio de bebida."
                rows={4}
                className="w-full bg-cm-bg-alt border border-cm-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cm-warning text-cm-text placeholder:text-cm-text-tertiary resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-cm-text-tertiary">
                  Ctrl+Enter para guardar
                </span>
                <span className={`text-[10px] ${charCount > maxChars * 0.9 ? 'text-cm-warning' : 'text-cm-text-tertiary'}`}>
                  {charCount}/{maxChars}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-cm-border bg-cm-surface/50">
              <button
                onClick={handleClose}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-cm-border text-xs font-bold text-cm-text-secondary hover:bg-cm-surface transition-all disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!text.trim() || saving}
                className="flex-1 py-2.5 rounded-xl bg-cm-warning text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cm-warning/90 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <StickyNote className="w-3.5 h-3.5" />
                )}
                Guardar nota
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}