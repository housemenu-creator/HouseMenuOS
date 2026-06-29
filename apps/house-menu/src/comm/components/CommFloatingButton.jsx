/**
 * CommFloatingButton — Floating action button to open the comm panel
 *
 * Features:
 * - Fixed position in bottom-right corner
 * - Unread count badge
 * - Opens CommPanel on click
 * - Dark mode friendly
 */
import { MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommStore } from '../store/commStore';

export function CommFloatingButton({ unreadCount = 0 }) {
  const { togglePanel, isPanelOpen } = useCommStore();

  // Don't show if panel is already open
  if (isPanelOpen) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="fixed bottom-20 left-4 md:bottom-6 md:left-6 z-40"
    >
      <button
        onClick={togglePanel}
        className="relative flex items-center justify-center w-14 h-14 rounded-full
                   bg-cm-accent hover:bg-cm-accent-hover
                   shadow-cm-md hover:shadow-cm-lg
                   transition-all duration-200
                   active:scale-95"
        aria-label="Open communication panel"
      >
        <MessageCircle className="w-6 h-6 text-white" />

        {/* Unread count badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 flex items-center justify-center
                         min-w-5 h-5 px-1.5 rounded-full
                         bg-cm-error text-white text-xs font-bold
                         border-2 border-cm-bg"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  );
}

export default CommFloatingButton;