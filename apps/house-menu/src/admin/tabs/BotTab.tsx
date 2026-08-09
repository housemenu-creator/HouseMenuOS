import { useState, useEffect, useRef } from 'react';
import { Bot, Wifi, WifiOff, Smartphone, MessageCircle, Cpu, Database, RefreshCw, Radio } from 'lucide-react';

const BOT_API = import.meta.env.VITE_BOT_API_URL || 'http://localhost:3000';

interface BotStatus {
  whatsapp: { status: string; number: string; enabled: boolean };
  telegram: { configured: boolean; username: string | null; adminChatId: string | null };
  ai: { model: string; provider: string; fallback: string };
  firebase: { configured: boolean; projectId: string | null };
  branch: string;
  uptime: number;
  version: string;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
      ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
    }`}>
      {ok ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {label}
    </span>
  );
}

function StatRow({ icon, label, value, extra }: { icon: React.ReactNode; label: string; value: string | React.ReactNode; extra?: string }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-cm-text-secondary">{icon}</span>
        <span className="text-sm text-cm-text-secondary">{label}</span>
      </div>
      <div className="text-right">
        <span className="text-sm font-semibold text-cm-text">{value}</span>
        {extra && <div className="text-xs text-cm-text-tertiary">{extra}</div>}
      </div>
    </div>
  );
}

export default function BotTab() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevRef = useRef<BotStatus | null>(null);

  async function fetchStatus() {
    setError(null);
    try {
      const res = await fetch(`${BOT_API}/api/bot/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      prevRef.current = status;
      setStatus(data);
    } catch (e: any) {
      setError(e.message || 'Error al conectar con el bot');
    } finally {
      setLoading(false);
    }
  }

  // Initial fetch
  useEffect(() => { fetchStatus(); }, []);

  // Auto-poll every 10s
  useEffect(() => {
    const id = setInterval(fetchStatus, 10_000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cm-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-cm-text-secondary">Conectando con el bot...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-sm">
          <Bot className="w-12 h-12 text-cm-accent mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-cm-text mb-1">Bot no disponible</h3>
          <p className="text-sm text-cm-text-secondary mb-4">{error}</p>
          <p className="text-xs text-cm-text-tertiary mb-4">El servidor del bot corre en <code className="text-cm-accent">{BOT_API}</code></p>
          <button onClick={fetchStatus} className="inline-flex items-center gap-2 px-4 py-2 bg-cm-accent text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-cm-text flex items-center gap-2">
            <Bot className="w-6 h-6 text-cm-accent" /> HousePySbot
          </h2>
          <p className="text-sm text-cm-text-secondary mt-1">
            v{status.version} · sucursal <span className="font-semibold text-cm-text">{status.branch}</span> · {formatUptime(status.uptime)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-cm-text-tertiary">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
            </span>
            Live
          </span>
          <button onClick={fetchStatus} className="p-2 rounded-xl hover:bg-white/5 text-cm-text-secondary hover:text-cm-text transition-colors" title="Recargar ahora">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-cm-text-secondary" />
            <span className="font-semibold text-sm text-cm-text">WhatsApp</span>
          </div>
          <StatusBadge ok={status.whatsapp.status === 'connected'} label={status.whatsapp.status === 'connected' ? 'Conectado' : 'Desconectado'} />
        </div>
        <div>
          <StatRow icon={<Smartphone className="w-4 h-4" />} label="Número" value={status.whatsapp.number || '—'} />
          <StatRow icon={<Wifi className="w-4 h-4" />} label="WhatsApp" value={status.whatsapp.enabled ? 'Activado' : 'Desactivado'} extra={status.whatsapp.enabled ? 'WHATSAPP_ENABLED=true' : 'WHATSAPP_ENABLED=false'} />
          {status.whatsapp.status !== 'connected' && (
            <div className="px-4 py-3 bg-cm-accent/5 border-t border-white/5">
              <a href={BOT_API} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-cm-accent hover:underline">
                📲 Escanear QR en el bot
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Telegram */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-cm-text-secondary" />
            <span className="font-semibold text-sm text-cm-text">Telegram</span>
          </div>
          <StatusBadge ok={status.telegram.configured} label={status.telegram.configured ? 'Configurado' : 'Sin configurar'} />
        </div>
        <div>
          <StatRow icon={<MessageCircle className="w-4 h-4" />} label="Bot" value={status.telegram.username ? `@${status.telegram.username}` : '—'} />
          <StatRow icon={<MessageCircle className="w-4 h-4" />} label="Admin Chat ID" value={status.telegram.adminChatId || '—'} />
        </div>
      </div>

      {/* IA */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cm-text-secondary" />
          <span className="font-semibold text-sm text-cm-text">Inteligencia Artificial</span>
        </div>
        <div>
          <StatRow icon={<Cpu className="w-4 h-4" />} label="Modelo" value={status.ai.model} />
          <StatRow icon={<Database className="w-4 h-4" />} label="Proveedor" value={status.ai.provider} />
          <StatRow icon={<RefreshCw className="w-4 h-4" />} label="Fallback" value={status.ai.fallback} />
        </div>
      </div>

      {/* Firebase */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cm-text-secondary" />
            <span className="font-semibold text-sm text-cm-text">Firebase</span>
          </div>
          <StatusBadge ok={status.firebase.configured} label={status.firebase.configured ? 'Configurado' : 'Sin configurar'} />
        </div>
        <div>
          <StatRow icon={<Database className="w-4 h-4" />} label="Project ID" value={status.firebase.projectId || '—'} />
        </div>
      </div>
    </div>
  );
}
