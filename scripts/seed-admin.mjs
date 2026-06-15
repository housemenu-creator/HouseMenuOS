#!/usr/bin/env node
/**
 * Seed script: crea usuario admin y roles por defecto en Firebase RTDB.
 * Se ejecuta dentro del container http (usa la conexión Firebase del bot).
 *
 * Uso: node scripts/seed-admin.mjs
 */
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, push, get } from "firebase/database";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const config = {
  apiKey: process.env.FIREBASE_API_KEY || "",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID || "",
};

if (!config.databaseURL) {
  console.error("Falta FIREBASE_DATABASE_URL");
  process.exit(1);
}

const app = initializeApp(config, "seed");
const db = getDatabase(app);
const auth = getAuth(app);

async function main() {
  // Autenticar como bot
  const botEmail = process.env.BOT_FIREBASE_EMAIL;
  const botPassword = process.env.BOT_FIREBASE_PASSWORD;
  if (!botEmail || !botPassword) {
    console.error("Faltan BOT_FIREBASE_EMAIL / BOT_FIREBASE_PASSWORD");
    process.exit(1);
  }
  await signInWithEmailAndPassword(auth, botEmail, botPassword);
  console.log("✅ Autenticado como", botEmail);

  const TENANT = "default"; // tenantId usado por el frontend

  // ── Roles por defecto ──
  const roles = {
    admin: {
      name: "Administrador",
      permissions: {
        "orders:read": true, "orders:create": true, "orders:update_status": true,
        "orders:cancel": true, "orders:edit": true, "orders:mark_paid": true,
        "orders:refund": true, "menu:read": true, "menu:edit": true,
        "menu:manage": true, "inventory:read": true, "inventory:edit": true,
        "analytics:read": true, "chat:read": true, "chat:write": true,
        "users:read": true, "users:manage": true, "config:manage": true,
        "kiosk:manage": true, "cuentas:read": true, "cuentas:manage": true,
        "marketing:read": true, "marketing:manage": true,
      },
    },
    kitchen: { name: "Cocina", permissions: { "orders:read": true, "orders:create": true, "orders:update_status": true, "menu:read": true, "chat:read": true, "chat:write": true } },
    mozo: { name: "Mozo", permissions: { "orders:read": true, "orders:create": true, "orders:update_status": true, "menu:read": true, "chat:read": true, "chat:write": true } },
    cajero: { name: "Cajero", permissions: { "orders:read": true, "orders:mark_paid": true, "orders:refund": true, "orders:cancel": true, "menu:read": true, "analytics:read": true, "chat:read": true, "chat:write": true } },
    dispatch: { name: "Reparto", permissions: { "orders:read": true, "orders:update_status": true, "chat:read": true, "chat:write": true } },
    delivery: { name: "Repartidor", permissions: { "orders:read": true } },
    vendedor: { name: "Vendedor", permissions: { "orders:read": true, "orders:create": true, "orders:update_status": true, "menu:read": true, "cuentas:read": true, "cuentas:manage": true, "chat:read": true, "chat:write": true } },
  };

  const rolesRef = ref(db, `tenants/${TENANT}/roles`);
  const existingRoles = await get(rolesRef);
  if (!existingRoles.exists()) {
    await set(rolesRef, roles);
    console.log("✅ Roles creados");
  } else {
    console.log("ℹ️ Roles ya existen");
  }

  // ── Usuario admin ──
  const usersRef = ref(db, `tenants/${TENANT}/users`);
  const existingUsers = await get(usersRef);
  let adminId = null;
  if (existingUsers.exists()) {
    const users = existingUsers.val();
    for (const [id, u] of Object.entries(users)) {
      if (u.email === "admin@house.local") {
        adminId = id;
        break;
      }
    }
  }

  const USER_ID = adminId || push(usersRef).key;
  const userData = {
    email: "admin@house.local",
    name: "Admin",
    pin: "admin", // plaintext — el frontend lo migra a hash en el primer login
    role: "admin",
    active: true,
    createdAt: new Date().toISOString(),
  };

  await set(ref(db, `tenants/${TENANT}/users/${USER_ID}`), userData);
  console.log("✅ Usuario admin creado/actualizado");

  // ── Crear membresía para el admin ──
  const membershipsRef = ref(db, `tenants/${TENANT}/memberships`);
  const existingMems = await get(membershipsRef);
  let membershipExists = false;
  if (existingMems.exists()) {
    const mems = existingMems.val();
    for (const [id, m] of Object.entries(mems)) {
      if (m.userId === USER_ID && m.active !== false) {
        membershipExists = true;
        break;
      }
    }
  }

  if (!membershipExists) {
    const memRef = push(membershipsRef);
    await set(memRef, {
      userId: USER_ID,
      roleId: "admin",
      branchIds: { castilla: true },
      active: true,
    });
    console.log("✅ Membresía admin creada (branch: castilla)");
  } else {
    console.log("ℹ️ Membresía admin ya existe");
  }

  console.log("🎉 Seed completo!");
  console.log("   Email: admin@house.local");
  console.log("   PIN:   admin");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
