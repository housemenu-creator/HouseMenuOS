/**
 * reservationService — Sistema de reservas para el cliente.
 * Datos en RTDB: branches/{bid}/reservations/{id}
 */
import { ref, push, set, onValue, update } from 'firebase/database';
import { realtimeDB as db } from '@house/db';

const RES_PATH = (bid) => `branches/${bid}/reservations`;
const SETTINGS_PATH = (bid) => `branches_config/${bid}/reservationSettings`;

export const reservationService = {
  /**
   * Crear una nueva reserva.
   */
  async create({ branchId, date, time, partySize, customerName, customerPhone, customerEmail, notes }) {
    if (!branchId || !date || !time || !partySize || !customerName) {
      return { success: false, error: 'Faltan campos requeridos' };
    }

    const refPath = ref(db, RES_PATH(branchId));
    const newRef = push(refPath);
    const now = new Date().toISOString();

    const reservation = {
      date,
      time,
      partySize: Number(partySize),
      customerName: customerName.trim().slice(0, 100),
      customerPhone: (customerPhone || '').trim().slice(0, 20),
      customerEmail: (customerEmail || '').trim().slice(0, 120),
      notes: (notes || '').trim().slice(0, 300),
      status: 'pending', // pending | confirmed | cancelled | completed
      createdAt: now,
      updatedAt: now,
      id: newRef.key,
    };

    try {
      await set(newRef, reservation);
      return { success: true, id: newRef.key };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Actualizar estado de una reserva.
   */
  async updateStatus(branchId, reservationId, status, actor = 'admin') {
    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return { success: false, error: 'Estado inválido' };
    }
    try {
      await update(ref(db, `${RES_PATH(branchId)}/${reservationId}`), {
        status,
        updatedAt: new Date().toISOString(),
        [`${status}At`]: new Date().toISOString(),
        [`${status}By`]: actor,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Suscribirse a reservas de una sucursal (tiempo real).
   */
  subscribe(branchId, callback) {
    if (!branchId) return () => {};
    const reservRef = ref(db, RES_PATH(branchId));
    return onValue(reservRef, (snap) => {
      const data = snap.val();
      if (!data) { callback([]); return; }
      const list = Object.values(data).map(r => ({
        ...r,
        // Normalizar partySize si viene como string
        partySize: Number(r.partySize) || 1,
      }));
      // Ordenar por fecha descendente
      list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.time || '').localeCompare(a.time || ''));
      callback(list);
    });
  },

  /**
   * Obtener settings de reservas para una sucursal.
   */
  subscribeSettings(branchId, callback) {
    if (!branchId) return () => {};
    const settingsRef = ref(db, SETTINGS_PATH(branchId));
    return onValue(settingsRef, (snap) => {
      const data = snap.val();
      callback(data || DEFAULT_SETTINGS);
    });
  },

  /**
   * Guardar settings de reservas.
   */
  async saveSettings(branchId, settings) {
    try {
      await set(ref(db, SETTINGS_PATH(branchId)), {
        ...DEFAULT_SETTINGS,
        ...settings,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};

// ── Standalone exports for ergonomic imports ──

export function subscribeReservations(branchId, callback) {
  return reservationService.subscribe(branchId, callback);
}

export function updateReservationStatus(branchId, id, status) {
  return reservationService.updateStatus(branchId, id, status);
}

export function subscribeReservationSettings(branchId, callback) {
  return reservationService.subscribeSettings(branchId, callback);
}

export function saveReservationSettings(branchId, settings) {
  return reservationService.saveSettings(branchId, settings);
}

export async function createReservation(data) {
  return reservationService.create(data);
}

export const DEFAULT_SETTINGS = {
  enabled: true,
  maxPartySize: 12,
  minHoursNotice: 1,
  timeSlots: [
    '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00',
    '19:00', '19:30', '20:00', '20:30',
    '21:00', '21:30',
  ],
  maxReservationsPerSlot: 3,
  advanceDays: 30,
};
