// Show allowedTools for each agent config in Firebase.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
  const snap = await get(child(ref(db), `branches/${branchId}/system/agents`));
  if (!snap.exists()) { console.log("NO AGENTS"); process.exit(0); }
  const agents = snap.val();
  for (const [id, cfg] of Object.entries(agents)) {
    const tools = Array.isArray(cfg.allowedTools) ? cfg.allowedTools : [];
    console.log(`=== ${id} === tools: ${tools.length}`);
    console.log(tools.join(", "));
    console.log("");
  }
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
