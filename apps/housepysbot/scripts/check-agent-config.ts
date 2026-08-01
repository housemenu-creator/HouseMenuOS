// Check what's in Firebase for the atencion agent config.
import "dotenv/config";
import { initFirebase, authenticateBot, get, ref, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
  const path = `branches/${branchId}/system/agents/atencion`;
  const snap = await get(child(ref(db), path));
  console.log("exists:", snap.exists());
  if (snap.exists()) {
    console.log("RAW:", JSON.stringify(snap.val()).slice(0, 500));
  }
  // also check parent
  const parent = await get(child(ref(db), `branches/${branchId}/system/agents`));
  console.log("agents node:", parent.exists() ? JSON.stringify(parent.val()).slice(0, 800) : "NOT FOUND");
  const telemetry = await get(child(ref(db), `branches/${branchId}/system/telemetry/agents`));
  console.log("telemetry node:", telemetry.exists() ? JSON.stringify(telemetry.val()).slice(0, 300) : "NOT FOUND");
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
