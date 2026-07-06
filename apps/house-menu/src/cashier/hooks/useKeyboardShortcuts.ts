// useKeyboardShortcuts — Global keyboard navigation for cashier ordering mode
// Scoped: only active when `enabled=true` and no input field is focused

import { useEffect } from 'react';

interface ShortcutMap {
  onNewOrder?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onQuickPay?: () => void;
  onProduct?: (index: number) => void; // 1-9
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
}

export function useKeyboardShortcuts(
  enabled: boolean,
  shortcuts: ShortcutMap
) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case 'n':
        case 'N':
          e.preventDefault();
          shortcuts.onNewOrder?.();
          break;
        case 'Enter':
          e.preventDefault();
          shortcuts.onConfirm?.();
          break;
        case 'Escape':
          e.preventDefault();
          shortcuts.onCancel?.();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          shortcuts.onQuickPay?.();
          break;
        case '1': case '2': case '3':
        case '4': case '5': case '6':
        case '7': case '8': case '9':
          e.preventDefault();
          shortcuts.onProduct?.(parseInt(e.key) - 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          shortcuts.onArrowUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          shortcuts.onArrowDown?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          shortcuts.onArrowLeft?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          shortcuts.onArrowRight?.();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, shortcuts]);
}
