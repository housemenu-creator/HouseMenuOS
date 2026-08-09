// List orders in Firebase to identify test orders.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
  const snap = await get(child(ref(db), `branches/${branchId}/orders`));
  if (!snap.exists()) { console.log("NO ORDERS"); process.exit(0); }
  const orders = snap.val();
  const now = Date.now();
  const entries = Object.entries(orders);
  console.log(`TOTAL pedidos: ${entries.length}`);
  console.log();
  for (const [id, o] of entries) {
    const raw = o.ts || o.createdAt || o.timestamp || o.updatedAt || 0;
    const t = typeof raw === "number" ? raw : new Date(raw).getTime();
    const dateStr = t ? new Date(t).toISOString().slice(0, 16) : "?";
    const state = o.estado || o.status || "?";
    const total = o.total ?? "";
    const items = Array.isArray(o.items) ? o.items.map(i => `${i.name}x${i.quantity}`).join(", ") : "";
    const ch = o.channel || o.origen || o.platform || "";
    console.log(`[${id.slice(0, 12)}] ${dateStr} state=${state} total=${total} ch=${ch}`);
    if (items) console.log(`   items: ${items}`);
  }
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });