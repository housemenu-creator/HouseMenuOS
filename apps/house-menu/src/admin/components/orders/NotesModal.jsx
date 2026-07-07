import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X, Loader2, StickyNote } from 'lucide-react';
import { formatOrderId } from '../../../lib/format';

export default function NotesModal({ isOpen, order, onClose, onSave, saving }) {
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      const latestNote =
        Array.isArray(order.notes) && order.notes.length > 0
          ? order.notes[order.notes.length - 1].text
          : '';
      setNoteText(latestNote || order.internalNote || '');
    }
  }, [isOpen, order]);

  return (
    <AnimatePresence>
      {isOpen && order && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-cm-surface rounded-xl shadow-cm-lg w-full max-w-md mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-cm-border flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-cm-info" />
              <div>
                <h3 className="text-lg font-bold text-cm-text">Nota interna</h3>
                <p className="text-xs text-cm-text-secondary">{formatOrderId(order.id)} — {order.customerName || 'Anonimo'}</p>
              </div>
            </div>
            <div className="p-6">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={4}
                className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:border-cm-accent resize-none"
                placeholder="Nota visible solo para administradores..."
              />
            </div>
            <div className="px-6 py-4 border-t border-cm-border flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => onSave(noteText)}
                disabled={saving}
                className="flex-1 py-2.5 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
