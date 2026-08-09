// Peek at cash_sessions and notifications to decide cleanup.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
  const base = `branches/${branchId}`;

  const cs = await get(child(ref(db), `${base}/cash_sessions`));
  if (cs.exists()) {
    console.log("=== cash_sessions ===");
    for (const [id, s] of Object.entries(cs.val())) {
      const t = s.openedAt || s.createdAt || s.startTs || 0;
      const dateStr = t ? new Date(t).toISOString().slice(0, 16) : "?";
      console.log(`  ${id.slice(0, 12)} ${dateStr} status=${s.status} initial=${s.initialAmount} total=${s.totalAmount ?? "?"}`);
    }
  }

  const nt = await get(child(ref(db), `${base}/notifications`));
  if (nt.exists()) {
    console.log("=== notifications ===");
    for (const [id, n] of Object.entries(nt.val())) {
      const t = n.ts || n.createdAt || n.timestamp || 0;
      const dateStr = t ? new Date(t).toISOString().slice(0, 16) : "?";
      const type = n.type || n.category || "?";
      const title = (n.title || n.body || n.message || "").toString().slice(0, 60);
      console.log(`  ${id.slice(0, 12)} ${dateStr} type=${type} [${title}]`);
    }
  }
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });