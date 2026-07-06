import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const SHEET_HEIGHT = '92%';
const DESKTOP_PANEL_WIDTH = 600;

export default function ProductSheet({ open, onClose, product, children }) {
  const [dragY, setDragY] = useState(0);

  const handleDragEnd = (_, info) => {
    const threshold = 120;
    if (info.offset.y > threshold || info.velocity.y > 400) {
      onClose();
    }
    setDragY(0);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[55] bg-black/70"
          />

          {/* Mobile — Bottom Sheet */}
          <motion.div
            key="sheet-mobile"
            initial={{ y: '100%' }}
            animate={{ y: dragY }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDrag={(_, info) => setDragY(Math.max(0, info.offset.y))}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-[60] flex flex-col bg-cm-bg rounded-t-3xl shadow-cm-xl border border-cm-border/40 border-b-0 overflow-hidden
              lg:hidden"
            style={{ height: SHEET_HEIGHT }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-cm-border/50" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-cm-border/30 shrink-0">
              <button
                onClick={onClose}
                className="p-1.5 -ml-1.5 hover:bg-cm-accent/10 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-cm-text" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-cm-text truncate">
                  {product?.name}
                </h2>
              </div>
              <div className="text-[10px] font-bold text-cm-accent bg-cm-accent/10 px-2.5 py-1 rounded-full border border-cm-accent/20 shrink-0">
                S/ {(product?.base_price ?? product?.price ?? 0).toFixed(2)}
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-4">
              <div className="max-w-2xl mx-auto">
                {children}
              </div>
            </div>
          </motion.div>

          {/* Desktop — Side Panel from right */}
          <motion.div
            key="sheet-desktop"
            initial={{ x: DESKTOP_PANEL_WIDTH }}
            animate={{ x: 0 }}
            exit={{ x: DESKTOP_PANEL_WIDTH }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed top-0 right-0 z-[60] h-full flex flex-col bg-cm-bg border-l border-cm-border/40 shadow-cm-xl
              hidden lg:flex"
            style={{ width: DESKTOP_PANEL_WIDTH }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-cm-border/30 shrink-0">
              <button
                onClick={onClose}
                className="p-1.5 -ml-1.5 hover:bg-cm-accent/10 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-cm-text" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-cm-text truncate">
                  {product?.name}
                </h2>
              </div>
              <div className="text-[10px] font-bold text-cm-accent bg-cm-accent/10 px-2.5 py-1 rounded-full border border-cm-accent/20 shrink-0">
                S/ {(product?.base_price ?? product?.price ?? 0).toFixed(2)}
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 pt-5 pb-6">
              <div className="max-w-2xl mx-auto">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
