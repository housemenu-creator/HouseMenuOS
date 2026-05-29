import { useState, useCallback, useRef, useEffect } from 'react';
import { ordersService } from '../../lib/ordersService';

const MAX_HISTORY = 10;
const UNDO_TTL = 8000;

export default function useUndoStack() {
  const [history, setHistory] = useState([]);
  const historyRef = useRef(history);
  const expireTimerRef = useRef(null);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const scheduleExpiry = useCallback(() => {
    clearTimeout(expireTimerRef.current);
    expireTimerRef.current = setTimeout(() => {
      setHistory([]);
    }, UNDO_TTL);
  }, []);

  const push = useCallback((orderId, from, to) => {
    setHistory((prev) => {
      const next = [{ orderId, from, to, ts: Date.now() }, ...prev].slice(0, MAX_HISTORY);
      return next;
    });
    scheduleExpiry();
  }, [scheduleExpiry]);

  const undo = useCallback(async (branchId) => {
    const current = historyRef.current;
    const last = current[0];
    if (!last) return null;
    const result = await ordersService.updateOrderStatus(branchId, last.orderId, last.from);
    if (result.success) {
      setHistory((prev) => prev.slice(1));
      return last;
    }
    return null;
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    clearTimeout(expireTimerRef.current);
  }, []);

  return { history, push, undo, clearHistory, canUndo: history.length > 0 };
}
