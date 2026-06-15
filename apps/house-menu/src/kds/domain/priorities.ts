export const PRIORITY = {
  RUSH: 'rush',
  NORMAL: 'normal',
  LOW: 'low',
} as const;

export type Priority = typeof PRIORITY[keyof typeof PRIORITY];

export const PRIORITY_CONFIG = {
  [PRIORITY.RUSH]: { label: 'Rush', color: 'text-cm-error', bg: 'bg-cm-error/10', border: 'border-cm-error/20', pulse: true, order: 0 },
  [PRIORITY.NORMAL]: { label: 'Normal', color: 'text-cm-info', bg: 'bg-cm-info/10', border: 'border-cm-info/20', pulse: false, order: 1 },
  [PRIORITY.LOW]: { label: 'Baja', color: 'text-cm-muted', bg: 'bg-cm-muted/10', border: 'border-cm-border', pulse: false, order: 2 },
} as const;

export function getPriority(order: { rush?: boolean; priority?: Priority }): Priority {
  if (order.rush) return PRIORITY.RUSH;
  return order.priority ?? PRIORITY.NORMAL;
}

export function sortByPriority<T extends { priority?: Priority; dueTime?: number }>(orders: T[]): T[] {
  return [...orders].sort((a, b) => {
    const pa = a.priority ?? PRIORITY.NORMAL;
    const pb = b.priority ?? PRIORITY.NORMAL;
    if (pa !== pb) {
      const orderA = PRIORITY_CONFIG[pa].order;
      const orderB = PRIORITY_CONFIG[pb].order;
      return orderA - orderB;
    }
    return (a.dueTime ?? 0) - (b.dueTime ?? 0);
  });
}