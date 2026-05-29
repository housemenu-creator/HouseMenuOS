import { useState, useEffect, useCallback, useRef } from 'react';

function getOrderTimestamp(order) {
  const sts = order.statusTimestamps;
  if (sts) {
    const ts = sts[order.status];
    if (ts) {
      const parsed = new Date(ts).getTime();
      if (!isNaN(parsed)) return parsed;
    }
  }
  return new Date(order.createdAt).getTime();
}

function calcTimers(orders) {
  const now = Date.now();
  const result = {};
  for (const order of orders) {
    const ts = getOrderTimestamp(order);
    result[order.id] = isNaN(ts) ? 0 : now - ts;
  }
  return result;
}

export function useOrderTimers(orders) {
  const [elapsed, setElapsed] = useState({});
  const prevOrdersRef = useRef(orders);

  useEffect(() => {
    prevOrdersRef.current = orders;
    setElapsed(calcTimers(orders));
    const id = setInterval(() => {
      setElapsed(calcTimers(prevOrdersRef.current));
    }, 1000);
    return () => clearInterval(id);
  }, [orders]);

  const getElapsed = useCallback((orderId) => elapsed[orderId] ?? 0, [elapsed]);

  return { getElapsed };
}
