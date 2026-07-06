// Cashier Module — Offline Queue Hook
// Queues Firebase operations when offline, replays in FIFO order on reconnect

import { useState, useEffect, useCallback, useRef } from 'react';

export interface QueuedOperation {
  id: string;
  name: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

interface OfflineQueueConfig {
  /** Maximum retry attempts per operation (default: 3) */
  maxRetries?: number;
  /** Called when an operation succeeds during replay */
  onOperationSuccess?: (id: string, result: unknown) => void;
  /** Called when an operation fails after all retries */
  onOperationFailed?: (id: string, error: Error) => void;
  /** Called when all queued operations have been replayed */
  onQueueDrained?: () => void;
}

export function useOfflineQueue(config: OfflineQueueConfig = {}) {
  const { maxRetries = 3, onOperationSuccess, onOperationFailed, onQueueDrained } = config;

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queue, setQueue] = useState<QueuedOperation[]>([]);
  const [processing, setProcessing] = useState(false);

  // All mutable state lives in refs to avoid stale closures
  const storeRef = useRef<Map<string, () => Promise<unknown>>>(new Map());
  const failedRef = useRef<Set<string>>(new Set());
  const processingRef = useRef(false);
  const idCounter = useRef(0);
  const callbacksRef = useRef({ onOperationSuccess, onOperationFailed, onQueueDrained, maxRetries });
  callbacksRef.current = { onOperationSuccess, onOperationFailed, onQueueDrained, maxRetries };

  // Track online/offline
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Auto-flush when coming back online or after enqueue
  useEffect(() => {
    if (isOnline && queue.length > 0 && !processingRef.current && !queue.every(op => op.status === 'completed' || op.status === 'failed')) {
      flushFromEffect();
    }
  }, [isOnline, queue]);

  const enqueue = useCallback((name: string, execute: () => Promise<unknown>): string => {
    const id = `op-${++idCounter.current}-${Date.now()}`;
    storeRef.current.set(id, execute);
    setQueue(prev => [...prev, { id, name, timestamp: Date.now(), status: 'pending' }]);
    return id;
  }, []);

  // Separated so it can be called from both effect and explicit flush()
  const flushFromEffect = useCallback(() => {
    // This runs synchronously to start the async flush
    // The actual processing continues in the background
    performFlush();
  }, []);

  const performFlush = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);

    const store = storeRef.current;
    const cb = callbacksRef.current;
    const ids = Array.from(store.keys());

    for (const id of ids) {
      const executeFn = store.get(id);
      if (!executeFn) continue;

      // Try up to maxRetries + 1 times
      for (let attempt = 0; attempt <= cb.maxRetries; attempt++) {
        setQueue(prev => prev.map(op => (op.id === id ? { ...op, status: 'processing' as const } : op)));

        try {
          const result = await executeFn();
          store.delete(id);
          setQueue(prev => prev.map(op => (op.id === id ? { ...op, status: 'completed' as const } : op)));
          cb.onOperationSuccess?.(id, result);
          break; // success, move to next operation
        } catch (err) {
          if (attempt < cb.maxRetries) {
            // Still has retries left, try again
            continue;
          }
          // Last attempt failed — mark as failed
          const error = err instanceof Error ? err : new Error(String(err));
          store.delete(id);
          failedRef.current.add(id);
          setQueue(prev => prev.map(op => (op.id === id ? { ...op, status: 'failed' as const, error: error.message } : op)));
          cb.onOperationFailed?.(id, error);
        }
      }
    }

    // Check if fully drained
    const hasFailed = failedRef.current.size > 0;
    if (store.size === 0) {
      if (!hasFailed) {
        setQueue([]);
        cb.onQueueDrained?.();
      }
      failedRef.current.clear();
    }

    processingRef.current = false;
    setProcessing(false);
  };

  const flush = useCallback(() => {
    flushFromEffect();
  }, [flushFromEffect]);

  const clear = useCallback(() => {
    storeRef.current.clear();
    failedRef.current.clear();
    setQueue([]);
  }, []);

  const pendingCount = queue.filter(op => op.status === 'pending').length;
  const failedCount = queue.filter(op => op.status === 'failed').length;

  return { isOnline, queue, processing, pendingCount, failedCount, enqueue, flush, clear };
}
