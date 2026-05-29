/**
 * Seed script — HOUSE MENU Castilla
 * 
 * Uso: node scripts/seed-house-menu.mjs
 * 
 * Requiere: FIREBASE_DATABASE_URL en .env.local
 *           o pasar --db-url como argumento
 * 
 * Este script crea la sucursal Castilla en la RTDB.
 * Los roles y usuarios default se crean automáticamente
 * al iniciar la app (authService.seedDefaultRoles).
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push } from 'firebase/database';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', 'apps', 'house-menu', '.env.local');

// ── Cargar vars de entorno ─────────────────────────────────────────────
let FIREBASE_API_KEY = '';
let FIREBASE_AUTH_DOMAIN = '';
let FIREBASE_DATABASE_URL = '';
let FIREBASE_PROJECT_ID = '';

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=').replace(/^["']|["']$/g, '');
    if (key === 'VITE_FIREBASE_API_KEY') FIREBASE_API_KEY = value;
    if (key === 'VITE_FIREBASE_AUTH_DOMAIN') FIREBASE_AUTH_DOMAIN = value;
    if (key === 'VITE_FIREBASE_DATABASE_URL') FIREBASE_DATABASE_URL = value;
    if (key === 'VITE_FIREBASE_PROJECT_ID') FIREBASE_PROJECT_ID = value;
  }
}

// Soporte para --db-url argumento
const dbUrlArg = process.argv.find(a => a.startsWith('--db-url='));
if (dbUrlArg) FIREBASE_DATABASE_URL = dbUrlArg.split('=')[1];

if (!FIREBASE_DATABASE_URL) {
  console.error('❌ FIREBASE_DATABASE_URL no encontrado.');
  console.error('   Asegúrate de que apps/house-menu/.env.local existe o pasa --db-url=...');
  process.exit(1);
}

// ── Inicializar Firebase ───────────────────────────────────────────────
const app = initializeApp({
  apiKey: FIREBASE_API_KEY || 'demo',
  authDomain: FIREBASE_AUTH_DOMAIN,
  databaseURL: FIREBASE_DATABASE_URL,
  projectId: FIREBASE_PROJECT_ID,
});

const db = getDatabase(app);

// ── Datos de HOUSE MENU Castilla ───────────────────────────────────────
const BRANCH_ID = 'castilla';

const branchConfig = {
  id: BRANCH_ID,
  name: 'HOUSE MENU — Castilla',
  address: 'URB. Monteverde Mz T lote 22, Castilla, Perú',
  phone: '913 341 698',
  instagram: 'house.menu.pe',
  whatsapp: 'https://wa.me/51913341698',
  email: 'housepys.contacto@gmail.com',
  schedule: 'Lun-Dom 11:00 AM - 11:00 PM',
  coordinates: {
    lat: -5.2079,
    lng: -80.6316,
  },
  active: true,
};

const kioskConfig = {
  kioskEnabled: false,
};

// ── Función principal ──────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Sembrando datos para HOUSE MENU — Castilla...\n');

  // 1. Branches config
  console.log(`📦 Creando sucursal: ${branchConfig.name}`);
  await set(ref(db, `branches_config/${BRANCH_ID}`), branchConfig);

  // 2. Kiosk config
  console.log(`🔧 Configuración kiosko`);
  await set(ref(db, `branches/${BRANCH_ID}/config`), kioskConfig);

  // 3. Catalog vacío (listo para que el cliente agregue productos)
  console.log(`📋 Catálogo vacío — el cliente llenará en vivo\n`);

  // 4. Roles — se auto-siembran al iniciar la app
  console.log(`👤 Roles y usuarios — se crean automáticamente al iniciar la app\n`);

  console.log('✅ Seed completado.');
  console.log(`   Sucursal: ${branchConfig.name}`);
  console.log(`   Path RTDB: branches_config/${BRANCH_ID}`);
  console.log(`\n🚀 Inicia la app con: npm run dev -w apps/house-menu`);
  console.log(`   Credenciales default:`);
  console.log(`   - admin@house.local / admin (Admin Hub)`);
  console.log(`   - cocina@house.local / 1234 (KDS Cocina)`);
  console.log(`   - reparto@house.local / 5678 (Despacho)\n`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
