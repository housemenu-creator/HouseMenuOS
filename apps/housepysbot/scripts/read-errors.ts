// Read recent system errors from Firebase.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";
import { query, orderByKey, limitToLast } from "firebase/database";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
  const errorsRef = child(ref(db), `branches/${branchId}/system/errors`);
  const snap = await get(query(errorsRef, orderByKey(), limitToLast(10)));
  if (!snap.exists()) { console.log("NO ERRORS"); process.exit(0); }
  const val = snap.val();
  const entries = Object.values(val);
  for (const e of entries.slice(-10)) {
    console.log("---");
    console.log("time:", new Date(e.timestamp || Date.now()).toISOString());
    console.log("agent:", e.agentId, "tool:", e.tool);
    console.log("msg:", e.message);
  }
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
