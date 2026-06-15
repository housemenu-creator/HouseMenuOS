import { ref, onValue, onChildAdded, onChildChanged, onChildRemoved, push, set, get, update, remove } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { normalizeFirebaseData } from './normalizeFirebaseData';
import { flashOfferPath, flashOfferItemsPath, flashOfferActivePath } from './paths';

/**
 * Servicio para manejar ofertas flash (flash sales) en tiempo real
 */
export const flashOfferService = {
  /**
   * Suscribirse a ofertas flash activas para una sucursal.
   * Escucha el índice activo + datos completos, los une y devuelve ofertas con campos completos.
   * @param {string} branchId - ID de la sucursal
   * @param {Function} callback - Función que recibe las ofertas flash activas
   * @param {Function} onError - Función de manejo de errores (opcional)
   * @returns {Function} Función para cancelar la suscripción
   */
  subscribeToActiveFlashOffers(branchId, callback, onError) {
    try {
      let activeIds = new Set();
      let allOffers = {}; // {offerId: fullData}
      let dirty = false;

      function emit() {
        if (!dirty) return;
        const active = [...activeIds]
          .map((id) => allOffers[id])
          .filter(Boolean);
        callback(active.length > 0 ? active : null);
        dirty = false;
      }

      const markDirty = () => { dirty = true; };

      // 1. Escuchar el índice activo (qué IDs están activos)
      const activeRef = ref(db, flashOfferActivePath(branchId));
      const unsubIndex = onValue(activeRef, (snap) => {
        const val = snap.val();
        activeIds = new Set(val ? Object.keys(val) : []);
        markDirty();
        // Esperar al próximo microtask para dar tiempo a que allOffers se poble
        queueMicrotask(emit);
      }, (error) => {
        if (onError) onError(error);
      });

      // 2. Escuchar datos completos de TODAS las ofertas
      const allRef = ref(db, flashOfferPath(branchId));
      const unsubAdd = onChildAdded(allRef, (snap) => {
        allOffers[snap.key] = { id: snap.key, ...normalizeFirebaseData(snap.val()) };
        markDirty();
        queueMicrotask(emit);
      });
      const unsubChange = onChildChanged(allRef, (snap) => {
        if (allOffers[snap.key]) {
          allOffers[snap.key] = { id: snap.key, ...normalizeFirebaseData(snap.val()) };
          markDirty();
          queueMicrotask(emit);
        }
      });
      const unsubRemove = onChildRemoved(allRef, (snap) => {
        delete allOffers[snap.key];
        markDirty();
        queueMicrotask(emit);
      });

      return () => {
        unsubIndex();
        unsubAdd();
        unsubChange();
        unsubRemove();
      };
    } catch (error) {
      console.warn('flashOfferService.subscribeToActiveFlashOffers setup error:', error);
      if (onError) onError(error);
      return () => {};
    }
  },

  /**
   * Obtener una oferta flash específica por ID
   * @param {string} branchId - ID de la sucursal
   * @param {string} offerId - ID de la oferta flash
   * @returns {Promise<Object>} Promesa que resuelve con los datos de la oferta
   */
  async getFlashOffer(branchId, offerId) {
    try {
      const offerRef = ref(db, `${flashOfferPath(branchId)}/${offerId}`);
      const snapshot = await get(offerRef);
      if (snapshot.exists()) {
        return normalizeFirebaseData(snapshot.val());
      }
      return null;
    } catch (error) {
      console.error('Error getting flash offer:', error);
      throw error;
    }
  },

  /**
   * Crear una nueva oferta flash
   * @param {string} branchId - ID de la sucursal
   * @param {Object} offerData - Datos de la oferta flash
   * @returns {Promise<string>} Promesa que resuelve con el ID de la nueva oferta
   */
  async createFlashOffer(branchId, offerData) {
    try {
      const offersRef = ref(db, flashOfferPath(branchId));
      const newOfferRef = push(offersRef);
      
      // Preparar datos de la oferta
      const flashOffer = {
        ...offerData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: true,
        views: 0,
        conversions: 0
      };
      
      await set(newOfferRef, flashOffer);
      
      // También agregar a ofertas activas si corresponde
      if (offerData.isActive && offerData.startTime <= Date.now() && offerData.endTime >= Date.now()) {
        const activeRef = ref(db, flashOfferActivePath(branchId));
        await set(ref(activeRef, newOfferRef.key), true);
      }
      
      return newOfferRef.key;
    } catch (error) {
      console.error('Error creating flash offer:', error);
      throw error;
    }
  },

  /**
   * Actualizar una oferta flash existente
   * @param {string} branchId - ID de la sucursal
   * @param {string} offerId - ID de la oferta flash
   * @param {Object} updates - Campos a actualizar
   * @returns {Promise<void>}
   */
  async updateFlashOffer(branchId, offerId, updates) {
    try {
      const offerRef = ref(db, `${flashOfferPath(branchId)}/${offerId}`);
      const updateData = {
        ...updates,
        updatedAt: Date.now()
      };
      await update(offerRef, updateData);
      
      // Actualizar estado en ofertas activas si es necesario
      const currentOffer = await this.getFlashOffer(branchId, offerId);
      const activeRef = ref(db, flashOfferActivePath(branchId));
      
      const now = Date.now();
      const shouldBeActive = currentOffer && 
                           currentOffer.isActive && 
                           currentOffer.startTime <= now && 
                           currentOffer.endTime >= now;
      
      if (shouldBeActive) {
        await set(ref(activeRef, offerId), true);
      } else {
        await remove(ref(activeRef, offerId));
      }
    } catch (error) {
      console.error('Error updating flash offer:', error);
      throw error;
    }
  },

  /**
   * Eliminar una oferta flash
   * @param {string} branchId - ID de la sucursal
   * @param {string} offerId - ID de la oferta flash
   * @returns {Promise<void>}
   */
  async deleteFlashOffer(branchId, offerId) {
    try {
      const offerRef = ref(db, `${flashOfferPath(branchId)}/${offerId}`);
      const activeRef = ref(db, `${flashOfferActivePath(branchId)}/${offerId}`);
      
      // Eliminar de ambas ubicaciones
      await update(offerRef, { isActive: false, deletedAt: Date.now() });
      await remove(activeRef);
      
      // Eliminación real después de un periodo (soft delete primero)
      setTimeout(async () => {
        try {
          await remove(offerRef);
        } catch (error) {
          console.error('Error in hard delete flash offer:', error);
        }
      }, 24 * 60 * 60 * 1000); // 24 horas
    } catch (error) {
      console.error('Error deleting flash offer:', error);
      throw error;
    }
  },

  /**
   * Incrementar contador de vistas de una oferta
   * @param {string} branchId - ID de la sucursal
   * @param {string} offerId - ID de la oferta flash
   * @returns {Promise<void>}
   */
  async incrementViews(branchId, offerId) {
    try {
      const offerRef = ref(db, `${flashOfferPath(branchId)}/${offerId}`);
      await update(offerRef, { views: increment(1) });
    } catch (error) {
      console.error('Error incrementing flash offer views:', error);
    }
  },

  /**
   * Incrementar contador de conversiones de una oferta
   * @param {string} branchId - ID de la sucursal
   * @param {string} offerId - ID de la oferta flash
   * @returns {Promise<void>}
   */
  async incrementConversions(branchId, offerId) {
    try {
      const offerRef = ref(db, `${flashOfferPath(branchId)}/${offerId}`);
      await update(offerRef, { conversions: increment(1) });
    } catch (error) {
      console.error('Error incrementing flash offer conversions:', error);
    }
  }
};

// Helper function for Firebase incremental updates
function increment(value) {
  return { '.sv': { 'increment': value } };
}