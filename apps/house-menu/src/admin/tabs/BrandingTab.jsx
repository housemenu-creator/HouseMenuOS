import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Type, Image, Save, Loader2, Undo2, Sparkles, Check, X } from 'lucide-react';
import { useBranch } from '../../context/BranchContext';
import { useToast } from '../../components/ToastContext';
import { useBranding } from '../../hooks/useBranding';
import { PALETTES, FONT_PAIRS, getDefaultBranding } from '../../lib/brandingService';
import { brandingService } from '../../lib/brandingService';

export default function BrandingTab() {
  const { activeBranchId } = useBranch();
  const { showToast } = useToast();
  const { branding, isApplying, saveBranding } = useBranding(activeBranchId);

  const [localConfig, setLocalConfig] = useState(getDefaultBranding());
  const [saving, setSaving] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState('default');
  const [customColor, setCustomColor] = useState('');
  const [selectedFont, setSelectedFont] = useState('geist');
  const [logoUrl, setLogoUrl] = useState('');
  const [headline, setHeadline] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync from Firebase → local state
  useEffect(() => {
    if (!branding) return;
    setSelectedPalette(branding.palette || 'default');
    setCustomColor(branding.accentColor || '');
    setSelectedFont(branding.fontPair || 'geist');
    setLogoUrl(branding.logoUrl || '');
    setHeadline(branding.heroHeadline || '');
    setSubtitle(branding.heroSubtitle || '');
    setHasChanges(false);
  }, [branding]);

  // Preview on change (apply to DOM without saving)
  useEffect(() => {
    const preview = {
      palette: selectedPalette,
      accentColor: customColor,
      fontPair: selectedFont,
      logoUrl,
      heroHeadline: headline,
      heroSubtitle: subtitle,
    };
    brandingService.applyToDOM(preview);
    setHasChanges(true);
  }, [selectedPalette, customColor, selectedFont, logoUrl, headline, subtitle]);

  // Reset preview on unmount
  useEffect(() => {
    return () => {
      if (branding) brandingService.applyToDOM(branding);
    };
  }, [branding]);

  const handleSave = async () => {
    setSaving(true);
    const data = {
      palette: selectedPalette,
      accentColor: customColor,
      fontPair: selectedFont,
      logoUrl,
      heroHeadline: headline,
      heroSubtitle: subtitle,
    };
    const result = await saveBranding(data);
    setSaving(false);
    if (result.success) {
      setHasChanges(false);
      showToast('Branding guardado correctamente', 'success');
    } else {
      showToast(result.error || 'Error al guardar', 'error');
    }
  };

  const handleReset = () => {
    const defaults = getDefaultBranding();
    setSelectedPalette(defaults.palette);
    setCustomColor(defaults.accentColor);
    setSelectedFont(defaults.fontPair);
    setLogoUrl(defaults.logoUrl);
    setHeadline(defaults.heroHeadline);
    setSubtitle(defaults.heroSubtitle);
    brandingService.applyToDOM(defaults);
    setHasChanges(true);
  };

  if (isApplying && !branding) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-10 pb-24">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-cm-text flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-cm-accent" />
            Theme Builder
          </h1>
          <p className="text-sm text-cm-text-secondary mt-1">
            Personaliza la apariencia de tu landing page y marca
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset}
            className="px-3 py-2 border border-cm-border rounded-xl text-xs font-bold text-cm-text-secondary hover:bg-cm-surface-hover transition-colors flex items-center gap-1.5">
            <Undo2 className="w-3.5 h-3.5" /> Reset
          </button>
          <button onClick={handleSave} disabled={!hasChanges || saving}
            className="px-5 py-2 bg-cm-accent hover:bg-cm-accent-hover disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-cm-sm">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* ═══════════ STEP 1: COLOR PALETTE ═══════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cm-accent/10 text-cm-accent flex items-center justify-center">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-cm-text">Paleta de colores</h2>
            <p className="text-xs text-cm-text-secondary">Elige la combinación cromática de tu marca</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(PALETTES).map(([key, palette]) => {
            const isSelected = selectedPalette === key;
            const colors = palette.light;
            return (
              <button key={key} onClick={() => setSelectedPalette(key)}
                className={`relative rounded-2xl border-2 overflow-hidden transition-all text-left ${
                  isSelected ? 'border-cm-accent ring-2 ring-cm-accent/20' : 'border-cm-border hover:border-cm-text/30'
                }`}>
                {/* Accent stripe */}
                <div className="h-24 flex flex-col" style={{ background: colors.bg }}>
                  <div className="h-3/5" style={{ background: colors.accent }} />
                </div>
                {/* Info */}
                <div className="px-3 py-2.5 bg-cm-surface">
                  <p className="text-xs font-black text-cm-text">{palette.label}</p>
                  <p className="text-[0.55rem] text-cm-text-secondary leading-tight mt-0.5 line-clamp-2">{palette.description}</p>
                  {/* Mini color dots */}
                  <div className="flex gap-1 mt-2">
                    <span className="w-3.5 h-3.5 rounded-full border border-cm-border" style={{ background: colors.bg }} />
                    <span className="w-3.5 h-3.5 rounded-full" style={{ background: colors.surface }} />
                    <span className="w-3.5 h-3.5 rounded-full" style={{ background: colors.accent }} />
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-cm-accent text-white flex items-center justify-center shadow-cm-sm">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Custom accent color ── */}
        <div className="flex items-center gap-4 bg-cm-surface rounded-2xl border border-cm-border p-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <input type="color" value={customColor || '#8A5A00'}
                onChange={e => setCustomColor(e.target.value)}
                className="w-10 h-10 rounded-xl border border-cm-border cursor-pointer bg-transparent p-0.5" />
              {customColor && (
                <button onClick={() => setCustomColor('')}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-cm-surface border border-cm-border text-cm-muted hover:text-cm-error flex items-center justify-center">
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-cm-text">Color personalizado</p>
              <p className="text-[0.55rem] text-cm-text-secondary mt-0.5">
                {customColor
                  ? `Sobreescribe el color de acento de la paleta (${customColor})`
                  : 'Usa el color de acento de la paleta seleccionada'}
              </p>
            </div>
          </div>
          {customColor && (
            <span className="text-[0.55rem] font-mono font-bold text-cm-accent bg-cm-accent/10 px-2 py-1 rounded-lg">{customColor}</span>
          )}
        </div>
      </section>

      {/* ═══════════ STEP 2: FONT PAIR ═══════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cm-accent/10 text-cm-accent flex items-center justify-center">
            <Type className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-cm-text">Tipografía</h2>
            <p className="text-xs text-cm-text-secondary">Define la personalidad tipográfica de tu marca</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(FONT_PAIRS).map(([key, font]) => {
            const isSelected = selectedFont === key;
            return (
              <button key={key} onClick={() => setSelectedFont(key)}
                className={`rounded-2xl border-2 p-4 text-left transition-all ${
                  isSelected ? 'border-cm-accent ring-2 ring-cm-accent/20 bg-cm-accent/[0.02]' : 'border-cm-border hover:border-cm-text/30 bg-cm-surface'
                }`}>
                <p className="text-xs font-bold text-cm-accent mb-1">{font.label}</p>
                <p className="text-base text-cm-text truncate" style={{ fontFamily: font.stack }}>
                  Aa
                </p>
                <p className="text-[0.5rem] text-cm-text-secondary mt-1 truncate" style={{ fontFamily: font.stack }}>
                  The quick brown fox
                </p>
                {isSelected && (
                  <div className="mt-2 flex items-center gap-1 text-[0.5rem] font-bold text-cm-accent">
                    <Check className="w-2.5 h-2.5" /> Activo
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══════════ STEP 3: LOGO + HERO ═══════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cm-accent/10 text-cm-accent flex items-center justify-center">
            <Image className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-cm-text">Logo y Hero</h2>
            <p className="text-xs text-cm-text-secondary">Personaliza el encabezado de tu landing page</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-cm-text-secondary mb-1.5 uppercase tracking-wider">URL del Logo</label>
            <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
              className="w-full px-3 py-2.5 bg-cm-surface border border-cm-border rounded-xl text-sm text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
              placeholder="https://ejemplo.com/logo.png" />
            {logoUrl && (
              <div className="mt-2 w-16 h-16 rounded-xl border border-cm-border overflow-hidden bg-cm-bg-alt">
                <img src={logoUrl} alt="Preview" className="w-full h-full object-contain" onError={e => { e.target.style.display = 'none'; }} />
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-cm-text-secondary mb-1.5 uppercase tracking-wider">Hero Headline</label>
              <input type="text" value={headline} onChange={e => setHeadline(e.target.value)}
                className="w-full px-3 py-2.5 bg-cm-surface border border-cm-border rounded-xl text-sm text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                placeholder="Ej: La mejor cocina de la ciudad" />
            </div>
            <div>
              <label className="block text-xs font-bold text-cm-text-secondary mb-1.5 uppercase tracking-wider">Hero Subtítulo</label>
              <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-cm-surface border border-cm-border rounded-xl text-sm text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                placeholder="Ej: Ingredientes frescos, recetas exclusivas" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ UNSAVED CHANGES BAR ═══════════ */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-cm-surface border-2 border-cm-accent/20 rounded-2xl shadow-cm-lg px-6 py-3 flex items-center gap-4">
            <span className="text-xs font-bold text-cm-text-secondary">Tienes cambios sin guardar</span>
            <button onClick={handleReset}
              className="px-3 py-1.5 border border-cm-border rounded-lg text-xs font-bold text-cm-text-secondary hover:bg-cm-surface-hover transition-colors">
              Descartar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-1.5 bg-cm-accent hover:bg-cm-accent-hover disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Guardar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
