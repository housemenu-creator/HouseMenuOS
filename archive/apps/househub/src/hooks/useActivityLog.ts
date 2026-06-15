import { useEffect, useState } from "react";
import { realtimeDB } from "@house/db";
import { ref, onValue, off, query, limitToLast } from "firebase/database";
import type { ActivityLog } from "../types";

const BRANCH = import.meta.env.VITE_HUB_BRANCH || "default";
const BASE = `branches/${BRANCH}/system`;

export interface ActivityState {
  logs: ActivityLog[];
  loading: boolean;
}

export function useActivityLog(limit = 100): ActivityState {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = query(ref(realtimeDB, `${BASE}/logs`), limitToLast(limit));
    const unsub = onValue(r, (snap) => {
      const val = snap.val();
      if (!val) { setLogs([]); setLoading(false); return; }
      const items: ActivityLog[] = Object.entries(val)
        .map(([id, v]: [string, any]) => ({ id, ...v, timestamp: v.timestamp || 0 }))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
      setLogs(items);
      setLoading(false);
    });
    return () => off(r);
  }, [limit]);

  return { logs, loading };
}
