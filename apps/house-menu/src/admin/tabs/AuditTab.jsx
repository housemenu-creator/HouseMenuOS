import { useState } from 'react';
import { motion } from 'framer-motion';
import { History, Search, Loader2, Clock, User, Shield, AlertTriangle } from 'lucide-react';
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-cm-text">Auditoría del Sistema</h2>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="px-2 py-1.5 bg-cm-surface border border-cm-border rounded-lg text-xs font-semibold text-cm-text"
          >
            <option value={1}>Último día</option>
            <option value={3}>Últimos 3 días</option>
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
          </select>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-accent text-white text-xs font-bold rounded-lg hover:bg-cm-accent-hover transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <History className="w-3.5 h-3.5" />}
            {loading ? 'Cargando...' : 'Cargar auditoría'}
          </button>
        </div>
      </div>

      <p className="text-xs text-cm-text-secondary">
        Registro de acciones administrativas realizadas en el sistema.
        {!logs && ' Selecciona un rango y presiona "Cargar auditoría".'}
      </p>

      {/* Search */}
      {logs && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filtrar por acción, actor..."
            className="w-full pl-9 pr-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
          />
        </div>
      )}

      {/* Logs list */}
      {logs && (
        <div className="space-y-1.5">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-cm-text-secondary">
              No se encontraron registros de auditoría en este rango.
            </div>
          ) : (
            filtered.map((entry, i) => (
              <motion.div
                key={entry.id || i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                className="flex items-start gap-3 p-3 bg-cm-surface rounded-xl border border-cm-border hover:border-cm-accent/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-cm-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  {entry.action?.startsWith('user') ? <User className="w-4 h-4 text-cm-info" /> :
                   entry.action?.startsWith('role') ? <Shield className="w-4 h-4 text-cm-accent" /> :
                   entry.action?.startsWith('branch') ? <AlertTriangle className="w-4 h-4 text-cm-warning" /> :
                   <History className="w-4 h-4 text-cm-text-tertiary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-cm-text uppercase tracking-wider">
                      {ACTION_LABELS[entry.action] || entry.action}
                    </span>
                    <span className="text-[10px] font-mono text-cm-text-tertiary bg-cm-bg-alt px-1 py-0.5 rounded">
                      {entry.actor}
                    </span>
                  </div>
                  {entry.detail && Object.keys(entry.detail).length > 0 && (
                    <p className="text-xs text-cm-text-secondary mt-0.5 font-mono truncate">
                      {JSON.stringify(entry.detail).slice(0, 200)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-cm-text-tertiary" />
                    <span className="text-[10px] text-cm-text-tertiary">
                      {new Date(entry.timestamp).toLocaleString('es-PE')}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Initial state */}
      {!logs && !loading && (
        <div className="text-center py-16 text-cm-text-tertiary">
          <History className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold">Selecciona un rango y carga la auditoría</p>
        </div>
      )}
    </div>
  );
}
