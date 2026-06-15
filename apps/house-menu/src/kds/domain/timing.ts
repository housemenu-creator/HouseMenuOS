import type { KitchenStation } from './stations';
import { getPrepTime } from './stations';

export const THRESHOLDS = {
  warning: 8 * 60 * 1000,
  critical: 12 * 60 * 1000,
} as const;

export type AlertLevel = 'safe' | 'warning' | 'critical';

export function calcElapsed(order: { statusTimestamps?: Record<string, string>; createdAt?: string; status?: string }, now: number): number {
  const ts = order.statusTimestamps?.[order.status || ''] || order.createdAt;
  if (!ts) return 0;
  return now - new Date(ts).getTime();
}

export function calcDueTime(order: { createdAt?: string; station?: KitchenStation }, prepTime?: number): number {
  const createdAt = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
  const prep = prepTime ?? (order.station ? getPrepTime(order.station) * 60 * 1000 : 5 * 60 * 1000);
  return createdAt + prep;
}

export function getAlertLevel(elapsedMs: number): AlertLevel {
  if (elapsedMs >= THRESHOLDS.critical) return 'critical';
  if (elapsedMs >= THRESHOLDS.warning) return 'warning';
  return 'safe';
}