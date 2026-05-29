import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

let globalConfirmRef = null;

export function confirmDialog(message, title = 'Confirmar') {
  return new Promise((resolve) => {
    if (globalConfirmRef) {
      globalConfirmRef({ message, title, resolve });
    } else {
      resolve(window.confirm(message));
    }
  });
}

export default function ConfirmDialog() {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  globalConfirmRef = useCallback(({ message, title, resolve }) => {
    setState({ message, title });
    resolveRef.current = resolve;
  }, []);

  const handleConfirm = () => {
    resolveRef.current?.(true);
    setState(null);
  };

  const handleCancel = () => {
    resolveRef.current?.(false);
    setState(null);
  };

  return (
    <AnimatePresence>
      {state && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={handleCancel}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95 }}
            className="bg-cm-surface rounded-2xl shadow-cm-lg p-6 w-full max-w-sm border border-cm-border"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-cm-warning/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-cm-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-cm-text">{state.title}</h3>
                <p className="text-sm text-cm-text-secondary mt-1">{state.message}</p>
              </div>
              <button onClick={handleCancel} className="text-cm-text-tertiary hover:text-cm-text p-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCancel} className="flex-1 py-2.5 border-2 border-cm-border text-sm font-bold text-cm-text rounded-xl hover:bg-cm-bg-alt transition-colors">
                Cancelar
              </button>
              <button onClick={handleConfirm} className="flex-1 py-2.5 bg-cm-accent text-white text-sm font-black rounded-xl hover:bg-cm-accent/80 transition-colors">
                Confirmar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
