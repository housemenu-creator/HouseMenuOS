import { useState, useCallback } from 'react';

interface UseKeyboardNavProps {
  orderIds: string[];
  enabled?: boolean;
  onStatusChange?: (orderId: string, status: string) => void;
  onExpand?: (orderId: string | null) => void;
  expandedId?: string | null;
}

interface UseKeyboardNavReturn {
  highlightedIndex: number;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName || '';
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

const STATUS_KEYS: Record<string, string> = {
  '1': 'recibido',
  '2': 'preparando',
  '3': 'listo',
  '4': 'en_camino',
  '5': 'entregado',
};

export default function useKeyboardNav({
  orderIds,
  enabled = true,
  onStatusChange,
  onExpand,
  expandedId,
}: UseKeyboardNavProps): UseKeyboardNavReturn {
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled || isInputFocused()) return;

      const maxIndex = orderIds.length - 1;
      if (maxIndex < 0) return;

      switch (e.key) {
        case 'j':
        case 'ArrowDown': {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
          break;
        }
        case 'k':
        case 'ArrowUp': {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (!onExpand) break;
          const id = orderIds[highlightedIndex];
          onExpand(expandedId === id ? null : id);
          break;
        }
        case 'Escape': {
          e.preventDefault();
          if (expandedId) {
            onExpand?.(null);
          }
          break;
        }
        default: {
          if (e.key >= '1' && e.key <= '5' && onStatusChange) {
            const status = STATUS_KEYS[e.key];
            if (status) {
              e.preventDefault();
              const id = orderIds[highlightedIndex];
              if (id) {
                onStatusChange(id, status);
              }
            }
          }
        }
      }
    },
    [enabled, orderIds, highlightedIndex, expandedId, onExpand, onStatusChange],
  );

  return { highlightedIndex, handleKeyDown };
}
