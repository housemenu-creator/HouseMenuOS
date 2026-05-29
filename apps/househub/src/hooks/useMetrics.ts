import { useEffect, useState } from "react";
import { realtimeDB } from "@house/db";
import { ref, onValue, off } from "firebase/database";
import type { DailyMetric } from "../types";

const BRANCH = import.meta.env.VITE_HUB_BRANCH || "default";
const BASE = `branches/${BRANCH}/system`;
const today = new Date().toISOString().split("T")[0];

export interface MetricState {
  today?: DailyMetric;
  week: DailyMetric[];
  loading: boolean;
}

export function useMetrics(): MetricState {
  const [state, setState] = useState<MetricState>({ week: [], loading: true });

  useEffect(() => {
    const r = ref(realtimeDB, `${BASE}/metrics/daily`);
    const unsub = onValue(r, (snap) => {
      const val = snap.val() || {};
      const weekData: DailyMetric[] = [];
      let todayMetric: DailyMetric | undefined;

      // Calculate the last 7 days efficiently
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const day = val[key];
        
        const m: DailyMetric = {
          totalMessages: day?.totalMessages || 0,
          totalTools: day?.totalTools || 0,
          totalErrors: day?.totalErrors || 0,
          toolsByType: day?.toolsByType || {},
          messagesByHour: day?.messagesByHour || new Array(24).fill(0),
        };
        
        weekData.push(m);
        if (key === today) todayMetric = m;
      }

      setState({ today: todayMetric, week: weekData, loading: false });
    });
    return () => off(r);
  }, []);

  return state;
}
