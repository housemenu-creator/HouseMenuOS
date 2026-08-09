// List top-level paths under the branch to see what needs cleanup.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
  const snap = await get(child(ref(db), `branches/${branchId}`));
  if (!snap.exists()) { console.log("NO BRANCH"); process.exit(0); }
  const val = snap.val();
  for (const [k, v] of Object.entries(val)) {
    if (typeof v === "object" && v !== null) {
      console.log(`${k}/ — ${Object.keys(v).length} keys`);
    } else {
      console.log(`${k} — ${String(v).slice(0, 60)}`);
    }
  }
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });