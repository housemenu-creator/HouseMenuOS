/**
 * System Configuration Tab — global settings panel.
 *
 * Orchestrates all config sections with a tabbed navigation.
 * Data layer via configService.js for clean separation of concerns.
 */

import { useState, useEffect } from 'react';
import { Settings, Globe, Lock, Bell, Bot, History, Activity, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { subscribeConfig, saveConfig } from './configService';
import GeneralSection from './GeneralSection';
import IntegrationsSection from './IntegrationsSection';
import SecuritySection from './SecuritySection';
import NotificationsSection from './NotificationsSection';
import TasksSection from './TasksSection';
import AuditSection from './AuditSection';
import HealthSection from './HealthSection';

const SECTIONS = [
  { key: 'general',       label: 'General',        icon: Settings },
  { key: 'integrations',  label: 'Integraciones',  icon: Globe },
  { key: 'security',      label: 'Seguridad',      icon: Lock },
  { key: 'notifications', label: 'Notificaciones',  icon: Bell },
  { key: 'tasks',         label: 'Tareas Agente',  icon: Bot },
  { key: 'audit',         label: 'Auditoría',      icon: History },
  { key: 'health',        label: 'Estado',         icon: Activity },
];

function Toast({ message, type, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-cm-lg text-xs font-medium animate-slide-up ${
      type === 'success' ? 'bg-cm-success text-white' :
      type === 'error' ? 'bg-cm-error text-white' :
      'bg-cm-warning text-white'
    }`}>
      {type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> :
       type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> :
       <AlertTriangle className="w-4 h-4 shrink-0" />}
      {message}
    </div>
  );
}

export default function SystemConfigTab() {
  const [activeSection, setActiveSection] = useState('general');
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Subscribe to config
  useEffect(() => {
    const unsub = subscribeConfig((data, err) => {
      if (err) { setConfigError(err); return; }
      setConfig(data);
    });
    return unsub;
  }, []);

  const handleSave = async (data) => {
    setSaving(true);
    setToast(null);
    const result = await saveConfig(data);
    if (result.success) {
      setToast({ type: 'success', message: 'Configuración guardada correctamente.' });
    } else {
      setToast({ type: 'error', message: `Error: ${result.error}` });
    }
    setSaving(false);
  };

  // Loading state
  if (!config && !configError) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
          <p className="text-xs text-cm-text-secondary">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (configError) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-12 h-12 text-cm-error mx-auto mb-4" />
        <h3 className="text-sm font-bold text-cm-text mb-1">Error de conexión</h3>
        <p className="text-xs text-cm-text-secondary">No se pudo cargar la configuración. Verificá la conexión con Firebase.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-cm-accent" />
          <h2 className="text-lg font-bold text-cm-text">Configuración del Sistema</h2>
        </div>
      </div>

      {/* Section navigation — responsive scrollable tabs */}
      <div className="overflow-x-auto -mx-5">
        <div className="flex gap-1 bg-cm-bg-alt/50 rounded-xl p-1 border border-cm-border/50 min-w-max px-5">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.key} onClick={() => setActiveSection(s.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeSection === s.key
                    ? 'bg-cm-surface text-cm-accent shadow-cm-sm border border-cm-border'
                    : 'text-cm-text-secondary hover:text-cm-text hover:bg-cm-bg-alt border border-transparent'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="bg-cm-surface border border-cm-border rounded-xl p-5">
        {activeSection === 'general' && (
          <GeneralSection config={config} onSave={handleSave} saving={saving} />
        )}
        {activeSection === 'integrations' && (
          <IntegrationsSection config={config} onSave={handleSave} saving={saving} />
        )}
        {activeSection === 'security' && (
          <SecuritySection config={config} onSave={handleSave} saving={saving} />
        )}
        {activeSection === 'notifications' && (
          <NotificationsSection config={config} onSave={handleSave} saving={saving} />
        )}
        {activeSection === 'tasks' && <TasksSection />}
        {activeSection === 'audit' && <AuditSection />}
        {activeSection === 'health' && <HealthSection />}
      </div>

      {/* Toast notification */}
      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
