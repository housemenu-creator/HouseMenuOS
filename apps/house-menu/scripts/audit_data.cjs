const fs = require('fs');
const raw = fs.readFileSync(process.env.TEMP + '/fulldb.json', 'utf8').trim();
const endBrace = raw.lastIndexOf('}');
const json = raw.slice(raw.indexOf('{'), endBrace + 1);
const db = JSON.parse(json);

const branch = db.branches?.monteverde;
const orders = branch?.orders || {};
const byStatus = {};
Object.values(orders).forEach(o => { byStatus[o.status] = (byStatus[o.status]||0) + 1; });
console.log('ORDERS by status:', JSON.stringify(byStatus), '| Total:', Object.keys(orders).length);

const dates = Object.values(orders).map(o => o.createdAt).filter(Boolean).sort();
if (dates.length) console.log('Date range:', dates[0].slice(0,10), 'to', dates[dates.length-1].slice(0,10));
console.log('');

Object.entries(orders).forEach(([k, o]) => {
  console.log(' ', k.slice(-6), '|', (o.customerName||'?').padEnd(18), '|', (o.customerEmail||'').padEnd(25), '|', (o.status||'').padEnd(10), '| S/' + String(o.financials?.total||o.orderTotal||0).padStart(6), '|', (o.createdAt||'--').slice(0,10));
});

const cats = branch?.catalog || {};
console.log('\nCATEGORIES:', Object.keys(cats).length);
Object.entries(cats).forEach(([id, c]) => {
  const prods = Object.keys(c.products||{}).length;
  console.log(' ', (c.name||id).padEnd(20), '-', prods, 'products');
  Object.entries(c.products||{}).forEach(([pid, p]) => {
    console.log('    -', (p.name||pid).padEnd(25), '| S/' + String(p.price||0).padStart(5), '| avail:', p.available !== false); 
  });
});

console.log('\nSUPPLIERS:', Object.keys(branch?.suppliers||{}).length);
Object.values(branch?.suppliers||{}).forEach(s => console.log(' -', s.name, '|', s.contactName||'', '|', s.email||''));

const log = branch?.logistics || {};
console.log('\nLOGISTICS:');
['ingredients','recipes','movements','waste','purchase_orders','suppliers'].forEach(k => {
  console.log(' ', k + ':', log[k] ? Object.keys(log[k]).length : 0);
});
