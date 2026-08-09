import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ──
const { mocks } = vi.hoisted(() => ({
  mocks: {
    storageRef: vi.fn((_storage, path) => ({ path })),
    uploadBytesResumable: vi.fn(),
    getDownloadURL: vi.fn().mockResolvedValue('https://download.url/voucher'),
    deleteObject: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('firebase/storage', () => ({
  ref: mocks.storageRef,
  uploadBytesResumable: mocks.uploadBytesResumable,
  getDownloadURL: mocks.getDownloadURL,
  deleteObject: mocks.deleteObject,
}));

vi.mock('@house/db', () => ({ storage: {} }));
vi.mock('../paths', () => ({
  storageProductImagesPath: (b) => `branches/${b}/product-images`,
  storageCategoryImagesPath: (b) => `branches/${b}/category-images`,
  storageVouchersPath: (b) => `branches/${b}/vouchers`,
  storageOptionImagesPath: (b) => `branches/${b}/option-images`,
  storageYapeQrPath: (b) => `branches/${b}/yape-qr`,
}));

import { storageService, validateVoucherFile } from '../storageService';

function makeUploadTask() {
  return {
    on: vi.fn((event, next, _error, complete) => {
      if (event === 'state_changed') {
        next({ bytesTransferred: 50, totalBytes: 100 });
        complete();
      }
    }),
    snapshot: { ref: { fullPath: 'branches/branch-1/vouchers/po-1_1700000000000' } },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('validateVoucherFile', () => {
  it('acepta imagen jpeg <= 5MB', () => {
    const file = new File(['x'], 'factura.jpg', { type: 'image/jpeg' });
    expect(validateVoucherFile(file)).toBeNull();
  });

  it('rechaza tipo no-imagen (PDF)', () => {
    const file = new File(['x'], 'factura.pdf', { type: 'application/pdf' });
    expect(validateVoucherFile(file)).toMatch(/Solo imágenes/);
  });

  it('rechaza archivo > 5MB', () => {
    const big = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    expect(validateVoucherFile(big)).toMatch(/5MB/);
  });

  it('rechaza archivo sin tipo MIME', () => {
    const file = new File(['x'], 'raro.bin', { type: '' });
    expect(validateVoucherFile(file)).toMatch(/Solo imágenes/);
  });
});

describe('storageService.uploadVoucher', () => {
  it('sube a branches/{bid}/vouchers/{orderId}_{timestamp} y resuelve { url, path }', async () => {
    const task = makeUploadTask();
    mocks.uploadBytesResumable.mockReturnValue(task);
    const file = new File(['x'], 'factura.jpg', { type: 'image/jpeg' });

    const result = await storageService.uploadVoucher('branch-1', 'po-1', file);

    expect(mocks.storageRef).toHaveBeenCalledWith({}, expect.stringMatching(/^branches\/branch-1\/vouchers\/po-1_\d+$/));
    expect(mocks.uploadBytesResumable).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringMatching(/^branches\/branch-1\/vouchers\/po-1_\d+$/) }),
      file
    );
    expect(result).toEqual({
      url: 'https://download.url/voucher',
      path: 'branches/branch-1/vouchers/po-1_1700000000000',
    });
  });

  it('notifica progreso 0-100 via onProgress', async () => {
    const task = makeUploadTask();
    mocks.uploadBytesResumable.mockReturnValue(task);
    const file = new File(['x'], 'factura.jpg', { type: 'image/jpeg' });
    const onProgress = vi.fn();

    await storageService.uploadVoucher('branch-1', 'po-1', file, onProgress);

    expect(onProgress).toHaveBeenCalledWith(50);
  });

  it('rechaza PDF antes de tocar la red (no llama uploadBytesResumable)', async () => {
    const file = new File(['x'], 'factura.pdf', { type: 'application/pdf' });

    await expect(storageService.uploadVoucher('branch-1', 'po-1', file)).rejects.toThrow(/Solo imágenes/);
    expect(mocks.uploadBytesResumable).not.toHaveBeenCalled();
  });

  it('rechaza archivo > 5MB antes de tocar la red', async () => {
    const big = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });

    await expect(storageService.uploadVoucher('branch-1', 'po-1', big)).rejects.toThrow(/5MB/);
    expect(mocks.uploadBytesResumable).not.toHaveBeenCalled();
  });

  it('propaga el error del upload', async () => {
    mocks.uploadBytesResumable.mockReturnValue({
      on: vi.fn((_event, _next, error, _complete) => { error(new Error('storage/unauthorized')); }),
      snapshot: { ref: {} },
    });
    const file = new File(['x'], 'factura.jpg', { type: 'image/jpeg' });

    await expect(storageService.uploadVoucher('branch-1', 'po-1', file)).rejects.toThrow('storage/unauthorized');
  });
});
