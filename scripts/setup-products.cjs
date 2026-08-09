// Quick script to update products with minStock + supplierId
const { execSync } = require('child_process');

const updates = [
  { path: '/branches/monteverde/catalog/products/Ow9Qf5wjd203yPe4TpB', data: { minStock: 10, supplierId: 'sup-proveedor-local', trackStock: true } },
  { path: '/branches/monteverde/catalog/products/Ow9SN6ur9EeKNRQg903', data: { minStock: 10, supplierId: 'sup-proveedor-local', trackStock: true } },
  { path: '/branches/monteverde/catalog/products/OwnW-hU2Vxp8KcHtHVs', data: { minStock: 10, supplierId: 'sup-proveedor-local', trackStock: true } },
  { path: '/branches/monteverde/catalog/products/Ows7e7cpzlDYr5qV3HR', data: { minStock: 10, supplierId: 'sup-proveedor-local', trackStock: true } },
];

const fs = require('fs');
const os = require('os');

for (const u of updates) {
  const tmp = os.tmpdir() + '\\prod_update_' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.json';
  fs.writeFileSync(tmp, JSON.stringify(u.data));
  try {
    const cmd = `firebase database:set "${u.path}" --project house-menuapp --data-file "${tmp}"`;
    console.log(`Updating ${u.path}`);
    execSync(cmd, { stdio: 'pipe', timeout: 15000, encoding: 'utf8' });
    console.log(`  OK`);
  } catch (e) {
    console.error(`  FAIL: ${e.message}`);
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

console.log('\nDone!');
