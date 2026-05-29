import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, X, Info } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: { bg: 'bg-cm-success/10', border: 'border-cm-success/30', icon: 'text-cm-success' },
  error: { bg: 'bg-cm-error/10', border: 'border-cm-error/30', icon: 'text-cm-error' },
  warning: { bg: 'bg-cm-warning/10', border: 'border-cm-warning/30', icon: 'text-cm-warning' },
  info: { bg: 'bg-cm-info/10', border: 'border-cm-info/30', icon: 'text-cm-info' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => {
            const Icon = ICONS[t.type] || Info;
            const c = COLORS[t.type] || COLORS.info;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className={`pointer-events-auto flex items-start gap-3 ${c.bg} border-2 ${c.border} rounded-xl px-4 py-3 shadow-cm-lg backdrop-blur-xl`}
              >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${c.icon}`} />
                <p className="flex-1 text-sm font-semibold text-cm-text">{t.message}</p>
                <button onClick={() => dismissToast(t.id)} className="text-cm-text-tertiary hover:text-cm-text transition-colors p-0.5">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
