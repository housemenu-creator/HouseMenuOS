import { ref, onValue, push, set, update, remove, get } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { dailyMenusPath, dailyMenuProductIdsPath } from './paths';

export const dailyMenuService = {
  subscribeToDailyMenus(branchId, callback) {
    const menusRef = ref(db, dailyMenusPath(branchId));
    return onValue(menusRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback({});
        return;
      }
      callback(data);
    });
  },

  async getDailyMenu(branchId, dateStr) {
    try {
      const menuRef = ref(db, dailyMenusPath(branchId, dateStr));
      const snapshot = await get(menuRef);
      if (!snapshot.exists()) return null;
      return { date: dateStr, ...snapshot.val() };
    } catch (e) {
      console.warn("dailyMenuService.getDailyMenu error:", e);
      return null;
    }
  },

  async setDailyMenu(branchId, dateStr, menuData) {
    try {
      const menuRef = ref(db, dailyMenusPath(branchId, dateStr));
      await set(menuRef, {
        name: menuData.name || 'Menu del Dia',
        description: menuData.description || '',
        productIds: menuData.productIds || [],
        basePrice: menuData.basePrice || 0,
        active: menuData.active !== false,
        updatedAt: Date.now(),
      });
      return { success: true };
    } catch (error) {
      console.error('dailyMenuService.setDailyMenu error:', error);
      return { success: false, error: error.message };
    }
  },

  async removeDailyMenu(branchId, dateStr) {
    try {
      const menuRef = ref(db, dailyMenusPath(branchId, dateStr));
      await remove(menuRef);
      return { success: true };
    } catch (error) {
      console.error('dailyMenuService.removeDailyMenu error:', error);
      return { success: false, error: error.message };
    }
  },

  async addProductToDailyMenu(branchId, dateStr, productId) {
    try {
      const menuRef = ref(db, dailyMenuProductIdsPath(branchId, dateStr));
      const snapshot = await get(menuRef);
      const current = snapshot.val() || [];
      if (current.includes(productId)) return { success: true };
      current.push(productId);
      await set(menuRef, current);
      return { success: true };
    } catch (error) {
      console.error('dailyMenuService.addProductToDailyMenu error:', error);
      return { success: false, error: error.message };
    }
  },

  async removeProductFromDailyMenu(branchId, dateStr, productId) {
    try {
      const menuRef = ref(db, dailyMenuProductIdsPath(branchId, dateStr));
      const snapshot = await get(menuRef);
      const current = snapshot.val() || [];
      await set(menuRef, current.filter(id => id !== productId));
      return { success: true };
    } catch (error) {
      console.error('dailyMenuService.removeProductFromDailyMenu error:', error);
      return { success: false, error: error.message };
    }
  },
};
