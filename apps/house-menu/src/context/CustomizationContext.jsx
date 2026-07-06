import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { subscribeConfig, saveConfig } from '../admin/tabs/config/configService';

const CustomizationContext = createContext(null);

const DEFAULT_BRANDING = {
  themePreset: 'classic',
  primaryColor: '#1E2B38',
  accentColor: '#8A5A00',
  fontFamily: 'Geist',
  borderRadius: 'medium',
  glassmorphism: true,
  businessName: 'Restaurante House',
  logoUrl: '',
};

// Mapeo de fuentes de Google Fonts
const GOOGLE_FONTS = {
  'Geist': 'Geist:wght@300;400;500;600;700;800',
  'Inter': 'Inter:wght@300;400;500;600;700;800',
  'Outfit': 'Outfit:wght@300;400;500;600;700;800',
  'Playfair Display': 'Playfair+Display:ital,wght@0,400..900;1,400..900',
  'Montserrat': 'Montserrat:wght@300;400;500;600;700;800',
  'Fira Code': 'Fira+Code:wght@300;400;500;600;700',
};

// Helper to convert hex to RGB
function hexToRgb(hex) {
  if (!hex) return null;
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Helper to adjust color brightness (negative = darker, positive = lighter)
function adjustColorBrightness(hex, percent) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const adjust = (val) => Math.max(0, Math.min(255, Math.round(val + (255 - val) * percent)));
  const darken = (val) => Math.max(0, Math.min(255, Math.round(val * (1 + percent))));
  
  const r = percent > 0 ? adjust(rgb.r) : darken(rgb.r);
  const g = percent > 0 ? adjust(rgb.g) : darken(rgb.g);
  const b = percent > 0 ? adjust(rgb.b) : darken(rgb.b);
  
  const toHex = (c) => c.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Dynamically inject Google Fonts into head
function injectGoogleFont(fontName) {
  const fontSlug = GOOGLE_FONTS[fontName];
  if (!fontSlug) return;
  const linkId = `gfont-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(linkId)) return;

  // Add preconnect tags if they don't exist
  if (!document.getElementById('gfonts-preconnect-api')) {
    const pc1 = document.createElement('link');
    pc1.id = 'gfonts-preconnect-api';
    pc1.rel = 'preconnect';
    pc1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(pc1);

    const pc2 = document.createElement('link');
    pc2.id = 'gfonts-preconnect-static';
    pc2.rel = 'preconnect';
    pc2.href = 'https://fonts.gstatic.com';
    pc2.crossOrigin = 'anonymous';
    document.head.appendChild(pc2);
  }

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontSlug}&display=swap`;
  document.head.appendChild(link);
}

// Applica las variables de estilo al :root
export function applyBrandingStyles(customization, activeTheme = 'light') {
  const root = document.documentElement;
  const config = { ...DEFAULT_BRANDING, ...customization };

  // 1. Colores de la marca
  const primary = config.primaryColor;
  const accent = config.accentColor;

  root.style.setProperty('--cm-primary', primary);
  root.style.setProperty('--cm-accent', accent);

  const primaryRgb = hexToRgb(primary);
  const accentRgb = hexToRgb(accent);

  if (primaryRgb) {
    root.style.setProperty('--cm-primary-light', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1)`);
    root.style.setProperty('--cm-primary-surface', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.06)`);
  }
  if (accentRgb) {
    root.style.setProperty('--cm-accent-light', `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.15)`);
    root.style.setProperty('--cm-accent-surface', `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.08)`);
  }

  // Hover states: darken for light theme, lighten for dark theme
  const isDark = activeTheme === 'dark' || root.classList.contains('dark');
  const hoverFactor = isDark ? 0.15 : -0.15;
  root.style.setProperty('--cm-primary-hover', adjustColorBrightness(primary, hoverFactor));
  root.style.setProperty('--cm-accent-hover', adjustColorBrightness(accent, hoverFactor));

  // 2. Tipografía
  if (config.fontFamily && GOOGLE_FONTS[config.fontFamily]) {
    injectGoogleFont(config.fontFamily);
    root.style.setProperty('--cm-font', `'${config.fontFamily}', system-ui, sans-serif`);
  } else {
    root.style.setProperty('--cm-font', DEFAULT_BRANDING.fontFamily);
  }

  // 3. Bordes (Boder Radius)
  const radiusScale = {
    none: { sm: '0px', md: '0px', lg: '0px', xl: '0px', '2xl': '0px' },
    soft: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', '2xl': '1rem' },
    medium: { sm: '0.625rem', md: '0.875rem', lg: '1.25rem', xl: '1.75rem', '2xl': '2.5rem' },
    large: { sm: '1rem', md: '1.25rem', lg: '1.75rem', xl: '2.25rem', '2xl': '3.25rem' },
    full: { sm: '9999px', md: '9999px', lg: '9999px', xl: '9999px', '2xl': '9999px' },
  };
  const currentScale = radiusScale[config.borderRadius] || radiusScale.medium;
  root.style.setProperty('--cm-radius-sm', currentScale.sm);
  root.style.setProperty('--cm-radius-md', currentScale.md);
  root.style.setProperty('--cm-radius-lg', currentScale.lg);
  root.style.setProperty('--cm-radius-xl', currentScale.xl);
  root.style.setProperty('--cm-radius-2xl', currentScale['2xl']);

  // 4. Glassmorphism
  if (!config.glassmorphism) {
    // Si está desactivado, el glass se vuelve opaco (surface)
    root.style.setProperty('--cm-glass-bg', 'var(--cm-surface)');
    root.style.setProperty('--cm-glass-blur', '0px');
    root.style.setProperty('--cm-glass-border', 'var(--cm-border)');
  } else {
    // Restaurar por defecto
    const glassBg = isDark ? `rgba(${isDark ? '42, 61, 78' : '255, 255, 255'}, 0.72)` : 'rgba(255, 255, 255, 0.72)';
    root.style.setProperty('--cm-glass-bg', glassBg);
    root.style.setProperty('--cm-glass-blur', '20px');
    root.style.setProperty('--cm-glass-border', isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.3)');
  }
}

export function CustomizationProvider({ children }) {
  const [dbCustomization, setDbCustomization] = useState(DEFAULT_BRANDING);
  const [previewSettings, setPreviewSettings] = useState(DEFAULT_BRANDING);
  const [isSandboxActive, setIsSandboxActive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carga inicial y suscripción a Firebase
  useEffect(() => {
    const unsub = subscribeConfig((data) => {
      const cust = data?.customization || {};
      const merged = { ...DEFAULT_BRANDING, ...cust };
      setDbCustomization(merged);
      if (!isSandboxActive) {
        setPreviewSettings(merged);
      }
      setLoading(false);
    });
    return unsub;
  }, [isSandboxActive]);

  // Aplicar estilos cada vez que cambien los ajustes activos
  useEffect(() => {
    const activeSettings = isSandboxActive ? previewSettings : dbCustomization;
    
    // Escucha cambios de tema oscuro/claro
    const observer = new MutationObserver(() => {
      applyBrandingStyles(activeSettings);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    
    applyBrandingStyles(activeSettings);
    return () => observer.disconnect();
  }, [dbCustomization, previewSettings, isSandboxActive]);

  const saveCustomization = useCallback(async (newSettings) => {
    try {
      const result = await saveConfig({ customization: newSettings });
      if (result.success) {
        setDbCustomization(newSettings);
        setIsSandboxActive(false);
      }
      return result;
    } catch (err) {
      console.error('Error saving customization:', err);
      return { success: false, error: err.message };
    }
  }, []);

  const resetPreview = useCallback(() => {
    setPreviewSettings(dbCustomization);
    setIsSandboxActive(false);
  }, [dbCustomization]);

  const value = {
    settings: isSandboxActive ? previewSettings : dbCustomization,
    dbCustomization,
    previewSettings,
    setPreviewSettings,
    isSandboxActive,
    setIsSandboxActive,
    saveCustomization,
    resetPreview,
    loading,
  };

  return (
    <CustomizationContext.Provider value={value}>
      {children}
    </CustomizationContext.Provider>
  );
}

export function useCustomization() {
  const ctx = useContext(CustomizationContext);
  if (!ctx) {
    // Safe fallback if used outside provider
    return {
      settings: DEFAULT_BRANDING,
      dbCustomization: DEFAULT_BRANDING,
      previewSettings: DEFAULT_BRANDING,
      setPreviewSettings: () => {},
      isSandboxActive: false,
      setIsSandboxActive: () => {},
      saveCustomization: async () => ({ success: false }),
      resetPreview: () => {},
      loading: false,
    };
  }
  return ctx;
}
