import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';

describe('useOfflineQueue', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with empty queue and online status', () => {
    const { result } = renderHook(() => useOfflineQueue());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.queue).toHaveLength(0);
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.processing).toBe(false);
  });

  it('detects offline status', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });
    const { result } = renderHook(() => useOfflineQueue());
    expect(result.current.isOnline).toBe(false);
  });

  it('enqueues an operation when offline stays pending', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });
    const { result } = renderHook(() => useOfflineQueue());
    act(() => {
      result.current.enqueue('test-op', vi.fn().mockResolvedValue('ok'));
    });
    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0].status).toBe('pending');
    expect(result.current.pendingCount).toBe(1);
  });

  it('processes queued operation when online', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useOfflineQueue());

    await act(async () => {
      result.current.enqueue('test-op', fn);
    });

    await waitFor(() => {
      expect(result.current.queue).toHaveLength(0);
      expect(result.current.pendingCount).toBe(0);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('keeps operations queued when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });
    const fn = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      result.current.enqueue('offline-op', fn);
    });

    expect(result.current.queue).toHaveLength(1);
    expect(fn).not.toHaveBeenCalled();
  });

  it('flushes queued operations when coming back online', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });
    const fn = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      result.current.enqueue('op', fn);
    });
    expect(result.current.queue).toHaveLength(1);

    // Come online
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current.queue).toHaveLength(0);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries failed operations up to maxRetries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('DB error'));
    const onOperationFailed = vi.fn();
    const { result } = renderHook(() => useOfflineQueue({ maxRetries: 2, onOperationFailed }));

    await act(async () => {
      result.current.enqueue('failing-op', fn);
    });

    await waitFor(() => {
      expect(result.current.failedCount).toBe(1);
    });
    // Should be called maxRetries + 1 times
    expect(fn.mock.calls.length).toBe(3);
    expect(onOperationFailed).toHaveBeenCalled();
    // First arg is operation id, second is the error
    expect(onOperationFailed.mock.calls[0][1]?.message).toBe('DB error');
  });

  it('calls onOperationSuccess when operation succeeds', async () => {
    const onOperationSuccess = vi.fn();
    const { result } = renderHook(() => useOfflineQueue({ onOperationSuccess }));

    await act(async () => {
      result.current.enqueue('ok-op', vi.fn().mockResolvedValue('done'));
    });

    await waitFor(() => {
      expect(onOperationSuccess).toHaveBeenCalled();
      // First arg is the operation id (auto-generated), second is the result
      expect(onOperationSuccess.mock.calls[0][1]).toBe('done');
    });
  });

  it('calls onQueueDrained after all operations processed', async () => {
    const onQueueDrained = vi.fn();
    const { result } = renderHook(() => useOfflineQueue({ onQueueDrained }));

    await act(async () => {
      result.current.enqueue('op1', vi.fn().mockResolvedValue('ok'));
      result.current.enqueue('op2', vi.fn().mockResolvedValue('ok'));
    });

    await waitFor(() => {
      expect(onQueueDrained).toHaveBeenCalled();
    });
  });

  it('clears queue on clear()', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });
    const { result } = renderHook(() => useOfflineQueue());
    act(() => {
      result.current.enqueue('op', vi.fn());
    });
    expect(result.current.queue).toHaveLength(1);

    act(() => {
      result.current.clear();
    });
    expect(result.current.queue).toHaveLength(0);
    expect(result.current.pendingCount).toBe(0);
  });

  it('provides unique IDs for each enqueued operation', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });
    const { result } = renderHook(() => useOfflineQueue());
    let id1: string, id2: string;
    act(() => {
      id1 = result.current.enqueue('op1', vi.fn());
      id2 = result.current.enqueue('op2', vi.fn());
    });
    expect(id1!).not.toBe(id2!);
  });
});
