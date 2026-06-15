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

  subscribeToTariffConfig(branchId: string, callback: (config: Record<string, any>) => void) {
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

  subscribeToDrivers(branchId: string, callback: (drivers: DeliveryDriver[]) => void) {
    const driversRef = ref(db, deliveryDriversPath(branchId));
    return onValue(driversRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { callback([]); return; }
      callback(Object.keys(data).map(key => ({ id: key, ...data[key] } as DeliveryDriver)));
    });
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
      await remove(ref(db, deliveryDriversPath(branchId, driverId)));
      return { success: true as const };
    } catch (error) {
      console.error('Error deleting driver:', error);
      return { success: false as const };
    }
  },

  // ─── DELIVERY ZONES ─────────────────────────────────

  subscribeToZones(branchId: string, callback: (zones: any[]) => void) {
    const zonesRef = ref(db, deliveryZonesPath(branchId));
    return onValue(zonesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { callback([]); return; }
      callback(Object.keys(data).map(key => ({ id: key, ...data[key] })));
    });
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
    try {
      const driverSnap = await get(driverRef);
      if (!driverSnap.exists()) {
        return { success: false as const, error: 'Repartidor no encontrado' };
      }
      const driverData = driverSnap.val();
      if (driverData.available === false) {
        return { success: false as const, error: 'Repartidor no disponible' };
      }

      const orderRef = ref(db, ordersPath(branchId, orderId));
      const orderResult = await runTransaction(orderRef, (current) => {
        if (current === null) return null;
        if (current.driverId) return;
        return { ...current, driverId, driverName, status: 'en_camino', updatedAt: nowISO() };
      });

      if (!orderResult.committed || !orderResult.snapshot?.val()) {
        return { success: false as const, error: 'Orden no disponible o ya asignada' };
      }

      await update(driverRef, { available: false });

      const logRef = push(ref(db, deliveryLogsPath(branchId)));
      await set(logRef, {
        orderId, driverId, driverName,
        assignedAt: nowISO(),
        pickedUpAt: null,
        deliveredAt: null,
        status: 'en_camino',
      });
      return { success: true as const };
    } catch (error) {
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

  subscribeToDeliveryLogs(branchId: string, callback: (logs: DeliveryLog[]) => void) {
    const logsRef = ref(db, deliveryLogsPath(branchId));
    return onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { callback([]); return; }
      callback(Object.keys(data).map(key => ({ id: key, ...data[key] } as DeliveryLog)));
    });
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
