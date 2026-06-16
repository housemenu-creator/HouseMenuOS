import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import {
  subscribeToNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  NOTIF_ICONS,
  NOTIF_TYPES,
} from '../lib/notificationService';
import {
  Bell, CheckCheck, ArrowLeft, Loader2, Clock,
  Filter, X, Inbox, ChevronDown,
} from 'lucide-react';

const TYPE_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'order_new', label: '📦 Nuevos pedidos' },
  { value: 'order_assigned', label: '🚴 Asignaciones' },
  { value: 'order_delivered', label: '✅ Entregas' },
  { value: 'order_cancelled', label: '❌ Cancelaciones' },
  { value: 'payment_verified', label: '💳 Pagos' },
  { value: 'system', label: '🔔 Sistema' },
];

function timeAgo(dateVal) {
  if (!dateVal) return '';
  const ts = typeof dateVal === 'number' ? dateVal : new Date(dateVal).getTime();
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Hace ${days}d`;
  return new Date(ts).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

function formatDateGroup(dateVal) {
  if (!dateVal) return '';
  const ts = typeof dateVal === 'number' ? dateVal : new Date(dateVal).getTime();
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
}

function groupByDate(items) {
  const groups = {};
  for (const item of items) {
    const key = formatDateGroup(item._createdAt_client || item.createdAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export default function NotificacionesView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeBranchId } = useBranch();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Subscribe
  useEffect(() => {
    if (!activeBranchId || !user?.email) return;
    setLoading(true);
    const unsub = subscribeToNotifications(activeBranchId, user.email, (list) => {
      setNotifications(list);
      setLoading(false);
    });
    return unsub;
  }, [activeBranchId, user?.email]);

  // Filtered list
  const filtered = useMemo(() => {
    if (!filterType) return notifications;
    return notifications.filter((n) => n.type === filterType);
  }, [notifications, filterType]);

  // Group by date
  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const unreadCount = getUnreadCount(notifications);
  const activeLabel = TYPE_OPTIONS.find((t) => t.value === filterType)?.label || 'Todas';

  const handleMarkRead = useCallback(async (notif) => {
    if (!notif.read) {
      await markAsRead(activeBranchId, user?.email, notif.id);
    }
    if (notif.url) {
      navigate(notif.url);
    }
  }, [activeBranchId, user?.email, navigate]);

  const handleMarkAllRead = useCallback(async () => {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    if (ids.length === 0) return;
    await markAllAsRead(activeBranchId, user?.email, ids);
  }, [activeBranchId, user?.email, notifications]);

  return (
    <div className="min-h-screen bg-cm-bg">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-cm-surface/80 backdrop-blur-xl border-b border-cm-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-cm-bg-alt transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-cm-text" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-cm-text truncate leading-tight">Notificaciones</h1>
              <p className="text-[10px] text-cm-muted font-semibold truncate">
                {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-cm-accent bg-cm-accent/10 rounded-lg hover:bg-cm-accent/20 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leer todas</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4 pb-24">

        {/* ── Filtro ── */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-cm-surface border border-cm-border rounded-xl text-xs font-bold text-cm-text hover:border-cm-accent/40 transition-colors"
          >
            <Filter className="w-3.5 h-3.5 text-cm-muted" />
            {activeLabel}
            <ChevronDown className={`w-3.5 h-3.5 text-cm-muted transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showFilterDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                className="absolute top-full left-0 mt-1 w-56 bg-cm-surface border border-cm-border rounded-xl shadow-cm-lg overflow-hidden z-50"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setFilterType(opt.value); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${
                      filterType === opt.value
                        ? 'bg-cm-accent/10 text-cm-accent'
                        : 'text-cm-text hover:bg-cm-bg-alt'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Lista ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
            <p className="text-xs font-bold text-cm-muted uppercase tracking-widest">Cargando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-cm-bg-alt border border-cm-border flex items-center justify-center">
              <Inbox className="w-8 h-8 text-cm-muted/40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-cm-text">Sin notificaciones</p>
              <p className="text-xs text-cm-muted mt-1">
                {filterType
                  ? `No hay notificaciones del tipo "${activeLabel.toLowerCase()}"`
                  : 'No hay novedades todavía. Cuando algo ocurra, aparecerá acá.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black text-cm-muted uppercase tracking-widest">{dateLabel}</span>
                  <div className="flex-1 h-px bg-cm-border/50" />
                  <span className="text-[9px] font-bold text-cm-muted">{items.length}</span>
                </div>
                <div className="space-y-1">
                  {items.map((notif) => (
                    <motion.button
                      key={notif.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleMarkRead(notif)}
                      className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all ${
                        !notif.read
                          ? 'bg-cm-accent/[0.03] border-cm-accent/15 hover:border-cm-accent/30'
                          : 'bg-cm-surface border-cm-border hover:border-cm-muted/30'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                        !notif.read ? 'bg-cm-accent/10' : 'bg-cm-bg-alt border border-cm-border/50'
                      }`}>
                        {NOTIF_ICONS[notif.type] || '🔔'}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notif.read ? 'font-black text-cm-text' : 'font-semibold text-cm-text-secondary'}`}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-cm-accent shrink-0 mt-1.5" />
                          )}
                        </div>
                        {notif.body && (
                          <p className={`text-xs mt-0.5 line-clamp-2 ${!notif.read ? 'text-cm-text-secondary' : 'text-cm-muted'}`}>
                            {notif.body}
                          </p>
                        )}
                        <p className="text-[10px] text-cm-text-tertiary mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(notif._createdAt_client || notif.createdAt)}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
