import { motion, AnimatePresence } from 'framer-motion';

const EMOJI_GROUPS = [
  {
    label: 'Carnes',
    items: ['🥩', '🍗', '🍖', '🥓', '🍔', '🌭', '🥟'],
  },
  {
    label: 'Aves & Pescado',
    items: ['🐔', '🐟', '🦐', '🦑', '🐙', '🦀', '🐠', '🦞'],
  },
  {
    label: 'Vegetales',
    items: ['🥗', '🥬', '🥒', '🌽', '🥕', '🧅', '🫑', '🥦', '🍄'],
  },
  {
    label: 'Frutas',
    items: ['🥑', '🍋', '🍅', '🥭', '🍍', '🥝', '🍓', '🍌', '🍊'],
  },
  {
    label: 'Bebidas',
    items: ['🥤', '🧃', '☕', '🍵', '🥛', '🧉', '🍺', '🍷', '🧊'],
  },
  {
    label: 'Panes & Lácteos',
    items: ['🧀', '🥖', '🥐', '🧈', '🥚', '🧇', '🥞', '🫓'],
  },
  {
    label: 'Extras',
    items: ['🍚', '🍟', '🌮', '🥟', '🍜', '🍝', '🫘', '🧂', '🌶️'],
  },
];

export default function EmojiPicker({ open, onSelect, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8 }}
            transition={{ duration: 0.12 }}
            className="absolute z-[61] top-full mt-1 right-0 bg-cm-surface rounded-xl border-2 border-cm-border shadow-xl p-3 w-[280px]"
          >
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label} className="mb-2 last:mb-0">
                <p className="text-[9px] font-black text-cm-muted uppercase tracking-wider mb-1.5">{group.label}</p>
                <div className="flex flex-wrap gap-1">
                  {group.items.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => { onSelect(emoji); onClose(); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 hover:ring-2 hover:ring-indigo-300 transition-all text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
