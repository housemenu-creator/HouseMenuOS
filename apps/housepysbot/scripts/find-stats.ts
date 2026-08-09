// Look for pre-computed analytics/sales stats paths that reference old test data.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
  const base = `branches/${branchId}`;
  const paths = [
    "stats", "analytics", "ventas", "sales", "ventas_dia", "reports", "reportes",
    "dashboard", "kpis", "metrics", "day_stats", "ventas_por_dia",
    "system/analytics", "system/stats",
  ];
  for (const p of paths) {
    const snap = await get(child(ref(db), `${base}/${p}`));
    if (snap.exists()) {
      const v = snap.val();
      if (typeof v === "object") {
        console.log(`${p}/ — ${Object.keys(v).length} keys`);
      } else {
        console.log(`${p} — ${String(v).slice(0, 60)}`);
      }
    }
  }
  console.log("done");
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });