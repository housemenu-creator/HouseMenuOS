import { useEffect, useRef, useCallback } from "react";
import { realtimeDB } from "@house/db";
import { ref, onValue, off } from "firebase/database";

const BRANCH = import.meta.env.VITE_HUB_BRANCH || "default";
const BASE = `branches/${BRANCH}/system`;

export function requestPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function usePushNotifier() {
  const notified = useRef<Set<string>>(new Set());

  const notify = useCallback((title: string, body: string) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    new Notification(title, { body, icon: "/favicon.svg" });
  }, []);

  useEffect(() => {
    const r = ref(realtimeDB, `${BASE}/errors`);
    const unsub = onValue(r, (snap) => {
      const val = snap.val();
      if (!val) return;
      Object.entries(val).forEach(([id, v]: [string, any]) => {
        if (!v.resolved && !notified.current.has(id)) {
          notified.current.add(id);
          notify(`⚠️ Error en ${v.agentId || "sistema"}`, v.message || "Error desconocido");
        }
      });
    });
    return () => off(r);
  }, [notify]);
}
