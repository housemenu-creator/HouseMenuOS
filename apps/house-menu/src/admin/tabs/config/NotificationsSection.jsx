/**
 * Notifications Section — event-to-channel routing matrix.
 */

import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle2, Bell } from 'lucide-react';

const NOTIF_EVENTS = [
  { key: 'order_new',        label: 'Nuevo pedido',        desc: 'Cuando se crea un pedido nuevo' },
  { key: 'order_delayed',    label: 'Pedido demorado',     desc: 'Cuando un pedido supera el tiempo estimado' },
  { key: 'order_cancelled',  label: 'Pedido cancelado',    desc: 'Cuando un pedido es cancelado' },
  { key: 'low_stock',        label: 'Stock bajo',          desc: 'Cuando un producto tiene poco inventario' },
  { key: 'daily_report',     label: 'Reporte diario',      desc: 'Resumen de ventas del día' },
  { key: 'system_error',     label: 'Error del sistema',   desc: 'Cuando ocurre un error crítico en el bot' },
  { key: 'employee_clock',   label: 'Fichado empleado',    desc: 'Cuando un empleado marca entrada/salida' },
];

const NOTIF_CHANNELS = [
  { key: 'telegram_admin', label: 'Telegram Admin', icon: '🤖' },
  { key: 'telegram_group', label: 'Telegram Grupo', icon: '👥' },
  { key: 'whatsapp',       label: 'WhatsApp',       icon: '💬' },
];

const DEFAULT_RULES = [
  { event: 'order_new',        channels: ['telegram_group'] },
  { event: 'order_delayed',    channels: ['telegram_admin', 'whatsapp'] },
  { event: 'order_cancelled',  channels: ['telegram_admin'] },
  { event: 'system_error',     channels: ['telegram_admin'] },
];

export default function NotificationsSection({ config, onSave, saving }) {
  const [rules, setRules] = useState([]);

  useEffect(() => {
    const stored = config?.notifications?.rules;
    setRules(stored && stored.length > 0 ? stored : DEFAULT_RULES);
  }, [config]);

  const toggleChannel = (eventKey, channelKey) => {
    setRules(prev => {
      const existing = prev.find(r => r.event === eventKey);
      if (existing) {
        const channels = existing.channels.includes(channelKey)
          ? existing.channels.filter(c => c !== channelKey)
          : [...existing.channels, channelKey];
        return prev.map(r => r.event === eventKey ? { ...r, channels } : r);
      }
      return [...prev, { event: eventKey, channels: [channelKey] }];
    });
  };

  const isActive = (eventKey, channelKey) => {
    const rule = rules.find(r => r.event === eventKey);
    return rule?.channels?.includes(channelKey) || false;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ notifications: { rules } });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-[0.6rem] text-cm-text-secondary leading-relaxed">
        Configurá qué eventos del sistema generan notificaciones y por qué canal se envían.
        Marcá las celdas de la matriz para activar cada combinación.
      </p>

      <div className="overflow-x-auto -mx-5">
        <div className="inline-block min-w-full px-5">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left font-semibold text-cm-text-secondary py-2.5 pr-4 text-[0.55rem] uppercase tracking-wider">Evento</th>
                {NOTIF_CHANNELS.map(ch => (
                  <th key={ch.key} className="text-center font-semibold text-cm-text-secondary py-2.5 px-3 text-[0.55rem] uppercase tracking-wider">
                    {ch.icon} {ch.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NOTIF_EVENTS.map(ev => (
                <tr key={ev.key} className="border-t border-cm-border/30 hover:bg-cm-bg-alt/40 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="text-cm-text font-medium text-xs">{ev.label}</div>
                    <div className="text-[0.5rem] text-cm-text-tertiary mt-0.5">{ev.desc}</div>
                  </td>
                  {NOTIF_CHANNELS.map(ch => {
                    const active = isActive(ev.key, ch.key);
                    return (
                      <td key={ch.key} className="text-center py-3 px-3">
                        <button type="button" onClick={() => toggleChannel(ev.key, ch.key)}
                          className={`mx-auto w-5 h-5 rounded border-2 transition-all duration-150 flex items-center justify-center ${
                            active
                              ? 'bg-cm-accent border-cm-accent shadow-cm-sm'
                              : 'border-cm-border bg-transparent hover:border-cm-text-tertiary'
                          }`}
                          title={active ? `Desactivar ${ch.label}` : `Activar ${ch.label}`}>
                          {active && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-cm-border/50">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-cm-sm">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Guardar notificaciones
        </button>
      </div>
    </form>
  );
}
