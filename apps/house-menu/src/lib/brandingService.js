import { ref, onValue, update } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { branchesConfigByIdPath } from './paths';

/**
 * brandingService — Configuración de paleta, fuente y apariencia
 * Almacenada en branches_config/{branchId}/branding
 */

const BRANDING_SUBPATH = (branchId) => `branches_config/${branchId}/branding`;

export const PALETTES = {
  default: {
    label: 'Clásico',
    description: 'Oro mostaza + azul marino — el look original de House',
    light: { bg: '#F5F5F7', accent: '#8A5A00', surface: '#FFFFFF' },
    dark: { bg: '#1E2B38', accent: '#F2B71A', surface: '#2A3D4E' },
  },
  forest: {
    label: 'Forest',
    description: 'Verde bosque profundo + crema cálido',
    light: { bg: '#FAFAF8', accent: '#2D6A4F', surface: '#FFFFFF' },
    dark: { bg: '#1A2E24', accent: '#52B788', surface: '#243D2E' },
  },
  cobalt: {
    label: 'Cobalt',
    description: 'Azul vibrante + blanco nítido',
    light: { bg: '#F8FAFC', accent: '#2563EB', surface: '#FFFFFF' },
    dark: { bg: '#1E293B', accent: '#60A5FA', surface: '#1E3A5F' },
  },
  terracotta: {
    label: 'Terracota',
    description: 'Rust cálido + gris piedra',
    light: { bg: '#FAF8F6', accent: '#C2410C', surface: '#FFFFFF' },
    dark: { bg: '#2D221C', accent: '#F97316', surface: '#3D322C' },
  },
  violet: {
    label: 'Violet',
    description: 'Púrpura intenso + fondo lavanda',
    light: { bg: '#F5F3FF', accent: '#7C3AED', surface: '#FFFFFF' },
    dark: { bg: '#1E1B2E', accent: '#A78BFA', surface: '#2D2847' },
  },
  monochrome: {
    label: 'Monocromo',
    description: 'Blanco y negro — máximo contraste',
    light: { bg: '#F5F5F5', accent: '#1E2B38', surface: '#FFFFFF' },
    dark: { bg: '#111111', accent: '#FFFFFF', surface: '#1C1C1E' },
  },
};

export const FONT_PAIRS = {
  geist: { label: 'Geist', stack: "'Geist', system-ui, -apple-system, sans-serif", googleFont: 'Geist:wght@400;500;600;700' },
  outfit: { label: 'Outfit', stack: "'Outfit', system-ui, -apple-system, sans-serif", googleFont: 'Outfit:wght@400;500;600;700' },
  inter: { label: 'Inter', stack: "'Inter', system-ui, -apple-system, sans-serif", googleFont: 'Inter:wght@400;500;600;700' },
  'space-grotesk': { label: 'Space Grotesk', stack: "'Space Grotesk', system-ui, -apple-system, sans-serif", googleFont: 'Space+Grotesk:wght@400;500;600;700' },
  'dm-sans': { label: 'DM Sans', stack: "'DM Sans', system-ui, -apple-system, sans-serif", googleFont: 'DM+Sans:wght@400;500;600;700' },
};

export function getDefaultBranding() {
  return {
    palette: 'default',
    accentColor: '',
    fontPair: 'geist',
    logoUrl: '',
    heroHeadline: '',
    heroSubtitle: '',
    heroLayout: 'default',
  };
}

export const brandingService = {

  /**
   * Suscribe en tiempo real a la config de branding de una sucursal.
   */
  subscribeToBranding(branchId, callback) {
    if (!branchId) return () => {};
    const brandingRef = ref(db, BRANDING_SUBPATH(branchId));
    return onValue(brandingRef, (snap) => {
      const val = snap.val();
      callback(val || getDefaultBranding());
    });
  },

  /**
   * Guarda/actualiza la config de branding.
   */
  async saveBranding(branchId, data) {
    try {
      const branchRef = ref(db, branchesConfigByIdPath(branchId));
      await update(branchRef, { branding: { ...getDefaultBranding(), ...data } });
      return { success: true };
    } catch (error) {
      console.error('brandingService.saveBranding error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Aplica la paleta y fuente al <html> via data-attributes.
   */
  applyToDOM(config) {
    const html = document.documentElement;
    const cfg = { ...getDefaultBranding(), ...config };

    // Palette
    html.dataset.palette = cfg.palette || 'default';

    // Font — setea variable directamente y data-font
    const fontKey = cfg.fontPair || 'geist';
    html.dataset.font = fontKey;
    const fontDef = FONT_PAIRS[fontKey];
    if (fontDef) {
      html.style.setProperty('--cm-font', fontDef.stack);
    }

    // Custom accent override
    if (cfg.accentColor) {
      html.style.setProperty('--branding-accent', cfg.accentColor);
      html.dataset.customAccent = 'true';
    } else {
      html.style.removeProperty('--branding-accent');
      html.dataset.customAccent = 'false';
    }
  },

  /**
   * Resetea los data-attributes al default.
   */
  resetDOM() {
    const html = document.documentElement;
    html.dataset.palette = 'default';
    html.dataset.font = 'geist';
    html.style.removeProperty('--cm-font');
    html.style.removeProperty('--branding-accent');
    html.dataset.customAccent = 'false';
  },
};
