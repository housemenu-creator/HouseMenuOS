/**
 * General Section — restaurant name, contact info, timezone, currency.
 */

import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';

const TIMEZONES = [
  { value: 'America/Lima', label: 'America/Lima (UTC-5)' },
  { value: 'America/Mexico_City', label: 'America/Mexico_City (UTC-6)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (UTC-3)' },
  { value: 'America/Bogota', label: 'Bogotá (UTC-5)' },
  { value: 'America/Santiago', label: 'Santiago (UTC-4)' },
  { value: 'America/Caracas', label: 'Caracas (UTC-4)' },
  { value: 'America/Sao_Paulo', label: 'Sao Paulo (UTC-3)' },
  { value: 'America/Panama', label: 'Panamá (UTC-5)' },
];

const CURRENCIES = [
  { value: 'PEN', label: 'Soles (S/)' },
  { value: 'USD', label: 'Dólares ($)' },
  { value: 'MXN', label: 'Pesos Mexicanos ($)' },
  { value: 'COP', label: 'Pesos Colombianos ($)' },
  { value: 'ARS', label: 'Pesos Argentinos ($)' },
  { value: 'CLP', label: 'Pesos Chilenos ($)' },
];

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
];

export default function GeneralSection({ config, onSave, saving }) {
  const [form, setForm] = useState({
    restaurantName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    timezone: 'America/Lima',
    currency: 'PEN',
    defaultLanguage: 'es',
    businessHours: '',
    logoUrl: '',
  });

  useEffect(() => {
    if (!config) return;
    setForm(prev => ({
      ...prev,
      restaurantName: config.restaurantName || '',
      contactEmail: config.contactEmail || '',
      contactPhone: config.contactPhone || '',
      address: config.address || '',
      timezone: config.timezone || 'America/Lima',
      currency: config.currency || 'PEN',
      defaultLanguage: config.defaultLanguage || 'es',
      businessHours: config.businessHours || '',
      logoUrl: config.logoUrl || '',
    }));
  }, [config]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      restaurantName: form.restaurantName.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim(),
      address: form.address.trim(),
      timezone: form.timezone,
      currency: form.currency,
      defaultLanguage: form.defaultLanguage,
      businessHours: form.businessHours.trim(),
      logoUrl: form.logoUrl.trim(),
    });
  };

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Nombre del restaurante</label>
          <input type="text" value={form.restaurantName} onChange={set('restaurantName')}
            className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 placeholder:text-cm-text-tertiary transition-colors"
            placeholder="Ej: Restaurante House" required />
        </div>
        <div>
          <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Email de contacto</label>
          <input type="email" value={form.contactEmail} onChange={set('contactEmail')}
            className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 placeholder:text-cm-text-tertiary transition-colors"
            placeholder="admin@house.local" />
        </div>
        <div>
          <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Teléfono de contacto</label>
          <input type="tel" value={form.contactPhone} onChange={set('contactPhone')}
            className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 placeholder:text-cm-text-tertiary transition-colors"
            placeholder="+51999000000" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Dirección</label>
          <input type="text" value={form.address} onChange={set('address')}
            className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 placeholder:text-cm-text-tertiary transition-colors"
            placeholder="Av. Principal 123, Lima" />
        </div>
        <div>
          <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Zona horaria</label>
          <select value={form.timezone} onChange={set('timezone')}
            className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 transition-colors">
            {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Moneda</label>
          <select value={form.currency} onChange={set('currency')}
            className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 transition-colors">
            {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Idioma por defecto</label>
          <select value={form.defaultLanguage} onChange={set('defaultLanguage')}
            className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 transition-colors">
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Horario comercial</label>
          <input type="text" value={form.businessHours} onChange={set('businessHours')}
            className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 placeholder:text-cm-text-tertiary transition-colors"
            placeholder="Lun-Sáb 9:00-22:00" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Logo URL (opcional)</label>
          <input type="url" value={form.logoUrl} onChange={set('logoUrl')}
            className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 text-xs font-medium text-cm-text focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 placeholder:text-cm-text-tertiary transition-colors"
            placeholder="https://ejemplo.com/logo.png" />
          {form.logoUrl && (
            <img src={form.logoUrl} alt="Logo preview"
              className="mt-2 h-12 w-auto rounded-lg border border-cm-border bg-cm-bg-alt object-contain p-1" />
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-cm-border/50">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-cm-sm">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Guardar configuración
        </button>
      </div>
    </form>
  );
}
