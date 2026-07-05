import type { DisplayMode } from './types';

export const CASHIER = {
  MAX_SPLIT_DINERS: 6,
  ANIMATION_MS: 150,
  CLOCK_INTERVAL_MS: 1000,
  DISPLAY_LABELS: {
    total: 'TOTAL' as const,
    payment: 'VUELTO' as const,
    closed: 'CAJA CERRADA' as const,
    idle: 'LISTO' as const,
  } satisfies Record<DisplayMode, string>,
} as const;
