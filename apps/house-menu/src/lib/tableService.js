import { ref, push, set, update, remove, onValue, get } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { tablesPath } from './paths';
import { nowISO } from './format';

/**
 * @typedef {Object} Table
 * @property {string}  id
 * @property {number}  number       — número de la mesa
 * @property {string}  name         — ej. "Mesa 3"
 * @property {number}  capacity     — personas
 * @property {'libre'|'ocupada'|'cuenta_pedida'} status
 * @property {string|null} currentOrderId
 * @property {string}  section      — 'salon' | 'terraza' | 'barra'
 * @property {string}  createdAt
 * @property {string}  updatedAt
 */

export const tableService = {
  /**
   * Suscribirse a las mesas en tiempo real.
   * @param {string} branchId
   * @param {(tables: Table[]) => void} callback
   * @returns {() => void} unsubscribe
   */
  subscribeToTables(branchId, callback) {
    const tablesRef = ref(db, tablesPath(branchId));
    return onValue(tablesRef, (snap) => {
      const data = snap.val();
      if (!data) {
        callback([]);
        return;
      }
      const tables = Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .sort((a, b) => (a.number || 0) - (b.number || 0));
      callback(tables);
    });
  },

  /**
   * Obtener mesas una sola vez (sin suscripción).
   * @param {string} branchId
   * @returns {Promise<Table[]>}
   */
  async getTables(branchId) {
    const snap = await get(ref(db, tablesPath(branchId)));
    const data = snap.val();
    if (!data) return [];
    return Object.entries(data)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => (a.number || 0) - (b.number || 0));
  },

  /**
   * Crear una nueva mesa.
   * @param {string} branchId
   * @param {{ number: number, name?: string, capacity?: number, section?: string }} tableData
   * @returns {Promise<{ success: boolean, tableId?: string, error?: string }>}
   */
  async createTable(branchId, tableData) {
    try {
      const tablesRef = ref(db, tablesPath(branchId));
      const newRef = push(tablesRef);
      const timestamp = nowISO();
      const table = {
        number: tableData.number,
        name: tableData.name || `Mesa ${tableData.number}`,
        capacity: tableData.capacity || 4,
        section: tableData.section || 'salon',
        status: 'libre',
        currentOrderId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await set(newRef, table);
      return { success: true, tableId: newRef.key };
    } catch (error) {
      console.error('Error creating table:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Actualizar campos de una mesa.
   * @param {string} branchId
   * @param {string} tableId
   * @param {Partial<Table>} updates
   */
  async updateTable(branchId, tableId, updates) {
    try {
      const tableRef = ref(db, `${tablesPath(branchId)}/${tableId}`);
      await update(tableRef, { ...updates, updatedAt: nowISO() });
      return { success: true };
    } catch (error) {
      console.error('Error updating table:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Eliminar una mesa.
   * @param {string} branchId
   * @param {string} tableId
   */
  async deleteTable(branchId, tableId) {
    try {
      await remove(ref(db, `${tablesPath(branchId)}/${tableId}`));
      return { success: true };
    } catch (error) {
      console.error('Error deleting table:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Cambiar el estado de una mesa (libre / ocupada / cuenta_pedida).
   * @param {string} branchId
   * @param {string} tableId
   * @param {'libre'|'ocupada'|'cuenta_pedida'} status
   * @param {string|null} [orderId]
   */
  async setTableStatus(branchId, tableId, status, orderId = null) {
    try {
      const tableRef = ref(db, `${tablesPath(branchId)}/${tableId}`);
      await update(tableRef, {
        status,
        currentOrderId: status === 'libre' ? null : orderId,
        updatedAt: nowISO(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error setting table status:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Genera las mesas iniciales para una sucursal nueva.
   * @param {string} branchId
   * @param {number} [count=10]
   */
  async seedTables(branchId, count = 10) {
    const existing = await this.getTables(branchId);
    if (existing.length > 0) return { success: true, skipped: true };
    const results = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        this.createTable(branchId, { number: i + 1, capacity: 4, section: 'salon' })
      )
    );
    return { success: true, created: results.length };
  },
};
