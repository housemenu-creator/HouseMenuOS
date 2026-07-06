import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  History, Search, Loader2, Clock, User, Shield, AlertTriangle,
  ShoppingCart, DollarSign, CreditCard, CheckCircle, XCircle,
  ArrowRight, ArrowUpDown, Ban, FileText, Activity,
} from 'lucide-react';
import { getAuditLogs } from '../../lib/auditService';

const ACTION_LABELS = {
  'user.created': 'Usuario creado',
  'user.updated': 'Usuario actualizado',
  'user.deleted': 'Usuario eliminado',
  'role.updated': 'Rol actualizado',
  'branch.created': 'Sucursal creada',
  'branch.updated': 'Sucursal actualizada',
  'config.updated': 'Config actualizada',
  'employee.created': 'Empleado creado',
  'employee.updated': 'Empleado actualizado',
  'employee.status_changed': 'Estado de empleado',
  'order.created': 'Pedido creado',
  'order.status_changed': 'Estado de pedido',
  'order.payment_verified': 'Pago verificado',
  'order.marked_paid': 'Cobro registrado',
};

const ACTION_ICONS = {
  'user.': <User className="w-4 h-4 text-cm-info" />,
  'role.': <Shield className="w-4 h-4 text-cm-accent" />,
  'branch.': <AlertTriangle className="w-4 h-4 text-cm-warning" />,
  'config.': <Activity className="w-4 h-4 text-cm-muted" />,
  'employee.': <User className="w-4 h-4 text-cm-text-secondary" />,
  'order.created': <ShoppingCart className="w-4 h-4 text-cm-success" />,
  'order.status_changed': <ArrowUpDown className="w-4 h-4 text-cm-info" />,
  'order.payment_verified': <CheckCircle className="w-4 h-4 text-cm-accent" />,
  'order.marked_paid': <DollarSign className="w-4 h-4 text-cm-success" />,
};

function getActionIcon(action) {
  if (!action) return <History className="w-4 h-4 text-cm-text-tertiary" />;
  // Exact match first
  if (ACTION_ICONS[action]) return ACTION_ICONS[action];
  // Prefix match
  for (const [prefix, icon] of Object.entries(ACTION_ICONS)) {
    if (action.startsWith(prefix)) return icon;
  }
  return <History className="w-4 h-4 text-cm-text-tertiary" />;
}

const ACTION_COLORS = {
  'user.created': 'border-l-cm-info',
  'user.deleted': 'border-l-cm-error',
  'order.created': 'border-l-cm-success',
  'order.status_changed': 'border-l-cm-info',
  'order.payment_verified': 'border-l-cm-accent',
  'order.marked_paid': 'border-l-cm-success',
};

export default function AuditTab() {
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [days, setDays] = useState(7);

  const fetchLogs = async () => {
    setLoading(true);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const result = await getAuditLogs(
      start.toISOString().slice(0, 10),
      end.toISOString().slice(0, 10)
    );
    setLogs(result);
    setLoading(false);
  };

  const filtered = logs
    ? logs.filter(l =>
        !search || l.action?.toLowerCase().includes(search.toLowerCase()) ||
        l.actor?.toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(l.detail).toLowerCase().includes(search.toLowerCase())
      )
    : [];

  // Stats
  const orderEvents = filtered.filter(l => l.action?.startsWith('order.'));
  const userEvents = filtered.filter(l => l.action?.startsWith('user.'));
  const statusChanges = filtered.filter(l => l.action === 'order.status_changed');

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-cm-text">Auditoría del Sistema</h2>
          <p className="text-xs text-cm-muted mt-0.5">
            Registro de acciones administrativas y operativas.
            {!logs && ' Seleccioná un rango y cargá la auditoría.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="px-2 py-1.5 bg-cm-surface border border-cm-border rounded-lg text-xs font-semibold text-cm-text"
          >
            <option value={1}>Último día</option>
            <option value={3}>Últimos 3 días</option>
            <option value={7}>Últimos 7 días</option>
            <option value={14}>Últimos 14 días</option>
            <option value={30}>Últimos 30 días</option>
          </select>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-accent text-white text-xs font-bold rounded-lg hover:bg-cm-accent/80 transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <History className="w-3.5 h-3.5" />}
            {loading ? 'Cargando...' : 'Cargar'}
          </button>
        </div>
      </div>

      {/* ── Stats (when loaded) ── */}
      {logs && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total eventos" value={filtered.length} icon={<Activity className="w-4 h-4" />} color="text-cm-text" />
          <StatCard label="Pedidos" value={orderEvents.length} icon={<ShoppingCart className="w-4 h-4" />} color="text-cm-success" />
          <StatCard label="Cambios de estado" value={statusChanges.length} icon={<ArrowUpDown className="w-4 h-4" />} color="text-cm-info" />
          <StatCard label="Usuarios" value={userEvents.length} icon={<User className="w-4 h-4" />} color="text-cm-accent" />
        </div>
      )}

      {/* ── Search ── */}
      {logs && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-muted" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filtrar por acción, actor..."
            className="w-full pl-9 pr-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text outline-none focus:border-cm-accent transition-colors"
          />
        </div>
      )}

      {/* ── Logs list ── */}
      {logs && (
        <div className="space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-cm-text-secondary bg-cm-surface rounded-xl border border-cm-border">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No se encontraron registros en este rango.
            </div>
          ) : (
            filtered.map((entry, i) => (
              <AuditEntry key={entry.id || i} entry={entry} index={i} />
            ))
          )}
        </div>
      )}

      {/* ── Initial state ── */}
      {!logs && !loading && (
        <div className="text-center py-20 text-cm-muted">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">Seleccioná un rango y cargá la auditoría</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════

function AuditEntry({ entry, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.4) }}
      className={`flex items-start gap-3 p-3 bg-cm-surface rounded-xl border border-cm-border hover:border-cm-accent/20 transition-colors ${
        entry.action === 'user.deleted' ? 'border-l-cm-error border-l-4' :
        entry.action === 'order.created' ? 'border-l-cm-success border-l-4' :
        entry.action === 'order.status_changed' ? 'border-l-cm-info border-l-4' :
        entry.action === 'order.payment_verified' ? 'border-l-cm-accent border-l-4' :
        ''
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-cm-bg-alt flex items-center justify-center shrink-0 mt-0.5">
        {getActionIcon(entry.action)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black text-cm-text uppercase tracking-wider">
            {ACTION_LABELS[entry.action] || entry.action}
          </span>
          <span className="text-[10px] font-mono text-cm-muted bg-cm-bg-alt px-1.5 py-0.5 rounded">
            {entry.actor}
          </span>
          {entry.action === 'order.status_changed' && entry.detail?.from && entry.detail?.to && (
            <span className="flex items-center gap-1 text-[10px] font-bold">
              <span className="text-cm-muted">{entry.detail.from}</span>
              <ArrowRight className="w-3 h-3 text-cm-accent" />
              <span className={entry.detail.to === 'cancelado' ? 'text-cm-error' : 'text-cm-success'}>
                {entry.detail.to}
              </span>
            </span>
          )}
          {entry.action === 'order.payment_verified' && (
            <span className="text-[10px] font-bold text-cm-accent flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Verificado
            </span>
          )}
          {entry.action === 'order.marked_paid' && (
            <span className="text-[10px] font-bold text-cm-success flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> {entry.detail?.method}
            </span>
          )}
        </div>

        {/* Detail */}
        {entry.detail && renderDetail(entry)}

        {/* Timestamp */}
        <div className="flex items-center gap-2 mt-1">
          <Clock className="w-3 h-3 text-cm-muted" />
          <span className="text-[10px] text-cm-muted">
            {new Date(entry.timestamp).toLocaleString('es-PE')}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function renderDetail(entry) {
  const d = entry.detail;

  // Order created
  if (entry.action === 'order.created') {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-cm-text-secondary mt-0.5">
        <span>#{d.orderId?.slice(-6).toUpperCase()}</span>
        {d.customerName && <span>— {d.customerName}</span>}
        <span>{d.itemCount} items</span>
        <span className="font-bold text-cm-text">S/ {d.total?.toFixed(2)}</span>
        <span className="capitalize">{d.source}</span>
        <span>{d.payment_method} · {d.payment_status}</span>
      </div>
    );
  }

  // Status change
  if (entry.action === 'order.status_changed') {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-cm-text-secondary mt-0.5">
        <span className="font-mono">#{d.orderId?.slice(-6).toUpperCase()}</span>
        {d.reason && <span>Motivo: {d.reason}</span>}
      </div>
    );
  }

  // Payment verified
  if (entry.action === 'order.payment_verified') {
    return (
      <div className="text-[10px] text-cm-text-secondary mt-0.5">
        #{d.orderId?.slice(-6).toUpperCase()} — Yape/Plin
      </div>
    );
  }

  // Marked paid
  if (entry.action === 'order.marked_paid') {
    return (
      <div className="text-[10px] text-cm-text-secondary mt-0.5">
        #{d.orderId?.slice(-6).toUpperCase()} — {d.method}
      </div>
    );
  }

  // Default: JSON
  if (Object.keys(d).length > 0) {
    return (
      <p className="text-[10px] text-cm-text-secondary mt-0.5 font-mono truncate">
        {JSON.stringify(d).slice(0, 250)}
      </p>
    );
  }

  return null;
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
      <div className="flex items-center gap-1.5 text-cm-text-secondary mb-1">
        <span className={color}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-black tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
