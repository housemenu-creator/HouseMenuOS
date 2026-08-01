// Clear residual telemetry from the old colliding path.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, set, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
  const oldPath = `branches/${branchId}/system/agents`;
  const snap = await (await import("firebase/database")).get(child(ref(db), oldPath));
  if (snap.exists()) {
    const val = snap.val();
    for (const agentId of Object.keys(val)) {
      const fields = val[agentId];
      // If it only has telemetry fields (status/lastSeen/...), it's stale heartbeat — remove it.
      const telemetryOnly = Object.keys(fields).every((k) => ["status", "lastSeen", "messagesToday", "toolsExecuted", "version"].includes(k));
      if (telemetryOnly) {
        await set(child(ref(db), `${oldPath}/${agentId}`), null);
        console.log(`🗑 removed stale telemetry node: ${oldPath}/${agentId}`);
      } else {
        console.log(`✅ kept (has config): ${oldPath}/${agentId} → ${Object.keys(fields).join(", ")}`);
      }
    }
  } else {
    console.log("old path empty, nothing to clean");
  }
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
