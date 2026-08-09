import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Check suppliers
console.log('=== SUPPLIERS ===');
const supRaw = execSync('npx firebase database:get /suppliers --project house-menuapp', { encoding: 'utf8', timeout: 15000 });
const suppliers = JSON.parse(supRaw);
for (const [id, s] of Object.entries(suppliers)) {
  console.log(`${id}: ${s.name} (active: ${s.active})`);
}

// Check products
console.log('\n=== PRODUCTS (monteverde) ===');
const prodRaw = execSync('npx firebase database:get /branches/monteverde/catalog/products --project house-menuapp', { encoding: 'utf8', timeout: 15000 });
const products = JSON.parse(prodRaw);
for (const [id, p] of Object.entries(products).sort((a,b)=>a[1].name?.localeCompare(b[1].name))) {
  console.log(`${id}: ${p.name} | minStock=${p.minStock ?? '-'} | supplierId=${p.supplierId ?? '-'} | stock=${p.stock ?? '-'} | trackStock=${p.trackStock ?? '-'}`);
}
