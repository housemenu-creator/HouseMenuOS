import { useEffect, useState } from "react";
import { realtimeDB } from "@house/db";
import { ref, onValue, off, query, limitToLast } from "firebase/database";
import type { ErrorAlert } from "../types";

const BRANCH = import.meta.env.VITE_HUB_BRANCH || "default";
const BASE = `branches/${BRANCH}/system`;

export function useErrorAlerts() {
  const [errors, setErrors] = useState<ErrorAlert[]>([]);

  useEffect(() => {
    const r = query(ref(realtimeDB, `${BASE}/errors`), limitToLast(50));
    const unsub = onValue(r, (snap) => {
      const val = snap.val();
      if (!val) { setErrors([]); return; }
      setErrors(
        Object.entries(val)
          .map(([id, v]: [string, any]) => ({ id, ...v }))
          .sort((a, b) => b.timestamp - a.timestamp)
      );
    });
    return () => off(r);
  }, []);

  return errors;
}
