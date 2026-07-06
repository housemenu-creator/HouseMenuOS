import { ref, get, set, update, remove } from 'firebase/database';
import { realtimeDB as db } from '@house/db';

/**
 * Normaliza una cadena de texto para hacerla URL-safe.
 * @param {string} text 
 * @returns {string}
 */
export function generateSlug(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Reemplaza espacios con -
    .replace(/[^\w\-]+/g, '')       // Elimina caracteres no alfanuméricos
    .replace(/\-\-+/g, '-')         // Reemplaza múltiples - con uno solo
    .replace(/^-+/, '')             // Elimina - al principio
    .replace(/-+$/, '');            // Elimina - al final
}

/**
 * Verifica si un slug está disponible en /global/slugs.
 * @param {string} slug 
 * @returns {Promise<boolean>}
 */
export async function isSlugAvailable(slug) {
  if (!slug) return false;
  const normalized = generateSlug(slug);
  try {
    const snap = await get(ref(db, `global/slugs/${normalized}`));
    return !snap.exists();
  } catch (err) {
    console.error('slugService.isSlugAvailable error:', err);
    return false;
  }
}

/**
 * Resuelve un slug a su tenantId y branchId correspondientes.
 * @param {string} slug 
 * @returns {Promise<{tenantId: string, branchId: string} | null>}
 */
export async function resolveSlug(slug) {
  if (!slug) return null;
  const normalized = generateSlug(slug);
  try {
    const snap = await get(ref(db, `global/slugs/${normalized}`));
    if (snap.exists()) {
      return snap.val();
    }
    return null;
  } catch (err) {
    console.error('slugService.resolveSlug error:', err);
    return null;
  }
}

/**
 * Registra un nuevo slug asociándolo a un tenant y branch.
 * @param {string} slug 
 * @param {string} tenantId 
 * @param {string} branchId 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function registerSlug(slug, tenantId, branchId) {
  if (!slug || !tenantId || !branchId) {
    return { success: false, error: 'Faltan parámetros requeridos' };
  }
  const normalized = generateSlug(slug);
  
  try {
    const available = await isSlugAvailable(normalized);
    if (!available) {
      return { success: false, error: 'El slug ya está en uso' };
    }

    const payload = {
      [`global/slugs/${normalized}`]: {
        tenantId,
        branchId,
        createdAt: new Date().toISOString(),
      },
      [`tenants/${tenantId}/_meta/slug`]: normalized,
    };

    await update(ref(db), payload);
    return { success: true };
  } catch (err) {
    console.error('slugService.registerSlug error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Actualiza el slug de un restaurante.
 * @param {string} oldSlug 
 * @param {string} newSlug 
 * @param {string} tenantId 
 * @param {string} branchId 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateSlug(oldSlug, newSlug, tenantId, branchId) {
  if (!newSlug || !tenantId || !branchId) {
    return { success: false, error: 'Faltan parámetros requeridos' };
  }
  
  const normalizedNew = generateSlug(newSlug);
  const normalizedOld = oldSlug ? generateSlug(oldSlug) : null;

  if (normalizedOld === normalizedNew) {
    return { success: true }; // No hay cambios
  }

  try {
    const available = await isSlugAvailable(normalizedNew);
    if (!available) {
      return { success: false, error: 'El nuevo slug ya está en uso' };
    }

    const payload = {
      [`global/slugs/${normalizedNew}`]: {
        tenantId,
        branchId,
        createdAt: new Date().toISOString(),
      },
      [`tenants/${tenantId}/_meta/slug`]: normalizedNew,
    };

    if (normalizedOld) {
      // Elimina el viejo slug en la misma transacción estableciéndolo a null
      payload[`global/slugs/${normalizedOld}`] = null;
    }

    await update(ref(db), payload);
    return { success: true };
  } catch (err) {
    console.error('slugService.updateSlug error:', err);
    return { success: false, error: err.message };
  }
}
