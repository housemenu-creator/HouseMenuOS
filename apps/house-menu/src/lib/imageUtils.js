/**
 * Image utilities — downscale client-side antes de enviar a la API (NFR-2).
 */

const DEFAULT_MAX_DIMENSION = 2048;
const DEFAULT_JPEG_QUALITY = 0.85;

/**
 * Reduce una imagen a ≤ `maxDimension` px en su lado más largo, preservando
 * la proporción, y la devuelve como data URL JPEG.
 *
 * Fallbacks seguros: sin canvas disponible (jsdom/tests) o si la imagen no
 * carga, devuelve la data URL original sin cambios.
 *
 * @param {string} dataUrl - data URL de la imagen (con o sin prefijo data:)
 * @param {number} maxDimension - lado más largo permitido (px)
 * @param {number} quality - calidad JPEG 0..1
 * @returns {Promise<string>} data URL (posiblemente re-escalada)
 */
export function downscaleImage(dataUrl, maxDimension = DEFAULT_MAX_DIMENSION, quality = DEFAULT_JPEG_QUALITY) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') { resolve(dataUrl); return; }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve(dataUrl); return; }

    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      if (scale >= 1) { resolve(dataUrl); return; } // ya cumple el límite
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
