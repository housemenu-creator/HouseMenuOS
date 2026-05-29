import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "demo_key",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

console.log("Initializing Firebase...");
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const seedData = {
  products: {
    "PT-301": {
      name: "Dúo de Pastas",
      description: "Lomo Saltado + Tallarín a la Huancaína + Tallarín Verde",
      category: "Pas Tas",
      price: 35.00,
      context: "Premium SKU",
      available: true
    },
    "TV-201": {
      name: "Tallarín Verde",
      description: "Pasta + Papa a la Huancaína + Proteína a elección",
      category: "Pas Tas",
      price: 19.00,
      context: "Premium SKU",
      available: true
    },
    "TH-202": {
      name: "Tallarín a la Huancaína",
      description: "Pasta + Papa a la Huancaína + Proteína a elección",
      category: "Pas Tas",
      price: 19.00,
      context: "Premium SKU",
      available: true
    },
    "PD-101": {
      name: "Pollo al Horno (Menú)",
      description: "Pollo + Tallarín + Chifles + Sarsa Criolla + Refresco",
      category: "Promo del Día",
      price: 13.50,
      context: "Combo Ahorro",
      available: true
    },
    "PD-102": {
      name: "Tallarín Saltado de Pollo",
      description: "Tallarín Saltado + Refresco",
      category: "Promo del Día",
      price: 13.50,
      context: "Combo Ahorro",
      available: true
    },
    "SP-201": {
      name: "Súper Promo Pollo",
      description: "Tallarines con Pollo al Horno + Chifles + Sarsa criolla",
      category: "Super Promo",
      price: 18.00,
      context: "Standalone",
      available: true
    }
  },
  modifiers: {
    "AD-001": { name: "Papas Fritas", price: 5.00, type: "Adicionales" },
    "AD-002": { name: "Huevo Frito", price: 2.00, type: "Adicionales" },
    "AD-003": { name: "Plátanos Fritos", price: 3.00, type: "Adicionales" },
    "AD-004": { name: "Piña", price: 3.00, type: "Adicionales" },
    "AD-005": { name: "Arroz", price: 3.00, type: "Adicionales" },
    "AD-006": { name: "Menestra", price: 5.00, type: "Adicionales" },
    "AD-007": { name: "Ensalada Fresca", price: 5.00, type: "Adicionales" },
    "AD-008": { name: "Queso", price: 3.00, type: "Adicionales" },
    "AD-009": { name: "Tocino", price: 5.00, type: "Adicionales" },
    "AD-010": { name: "Chorizo", price: 5.00, type: "Adicionales" },
    "MOD-PKG": { name: "Descartable Adicional", price: 2.00, type: "Empaque", dynamicPricing: true }
  },
  variations: {
    "PR-001": { name: "Pollo Hornado", category: "Proteína", adjustPrice: 0 },
    "PR-002": { name: "Chuleta Frita", category: "Proteína", adjustPrice: 0 },
    "PR-003": { name: "Pollo Saltado", category: "Proteína", adjustPrice: 0 },
    "PR-004": { name: "Lomo Fino", category: "Proteína", adjustPrice: 4.00 },
    "PR-005": { name: "Bisteck", category: "Proteína", adjustPrice: 4.00 },
    "PR-006": { name: "Apanado", category: "Proteína", adjustPrice: 4.00 }
  }
};

async function seedDatabase() {
  try {
    console.log("Seeding Database...");
    
    // Seed Products
    await set(ref(db, 'master_catalog/products'), seedData.products);
    console.log("✅ Products seeded successfully");

    // Seed Modifiers
    await set(ref(db, 'master_catalog/modifiers'), seedData.modifiers);
    console.log("✅ Modifiers seeded successfully");

    // Seed Variations
    await set(ref(db, 'master_catalog/variations'), seedData.variations);
    console.log("✅ Variations seeded successfully");

    console.log("🎉 Database seeding completed! Exiting...");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
