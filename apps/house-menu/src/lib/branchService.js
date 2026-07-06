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
      // Guarda TODO lo que viene del form, con defaults solo para campos críticos
      const { id, ...cleanData } = branchData; // eliminar id por si acaso
      const payload = {
        ...cleanData,
        active: true,
        tableCount,
        coordinates: {
          lat: cleanData.coordinates?.lat ?? null,
          lng: cleanData.coordinates?.lng ?? null,
        },
        packagingItems: cleanData.packagingItems?.length > 0
          ? cleanData.packagingItems
          : [{ id: 'bottle', name: 'Botella', icon: '🍾', price: 0.50 },
             { id: 'halfL', name: '1/2 Litro', icon: '📦', price: 1.00 },
             { id: 'liter', name: '1 Litro', icon: '📦', price: 1.00 }],
      };
      await set(newBranchRef, payload);
      // Auto-generate tables array for the Mozo module
      if (tableCount > 0) {
        const tablesRef = ref(db, `branches/${branchId}/tables`);
        await set(tablesRef, Array.from({ length: tableCount }, (_, i) => i + 1));
      }
      return { success: true, branchId };
    } catch (error) {
      console.error('[createBranch] ERROR:', error.code, error.message, error);
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
   * Cambia el estado activo/inactivo de una sucursal.
   * Es la acción principal — reemplaza al borrado directo.
   */
  async setBranchActive(branchId, isActive) {
    try {
      const branchRef = ref(db, branchesConfigByIdPath(branchId));
      await update(branchRef, { active: isActive });
      return { success: true };
    } catch (error) {
      console.error('branchService.setBranchActive error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Elimina UNA SUCURSAL de forma PERMANENTE.
   * Solo borra branches_config/{branchId}.
   * Los datos operativos (branches/{branchId}/...) quedan huérfanos.
   * No debería usarse — preferir setBranchActive.
   */
  async deleteBranch(branchId) {
    try {
      const branchRef = ref(db, branchesConfigByIdPath(branchId));
      await remove(branchRef);
      return { success: true };
    } catch (error) {
      console.error('branchService.deleteBranch error:', error);
      return { success: false, error: error.message };
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
