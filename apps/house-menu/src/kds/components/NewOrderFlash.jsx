import { motion, AnimatePresence } from 'framer-motion';
import { BellRing } from 'lucide-react';

export default function NewOrderFlash({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-cm-accent text-white px-6 py-3 rounded-2xl shadow-2xl border border-cm-border font-bold text-sm tracking-wide"
        >
          <BellRing className="w-5 h-5 animate-bounce" />
          ¡NUEVO PEDIDO ENTRANTE!
          <BellRing className="w-5 h-5 animate-bounce" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
