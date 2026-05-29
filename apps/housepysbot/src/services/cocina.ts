import { initFirebase, ref, child, set, push, onChildAdded, off } from "../lib/firebase.js";
import { reportToolCall } from "../lib/telemetry.js";

const db = initFirebase();
const BRANCH = process.env.HOUSEPYSBOT_BRANCH_ID || "default";

export function startCocinaWatcher() {
  const ordersRef = ref(db, `branches/${BRANCH}/orders`);

  const unsub = onChildAdded(ordersRef, (snap) => {
    const order = snap.val();
    if (!order || order.status !== "recibido") return;

    (async () => {
      try {
        const cocinaRef = child(ref(db), `branches/${BRANCH}/system/cocina/pendientes/${snap.key}`);
        await set(cocinaRef, {
          ...order,
          notifiedAt: Date.now(),
        });

        await reportToolCall(
          "atencion",
          "crear_pedido",
          { id: snap.key, cliente: order.cliente, total: order.total },
          "success",
          `🍳 Nuevo pedido: ${order.cliente} — S/ ${Number(order.total).toFixed(2)}`,
          0,
        );
      } catch (e) {
        console.error("cocina watcher error:", e);
      }
    })();
  });

  return () => off(ordersRef);
}
