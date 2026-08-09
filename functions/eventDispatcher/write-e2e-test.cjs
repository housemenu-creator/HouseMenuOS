const admin = require("firebase-admin");

const sa = require(require("path").join(require("os").homedir(), ".firebase", "house-menuapp-firebase-adminsdk.json"));

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    databaseURL: "https://house-menuapp-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();
const eventId = "e2e-" + new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const eventData = {
  eventId,
  eventType: "inventory.stock.low",
  tenantId: "portal",
  source: "e2e-test",
  timestamp: new Date().toISOString(),
  payload: {
    productId: "e2e-test-product",
    productName: "E2E Test Product",
    supplierId: "e2e-test-supplier",
    currentStock: 3,
    minStock: 10,
    suggestedQty: 18
  }
};

console.log("Writing event:", eventId);
db.ref("events/portal/pending/" + eventId).set(eventData)
  .then(() => { console.log("OK"); process.exit(0); })
  .catch(err => { console.error("FAIL:", err); process.exit(1); });
