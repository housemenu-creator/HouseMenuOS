import { useState, useEffect } from 'react';
import { useCustomization } from '../../../context/CustomizationContext';
import { Palette, Undo2, Save, Sparkles, Eye, EyeOff, Check, AlertCircle, Info } from 'lucide-react';

const PRESETS = [
  { id: 'classic', label: 'Classic Blue', primary: '#1E2B38', accent: '#8A5A00' },
  { id: 'amber', label: 'Amber Gold', primary: '#2C1E12', accent: '#D97706' },
  { id: 'emerald', label: 'Emerald Garden', primary: '#064E3B', accent: '#10B981' },
  { id: 'crimson', label: 'Crimson Velvet', primary: '#450A0A', accent: '#DC2626' },
  { id: 'amethyst', label: 'Midnight Amethyst', primary: '#3B0764', accent: '#8B5CF6' },
  { id: 'charcoal', label: 'Sleek Charcoal', primary: '#1F2937', accent: '#4B5563' },
];

const FONTS = ['Geist', 'Inter', 'Outfit', 'Playfair Display', 'Montserrat', 'Fira Code'];

const RADII = [
  { id: 'none', label: 'Recto (0px)' },
  { id: 'soft', label: 'Suave (6px)' },
  { id: 'medium', label: 'Estándar (14px)' },
  { id: 'large', label: 'Pronunciado (28px)' },
  { id: 'full', label: 'Redondo (999px)' },
];

export default function CustomizationSection() {
  const {
    previewSettings,
    setPreviewSettings,
    isSandboxActive,
    setIsSandboxActive,
    saveCustomization,
    resetPreview,
    dbCustomization,
  } = useCustomization();

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sincronizar formulario local con previewSettings del contexto
  const handleChange = (field, value) => {
    setPreviewSettings((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Si el cambio de color rompe la coincidencia con el preset actual, marcar como custom
      if (field === 'primaryColor' || field === 'accentColor') {
        const matchingPreset = PRESETS.find(
          (p) => p.primary.toLowerCase() === (field === 'primaryColor' ? value.toLowerCase() : prev.primaryColor.toLowerCase()) &&
                 p.accent.toLowerCase() === (field === 'accentColor' ? value.toLowerCase() : prev.accentColor.toLowerCase())
        );
        updated.themePreset = matchingPreset ? matchingPreset.id : 'custom';
      }
      
      return updated;
    });
  };

  const handlePresetSelect = (preset) => {
    setPreviewSettings((prev) => ({
      ...prev,
      themePreset: preset.id,
      primaryColor: preset.primary,
      accentColor: preset.accent,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    const result = await saveCustomization(previewSettings);
    if (result.success) {
      setSuccessMsg('Branding y diseño actualizados con éxito.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(`Error al guardar: ${result.error}`);
    }
    setSaving(false);
  };

  const handleReset = () => {
    resetPreview();
    setSuccessMsg('Restablecido a los ajustes guardados.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Formulario de Configuración (Izquierda) */}
        <div className="flex-1 space-y-6">
          
          {/* Alertas */}
          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-cm-success-soft text-cm-success text-xs font-semibold rounded-xl border border-cm-success/20 animate-slide-up">
              <Check className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-cm-error-soft text-cm-error text-xs font-semibold rounded-xl border border-cm-error/20 animate-slide-up">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Información e Identidad */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-cm-text uppercase tracking-wider border-b border-cm-border/50 pb-2">Identidad de Marca</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[0.6rem] font-bold text-cm-text-secondary uppercase tracking-wider mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  value={previewSettings.businessName}
                  onChange={(e) => handleChange('businessName', e.target.value)}
                  className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent transition-colors"
                  placeholder="Restaurante House Portal"
                />
              </div>
              <div>
                <label className="block text-[0.6rem] font-bold text-cm-text-secondary uppercase tracking-wider mb-1">Logo URL (PNG/SVG recomendado)</label>
                <input
                  type="url"
                  value={previewSettings.logoUrl}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent transition-colors"
                  placeholder="https://ejemplo.com/logo.png"
                />
              </div>
            </div>
          </div>

          {/* Presets de Temas */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-cm-text uppercase tracking-wider border-b border-cm-border/50 pb-2">Temas Preestablecidos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PRESETS.map((p) => {
                const isActive = previewSettings.themePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetSelect(p)}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'border-cm-accent bg-cm-accent-light/10 shadow-cm-sm'
                        : 'border-cm-border hover:border-cm-border-hover bg-cm-bg-alt/30 hover:bg-cm-bg-alt/50'
                    }`}
                  >
                    <span className="text-[0.7rem] font-bold text-cm-text mb-2 flex items-center justify-between w-full">
                      {p.label}
                      {isActive && <Check className="w-3.5 h-3.5 text-cm-accent" />}
                    </span>
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full border border-black/5" style={{ backgroundColor: p.primary }} title="Primario" />
                      <div className="w-4 h-4 rounded-full border border-black/5" style={{ backgroundColor: p.accent }} title="Acento" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colores Personalizados */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-cm-text uppercase tracking-wider border-b border-cm-border/50 pb-2">Ajustes de Color Manuales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[0.6rem] font-bold text-cm-text-secondary uppercase tracking-wider mb-1.5">Color Primario (Header / Sidebar)</label>
                <div className="flex gap-2">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-cm-border shrink-0">
                    <input
                      type="color"
                      value={previewSettings.primaryColor}
                      onChange={(e) => handleChange('primaryColor', e.target.value)}
                      className="absolute inset-0 w-full h-full scale-150 cursor-pointer p-0 border-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={previewSettings.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-1.5 text-xs font-mono uppercase focus:outline-none focus:border-cm-accent transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[0.6rem] font-bold text-cm-text-secondary uppercase tracking-wider mb-1.5">Color de Acento (Botones / Destacados)</label>
                <div className="flex gap-2">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-cm-border shrink-0">
                    <input
                      type="color"
                      value={previewSettings.accentColor}
                      onChange={(e) => handleChange('accentColor', e.target.value)}
                      className="absolute inset-0 w-full h-full scale-150 cursor-pointer p-0 border-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={previewSettings.accentColor}
                    onChange={(e) => handleChange('accentColor', e.target.value)}
                    className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-1.5 text-xs font-mono uppercase focus:outline-none focus:border-cm-accent transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tipografía, Bordes y Glassmorphism */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-cm-text uppercase tracking-wider border-b border-cm-border/50 pb-2">Estilos y Estructura</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[0.6rem] font-bold text-cm-text-secondary uppercase tracking-wider mb-1">Tipografía</label>
                <select
                  value={previewSettings.fontFamily}
                  onChange={(e) => handleChange('fontFamily', e.target.value)}
                  className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent transition-colors"
                >
                  {FONTS.map((font) => (
                    <option key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[0.6rem] font-bold text-cm-text-secondary uppercase tracking-wider mb-1">Redondez de Bordes</label>
                <select
                  value={previewSettings.borderRadius}
                  onChange={(e) => handleChange('borderRadius', e.target.value)}
                  className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent transition-colors"
                >
                  {RADII.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex items-center justify-between p-3 bg-cm-bg-alt/30 border border-cm-border rounded-xl">
                <div className="space-y-0.5">
                  <span className="block text-xs font-bold text-cm-text">Habilitar Glassmorphism</span>
                  <span className="block text-[0.65rem] text-cm-text-secondary">Efecto translúcido y desenfoque de fondo premium para modales y paneles</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('glassmorphism', !previewSettings.glassmorphism)}
                  className={`toggle-cm ${previewSettings.glassmorphism ? 'active' : ''}`}
                />
              </div>
            </div>
          </div>

          {/* Sandbox Switch */}
          <div className="p-3 bg-cm-primary-light/5 border border-cm-primary/10 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isSandboxActive ? (
                  <Eye className="w-4 h-4 text-cm-accent animate-pulse" />
                ) : (
                  <EyeOff className="w-4 h-4 text-cm-text-secondary" />
                )}
                <div className="space-y-0.5">
                  <span className="block text-xs font-bold text-cm-text">Modo Previsualización Local (Sandbox)</span>
                  <span className="block text-[0.65rem] text-cm-text-secondary">Aplica el tema instantáneamente a todo tu navegador sin guardar en la base de datos</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSandboxActive(!isSandboxActive)}
                className={`toggle-cm ${isSandboxActive ? 'active' : ''}`}
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-cm-border/50">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 border border-cm-border text-cm-text-secondary hover:text-cm-text hover:bg-cm-bg-alt text-xs font-semibold rounded-lg transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Restablecer
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-cm-accent text-white hover:bg-cm-accent-hover text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors shadow-cm-sm"
            >
              {saving ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Guardar Cambios
            </button>
          </div>

        </div>

        {/* Live Preview Panel (Derecha) */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cm-text uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-cm-accent" />
              Vista Previa en Vivo
            </div>
            
            <div className="border border-cm-border rounded-2xl bg-cm-bg overflow-hidden shadow-cm-md transition-all">
              {/* Header de Simulación */}
              <div
                className="p-4 flex items-center justify-between text-white border-b border-white/10"
                style={{ backgroundColor: 'var(--cm-primary)' }}
              >
                <div className="flex items-center gap-2">
                  {previewSettings.logoUrl ? (
                    <img
                      src={previewSettings.logoUrl}
                      alt="Logo sim"
                      className="w-5 h-5 rounded object-contain bg-white/10 p-0.5"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center text-[0.6rem] font-black">H</div>
                  )}
                  <span className="text-xs font-bold truncate max-w-[140px]">
                    {previewSettings.businessName || 'Restaurante House'}
                  </span>
                </div>
                <div className="w-4 h-4 rounded-full bg-white/20" />
              </div>

              {/* Contenido de Simulación */}
              <div className="p-4 space-y-4">
                {/* Texto */}
                <div className="space-y-1">
                  <span className="block text-[0.65rem] font-bold text-cm-text-secondary uppercase tracking-wider">Tipografía Activa</span>
                  <p className="text-sm font-bold text-cm-text leading-tight" style={{ fontFamily: `'${previewSettings.fontFamily}', sans-serif` }}>
                    Menú Digital Exclusivo
                  </p>
                  <p className="text-xs text-cm-text-secondary leading-relaxed" style={{ fontFamily: `'${previewSettings.fontFamily}', sans-serif` }}>
                    Explora nuestra carta digital y pide directo a cocina.
                  </p>
                </div>

                {/* Botón */}
                <div className="space-y-1.5">
                  <span className="block text-[0.65rem] font-bold text-cm-text-secondary uppercase tracking-wider">Botones y Acento</span>
                  <button
                    type="button"
                    className="w-full text-center py-2 text-white text-xs font-bold transition-all shadow-cm-sm flex items-center justify-center gap-1.5"
                    style={{
                      backgroundColor: 'var(--cm-accent)',
                      borderRadius: 'var(--cm-radius-md)',
                      fontFamily: `'${previewSettings.fontFamily}', sans-serif`
                    }}
                  >
                    <span>Realizar Pedido</span>
                  </button>
                  <button
                    type="button"
                    className="w-full text-center py-2 text-xs font-bold border border-cm-border transition-all flex items-center justify-center gap-1.5 bg-cm-surface hover:bg-cm-surface-hover"
                    style={{
                      color: 'var(--cm-accent)',
                      borderRadius: 'var(--cm-radius-md)',
                      fontFamily: `'${previewSettings.fontFamily}', sans-serif`
                    }}
                  >
                    Ver detalles
                  </button>
                </div>

                {/* Tarjetas e Info */}
                <div className="space-y-2">
                  <span className="block text-[0.65rem] font-bold text-cm-text-secondary uppercase tracking-wider">Bordes y Glassmorphism</span>
                  <div
                    className="p-3 border shadow-cm-sm space-y-1.5 glass transition-all"
                    style={{
                      borderRadius: 'var(--cm-radius-lg)',
                      fontFamily: `'${previewSettings.fontFamily}', sans-serif`
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[0.7rem] font-bold text-cm-text">Lomo de Alpaca</span>
                      <span className="text-[0.7rem] font-extrabold text-cm-accent">S/ 48.00</span>
                    </div>
                    <div className="flex gap-1.5">
                      <span
                        className="text-[0.6rem] font-bold px-2 py-0.5"
                        style={{
                          backgroundColor: 'var(--cm-accent-light)',
                          color: 'var(--cm-accent)',
                          borderRadius: 'var(--cm-radius-full)',
                        }}
                      >
                        Más vendido
                      </span>
                      <span className="bdg bdg-neutral text-[0.6rem] px-2 py-0.5">Criollo</span>
                    </div>
                  </div>
                </div>

                {/* Info adicional del sandbox */}
                {isSandboxActive && (
                  <div className="flex items-start gap-1.5 p-2 bg-cm-accent-light/10 border border-cm-accent/20 rounded-xl">
                    <Info className="w-3.5 h-3.5 text-cm-accent shrink-0 mt-0.5" />
                    <span className="text-[0.65rem] text-cm-accent leading-normal font-medium">
                      El modo sandbox está activo. Navega por las pestañas para ver los cambios aplicados en vivo en todo el sistema.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
