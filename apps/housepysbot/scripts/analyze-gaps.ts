// Identify: (a) products without recipe, (b) orphan recipe, (c) existing tenant employee records + role cache.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, get, child } from "../src/lib/firebase.js";

const db = initFirebase();

async function main() {
  await authenticateBot();
  const b = "monteverde";

  const prods = (await get(child(ref(db), `branches/${b}/catalog/products`))).val() || {};
  const recs = (await get(child(ref(db), `branches/${b}/logistics/recipes`))).val() || {};
  const emps = (await get(child(ref(db), `branches/${b}/employees`))).val() || {};

  // (a) products without recipe
  const recProductIds = new Set(Object.values(recs).map(r => r.productId).filter(Boolean));
  const missing = [];
  for (const [id, p] of Object.entries(prods)) {
    if (!recProductIds.has(id)) missing.push({ id, name: p.name, cat: p.category, price: p.base_price, wizard: p.isWizard });
  }
  console.log(`=== ${missing.length} productos SIN receta ===`);
  missing.forEach(m => console.log(`  ${m.id} | ${m.name} | ${m.category} | s/${m.price}${m.wizard ? " | WIZARD" : ""}`));

  // (b) orphan recipes (productId not in catalog)
  console.log(`\n=== recetas HUEBANAS (productId inexistente) ===`);
  for (const [id, r] of Object.entries(recs)) {
    if (r.productId && !prods[r.productId]) console.log(`  ${id} | ${r.productName} | productId=${r.productId}`);
  }

  // (c) tenant user records for existing employees with userId
  console.log(`\n=== tenant users de empleados con userId ===`);
  const tenant = "default";
  const users = (await get(child(ref(db), `tenants/${tenant}/employees`))).val() || {};
  for (const [id, u] of Object.entries(emps)) {
    if (!u.userId) { console.log(`  SIN userId: ${u.name} (emp ${id.slice(0,12)})`); continue; }
    const t = users[u.userId];
    console.log(`  ${u.name} | userId=${u.userId.slice(0,12)} | tenantRec=${t ? "SÍ" : "NO"} | role=${t?.role} | pinHash=${t?.profile?.pinHash ? "SÍ" : "—"}`);
  }

  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });