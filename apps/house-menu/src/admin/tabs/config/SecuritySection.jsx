/**
 * Security Section — PIN policy, session management.
 */

import { useState, useEffect } from 'react';
import { Save, Loader2, KeyRound, Lock } from 'lucide-react';

export default function SecuritySection({ config, onSave, saving }) {
  const [form, setForm] = useState({
    pinMinLength: 4,
    pinMaxAttempts: 5,
    pinExpiryDays: 0,
    sessionTimeoutMinutes: 60,
    allowMultipleSessions: false,
  });

  useEffect(() => {
    if (!config?.security) return;
    setForm(prev => ({
      ...prev,
      pinMinLength: config.security.pinMinLength ?? 4,
      pinMaxAttempts: config.security.pinMaxAttempts ?? 5,
      pinExpiryDays: config.security.pinExpiryDays ?? 0,
      sessionTimeoutMinutes: config.security.sessionTimeoutMinutes ?? 60,
      allowMultipleSessions: config.security.allowMultipleSessions ?? false,
    }));
  }, [config]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      security: {
        pinMinLength: Math.max(3, Math.min(10, form.pinMinLength)),
        pinMaxAttempts: Math.max(0, Math.min(20, form.pinMaxAttempts)),
        pinExpiryDays: Math.max(0, Math.min(365, form.pinExpiryDays)),
        sessionTimeoutMinutes: Math.max(5, Math.min(1440, form.sessionTimeoutMinutes)),
        allowMultipleSessions: form.allowMultipleSessions,
      },
    });
  };

  const set = (field) => (e) => {
    const val = e.target.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value;
    setForm(prev => ({ ...prev, [field]: val }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* PIN Policy */}
      <fieldset>
        <legend className="text-xs font-bold text-cm-text mb-3 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-cm-warning" /> Política de PIN
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Largo mínimo</label>
            <input type="number" min={3} max={10} value={form.pinMinLength} onChange={set('pinMinLength')}
              className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 transition-colors" />
            <p className="text-[0.5rem] text-cm-text-tertiary mt-1">Entre 3 y 10 dígitos</p>
          </div>
          <div>
            <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Intentos máximos</label>
            <input type="number" min={0} max={20} value={form.pinMaxAttempts} onChange={set('pinMaxAttempts')}
              className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 transition-colors" />
            <p className="text-[0.5rem] text-cm-text-tertiary mt-1">0 = intentos ilimitados</p>
          </div>
          <div>
            <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Expiración (días)</label>
            <input type="number" min={0} max={365} value={form.pinExpiryDays} onChange={set('pinExpiryDays')}
              className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 transition-colors" />
            <p className="text-[0.5rem] text-cm-text-tertiary mt-1">0 = no expira</p>
          </div>
        </div>
      </fieldset>

      {/* Session settings */}
      <fieldset className="border-t border-cm-border/50 pt-4">
        <legend className="text-xs font-bold text-cm-text mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-cm-warning" /> Sesiones
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Timeout de sesión (minutos)</label>
            <input type="number" min={5} max={1440} value={form.sessionTimeoutMinutes} onChange={set('sessionTimeoutMinutes')}
              className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 transition-colors" />
            <p className="text-[0.5rem] text-cm-text-tertiary mt-1">Entre 5 min y 24 h</p>
          </div>
          <div>
            <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-2">Sesiones múltiples</label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <button type="button" onClick={() => setForm(prev => ({ ...prev, allowMultipleSessions: !prev.allowMultipleSessions }))}
                className={`relative w-9 h-[18px] rounded-full transition-colors ${form.allowMultipleSessions ? 'bg-cm-success' : 'bg-cm-border group-hover:bg-cm-text-tertiary/30'}`}>
                <span className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${form.allowMultipleSessions ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-cm-text-secondary select-none">Permitir mismo usuario en múltiples dispositivos</span>
            </label>
          </div>
        </div>
      </fieldset>

      <div className="flex justify-end pt-2 border-t border-cm-border/50">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-cm-sm">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Guardar seguridad
        </button>
      </div>
    </form>
  );
}
