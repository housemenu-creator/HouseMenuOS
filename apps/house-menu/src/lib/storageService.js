import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@house/db';
import { storageProductImagesPath, storageCategoryImagesPath, storageVouchersPath, storageOptionImagesPath, storageYapeQrPath } from './paths';

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
    const path = `${storageVouchersPath(branchId)}/${orderId}_${Date.now()}`;
    const bucket = 'house-menuapp.firebasestorage.app';
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(path)}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress((e.loaded / e.total) * 100);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            const downloadToken = data.downloadTokens;
            const encodedPath = encodeURIComponent(path);
            const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media&token=${downloadToken}`;
            resolve({ url: downloadUrl, path });
          } catch (e) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
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
