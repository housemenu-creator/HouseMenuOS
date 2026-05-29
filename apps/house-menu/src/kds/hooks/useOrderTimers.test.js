import { renderHook, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { useOrderTimers } from './useOrderTimers';

afterEach(() => {
  cleanup();
});

describe('useOrderTimers', () => {
  it('should calculate elapsed from createdAt', () => {
    const now = Date.now();
    const fiveMinAgo = new Date(now - 300000).toISOString();
    const orders = [{ id: '1', status: 'recibido', createdAt: fiveMinAgo }];
    const { result } = renderHook(() => useOrderTimers(orders));

    const elapsed = result.current.getElapsed('1');
    expect(elapsed).toBeGreaterThanOrEqual(290000);
    expect(elapsed).toBeLessThanOrEqual(310000);
  });

  it('should calculate elapsed from current status timestamp', () => {
    const now = Date.now();
    const createdAt = new Date(now - 600000).toISOString();
    const preparandoAt = new Date(now - 120000).toISOString();
    const orders = [{
      id: '1',
      status: 'preparando',
      createdAt,
      statusTimestamps: { preparando: preparandoAt },
    }];
    const { result } = renderHook(() => useOrderTimers(orders));

    const elapsed = result.current.getElapsed('1');
    expect(elapsed).toBeGreaterThanOrEqual(110000);
    expect(elapsed).toBeLessThanOrEqual(130000);
  });

  it('should handle NaN timestamps gracefully', () => {
    const orders = [{ id: '1', status: 'recibido', createdAt: '' }];
    const { result } = renderHook(() => useOrderTimers(orders));
    expect(result.current.getElapsed('1')).toBe(0);
  });

  it('should use createdAt when statusTimestamp is missing', () => {
    const now = Date.now();
    const createdAt = new Date(now - 60000).toISOString();
    const orders = [{ id: '1', status: 'preparando', createdAt, statusTimestamps: {} }];
    const { result } = renderHook(() => useOrderTimers(orders));

    const elapsed = result.current.getElapsed('1');
    expect(elapsed).toBeGreaterThanOrEqual(55000);
    expect(elapsed).toBeLessThanOrEqual(65000);
  });
});
