import { ref, push, set, onValue, update, remove, get, runTransaction } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { deliveryDriversPath, deliveryZonesPath, deliveryLogsPath, deliveryTariffPath, ordersPath } from './paths';
import { nowISO } from './format';

export const deliveryService = {

  // ─── TARIFF CONFIG ──────────────────────────────────

  subscribeToTariffConfig(branchId, callback) {
    const refPath = ref(db, deliveryTariffPath(branchId));
    return onValue(refPath, (snap) => {
      const data = snap.val();
      if (!data) {
        callback({ tarifaBase: 3.5, precioPorKm: 1, kmGratis: 1 });
        return;
      }
      callback(data);
    });
  },

  async updateTariffConfig(branchId, data) {
    try {
      await set(ref(db, deliveryTariffPath(branchId)), data);
      return { success: true };
    } catch (error) {
      console.error('Error updating tariff config:', error);
      return { success: false };
    }
  },

  // ─── DRIVERS ────────────────────────────────────────

  subscribeToDrivers(branchId, callback) {
    const driversRef = ref(db, deliveryDriversPath(branchId));
    return onValue(driversRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { callback([]); return; }
      callback(Object.keys(data).map(key => ({ id: key, ...data[key] })));
    });
  },

  async createDriver(branchId, driverData) {
    try {
      const driversRef = ref(db, deliveryDriversPath(branchId));
      const newRef = push(driversRef);
      const record = {
        name: driverData.name || '',
        phone: driverData.phone || '',
        vehicle: driverData.vehicle || 'Moto',
        active: true,
        available: true,
        totalDeliveries: 0,
        rating: 5,
        createdAt: nowISO(),
      };
      if (driverData.userId) record.userId = driverData.userId;
      if (driverData.email) record.email = driverData.email;
      await set(newRef, record);
      return { success: true, driverId: newRef.key };
    } catch (error) {
      console.error('Error creating driver:', error);
      return { success: false };
    }
  },

  async updateDriver(branchId, driverId, data) {
    try {
      await update(ref(db, deliveryDriversPath(branchId, driverId)), data);
      return { success: true };
    } catch (error) {
      console.error('Error updating driver:', error);
      return { success: false };
    }
  },

  async deleteDriver(branchId, driverId) {
    try {
      await remove(ref(db, deliveryDriversPath(branchId, driverId)));
      return { success: true };
    } catch (error) {
      console.error('Error deleting driver:', error);
      return { success: false };
    }
  },

  // ─── DELIVERY ZONES ─────────────────────────────────

  subscribeToZones(branchId, callback) {
    const zonesRef = ref(db, deliveryZonesPath(branchId));
    return onValue(zonesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { callback([]); return; }
      callback(Object.keys(data).map(key => ({ id: key, ...data[key] })));
    });
  },

  async createZone(branchId, zoneData) {
    try {
      const zonesRef = ref(db, deliveryZonesPath(branchId));
      const newRef = push(zonesRef);
      await set(newRef, {
        name: zoneData.name || '',
        fee: parseFloat(zoneData.fee) || 0,
        freeThreshold: zoneData.freeThreshold != null ? parseFloat(zoneData.freeThreshold) : null,
        estimatedMinutes: parseInt(zoneData.estimatedMinutes) || 15,
        active: true,
        priority: parseInt(zoneData.priority) || 0,
        createdAt: nowISO(),
      });
      return { success: true, zoneId: newRef.key };
    } catch (error) {
      console.error('Error creating zone:', error);
      return { success: false };
    }
  },

  async updateZone(branchId, zoneId, data) {
    try {
      await update(ref(db, deliveryZonesPath(branchId, zoneId)), data);
      return { success: true };
    } catch (error) {
      console.error('Error updating zone:', error);
      return { success: false };
    }
  },

  async deleteZone(branchId, zoneId) {
    try {
      await remove(ref(db, deliveryZonesPath(branchId, zoneId)));
      return { success: true };
    } catch (error) {
      console.error('Error deleting zone:', error);
      return { success: false };
    }
  },

  // ─── ORDER-DRIVER ASSIGNMENT ────────────────────────

  async assignDriver(branchId, orderId, driverId, driverName) {
    const driverRef = ref(db, deliveryDriversPath(branchId, driverId));
    try {
      const driverResult = await runTransaction(driverRef, (current) => {
        if (current === null) return;
        if (current.available === false) return;
        return { ...current, available: false };
      });
      if (driverResult.committed !== true || driverResult.data === undefined) {
        return { success: false, error: 'Repartidor no disponible' };
      }

      const orderRef = ref(db, ordersPath(branchId, orderId));
      const orderResult = await runTransaction(orderRef, (current) => {
        if (current === null) return null;
        if (current.driverId) return;
        return { ...current, driverId, driverName, status: 'en_camino', updatedAt: nowISO() };
      });

      if (orderResult.committed !== true || orderResult.data === undefined) {
        await update(driverRef, { available: true });
        return { success: false, error: 'Orden no disponible o ya asignada' };
      }

      const logRef = push(ref(db, deliveryLogsPath(branchId)));
      await set(logRef, {
        orderId, driverId, driverName,
        assignedAt: nowISO(),
        pickedUpAt: null, deliveredAt: null,
        status: 'en_camino',
      });
      return { success: true };
    } catch (error) {
      try { await update(driverRef, { available: true }); } catch (_) {}
      console.error('Error assigning driver:', error);
      return { success: false };
    }
  },

  async unassignDriver(branchId, orderId) {
    try {
      const orderRef = ref(db, ordersPath(branchId, orderId));
      let releasedDriverId = null;

      await runTransaction(orderRef, (current) => {
        if (current === null) return null;
        releasedDriverId = current.driverId;
        return { ...current, driverId: null, driverName: null, status: 'listo', updatedAt: nowISO() };
      });

      const logsRef = ref(db, deliveryLogsPath(branchId));
      const logsSnap = await get(logsRef);
      if (logsSnap.exists()) {
        const logs = logsSnap.val();
        const logEntry = Object.entries(logs).find(([, l]) => l.orderId === orderId && l.status === 'en_camino');
        if (logEntry) {
          const [logKey] = logEntry;
          await update(ref(db, deliveryLogsPath(branchId, logKey)), { status: 'unassigned', unassignedAt: nowISO() });
        }
      }

      if (releasedDriverId) {
        const driverRef = ref(db, deliveryDriversPath(branchId, releasedDriverId));
        await update(driverRef, { available: true });
      }

      return { success: true };
    } catch (error) {
      console.error('Error unassigning driver:', error);
      return { success: false };
    }
  },

  async confirmDelivery(branchId, orderId, driverId) {
    try {
      const orderRef = ref(db, ordersPath(branchId, orderId));
      await runTransaction(orderRef, (current) => {
        if (current === null) return null;
        return { ...current, status: 'entregado', deliveredAt: nowISO(), updatedAt: nowISO() };
      });

      const logsRef = ref(db, deliveryLogsPath(branchId));
      const logsSnap = await get(logsRef);
      if (logsSnap.exists()) {
        const logs = logsSnap.val();
        const logEntry = Object.entries(logs).find(([, l]) => l.orderId === orderId && !l.deliveredAt);
        if (logEntry) {
          const [logKey] = logEntry;
          await update(ref(db, deliveryLogsPath(branchId, logKey)), {
            deliveredAt: nowISO(),
            status: 'delivered',
          });
        }
      }

      if (driverId) {
        const driverRef = ref(db, deliveryDriversPath(branchId, driverId));
        await runTransaction(driverRef, (current) => {
          if (current === null) return null;
          return { ...current, totalDeliveries: (current.totalDeliveries || 0) + 1, available: true };
        });
      }
      return { success: true };
    } catch (error) {
      console.error('Error confirming delivery:', error);
      return { success: false };
    }
  },

  // ─── DELIVERY METRICS ────────────────────────────────

  subscribeToDeliveryLogs(branchId, callback) {
    const logsRef = ref(db, deliveryLogsPath(branchId));
    return onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { callback([]); return; }
      callback(Object.keys(data).map(key => ({ id: key, ...data[key] })));
    });
  },
};
