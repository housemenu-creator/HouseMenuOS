import 'dotenv/config';
import { initFirebase, ref, get, child } from '../src/lib/firebase.js';

async function test() {
  const db = initFirebase();
  console.log('Firebase: OK');

  const branchSnap = await get(child(ref(db), 'branches_config/hq'));
  console.log('branches_config/hq exists:', branchSnap.exists());
  if (branchSnap.exists()) console.log('data:', JSON.stringify(branchSnap.val()).slice(0,200));

  const catSnap = await get(child(ref(db), 'branches/hq/catalog/products'));
  console.log('catalog/products exists:', catSnap.exists());
  if (catSnap.exists()) {
    const products = catSnap.val();
    const entries = Object.entries(products).slice(0,2);
    console.log('sample products:', JSON.stringify(entries));
  }

  const ordSnap = await get(child(ref(db), 'branches/hq/orders'));
  console.log('orders exists:', ordSnap.exists());
  if (ordSnap.exists()) {
    const orders = ordSnap.val();
    const entries = Object.entries(orders).slice(0,2);
    console.log('sample orders:', JSON.stringify(entries));
  }
}
test().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
