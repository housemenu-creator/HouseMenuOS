import { useEffect, useState } from "react";
import { realtimeDB } from "@house/db";
import { ref, onValue, off } from "firebase/database";
import type { Order } from "../types";

const BRANCH = import.meta.env.VITE_HUB_BRANCH || "default";

export function useOrders(status?: string): { orders: Order[]; loading: boolean } {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = ref(realtimeDB, `branches/${BRANCH}/orders`);
    const unsub = onValue(r, (snap) => {
      const val = snap.val();
      if (!val) { 
        setOrders([]); 
        setLoading(false); 
        return; 
      }
      
      // Transform and sort data once per update
      const items: Order[] = Object.entries(val)
        .map(([id, v]: [string, any]) => ({ id, ...v }))
        .filter((o) => !status || o.status === status)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      
      setOrders(items);
      setLoading(false);
    });
    return () => off(r);
  }, [status]);

  return { orders, loading };
}
