import { useEffect, useState } from "react";
import { realtimeDB } from "@house/db";
import { ref, onValue, off } from "firebase/database";
import type { AgentStatus, SystemStatus } from "../types";

const BRANCH = import.meta.env.VITE_HUB_BRANCH || "default";
const BASE = `branches/${BRANCH}/system`;

export interface FullStatus {
  agents: { atencion?: AgentStatus; admin?: AgentStatus };
  system?: SystemStatus;
  loading: boolean;
}

export function useAgentStatus(): FullStatus {
  const [data, setData] = useState<FullStatus>({ agents: {}, loading: true });

  useEffect(() => {
    const r = ref(realtimeDB, `${BASE}/agents`);
    const sysR = ref(realtimeDB, `${BASE}/system`);

    const unsub1 = onValue(r, (snap) => {
      setData((prev) => ({
        ...prev,
        agents: snap.val() || {},
        loading: false,
      }));
    });

    const unsub2 = onValue(sysR, (snap) => {
      setData((prev) => ({
        ...prev,
        system: snap.val(),
        loading: false,
      }));
    });

    return () => { off(r); off(sysR); };
  }, []);

  return data;
}
