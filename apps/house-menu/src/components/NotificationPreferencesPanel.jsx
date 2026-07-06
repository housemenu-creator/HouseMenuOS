import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import {
  subscribeToPreferences,
  updatePreference,
  resetAllPreferences,
  resetPreference,
  NOTIF_PREF_TYPES,
  getDefaultPreferences,
  subscribeToDNDConfig,
  updateDNDConfig,
  toggleDND,
  isDNDActive,
  DND_DAY_LABELS,
  DEFAULT_DND,
} from '../lib/notificationPreferences';
import { NOTIF_ICONS, NOTIF_TYPES } from '../lib/notificationService';
import { useToast } from './ToastContext';
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Smartphone,
  SmartphoneNfc,
  RotateCcw,
  RotateCw,
  Loader2,
  Moon,
  Sun,
  Clock,
  CalendarDays,
} from 'lucide-react';

const TYPE_LABELS = {
  order_new:        'Nuevos pedidos',
  order_assigned:   'Asignaciones',
  order_delivered:  'Entregas',
  order_cancelled:  'Cancelaciones',
  delivery_confirmed: 'Confirmaciones de entrega',
  driver_offline:   'Repartidores offline',
  system:           'Sistema',
  comm_message:     'Mensajes del chat',
};

const TYPE_DESCRIPTIONS = {
  order_new:        'Cuando llega un pedido nuevo',
  order_assigned:   'Cuando se asigna un repartidor',
  order_delivered:  'Cuando un pedido se marca como entregado',
  order_cancelled:  'Cuando se cancela un pedido',
  delivery_confirmed: 'Cuando se confirma una entrega',
  driver_offline:   'Cuando un repartidor se desconecta',
  system:           'Avisos del sistema y mantenimiento',
  comm_message:     'Mensajes nuevos en los canales de comunicación',
};

function PreferenceToggle({ label, description, icon, enabled, push, sound, onToggle, onChange, onReset }) {
  const isActive = enabled !== false;

  return (
    <div className={`rounded-xl border transition-all ${
      isActive
        ? 'bg-cm-surface border-cm-border hover:border-cm-accent/30'
        : 'bg-cm-bg-alt/50 border-cm-border/50 opacity-60'
    }`}>
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
              isActive
                ? 'bg-cm-accent/10 ring-1 ring-cm-accent/20'
                : 'bg-cm-bg-alt border border-cm-border/50'
            }`}>
              {icon}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-bold truncate ${isActive ? 'text-cm-text' : 'text-cm-muted'}`}>
                {label}
              </p>
              <p className="text-[10px] text-cm-muted font-medium truncate">
                {description}
              </p>
            </div>
          </div>

          {/* Master toggle */}
          <button
            onClick={() => onToggle(enabled !== false ? { enabled: false } : { enabled: true, push: true, sound: true })}
            className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${
              isActive ? 'bg-cm-accent' : 'bg-cm-border'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-cm-surface shadow-sm transition-transform ${
              isActive ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Sub-toggles (only when enabled) */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-4 pt-3 mt-3 border-t border-cm-border/50">
                {/* Push toggle */}
                <button
                  onClick={() => onChange({ push: push !== false ? false : true })}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    push !== false
                      ? 'bg-cm-accent/10 text-cm-accent'
                      : 'bg-cm-bg-alt text-cm-muted'
                  }`}
                >
                  {push !== false
                    ? <Smartphone className="w-3 h-3" />
                    : <SmartphoneNfc className="w-3 h-3" />
                  }
                  Push {push !== false ? 'ON' : 'OFF'}
                </button>

                {/* Sound toggle */}
                <button
                  onClick={() => onChange({ sound: sound !== false ? false : true })}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    sound !== false
                      ? 'bg-cm-accent/10 text-cm-accent'
                      : 'bg-cm-bg-alt text-cm-muted'
                  }`}
                >
                  {sound !== false
                    ? <Volume2 className="w-3 h-3" />
                    : <VolumeX className="w-3 h-3" />
                  }
                  Sonido {sound !== false ? 'ON' : 'OFF'}
                </button>

                {/* Reset button */}
                <button
                  onClick={onReset}
                  className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-cm-muted hover:text-cm-text hover:bg-cm-bg-alt transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restaurar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function NotificationPreferencesPanel({ onClose }) {
  const { user } = useAuth();
  const { activeBranchId } = useBranch();
  const { showToast } = useToast();
  const [preferences, setPreferences] = useState(null);
  const [dndConfig, setDNDConfig] = useState(null);
  const [saving, setSaving] = useState(false);

  // Subscribe to preferences
  useEffect(() => {
    if (!activeBranchId || !user?.email) return;
    return subscribeToPreferences(activeBranchId, user.email, setPreferences);
  }, [activeBranchId, user?.email]);

  // Subscribe to DND config
  useEffect(() => {
    if (!activeBranchId || !user?.email) return;
    return subscribeToDNDConfig(activeBranchId, user.email, setDNDConfig);
  }, [activeBranchId, user?.email]);

  const handleToggle = useCallback(async (type, partial) => {
    if (!activeBranchId || !user?.email) return;
    setSaving(true);
    try {
      await updatePreference(activeBranchId, user.email, type, partial);
    } catch {
      showToast('Error al guardar preferencia', 'error');
    }
    setSaving(false);
  }, [activeBranchId, user?.email, showToast]);

  const handleChange = useCallback(async (type, partial) => {
    if (!activeBranchId || !user?.email) return;
    setSaving(true);
    try {
      await updatePreference(activeBranchId, user.email, type, partial);
    } catch {
      showToast('Error al guardar preferencia', 'error');
    }
    setSaving(false);
  }, [activeBranchId, user?.email, showToast]);

  const handleReset = useCallback(async (type) => {
    if (!activeBranchId || !user?.email) return;
    setSaving(true);
    try {
      await resetPreference(activeBranchId, user.email, type);
      showToast('Preferencia restaurada a valores de fábrica', 'success');
    } catch {
      showToast('Error al restaurar preferencia', 'error');
    }
    setSaving(false);
  }, [activeBranchId, user?.email, showToast]);

  const handleResetAll = useCallback(async () => {
    if (!activeBranchId || !user?.email) return;
    setSaving(true);
    try {
      await resetAllPreferences(activeBranchId, user.email);
      showToast('Preferencias restauradas a valores de fábrica', 'success');
    } catch {
      showToast('Error al restaurar preferencias', 'error');
    }
    setSaving(false);
  }, [activeBranchId, user?.email, showToast]);

  // ── DND handlers ──

  const handleDNDToggle = useCallback(async (active) => {
    if (!activeBranchId || !user?.email) return;
    setSaving(true);
    try {
      await toggleDND(activeBranchId, user.email, active);
    } catch {
      showToast('Error al cambiar modo silencio', 'error');
    }
    setSaving(false);
  }, [activeBranchId, user?.email, showToast]);

  const handleDNDUpdate = useCallback(async (partial) => {
    if (!activeBranchId || !user?.email) return;
    setSaving(true);
    try {
      await updateDNDConfig(activeBranchId, user.email, partial);
    } catch {
      showToast('Error al guardar configuración DND', 'error');
    }
    setSaving(false);
  }, [activeBranchId, user?.email, showToast]);

  const dnd = dndConfig ? isDNDActive(dndConfig) : { dnd: false, quiet: false };

  if (!preferences) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-cm-accent animate-spin" />
      </div>
    );
  }

  const enabledCount = Object.entries(preferences).filter(([, v]) => v.enabled !== false).length;
  const totalCount = NOTIF_PREF_TYPES.length;

  return (
    <div className="min-h-screen bg-cm-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-cm-surface/80 backdrop-blur-xl border-b border-cm-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-cm-bg-alt transition-colors shrink-0"
            >
              <ChevronDown className="w-5 h-5 text-cm-text rotate-90" />
            </button>

            <div className="min-w-0">
              <h1 className="text-sm font-black text-cm-text truncate leading-tight">
                Preferencias de notificación
              </h1>
              <p className="text-[10px] text-cm-muted font-semibold truncate">
                {enabledCount} de {totalCount} tipos activos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saving && (
              <Loader2 className="w-4 h-4 text-cm-muted animate-spin" />
            )}
            <button
              onClick={handleResetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-cm-muted bg-cm-bg-alt rounded-lg hover:text-cm-text hover:bg-cm-border transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restaurar todo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-4 pb-24">
        {/* Summary */}
        <div className="flex items-center gap-3 text-[10px] font-bold text-cm-muted">
          <span className="flex items-center gap-1">
            <Bell className="w-3 h-3" />
            {enabledCount === totalCount
              ? 'Todas las notificaciones activas'
              : `${enabledCount} tipo${enabledCount !== 1 ? 's' : ''} activo${enabledCount !== 1 ? 's' : ''}`
            }
          </span>
          {enabledCount < totalCount && (
            <span className="flex items-center gap-1 text-cm-muted/60">
              <BellOff className="w-3 h-3" />
              {totalCount - enabledCount} desactivado{totalCount - enabledCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* ── Do Not Disturb ── */}
        {dndConfig && (
          <div className={`rounded-xl border transition-all ${
            dnd.quiet
              ? 'bg-cm-accent/[0.03] border-cm-accent/20'
              : 'bg-cm-surface border-cm-border'
          }`}>
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    dnd.quiet
                      ? 'bg-cm-accent/10 ring-1 ring-cm-accent/20'
                      : 'bg-cm-bg-alt border border-cm-border/50'
                  }`}>
                    <Moon className={`w-5 h-5 ${dnd.quiet ? 'text-cm-accent' : 'text-cm-muted'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${dnd.quiet ? 'text-cm-accent' : 'text-cm-text'}`}>
                      No molestar
                    </p>
                    <p className="text-[10px] text-cm-muted font-medium">
                      {dnd.quiet
                        ? 'Notificaciones silenciadas'
                        : dndConfig.enabled && !dndConfig.manual
                          ? 'Programado'
                          : 'Recibir notificaciones normalmente'
                      }
                    </p>
                  </div>
                </div>

                {/* Master toggle */}
                <button
                  onClick={() => handleDNDUpdate({ enabled: !dndConfig.enabled, manual: false })}
                  className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${
                    dndConfig.enabled ? 'bg-cm-accent' : 'bg-cm-border'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-cm-surface shadow-sm transition-transform ${
                    dndConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Quick mute button */}
              {dndConfig.enabled && (
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleDNDToggle(!dndConfig.manual)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      dndConfig.manual
                        ? 'bg-cm-accent/15 text-cm-accent ring-1 ring-cm-accent/30'
                        : 'bg-cm-bg-alt text-cm-muted hover:text-cm-text'
                    }`}
                  >
                    {dndConfig.manual ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                    {dndConfig.manual ? 'Silenciado ahora' : 'Silenciar ahora'}
                  </button>

                  {dnd.quiet && !dndConfig.manual && dndConfig.schedule && (
                    <span className="text-[9px] text-cm-muted font-medium flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {dndConfig.schedule.start}–{dndConfig.schedule.end}
                    </span>
                  )}
                </div>
              )}

              {/* Schedule config (only when DND enabled) */}
              <AnimatePresence>
                {dndConfig.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 mt-3 border-t border-cm-border/50 space-y-3">
                      {/* Start/End time */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[9px] font-bold text-cm-muted uppercase tracking-wider block mb-1">
                            Desde
                          </label>
                          <input
                            type="time"
                            value={dndConfig.schedule?.start || '22:00'}
                            onChange={(e) => handleDNDUpdate({ schedule: { ...dndConfig.schedule, start: e.target.value } })}
                            className="w-full px-3 py-2 bg-cm-bg-alt border border-cm-border rounded-lg text-xs font-bold text-cm-text focus:outline-none focus:border-cm-accent/40 transition-colors"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] font-bold text-cm-muted uppercase tracking-wider block mb-1">
                            Hasta
                          </label>
                          <input
                            type="time"
                            value={dndConfig.schedule?.end || '08:00'}
                            onChange={(e) => handleDNDUpdate({ schedule: { ...dndConfig.schedule, end: e.target.value } })}
                            className="w-full px-3 py-2 bg-cm-bg-alt border border-cm-border rounded-lg text-xs font-bold text-cm-text focus:outline-none focus:border-cm-accent/40 transition-colors"
                          />
                        </div>
                      </div>

                      {/* Days of week */}
                      <div>
                        <label className="text-[9px] font-bold text-cm-muted uppercase tracking-wider block mb-1.5">
                          <CalendarDays className="w-3 h-3 inline mr-1" />
                          Días
                        </label>
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                            const active = dndConfig.schedule?.days?.includes(day);
                            return (
                              <button
                                key={day}
                                onClick={() => {
                                  const current = dndConfig.schedule?.days || [];
                                  const next = active
                                    ? current.filter((d) => d !== day)
                                    : [...current, day].sort();
                                  handleDNDUpdate({ schedule: { ...dndConfig.schedule, days: next } });
                                }}
                                className={`w-9 h-9 rounded-lg text-[10px] font-bold transition-all ${
                                  active
                                    ? 'bg-cm-accent/15 text-cm-accent ring-1 ring-cm-accent/30'
                                    : 'bg-cm-bg-alt text-cm-muted hover:text-cm-text hover:bg-cm-border'
                                }`}
                              >
                                {DND_DAY_LABELS[day]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Preference list */}
        <div className="space-y-2">
          {NOTIF_PREF_TYPES.map((type) => {
            const prefs = preferences[type] || { enabled: true, push: true, sound: true };
            return (
              <PreferenceToggle
                key={type}
                icon={NOTIF_ICONS[type] || '🔔'}
                label={TYPE_LABELS[type] || type}
                description={TYPE_DESCRIPTIONS[type] || ''}
                enabled={prefs.enabled}
                push={prefs.push}
                sound={prefs.sound}
                onToggle={(partial) => handleToggle(type, partial)}
                onChange={(partial) => handleChange(type, partial)}
                onReset={() => handleReset(type)}
              />
            );
          })}
        </div>

        {/* Info footer */}
        <div className="text-center pt-4">
          <p className="text-[10px] text-cm-muted/60 font-medium">
            Las preferencias se sincronizan en tiempo real entre todos tus dispositivos.
            Los cambios aplican inmediatamente.
          </p>
        </div>
      </div>
    </div>
  );
}
