import { ref, onValue, set, push, remove, get, update } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { branchesConfigPath, branchesConfigByIdPath, branchPath } from './paths';

/**
 * branchService - Gestión dinámica de sucursales en Firebase RTDB.
 * Las sucursales se almacenan en el nodo `branches_config/{branchId}`.
 * Los catálogos y pedidos siguen en `branches/{branchId}/...` sin cambios.
 */
export const branchService = {

  /**
   * Suscribe en tiempo real al listado completo de sucursales configuradas.
   */
  subscribeToBranches(callback, onError) {
    const branchesRef = ref(db, branchesConfigPath());
    const onErrorHandler = typeof onError === 'function' ? onError : undefined;
    return onValue(branchesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([
          {
            id: 'monteverde',
            name: 'Monteverde',
            address: '',
            phone: '',
            coordinates: { lat: null, lng: null },
            schedule: '',
            active: true,
            tableCount: 0,
            deliveryEnabled: false,
            deliveryFee: 5,
            freeThreshold: 0,
            packagingItems: [
              { id: 'bottle', name: 'Botella', icon: '🍾', price: 0.50 },
              { id: 'halfL', name: '1/2 Litro', icon: '📦', price: 1.00 },
              { id: 'liter', name: '1 Litro', icon: '📦', price: 1.00 },
            ],
          }
        ]);
        return;
      }
      const branchesArray = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));
      callback(branchesArray);
    }, onErrorHandler);
  },

  /**
   * Crea una nueva sucursal en Firebase.
   */
  async createBranch(branchData) {
    try {
      const branchesRef = ref(db, branchesConfigPath());
      const newBranchRef = push(branchesRef);
      const branchId = newBranchRef.key;
      const tableCount = branchData.tableCount ?? 0;
      await set(newBranchRef, {
        name: branchData.name || 'Nueva Sucursal',
        address: branchData.address || '',
        phone: branchData.phone || '',
        coordinates: {
          lat: branchData.coordinates?.lat ?? null,
          lng: branchData.coordinates?.lng ?? null,
        },
        schedule: branchData.schedule || '',
        active: true,
        tableCount,
        deliveryEnabled: branchData.deliveryEnabled ?? false,
        deliveryFee: branchData.deliveryFee ?? 5,
        freeThreshold: branchData.freeThreshold ?? 0,
        packagingItems: branchData.packagingItems || [
          { id: 'bottle', name: 'Botella', icon: '🍾', price: 0.50 },
          { id: 'halfL', name: '1/2 Litro', icon: '📦', price: 1.00 },
          { id: 'liter', name: '1 Litro', icon: '📦', price: 1.00 },
        ],
      });
      // Auto-generate tables array for the Mozo module
      if (tableCount > 0) {
        const tablesRef = ref(db, `branches/${branchId}/tables`);
        await set(tablesRef, Array.from({ length: tableCount }, (_, i) => i + 1));
      }
      return { success: true, branchId };
    } catch (error) {
      console.error('branchService.createBranch error:', error);
      return { success: false, branchId: null };
    }
  },

  /**
   * Actualiza los campos de una sucursal existente.
   */
  async updateBranch(branchId, branchData) {
    try {
      const branchRef = ref(db, branchesConfigByIdPath(branchId));
      await update(branchRef, branchData);
      return { success: true };
    } catch (error) {
      console.error('branchService.updateBranch error:', error);
      return { success: false };
    }
  },

  /**
   * Elimina una sucursal de la configuración.
   */
  async deleteBranch(branchId) {
    try {
      const branchRef = ref(db, branchesConfigByIdPath(branchId));
      await remove(branchRef);
      return { success: true };
    } catch (error) {
      console.error('branchService.deleteBranch error:', error);
      return { success: false };
    }
  },

  /**
   * Clona el catálogo completo de una sucursal origen a una sucursal destino.
   * ADVERTENCIA: Sobreescribe completamente el catálogo de la sucursal destino.
   */
  async cloneMenu(sourceBranchId, targetBranchId) {
    try {
      const sourceCatalogRef = ref(db, branchPath(sourceBranchId, 'catalog'));
      const snapshot = await get(sourceCatalogRef);

      if (!snapshot.exists()) {
        return { success: false, error: 'El catálogo origen está vacío.' };
      }

      const catalogData = snapshot.val();
      const targetCatalogRef = ref(db, branchPath(targetBranchId, 'catalog'));
      await set(targetCatalogRef, catalogData);

      const itemCount = catalogData.products
        ? Object.keys(catalogData.products).length
        : 0;

      return { success: true, itemCount };
    } catch (error) {
      console.error('branchService.cloneMenu error:', error);
      return { success: false, error: error.message };
    }
  },
};
