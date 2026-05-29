import { initFirebase, ref, set, push, child } from "../lib/firebase.js";

const db = initFirebase();
const BRANCH = process.env.HOUSEPYSBOT_BRANCH_ID || "default";

interface HealthState {
  firebase: "ok" | "error";
  openrouter: "ok" | "error";
  lastCheck: number;
  uptime: number;
  memory: number;
}

let health: HealthState = {
  firebase: "ok",
  openrouter: "ok",
  lastCheck: Date.now(),
  uptime: 0,
  memory: 0,
};

export function startMonitor() {
  async function check() {
    const now = Date.now();
    const checks: string[] = [];

    // Check Firebase
    try {
      const testRef = ref(db, `branches/${BRANCH}/_health`);
      await set(testRef, { lastPing: now });
      health.firebase = "ok";
    } catch {
      health.firebase = "error";
      checks.push("firebase");
    }

    // Check OpenRouter
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.status === 200) {
          health.openrouter = "ok";
        } else {
          health.openrouter = "error";
          checks.push("openrouter");
        }
      } catch {
        health.openrouter = "error";
        checks.push("openrouter");
      }
    }

    health.lastCheck = now;
    health.uptime = process.uptime();
    health.memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

    // Write health to Firebase
    try {
      const healthRef = child(ref(db), `branches/${BRANCH}/system/monitor/health`);
      await set(healthRef, health);
    } catch {}

    // If something failed, create error alert
    if (checks.length > 0) {
      try {
        const errRef = push(child(ref(db), `branches/${BRANCH}/system/errors`));
        await set(errRef, {
          agentId: "monitor",
          tool: "health_check",
          message: `Servicio caído: ${checks.join(", ")}`,
          resolved: false,
          timestamp: now,
        });
      } catch {}
    }
  }

  // Run every 60s
  check();
  const interval = setInterval(check, 60000);
  return () => clearInterval(interval);
}

export function getHealth(): HealthState {
  return { ...health };
}
