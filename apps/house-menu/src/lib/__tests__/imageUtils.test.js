import { describe, it, expect, vi, afterEach } from 'vitest';
import { downscaleImage } from '../imageUtils';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('downscaleImage', () => {
  it('devuelve la imagen original si no hay contexto canvas (jsdom/tests)', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const dataUrl = 'data:image/jpeg;base64,abc';
    const result = await downscaleImage(dataUrl, 2048);
    expect(result).toBe(dataUrl);
  });

  it('devuelve la imagen original si la imagen no puede cargarse', async () => {
    const dataUrl = 'data:image/jpeg;base64,broken';
    const fakeCtx = { drawImage: vi.fn(), toDataURL: vi.fn(() => 'data:image/jpeg;base64,down') };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx);
    class BrokenImage {
      set src(_v) { setTimeout(() => this.onerror?.(), 0); }
    }
    vi.stubGlobal('Image', BrokenImage);

    const result = await downscaleImage(dataUrl, 2048);
    expect(result).toBe(dataUrl);
    expect(fakeCtx.drawImage).not.toHaveBeenCalled();
  });

  it('no downscale si ya cumple ≤ maxDimension (conserva el original)', async () => {
    const dataUrl = 'data:image/jpeg;base64,small';
    const fakeCtx = { drawImage: vi.fn(), toDataURL: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx);
    class SmallImage {
      width = 1000;
      height = 800;
      set src(_v) { setTimeout(() => this.onload?.(), 0); }
    }
    vi.stubGlobal('Image', SmallImage);

    const result = await downscaleImage(dataUrl, 2048);
    expect(result).toBe(dataUrl);
    expect(fakeCtx.drawImage).not.toHaveBeenCalled();
  });

  it('downscale a ≤ 2048px preservando proporción, JPEG 0.85', async () => {
    const dataUrl = 'data:image/jpeg;base64,big';
    let capturedCanvas = null;
    const fakeCtx = { drawImage: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      capturedCanvas = this;
      return fakeCtx;
    });
    const toDataUrlSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockImplementation(function (type, q) { return `data:${type};base64,scaled-${q}`; });
    class BigImage {
      width = 4000;
      height = 2000;
      set src(_v) { setTimeout(() => this.onload?.(), 0); }
    }
    vi.stubGlobal('Image', BigImage);

    const result = await downscaleImage(dataUrl, 2048);

    expect(result).toBe('data:image/jpeg;base64,scaled-0.85');
    expect(fakeCtx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2048, 1024);
    expect(capturedCanvas.width).toBe(2048);
    expect(capturedCanvas.height).toBe(1024); // proporción 2:1 preservada
    expect(toDataUrlSpy).toHaveBeenCalledWith('image/jpeg', 0.85);
  });
});
