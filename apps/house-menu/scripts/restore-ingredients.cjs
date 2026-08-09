// One-off restore: rebuild ingredient nodes destroyed by migrate-ingredient-arrays.cjs
// Source: scripts/seed-ingredients-updated.json (same IDs as prod) + current categories/supplierIds from DB
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CONFIG = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const raw = fs.readFileSync(CONFIG, 'utf8').replace(/^\uFEFF/, '');
const { tokens } = JSON.parse(raw);
const TOKEN = tokens.access_token;
const DB = 'https://house-menuapp-default-rtdb.firebaseio.com';
const BASE = `${DB}/branches/monteverde/logistics`;

function req(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const r = https.request({
      method,
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        ...(body !== undefined ? { 'Content-Length': Buffer.byteLength(JSON.stringify(body)) } : {}),
      },
    }, (res) => {
      let d = '';
      res.on('data', (chunk) => d += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

(async () => {
  // 1. Current (broken) ingredients — has categories + supplierIds
  const cur = (await req('GET', `${BASE}/ingredients.json`)).body;
  // 2. Seed — full original data
  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'scripts', 'seed-ingredients-updated.json'), 'utf8'));
  // 3. Movements — newest stockAfter per ingredient (actual stock today)
  const mv = (await req('GET', `${BASE}/movements.json`)).body || {};
  const latestStock = {};
  for (const m of Object.values(mv)) {
    if (m.ingredientId && m.stockAfter !== undefined) latestStock[m.ingredientId] = Number(m.stockAfter);
  }

  // Field-level PATCH: never replaces whole nodes, only the listed fields
  const updates = {};
  let rebuilt = 0;
  for (const [id, broken] of Object.entries(cur || {})) {
    const s = seed[id];
    if (!s) { console.log('SKIP (no seed):', id); continue; }
    const node = {
      name: s.name,
      unit: s.unit || 'unidad',
      stock: latestStock[id] !== undefined ? latestStock[id] : Number(s.stock) || 0,
      minStock: Number(s.minStock) || 0,
      cost: Number(s.cost) || 0,
      cargo: s.cargo || '',
      categories: Array.isArray(broken.categories) ? broken.categories : (s.category ? [s.category] : []),
      supplierIds: Array.isArray(broken.supplierIds) ? broken.supplierIds : [],
      createdAt: s.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updates[`ingredients/${id}`] = node;
    rebuilt++;
  }
  console.log('Rebuilding', rebuilt, 'ingredients');

  const r = await req('PATCH', `${BASE}.json`, updates);
  console.log('PATCH status', r.status);
  if (r.status !== 200) { console.error(r.body); process.exit(1); }

  // Verify
  const v = (await req('GET', `${BASE}/ingredients.json`)).body;
  const entries = Object.entries(v || {});
  const withName = entries.filter(([, i]) => i && i.name);
  const withStock = entries.filter(([, i]) => i && Number(i.stock) > 0);
  console.log('Verify: total', entries.length, '| with name:', withName.length, '| with stock>0:', withStock.length);
  console.log('Sample:', entries.slice(0, 3).map(([id, i]) => `${i.name} stock=${i.stock} cat=${JSON.stringify(i.categories)} sup=${JSON.stringify(i.supplierIds)}`).join('\n'));
})();
