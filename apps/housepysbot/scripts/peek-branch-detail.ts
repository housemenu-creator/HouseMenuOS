// Detail peek: employees (login readiness), catalog products, drivers.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";
  const base = `branches/${branchId}`;

  const empSnap = await get(child(ref(db), `${base}/employees`));
  if (empSnap.exists()) {
    console.log("=== employees (detalle) ===");
    for (const [id, e] of Object.entries(empSnap.val())) {
      console.log(`- ${e.name} | role=${e.role} | email=${e.email || "—"} | pin=${e.pin || "—"} | userId=${(e.userId || "").slice(0, 12) || "—"} | area=${e.area || ""} | station=${e.station || ""}`);
    }
  }

  const catSnap = await get(child(ref(db), `${base}/catalog`));
  if (catSnap.exists()) {
    const cat = catSnap.val();
    const cats = cat.categories || {};
    const prods = cat.products || {};
    console.log(`\n=== catalog: ${Object.keys(cats).length} categorías, ${Object.keys(prods).length} productos ===`);
    for (const [id, c] of Object.entries(cats)) {
      const items = Object.entries(prods).filter(([pid, p]) => p.categoryId === id || p.category === id);
      console.log(`- CAT ${c.name}: ${items.length} productos`);
      for (const [pid, p] of items.slice(0, 8)) {
        console.log(`    · ${p.name} — s/${p.price} ${p.active === false ? "(inactivo)" : ""}`);
      }
    }
    // productos sin categoría
    const withCat = new Set(Object.values(prods).filter(p => p.categoryId || p.category).map(p => p.categoryId || p.category));
    const orphan = Object.values(prods).filter(p => !p.categoryId && !p.category);
    if (orphan.length) console.log(`  ORFANOS: ${orphan.length} productos sin categoría`);
  }

  const delSnap = await get(child(ref(db), `${base}/delivery`));
  if (delSnap.exists() && delSnap.val().drivers) {
    console.log(`\n=== drivers ===`);
    for (const [id, d] of Object.entries(delSnap.val().drivers)) {
      console.log(`- ${d.name} | phone=${d.phone || ""} | vehicle=${d.vehicle || ""}`);
    }
  }

  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });