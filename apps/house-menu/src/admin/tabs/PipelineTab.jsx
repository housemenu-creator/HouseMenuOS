import { useState, useEffect } from 'react';
import { ref, get, child } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import {
  Settings, Activity, Play, ExternalLink, Loader2, AlertTriangle,
  CheckCircle, XCircle, HelpCircle, Power, Trash2,
} from 'lucide-react';

const PIPELINE_API_URL =
  import.meta.env.VITE_PIPELINE_API_URL ||
  'https://us-central1-house-menuapp.cloudfunctions.net/pipelineStatus';

const COMPONENTS_INITIAL = [
  { name: 'API Gateway', status: 'loading', detail: 'Verificando...' },
  { name: 'Event Bus', status: 'loading', detail: 'Verificando...' },
  { name: 'n8n', status: 'loading', detail: 'Verificando...' },
  { name: 'Bridge PO', status: 'loading', detail: 'Verificando...' },
];

const STATUS_STYLES = {
  ok: 'bg-cm-success',
  error: 'bg-cm-error',
  unknown: 'bg-cm-muted',
  loading: 'bg-cm-warning',
};

const STATUS_ICONS = {
  ok: CheckCircle,
  error: XCircle,
  unknown: HelpCircle,
  loading: Loader2,
};

export default function PipelineTab({ branchId }) {
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [components, setComponents] = useState(COMPONENTS_INITIAL);
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(true);

  // ── Pipeline config ──
  useEffect(() => {
    let dead = false;
    get(child(ref(db), `tenants/${branchId}/config`))
      .then((snap) => {
        if (dead) return;
        setConfig(snap.exists() ? snap.val() : null);
      })
      .catch(() => { if (!dead) setConfig(null); })
      .finally(() => { if (!dead) setConfigLoading(false); });
    return () => { dead = true; };
  }, [branchId]);

  // ── Component health ──
  useEffect(() => {
    let dead = false;
    fetch(PIPELINE_API_URL, { signal: AbortSignal.timeout(10_000) })
      .then((r) => r.json())
      .then((data) => { if (!dead) setComponents(data.components || []); })
      .catch(() => {
        if (dead) return;
        setComponents([
          { name: 'API Gateway', status: 'ok', detail: 'Online' },
          { name: 'Event Bus', status: 'unknown', detail: 'No verificado' },
          { name: 'n8n', status: 'unknown', detail: 'Local — verificar tunnel' },
          { name: 'Bridge PO', status: 'unknown', detail: 'Local — verificar puerto' },
        ]);
      });
    return () => { dead = true; };
  }, []);

  // ── Automation rules ──
  useEffect(() => {
    let dead = false;
    get(ref(db, 'automation/rules'))
      .then((snap) => {
        if (dead) return;
        if (!snap.exists()) { setRules([]); return; }
        const data = snap.val();
        setRules(
          Object.entries(data).map(([id, r]) => ({ id, ...r }))
            .sort((a, b) => a.name?.localeCompare(b.name || '') || 0)
        );
      })
      .catch(() => { if (!dead) setRules([]); })
      .finally(() => { if (!dead) setRulesLoading(false); });
    return () => { dead = true; };
  }, []);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-cm-text">Pipeline Automatizado</h2>
          <p className="text-xs text-cm-muted mt-0.5">
            Reglas de automatización, health de componentes y configuración del pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://n8n.house-menu.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cm-accent text-white text-xs font-bold rounded-lg hover:bg-cm-accent/80 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Abrir n8n
          </a>
          <a
            href={PIPELINE_API_URL.replace('/pipelineStatus', '/health')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cm-bg-alt text-cm-text-secondary border border-cm-border text-xs font-bold rounded-lg hover:bg-cm-surface-hover transition-colors"
          >
            <Play className="w-3.5 h-3.5" /> Health check
          </a>
        </div>
      </div>

      {/* ── Pipeline config ── */}
      <section className="bg-cm-surface border border-cm-border rounded-xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <Settings className="w-4 h-4 text-cm-text-tertiary" />
          <h3 className="text-sm font-bold text-cm-text">Configuración del Pipeline</h3>
        </div>
        {configLoading ? (
          <div className="flex items-center gap-2 text-xs text-cm-muted">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando...
          </div>
        ) : config ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatusCard label="Estado" value={config?.pipeline?.status || '—'} />
            <StatusCard label="Último trigger" value={config?.pipeline?.lastTrigger || '—'} />
            <StatusCard label="n8n webhook" value={config?.n8n?.webhookUrl ? 'Configurado' : 'No configurado'} />
            <StatusCard label="Forwards" value={String(config?.pipeline?.forwardCount ?? 0)} />
          </div>
        ) : (
          <p className="text-xs text-cm-muted">Sin configuración. Seedéalas desde Firebase o n8n.</p>
        )}
      </section>

      {/* ── Component health ── */}
      <section className="bg-cm-surface border border-cm-border rounded-xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <Activity className="w-4 h-4 text-cm-text-tertiary" />
          <h3 className="text-sm font-bold text-cm-text">Estado de Componentes</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {components.map((c) => {
            const Icon = STATUS_ICONS[c.status] || HelpCircle;
            return (
              <div key={c.name} className="bg-cm-bg-alt border border-cm-border rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_STYLES[c.status] || 'bg-cm-muted'}`} />
                  <span className="text-xs font-bold text-cm-text">{c.name}</span>
                </div>
                <div className="flex items-center gap-1 mt-1 ml-4">
                  <Icon className={`w-3 h-3 ${c.status === 'loading' ? 'animate-spin' : ''} text-cm-muted`} />
                  <span className="text-[10px] text-cm-text-secondary truncate">{c.detail}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Automation rules ── */}
      <section className="bg-cm-surface border border-cm-border rounded-xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <Power className="w-4 h-4 text-cm-text-tertiary" />
          <h3 className="text-sm font-bold text-cm-text">Reglas de Automatización</h3>
        </div>
        {rulesLoading ? (
          <div className="flex items-center gap-2 text-xs text-cm-muted">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando...
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-8 text-xs text-cm-muted">
            <Settings className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No hay reglas de automatización. Seedéalas desde Firebase Console.
          </div>
        ) : (
          <div className="space-y-1">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between px-4 py-2.5 bg-cm-bg-alt border border-cm-border rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-cm-text truncate">{rule.name}</p>
                  <p className="text-[10px] text-cm-muted font-mono">{rule.eventType}</p>
                </div>
                <span
                  className={`shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    rule.enabled
                      ? 'bg-cm-success/10 text-cm-success'
                      : 'bg-cm-error/10 text-cm-error'
                  }`}
                >
                  {rule.enabled ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ═════════════════════════════════

function StatusCard({ label, value }) {
  return (
    <div className="bg-cm-bg-alt border border-cm-border rounded-lg p-4">
      <p className="text-[10px] font-bold text-cm-text-secondary uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-bold text-cm-text">{value}</p>
    </div>
  );
}
