import { ref, push, set, onValue, update, remove, get, runTransaction } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { deliveryDriversPath, deliveryZonesPath, deliveryLogsPath, deliveryTariffPath, ordersPath } from './paths';
import { nowISO } from './format';
import type { DeliveryDriver } from '../worker/workerTypes';

export interface DeliveryLog {
  id: string;
  orderId: string;
  driverId: string;
  driverName: string;
  assignedAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  status: string;
}

export interface DriverStats {
  total: number;
  delivered: number;
  pending: number;
}

export function calculateWaitingTime(updatedAt: string | number | undefined): number {
  if (!updatedAt) return 0;
  const ts = typeof updatedAt === 'string' ? new Date(updatedAt).getTime() : updatedAt;
  return Date.now() - ts;
}

export function formatWaitingTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function getWaitingUrgency(ms: number): 'low' | 'medium' | 'high' {
  if (ms > 30 * 60000) return 'high';
  if (ms > 15 * 60000) return 'medium';
  return 'low';
}

export const deliveryService = {

  // ─── TARIFF CONFIG ──────────────────────────────────

  subscribeToTariffConfig(branchId: string, callback: (config: Record<string, any>) => void, onError?: (err: Error) => void) {
    const refPath = ref(db, deliveryTariffPath(branchId));
    return onValue(refPath, (snap) => {
      const data = snap.val();
      if (!data) {
        callback({ tarifaBase: 3.5, precioPorKm: 1, kmGratis: 1 });
        return;
      }
      callback(data);
    }, onError);
  },

  async updateTariffConfig(branchId: string, data: Record<string, any>) {
    try {
      await set(ref(db, deliveryTariffPath(branchId)), data);
      return { success: true as const };
    } catch (error) {
      console.error('Error updating tariff config:', error);
      return { success: false as const };
    }
  },

  // ─── DRIVERS ────────────────────────────────────────

  subscribeToDrivers(branchId: string, callback: (drivers: DeliveryDriver[]) => void, onError?: (err: Error) => void) {
    const driversRef = ref(db, deliveryDriversPath(branchId));
    return onValue(driversRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { callback([]); return; }
      callback(Object.keys(data).map(key => ({ id: key, ...data[key] } as DeliveryDriver)));
    }, onError);
  },

  async createDriver(branchId: string, driverData: Partial<DeliveryDriver> & { userId?: string; email?: string }) {
    try {
      const driversRef = ref(db, deliveryDriversPath(branchId));
      const newRef = push(driversRef);
      const record: Record<string, any> = {
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
      return { success: true as const, driverId: newRef.key! };
    } catch (error) {
      console.error('Error creating driver:', error);
      return { success: false as const };
    }
  },

  async updateDriver(branchId: string, driverId: string, data: Record<string, any>) {
    try {
      await update(ref(db, deliveryDriversPath(branchId, driverId)), data);
      return { success: true as const };
    } catch (error) {
      console.error('Error updating driver:', error);
      return { success: false as const };
    }
  },

  async deleteDriver(branchId: string, driverId: string) {
    try {
      const driverRef = ref(db, deliveryDriversPath(branchId, driverId));
      const driverSnap = await get(driverRef);
      const driverData = driverSnap.val();

      // If driver is busy, unassign from active orders first
      if (driverData && driverData.available === false) {
        const allOrdersSnap = await get(ref(db, ordersPath(branchId)));
        const allOrders = allOrdersSnap.val();
        if (allOrders) {
          const orderUpdates: Record<string, null> = {};
          for (const [oid, order] of Object.entries(allOrders)) {
            const o = order as Record<string, unknown>;
            if (o.driverId === driverId) {
              orderUpdates[`${ordersPath(branchId, oid)}/driverId`] = null;
              orderUpdates[`${ordersPath(branchId, oid)}/driverName`] = null;
            }
          }
          if (Object.keys(orderUpdates).length > 0) {
            await update(ref(db), orderUpdates);
          }
        }
      }

      await remove(driverRef);
      return { success: true as const };
    } catch (error) {
      console.error('Error deleting driver:', error);
      return { success: false as const };
    }
  },

  // ─── DELIVERY ZONES ─────────────────────────────────

  subscribeToZones(branchId: string, callback: (zones: any[]) => void, onError?: (err: Error) => void) {
    const zonesRef = ref(db, deliveryZonesPath(branchId));
    return onValue(zonesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { callback([]); return; }
      callback(Object.keys(data).map(key => ({ id: key, ...data[key] })));
    }, onError);
  },

  async createZone(branchId: string, zoneData: Record<string, any>) {
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
      return { success: true as const, zoneId: newRef.key! };
    } catch (error) {
      console.error('Error creating zone:', error);
      return { success: false as const };
    }
  },

  async updateZone(branchId: string, zoneId: string, data: Record<string, any>) {
    try {
      await update(ref(db, deliveryZonesPath(branchId, zoneId)), data);
      return { success: true as const };
    } catch (error) {
      console.error('Error updating zone:', error);
      return { success: false as const };
    }
  },

  async deleteZone(branchId: string, zoneId: string) {
    try {
      await remove(ref(db, deliveryZonesPath(branchId, zoneId)));
      return { success: true as const };
    } catch (error) {
      console.error('Error deleting zone:', error);
      return { success: false as const };
    }
  },

  // ─── ORDER-DRIVER ASSIGNMENT ────────────────────────

  async assignDriver(branchId: string, orderId: string, driverId: string, driverName: string) {
    const driverRef = ref(db, deliveryDriversPath(branchId, driverId));
    const orderRef = ref(db, ordersPath(branchId, orderId));
    let logKey: string | null = null;
    try {
      const driverSnap = await get(driverRef);
      if (!driverSnap.exists()) {
        return { success: false as const, error: 'Repartidor no encontrado' };
      }
      const driverData = driverSnap.val();
      if (driverData.available === false) {
        return { success: false as const, error: 'Repartidor no disponible' };
      }

      // 1. Create delivery log FIRST (cheap, easy to revert)
      const logRef = push(ref(db, deliveryLogsPath(branchId)));
      logKey = logRef.key;
      await set(logRef, {
        orderId, driverId, driverName,
        assignedAt: nowISO(),
        pickedUpAt: null,
        deliveredAt: null,
        status: 'en_camino',
      });

      // 2. Mark driver unavailable
      await update(driverRef, { available: false });

      // 3. Transaction on order LAST — most critical, atomic
      const orderResult = await runTransaction(orderRef, (current) => {
        if (current === null) return null;
        if (current.driverId) return;
        return { ...current, driverId, driverName, status: 'en_camino', updatedAt: nowISO() };
      });

      if (!orderResult.committed || !orderResult.snapshot?.val()) {
        // Order was taken — revert log + driver
        try { if (logKey) await remove(ref(db, deliveryLogsPath(branchId, logKey))); } catch (_) {}
        try { await update(driverRef, { available: true }); } catch (_) {}
        return { success: false as const, error: 'Orden no disponible o ya asignada' };
      }

      return { success: true as const };
    } catch (error) {
      // Revert all side effects on failure
      try { if (logKey) await remove(ref(db, deliveryLogsPath(branchId, logKey))); } catch (_) {}
      try { await update(driverRef, { available: true }); } catch (_) {}
      console.error('Error assigning driver:', error);
      return { success: false as const };
    }
  },

  async unassignDriver(branchId: string, orderId: string) {
    try {
      const orderRef = ref(db, ordersPath(branchId, orderId));
      let releasedDriverId: string | null = null;

      await runTransaction(orderRef, (current) => {
        if (current === null) return null;
        releasedDriverId = current.driverId;
        return { ...current, driverId: null, driverName: null, status: 'listo', updatedAt: nowISO() };
      });

      const logsRef = ref(db, deliveryLogsPath(branchId));
      const logsSnap = await get(logsRef);
      if (logsSnap.exists()) {
        const logs = logsSnap.val() as Record<string, DeliveryLog>;
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

      return { success: true as const };
    } catch (error) {
      console.error('Error unassigning driver:', error);
      return { success: false as const };
    }
  },

  async confirmDelivery(branchId: string, orderId: string, driverId: string) {
    try {
      const orderRef = ref(db, ordersPath(branchId, orderId));
      await runTransaction(orderRef, (current) => {
        if (current === null) return null;
        if (current.status === 'entregado') return;
        return { ...current, status: 'entregado', deliveredAt: nowISO(), updatedAt: nowISO() };
      });

      const logsRef = ref(db, deliveryLogsPath(branchId));
      const logsSnap = await get(logsRef);
      if (logsSnap.exists()) {
        const logs = logsSnap.val() as Record<string, DeliveryLog>;
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
      return { success: true as const };
    } catch (error) {
      console.error('Error confirming delivery:', error);
      return { success: false as const };
    }
  },

  // ─── DELIVERY METRICS ────────────────────────────────

  subscribeToDeliveryLogs(branchId: string, callback: (logs: DeliveryLog[]) => void, onError?: (err: Error) => void) {
    const logsRef = ref(db, deliveryLogsPath(branchId));
    return onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { callback([]); return; }
      callback(Object.keys(data).map(key => ({ id: key, ...data[key] } as DeliveryLog)));
    }, onError);
  },

  async getDriverStats(branchId: string, driverId: string): Promise<DriverStats> {
    try {
      const logsRef = ref(db, deliveryLogsPath(branchId));
      const snap = await get(logsRef);
      if (!snap.exists()) return { total: 0, delivered: 0, pending: 0 };

      const logs = snap.val() as Record<string, DeliveryLog>;
      const myLogs = Object.values(logs).filter((l) => l.driverId === driverId);

      const total = myLogs.length;
      const delivered = myLogs.filter((l) => l.status === 'delivered').length;
      return { total, delivered, pending: total - delivered };
    } catch {
      return { total: 0, delivered: 0, pending: 0 };
    }
  },
};
