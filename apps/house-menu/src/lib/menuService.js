import { ref, onValue, set, push, remove, get, update } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { normalizeFirebaseData } from './normalizeFirebaseData';
import { catalogPath, catalogProductsPath, catalogFieldPath } from './paths';

export const menuService = {
  /**
   * Obtiene la estructura relacional completa del catálogo desde Firebase
   * @param {string} branchId - ID de la sucursal
   * @param {Function} callback (catalog) => void
   */
  subscribeToCatalog(branchId, callback, onError) {
    try {
      const catalogRef = ref(db, catalogPath(branchId));
      return onValue(catalogRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          callback({ products: {}, modifiers: {}, variations: {} });
          return;
        }
        callback(normalizeFirebaseData(data));
      }, (error) => {
        console.warn('menuService.subscribeToCatalog error:', error);
        if (onError) onError(error);
      });
    } catch (error) {
      console.warn('menuService.subscribeToCatalog setup error:', error);
      if (onError) onError(error);
      return () => {};
    }
  },

  /**
   * Actualiza la disponibilidad de un producto en tiempo real
   */
  async updateProductAvailability(branchId, productId, isAvailable) {
    const itemRef = ref(db, catalogFieldPath(branchId, productId, 'available'));
    await set(itemRef, isAvailable);
  },

  /**
   * Actualiza un campo específico de un producto (ej. name, base_price) de forma atómica
   */
  async updateProductField(branchId, productId, field, value) {
    const fieldRef = ref(db, catalogFieldPath(branchId, productId, field));
    await set(fieldRef, value);
  },

  /**
   * Crea un nuevo producto en una categoría específica
   */
  async createProduct(branchId, category) {
    const productsRef = ref(db, catalogProductsPath(branchId));
    const newProductRef = push(productsRef);
    const newProduct = {
      name: "Nuevo Plato",
      category: category,
      base_price: 0,
      available: false,
      description: "Descripción del plato...",
      image: "",
      isWizard: false,
      steps: []
    };
    await set(newProductRef, newProduct);
    return newProductRef.key;
  },

  /**
   * Crea una nueva categoría insertando un plato "fantasma" inactivo
   */
  async createCategory(branchId, categoryName) {
    const productsRef = ref(db, catalogProductsPath(branchId));
    const newProductRef = push(productsRef);
    const newProduct = {
      name: "Plato de Ejemplo",
      category: categoryName,
      base_price: 0,
      available: false,
      description: "Edita o elimina este plato de ejemplo.",
      image: "",
      isWizard: false,
      steps: []
    };
    await set(newProductRef, newProduct);
    return newProductRef.key;
  },

  /**
   * Duplica un producto existente exactamente como está
   */
  async duplicateProduct(branchId, product) {
    const productsRef = ref(db, catalogProductsPath(branchId));
    const newProductRef = push(productsRef);
    
    // Create a copy but remove id and change name
    const { id, ...productData } = product;
    const newProduct = {
      ...productData,
      name: `Copia de ${productData.name}`,
      available: false // Duplicates start inactive for safety
    };
    
    await set(newProductRef, newProduct);
    return newProductRef.key;
  },

  /**
   * Elimina un producto del catálogo
   */
  async deleteProduct(branchId, productId) {
    const itemRef = ref(db, catalogPath(branchId, productId));
    await remove(itemRef);
  },

  /**
   * Renombra una categoría actualizando el campo 'category' de todos los productos correspondientes
   */
  async renameCategory(branchId, oldCategoryName, newCategoryName) {
    if (!newCategoryName || !newCategoryName.trim() || oldCategoryName === newCategoryName) return;
    const cleanNewCategory = newCategoryName.trim();
    
    const productsRef = ref(db, catalogProductsPath(branchId));
    const snapshot = await get(productsRef);
    if (snapshot.exists()) {
      const products = snapshot.val();
      const updates = {};
      Object.entries(products).forEach(([id, p]) => {
        if (p.category === oldCategoryName) {
          updates[`${id}/category`] = cleanNewCategory;
        }
      });
      if (Object.keys(updates).length > 0) {
        const productsUpdateRef = ref(db, catalogProductsPath(branchId));
        await update(productsUpdateRef, updates);
      }
    }
  }
};
