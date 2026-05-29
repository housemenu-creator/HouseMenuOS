import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export default function BulkConfirmModal({ bulkConfirm, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {bulkConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-cm-surface rounded-2xl border border-cm-border shadow-cm-lg p-6 max-w-sm w-full mx-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cm-warning/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-cm-warning" />
              </div>
              <div>
                <h3 className="text-cm-text font-bold text-sm">Confirmar acción masiva</h3>
                <p className="text-cm-muted/50 text-xs mt-0.5">
                  {bulkConfirm.count} orden{bulkConfirm.count !== 1 ? 'es' : ''} seleccionada{bulkConfirm.count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <p className="text-cm-muted/60 text-sm mb-6">
              {bulkConfirm.targetStatus === 'rush' ? (
                <>¿Marcar {bulkConfirm.count} pedido{bulkConfirm.count !== 1 ? 's' : ''} como <strong>Prioridad Rush</strong>?</>
              ) : (
                <>¿Estás seguro de mover {bulkConfirm.count} pedido{bulkConfirm.count !== 1 ? 's' : ''} a &quot;
                {bulkConfirm.targetStatus === 'preparando' ? 'Preparando' : 'Listos'}&quot;?</>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-cm-muted/10 text-cm-muted/70 hover:bg-cm-muted/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-cm-accent text-white hover:bg-cm-accent-hover transition-colors"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
