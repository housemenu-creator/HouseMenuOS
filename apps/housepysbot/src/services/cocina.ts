import { initFirebase, ref, child, set, push, onChildAdded, off } from "../lib/firebase.js";
import { getAllBranchIds } from "../lib/branch.js";
import { reportToolCall } from "../lib/telemetry.js";
import { retry } from "../lib/retry.js";
import logger from "../lib/logger.js";

const db = initFirebase();

export function startCocinaWatcher() {
  const branchIds = getAllBranchIds();
  const cleanups: (() => void)[] = [];

  for (const branchId of branchIds) {
    const ordersRef = ref(db, `branches/${branchId}/orders`);

    const unsub = onChildAdded(ordersRef, (snap) => {
      const order = snap.val();
      if (!order || order.status !== "recibido") return;

      (async () => {
        try {
          const cocinaRef = child(ref(db), `branches/${branchId}/system/cocina/pendientes/${snap.key}`);
          await retry(() =>
            set(cocinaRef, {
              ...order,
              notifiedAt: Date.now(),
              branchId,
            }),
            {
              maxAttempts: 3,
              onRetry: (attempt, err) =>
                logger.warn(`cocina watch retry ${attempt}/${3} [${branchId}]: ${err.message}`),
            },
          );

          await reportToolCall(
            "atencion",
            "crear_pedido",
            { id: snap.key, branchId, cliente: order.cliente, total: order.total },
            "success",
            `🍳 Nuevo pedido [${branchId}]: ${order.cliente} — S/ ${Number(order.total).toFixed(2)}`,
            0,
          );
        } catch (e) {
          logger.error(`cocina watcher error [${branchId}] tras ${3} intentos:`, e);
        }
      })();
    });

    cleanups.push(() => off(ordersRef));
  }

  logger.info(`🍳 Cocina Watcher: ${branchIds.length} sucursal(es)`);
  return () => cleanups.forEach((fn) => fn());
}
