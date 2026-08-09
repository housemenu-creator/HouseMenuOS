import { motion } from 'framer-motion';
import { Instagram, Facebook, MessageCircle, Link2, Link2Off, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram Business', Icon: Instagram, color: 'from-pink-500 to-orange-400' },
  { key: 'facebook', label: 'Facebook Page', Icon: Facebook, color: 'from-blue-600 to-blue-700' },
  { key: 'whatsapp', label: 'WhatsApp Business', Icon: MessageCircle, color: 'from-green-500 to-green-600' },
];

function StatusBadge({ connected, expired }) {
  if (expired) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cm-warning/10 text-cm-warning text-[0.6rem] font-black uppercase tracking-wider"><AlertCircle className="w-3 h-3" /> Expirado</span>;
  if (connected) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cm-success/10 text-cm-success text-[0.6rem] font-black uppercase tracking-wider"><Link2 className="w-3 h-3" /> Conectado</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cm-bg text-cm-text-tertiary text-[0.6rem] font-black uppercase tracking-wider"><Link2Off className="w-3 h-3" /> Desconectado</span>;
}

export default function SocialConnections({ connections, onConnect, onDisconnect, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLATFORMS.map((p) => (
          <div key={p.key} className="bg-cm-surface border border-cm-border rounded-xl p-5 animate-pulse space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cm-bg" />
            <div className="h-4 w-28 bg-cm-bg rounded" />
            <div className="h-3 w-20 bg-cm-bg rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {PLATFORMS.map((platform, idx) => {
        const conn = connections?.[platform.key];
        const isConnected = conn?.connected === true;
        return (
          <motion.div
            key={platform.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`bg-cm-surface border rounded-xl p-5 shadow-cm-sm transition-all ${
              isConnected ? 'border-cm-success/30' : 'border-cm-border'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center shadow-lg`}>
                <platform.Icon className="w-5 h-5 text-white" />
              </div>
              <StatusBadge connected={isConnected} expired={conn?.tokenExpiresAt && conn.tokenExpiresAt < Date.now()} />
            </div>
            <h3 className="text-sm font-bold text-cm-text mb-1">{platform.label}</h3>
            {isConnected ? (
              <div className="space-y-2">
                <p className="text-xs text-cm-text-secondary">
                  {platform.key === 'instagram' && (conn?.username ? `@${conn.username}` : 'Conectado')}
                  {platform.key === 'facebook' && (conn?.pageName || 'Página conectada')}
                  {platform.key === 'whatsapp' && (conn?.phoneNumber || 'Número conectado')}
                </p>
                {conn?.tokenExpiresAt && (
                  <p className="text-[0.6rem] text-cm-text-tertiary">
                    Token expira: {new Date(conn.tokenExpiresAt).toLocaleDateString('es-PE')}
                  </p>
                )}
                <button
                  onClick={() => onDisconnect(platform.key)}
                  className="text-[0.6rem] font-bold text-cm-error hover:text-cm-error/80 transition-colors uppercase tracking-wider"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-cm-text-tertiary">No conectado</p>
                <button
                  onClick={() => onConnect(platform.key)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cm-accent text-white text-[0.6rem] font-black uppercase tracking-wider hover:brightness-110 transition-all"
                >
                  <ExternalLink className="w-3 h-3" /> Conectar
                </button>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
