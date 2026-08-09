// One-off migration: normalize ingredient supplierId/category -> supplierIds/categories arrays
// Run with: node scripts/migrate-ingredient-arrays.mjs (from apps/house-menu)
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CONFIG = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const raw = fs.readFileSync(CONFIG, 'utf8').replace(/^\uFEFF/, ''); // strip BOM
const { tokens } = JSON.parse(raw);
const TOKEN = tokens.access_token;
const DB = 'https://house-menuapp-default-rtdb.firebaseio.com';

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
      res.on('data', (c) => d += c);
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

const normList = (v, legacy) => {
  if (Array.isArray(v)) return v;
  if (v) return [v];
  if (legacy) return [legacy];
  return [];
};

(async () => {
  const url = `${DB}/branches/monteverde/logistics/ingredients.json`;
  const res = await req('GET', url);
  if (res.status !== 200) { console.error('GET failed', res.status, res.body); process.exit(1); }
  const ings = res.body;
  const updates = {};
  let changed = 0;
  for (const [id, ing] of Object.entries(ings)) {
    const supplierIds = normList(ing.supplierIds, ing.supplierId);
    const categories = normList(ing.categories, ing.category);
    const patch = {};
    if (JSON.stringify(supplierIds) !== JSON.stringify(ing.supplierIds)) patch.supplierIds = supplierIds;
    if (JSON.stringify(categories) !== JSON.stringify(ing.categories)) patch.categories = categories;
    if (Object.keys(patch).length) {
      updates[`${id}`] = patch;
      changed++;
    }
  }
  console.log(`Ingredients: ${Object.keys(ings).length}, to update: ${changed}`);
  if (changed === 0) { console.log('Nothing to migrate'); return; }
  const r2 = await req('PATCH', url, updates);
  console.log('PATCH status', r2.status, r2.body);
  if (r2.status !== 200) process.exit(1);

  // Verify
  const v = await req('GET', url);
  const bad = Object.entries(v.body).filter(([, i]) => (i.supplierIds && i.supplierIds.length > 1) || (i.categories && i.categories.length > 1));
  const withSup = Object.entries(v.body).filter(([, i]) => (i.supplierIds || []).length > 0);
  console.log('Verify: ingredients with suppliers:', withSup.length, '| multi-supplier:', bad.length);
  console.log('Samples:', Object.entries(v.body).slice(0, 3).map(([id, i]) => `${i.name} => sup:${JSON.stringify(i.supplierIds)} cat:${JSON.stringify(i.categories)}`).join('\n'));
})();
