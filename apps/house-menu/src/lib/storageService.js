import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@house/db';
import { storageProductImagesPath, storageVouchersPath } from './paths';

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

  async uploadVoucher(branchId, orderId, file, onProgress) {
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
