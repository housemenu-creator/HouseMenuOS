import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@house/db';
import { storageProductImagesPath, storageCategoryImagesPath, storageVouchersPath, storageOptionImagesPath, storageYapeQrPath } from './paths';

const VOUCHER_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const VOUCHER_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Valida un archivo de voucher ANTES de cualquier request de red.
 * Retorna null si es válido, o un mensaje de error legible.
 */
export function validateVoucherFile(file) {
  if (!file) return 'Selecciona un archivo.';
  if (!VOUCHER_ALLOWED_TYPES.includes(file.type)) return 'Solo imágenes (JPG/PNG/WebP).';
  if (file.size > VOUCHER_MAX_SIZE) return 'Archivo > 5MB. Usa una foto más ligera.';
  return null;
}

export const storageService = {
  async uploadProductImage(branchId, productId, file, onProgress) {
    const storageRef = ref(storage, `${storageProductImagesPath(branchId)}/${productId}_${Date.now()}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          reject(error);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url: downloadUrl, path: uploadTask.snapshot.ref.fullPath });
        }
      );
    });
  },

  async uploadCategoryImage(branchId, categorySlug, file, onProgress) {
    const storageRef = ref(storage, `${storageCategoryImagesPath(branchId)}/${categorySlug}_${Date.now()}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          reject(error);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url: downloadUrl, path: uploadTask.snapshot.ref.fullPath });
        }
      );
    });
  },

  async uploadVoucher(branchId, orderId, file, onProgress) {
    // Validación client-side: rechaza antes de tocar la red
    const validationError = validateVoucherFile(file);
    if (validationError) return Promise.reject(new Error(validationError));

    const storageRef = ref(storage, `${storageVouchersPath(branchId)}/${orderId}_${Date.now()}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          reject(error);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url: downloadUrl, path: uploadTask.snapshot.ref.fullPath });
        }
      );
    });
  },

  async uploadOptionImage(branchId, optionId, file, onProgress) {
    const storageRef = ref(storage, `${storageOptionImagesPath(branchId)}/${optionId}_${Date.now()}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          reject(error);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url: downloadUrl, path: uploadTask.snapshot.ref.fullPath });
        }
      );
    });
  },

  async uploadYapeQr(branchId, file, onProgress) {
    const storageRef = ref(storage, `${storageYapeQrPath(branchId)}/${Date.now()}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          reject(error);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url: downloadUrl, path: uploadTask.snapshot.ref.fullPath });
        }
      );
    });
  },

  async uploadBranchPhoto(branchId, file, onProgress) {
    const storageRef = ref(storage, `branches/${branchId}/photo/${Date.now()}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          reject(error);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url: downloadUrl, path: uploadTask.snapshot.ref.fullPath });
        }
      );
    });
  },

  async deleteImage(storagePath) {
    if (!storagePath) return;
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch (err) {
      if (err.code === 'storage/object-not-found') return;
      console.warn('storageService.deleteImage error:', err);
    }
  },
};
