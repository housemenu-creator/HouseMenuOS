/**
 * NotificationBell — in-app notification dropdown.
 *
 * Props:
 *   branchId   — active branch
 *   userId     — user identifier (email or uid)
 *   onNavigate — (url) => void, called when user clicks a notification
 *   className  — optional extra classes
 *
 * Subscribes to RTDB notifications and shows unread badge + dropdown.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Loader2, Clock } from 'lucide-react';
import { subscribeToNotifications, markAsRead, markAllAsRead, getUnreadCount, NOTIF_ICONS } from '../lib/notificationService';
import { playChime } from '../lib/notificationSound';
import { useCommStore } from '../comm/store/commStore';

function timeAgo(dateVal) {
  if (!dateVal) return '';
  const ts = typeof dateVal === 'number' ? dateVal : new Date(dateVal).getTime();
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function NotificationBell({ branchId, userId, onNavigate = () => {}, className = '' }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const prevCountRef = useRef(0);
  const dropdownRef = useRef(null);

  // Subscribe to notifications
  useEffect(() => {
    if (!branchId || !userId) return;
    setLoading(true);
    const unsub = subscribeToNotifications(branchId, userId, (list) => {
      setNotifications(list);
      setLoading(false);
    });
    return unsub;
  }, [branchId, userId]);

  // Play chime on new notification
  useEffect(() => {
    const currentCount = notifications.length;
    if (prevCountRef.current > 0 && currentCount > prevCountRef.current) {
      playChime();
    }
    prevCountRef.current = currentCount;
  }, [notifications.length]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const unreadCount = getUnreadCount(notifications);

  const handleMarkRead = useCallback(async (notif) => {
    if (notif.read) return;
    await markAsRead(branchId, userId, notif.id);
    if (notif.type === 'comm_message') {
      useCommStore.getState().setPanelOpen(true);
    } else if (notif.url) {
      onNavigate(notif.url);
    }
    setOpen(false);
  }, [branchId, userId, onNavigate]);

  const handleMarkAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    await markAllAsRead(branchId, userId, unreadIds);
  }, [branchId, userId, notifications]);

  const recent = notifications.slice(0, 20);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-cm-bg-alt transition-colors"
        title="Notificaciones"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-cm-accent' : 'text-cm-muted'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-cm-error text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-cm-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-cm-surface border border-cm-border rounded-2xl shadow-cm-lg overflow-hidden z-[9999]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-cm-border">
              <h3 className="text-xs font-black text-cm-text uppercase tracking-wider">Notificaciones</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[10px] font-bold text-cm-accent hover:text-cm-accent/80 transition-colors"
                >
                  <CheckCheck className="w-3 h-3" />
                  Marcar todas leídas
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-cm-muted animate-spin" />
                </div>
              ) : recent.length === 0 ? (
                <div className="text-center py-10 text-cm-muted">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold">Sin notificaciones</p>
                  <p className="text-[10px] mt-1">Las novedades aparecerán acá</p>
                </div>
              ) : (
                <div className="divide-y divide-cm-border/50">
                  {recent.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleMarkRead(notif)}
                      className={`w-full text-left px-4 py-3 hover:bg-cm-bg-alt transition-colors flex items-start gap-3 ${
                        !notif.read ? 'bg-cm-accent/[0.03]' : ''
                      }`}
                    >
                      <span className="text-lg shrink-0 mt-0.5">
                        {NOTIF_ICONS[notif.type] || '🔔'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs ${!notif.read ? 'font-black text-cm-text' : 'font-medium text-cm-text-secondary'}`}>
                          {notif.title}
                        </p>
                        {notif.body && (
                          <p className="text-[11px] text-cm-muted mt-0.5 line-clamp-2">{notif.body}</p>
                        )}
                        <p className="text-[9px] text-cm-text-tertiary mt-1 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {timeAgo(notif._createdAt_client || notif.createdAt)}
                        </p>
                      </div>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-cm-accent shrink-0 mt-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Ver todas */}
              <button
                onClick={() => { navigate(ROUTES.NOTIFICACIONES); setOpen(false); }}
                className="w-full py-2.5 text-xs font-bold text-cm-accent hover:bg-cm-accent/5 transition-colors border-t border-cm-border/50"
              >
                Ver todas las notificaciones
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
