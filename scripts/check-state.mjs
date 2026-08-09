import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const raw = execSync('firebase database:get /branches/monteverde --project house-menuapp', { encoding: 'utf8', cwd: process.cwd() });
const data = JSON.parse(raw);

const products = data.catalog?.products || {};
const cats = {};
Object.values(products).forEach(p => {
  const c = p.category || 'Sin Cat';
  if (!cats[c]) cats[c] = 0;
  cats[c]++;
});
console.log('PRODUCTOS:', Object.keys(products).length);
console.log('CATEGORIAS:', JSON.stringify(cats, null, 2));

const ingredients = data.logistics?.ingredients || {};
console.log('INSUMOS:', Object.keys(ingredients).length);

const suppliers = data.logistics?.suppliers || {};
console.log('PROVEEDORES:', Object.keys(suppliers).length);
Object.values(suppliers).forEach(s => console.log('  SUP:', s.name));

const employees = data.employees || {};
console.log('EMPLEADOS:', Object.keys(employees).length);
Object.values(employees).forEach(e => console.log('  EMP:', e.name || e.email, 'pin:', e.pin || 'none', 'role:', e.role || 'none'));

// Write products JSON for recipe creation
const productList = Object.entries(products).map(([id, p]) => ({ id, name: p.name, category: p.category, base_price: p.base_price }));
writeFileSync('scripts/products.json', JSON.stringify(productList, null, 2));
console.log('\nProducts saved to scripts/products.json');
