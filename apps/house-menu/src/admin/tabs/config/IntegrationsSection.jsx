/**
 * Integrations Section — Telegram, WhatsApp, OpenRouter config.
 */

import { useState, useEffect } from 'react';
import { Save, Loader2, AlertTriangle, MessageSquare, Phone, Terminal, Eye, EyeOff } from 'lucide-react';

export default function IntegrationsSection({ config, onSave, saving }) {
  const [form, setForm] = useState({
    telegramToken: '',
    telegramAdminChatId: '',
    whatsappEnabled: false,
    openrouterModel: 'qwen/qwen3.6-flash',
    openrouterFallback: 'openrouter/auto',
  });
  const [showToken, setShowToken] = useState(false);
  const [showChatId, setShowChatId] = useState(false);

  useEffect(() => {
    if (!config) return;
    setForm(prev => ({
      ...prev,
      telegramToken: config.telegramToken || '',
      telegramAdminChatId: config.telegramAdminChatId || '',
      whatsappEnabled: config.whatsappEnabled ?? false,
      openrouterModel: config.openrouterModel || 'qwen/qwen3.6-flash',
      openrouterFallback: config.openrouterFallback || 'openrouter/auto',
    }));
  }, [config]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      telegramToken: form.telegramToken.trim(),
      telegramAdminChatId: form.telegramAdminChatId.trim(),
      whatsappEnabled: form.whatsappEnabled,
      openrouterModel: form.openrouterModel.trim() || 'qwen/qwen3.6-flash',
      openrouterFallback: form.openrouterFallback.trim() || 'openrouter/auto',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Security note */}
      <div className="flex items-start gap-3 p-3 bg-cm-warning/5 border border-cm-warning/20 rounded-xl">
        <AlertTriangle className="w-4 h-4 text-cm-warning shrink-0 mt-0.5" />
        <div className="text-[0.6rem] text-cm-text-secondary leading-relaxed">
          <strong className="text-cm-text">Almacenamiento seguro:</strong> Los tokens y claves se guardan en Firebase Realtime Database.
          En producción, considerá usar variables de entorno en el servidor para mayor seguridad.
        </div>
      </div>

      {/* Telegram */}
      <fieldset>
        <legend className="text-xs font-bold text-cm-text mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cm-info" /> Telegram
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Bot Token</label>
            <div className="relative">
              <input type={showToken ? 'text' : 'password'} value={form.telegramToken}
                onChange={e => setForm(prev => ({ ...prev, telegramToken: e.target.value }))}
                className="w-full bg-cm-bg-alt border border-cm-border rounded-lg pl-3 pr-10 py-2 text-xs font-mono text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 placeholder:text-cm-text-tertiary transition-colors"
                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz" />
              <button type="button" onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-cm-text-tertiary hover:text-cm-text transition-colors">
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Admin Chat ID</label>
            <div className="relative">
              <input type={showChatId ? 'text' : 'password'} value={form.telegramAdminChatId}
                onChange={e => setForm(prev => ({ ...prev, telegramAdminChatId: e.target.value }))}
                className="w-full bg-cm-bg-alt border border-cm-border rounded-lg pl-3 pr-10 py-2 text-xs font-mono text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 placeholder:text-cm-text-tertiary transition-colors"
                placeholder="-1001234567890" />
              <button type="button" onClick={() => setShowChatId(!showChatId)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-cm-text-tertiary hover:text-cm-text transition-colors">
                {showChatId ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </fieldset>

      {/* WhatsApp */}
      <fieldset className="border-t border-cm-border/50 pt-4">
        <legend className="text-xs font-bold text-cm-text mb-3 flex items-center gap-2">
          <Phone className="w-4 h-4 text-cm-info" /> WhatsApp
        </legend>
        <label className="flex items-center gap-3 cursor-pointer group">
          <button type="button" onClick={() => setForm(prev => ({ ...prev, whatsappEnabled: !prev.whatsappEnabled }))}
            className={`relative w-10 h-5 rounded-full transition-colors ${form.whatsappEnabled ? 'bg-cm-success' : 'bg-cm-border group-hover:bg-cm-text-tertiary/30'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form.whatsappEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </button>
          <div className="select-none">
            <span className="text-xs font-semibold text-cm-text">WhatsApp habilitado</span>
            <p className="text-[0.55rem] text-cm-text-secondary mt-0.5">
              Si está deshabilitado, el bot no intentará enviar mensajes por WhatsApp
            </p>
          </div>
        </label>
      </fieldset>

      {/* OpenRouter */}
      <fieldset className="border-t border-cm-border/50 pt-4">
        <legend className="text-xs font-bold text-cm-text mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cm-info" /> Agente IA (OpenRouter)
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Modelo principal</label>
            <input type="text" value={form.openrouterModel}
              onChange={e => setForm(prev => ({ ...prev, openrouterModel: e.target.value }))}
              className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-mono text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 transition-colors"
              placeholder="qwen/qwen3.6-flash" />
          </div>
          <div>
            <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Modelo fallback</label>
            <input type="text" value={form.openrouterFallback}
              onChange={e => setForm(prev => ({ ...prev, openrouterFallback: e.target.value }))}
              className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-mono text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 transition-colors"
              placeholder="openrouter/auto" />
          </div>
        </div>
      </fieldset>

      <div className="flex justify-end pt-2 border-t border-cm-border/50">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-cm-sm">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Guardar integraciones
        </button>
      </div>
    </form>
  );
}
