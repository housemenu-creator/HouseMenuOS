import { initFirebase, ref, set, push, child } from "../lib/firebase.js";
import { getAllBranchIds } from "../lib/branch.js";

const db = initFirebase();

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
    const globalChecks: string[] = [];
    const branchIds = getAllBranchIds();

    // Check Firebase — ping ALL branches
    let fbOk = true;
    for (const branchId of branchIds) {
      try {
        const testRef = ref(db, `branches/${branchId}/_health`);
        await set(testRef, { lastPing: now, monitor: "ok" });
      } catch {
        fbOk = false;
        // Write error directly to the failing branch
        try {
          const errRef = push(child(ref(db), `branches/${branchId}/system/errors`));
          await set(errRef, {
            agentId: "monitor",
            tool: "health_check",
            message: `Firebase no responde en sucursal "${branchId}"`,
            resolved: false,
            timestamp: now,
          });
        } catch {}
        globalChecks.push(`firebase[${branchId}]`);
      }
    }
    health.firebase = fbOk ? "ok" : "error";

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
          globalChecks.push("openrouter");
        }
      } catch {
        health.openrouter = "error";
        globalChecks.push("openrouter");
      }
    }

    health.lastCheck = now;
    health.uptime = process.uptime();
    health.memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

    // Write health to ALL branches
    for (const branchId of branchIds) {
      try {
        const healthRef = child(ref(db), `branches/${branchId}/system/monitor/health`);
        await set(healthRef, { ...health, branchId });
      } catch {}
    }

    // Global errors (OpenRouter, memory) → write to ALL branches
    const globalErrors = globalChecks.filter((c) => !c.startsWith("firebase["));
    if (globalErrors.length > 0) {
      for (const branchId of branchIds) {
        try {
          const errRef = push(child(ref(db), `branches/${branchId}/system/errors`));
          await set(errRef, {
            agentId: "monitor",
            tool: "health_check",
            message: `Servicio compartido caído: ${globalErrors.join(", ")}`,
            resolved: false,
            timestamp: now,
          });
        } catch {}
      }
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
