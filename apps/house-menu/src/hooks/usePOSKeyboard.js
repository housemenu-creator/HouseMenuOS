import { useEffect, useCallback } from 'react';
import { playKeyClick } from '../lib/posSound';

/**
 * usePOSKeyboard — Atajos de teclado para el módulo de caja POS.
 *
 * bindings: { [key: string]: () => void }
 *   - Las funciones se ejecutan al presionar la tecla
 *   - Teclas comunes: F1, F2, F3, F4, Escape, Digit1, Digit2, Digit3, etc.
 *
 * enable: si false, desactiva los shortcuts (útil cuando hay modales abiertos).
 */
export function usePOSKeyboard(bindings, { enabled = true, deps = [] } = {}) {
  const handler = useCallback((e) => {
    if (!enabled) return;

    // Ignorar si el usuario está escribiendo en un input (excepto F-keys y Escape)
    const tag = document.activeElement?.tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    const isFKey = e.key.startsWith('F') && e.key.length <= 3;
    const isEscape = e.key === 'Escape';
    const isDigit = e.key.startsWith('Digit');

    // Siempre permitir Escape y F-keys
    if (isInput && !isFKey && !isEscape && !isDigit) return;

    const fn = bindings[e.key] || bindings[e.code];
    if (fn) {
      e.preventDefault();
      e.stopPropagation();
      playKeyClick();
      fn();
    }
  }, [enabled, ...deps]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler, enabled]);
}
