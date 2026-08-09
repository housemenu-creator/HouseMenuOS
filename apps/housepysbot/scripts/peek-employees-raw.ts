// Raw dump of branch employees to see exact current state.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const b = "monteverde";
  const snap = await get(child(ref(db), `branches/${b}/employees`));
  if (!snap.exists()) { console.log("employees: NO EXISTE"); process.exit(0); }
  const val = snap.val();
  console.log("keys:", Object.keys(val).length);
  console.log(JSON.stringify(val, null, 2).slice(0, 4000));
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });