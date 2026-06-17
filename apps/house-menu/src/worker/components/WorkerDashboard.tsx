import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, ChefHat, Truck, Bike, Clock, Activity,
  Calendar, Award, Megaphone, CheckCircle,
  AlertCircle, Coins, Play, Square, ArrowRight,
  TrendingUp, CircleDollarSign,
  Zap, Timer, ShoppingBag, BarChart3, Flame,
  MapPin, Coffee
} from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import useOrderStore from '../store/orderStore';
import { ACTIVE_STATUSES } from '../workerTypes';
import {
  clockIn,
  clockOut,
  getAttendanceHistory,
  computeEmployeeKPI
} from '../../lib/employeeService';
import { todayISO } from '../../lib/format';

// ── Configuración de módulos por rol ──────────────────────────────────────────

const ROLE_CONFIG = {
  mozo: {
    title: 'Mozo / Mesas',
    description: 'Tomar pedidos y gestionar mesas',
    route: '/staff/mozo',
    icon: <ClipboardList className="w-5 h-5" />,
    gradient: 'from-emerald-500 to-teal-600',
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  kitchen: {
    title: 'Cocina (KDS)',
    description: 'Ver y preparar pedidos en tiempo real',
    route: '/staff/cocina',
    icon: <ChefHat className="w-5 h-5" />,
    gradient: 'from-orange-500 to-red-600',
    accent: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  dispatch: {
    title: 'Despacho',
    description: 'Asignar repartidores y despachar',
    route: '/staff/despacho',
    icon: <Truck className="w-5 h-5" />,
    gradient: 'from-blue-500 to-indigo-600',
    accent: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  delivery: {
    title: 'Repartidor',
    description: 'Mis entregas y rutas asignadas',
    route: '/staff/delivery',
    icon: <Bike className="w-5 h-5" />,
    gradient: 'from-purple-500 to-violet-600',
    accent: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  vendedor: {
    title: 'Vendedor / POS',
    description: 'Punto de venta y cuadre de caja',
    route: '/staff/vendedor',
    icon: <CircleDollarSign className="w-5 h-5" />,
    gradient: 'from-amber-500 to-yellow-600',
    accent: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  cajero: {
    title: 'Cajero',
    description: 'Cobrar pedidos y gestionar caja',
    route: '/staff/caja',
    icon: <Coins className="w-5 h-5" />,
    gradient: 'from-lime-500 to-green-600',
    accent: 'text-lime-400',
    bg: 'bg-lime-500/10',
    border: 'border-lime-500/20',
  },
} as const;

const STATUS_DISPLAY: Record<string, { label: string; dot: string; badge: string }> = {
  recibido:   { label: 'Recibido',   dot: 'bg-cm-warning',  badge: 'bg-cm-warning/10 text-cm-warning border-cm-warning/20' },
  preparando: { label: 'Preparando', dot: 'bg-cm-info',     badge: 'bg-cm-info/10 text-cm-info border-cm-info/20' },
  listo:      { label: 'Listo',      dot: 'bg-cm-success',  badge: 'bg-cm-success/10 text-cm-success border-cm-success/20' },
  en_camino:  { label: 'En camino',  dot: 'bg-cm-accent',   badge: 'bg-cm-accent/10 text-cm-accent border-cm-accent/20' },
  entregado:  { label: 'Entregado',  dot: 'bg-cm-border',   badge: 'bg-cm-border text-cm-muted border-cm-border' },
  cancelado:  { label: 'Cancelado',  dot: 'bg-cm-error',    badge: 'bg-cm-error/10 text-cm-error border-cm-error/20' },
};

const MOTIVATIONAL: Record<string, string> = {
  mozo:     '🍽️ Haz que cada mesa se sienta especial. ¡Tú pones el sabor a la experiencia!',
  kitchen:  '👨‍🍳 El KDS es tu centro de mando. ¡Precisión, ritmo y sabor hoy!',
  dispatch: '📦 Despacha rápido y con precisión. Cada minuto cuenta para el cliente.',
  delivery: '🛵 Ruta segura, entrega feliz. ¡Lleva el mejor sabor a casa!',
  vendedor: '💳 Registra cada venta con precisión. Tu exactitud es la base del negocio.',
  cajero:   '🏦 Caja al día, negocio en orden. ¡Excelente turno hoy!',
  admin:    '⭐ Mantén las operaciones optimizadas. El equipo confía en tu liderazgo.',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ts: number | null): string {
  if (!ts) return '--:--';
  return new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m}m`;
}

function getShiftDuration(clockInTs: number | null): string {
  if (!clockInTs) return '—';
  return formatDuration(Date.now() - clockInTs);
}

// ── Componente Principal ──────────────────────────────────────────────────────

export default function WorkerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeBranchId, branches } = useBranch();

  // ── Seleccionar sólo primitivos estables del store ──
  // IMPORTANTE: no llamar a getActiveOrders()/getStatusCounts() directamente en el
  // selector porque retornan nuevas referencias en cada llamada, causando un bucle
  // infinito con useSyncExternalStore de React 18.
  const ordersMap  = useOrderStore((s) => s.orders);
  const orderIndex = useOrderStore((s) => s.orderIndex);

  // Derivados estables con useMemo
  const activeOrders = useMemo(
    () => orderIndex.filter(id => ACTIVE_STATUSES.includes(ordersMap[id]?.status)).map(id => ordersMap[id]).filter(Boolean),
    [ordersMap, orderIndex]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orderIndex.length };
    for (const id of orderIndex) {
      const s = ordersMap[id]?.status || 'unknown';
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [ordersMap, orderIndex]);

  const userRole = user?.role || '';
  const userRoles = userRole ? [userRole] : [];

  // ── Estado local ──
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Tick clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Suscripciones Firebase
  useEffect(() => {
    if (!activeBranchId || !user?.id) return;

    const today = todayISO();

    // Asistencia de hoy
    const attRef = ref(db, `branches/${activeBranchId}/attendance/${user.id}/${today}`);
    const unsubAtt = onValue(attRef, (snap) => setTodayAttendance(snap.val()));

    // Tablón de anuncios
    const annRef = ref(db, `branches_config/${activeBranchId}/announcement`);
    const unsubAnn = onValue(annRef, (snap) => setAnnouncement(snap.val()));

    // Historial inicial
    getAttendanceHistory(activeBranchId, user.id)
      .then((h) => setAttendanceHistory(h.slice(0, 5)))
      .catch(() => {});

    return () => { unsubAtt(); unsubAnn(); };
  }, [activeBranchId, user?.id]);

  // ── Toast ──
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Clock In / Out ──
  const handleClockIn = async () => {
    if (!activeBranchId || !user?.id || attendanceLoading) return;
    setAttendanceLoading(true);
    try {
      const rec = await clockIn(activeBranchId, user.id);
      setTodayAttendance(rec);
      const h = await getAttendanceHistory(activeBranchId, user.id);
      setAttendanceHistory(h.slice(0, 5));
      showToast('¡Turno iniciado con éxito! 🟢');
    } catch {
      showToast('Error al iniciar el turno', false);
    }
    setAttendanceLoading(false);
  };

  const handleClockOut = async () => {
    if (!activeBranchId || !user?.id || attendanceLoading) return;
    setAttendanceLoading(true);
    try {
      const rec = await clockOut(activeBranchId, user.id);
      setTodayAttendance(rec);
      const h = await getAttendanceHistory(activeBranchId, user.id);
      setAttendanceHistory(h.slice(0, 5));
      showToast('Turno finalizado. ¡Hasta pronto! 🔴');
    } catch {
      showToast('Error al finalizar el turno', false);
    }
    setAttendanceLoading(false);
  };

  // ── KPIs calculados ──
  const kpis = useMemo(() => {
    if (!user?.id) return { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, cancellations: 0 };
    // ordersMap ya es estable; Object.values() dentro del memo no causa el bug
    return computeEmployeeKPI(Object.values(ordersMap), user.id, user.name || '');
  }, [ordersMap, user?.id, user?.name]);

  const activeBranchName = useMemo(
    () => branches.find((b: any) => b.id === activeBranchId)?.name || 'Principal',
    [branches, activeBranchId]
  );

  const defaultPhrase = MOTIVATIONAL[userRole] || MOTIVATIONAL['admin'];

  // ── Turno activo ──
  const isInShift = !!todayAttendance?.clockIn && !todayAttendance?.clockOut;
  const shiftDuration = isInShift ? getShiftDuration(todayAttendance?.clockIn) : null;

  // ── 5 pedidos activos más recientes ──
  const recentActiveOrders = activeOrders.slice(-5).reverse();

  // ── Pedidos por estado (métricas rápidas) ──
  const orderMetrics = [
    { label: 'Recibidos',   count: statusCounts['recibido'] || 0,   dot: 'bg-cm-warning', key: 'recibido' },
    { label: 'En cocina',   count: statusCounts['preparando'] || 0, dot: 'bg-cm-info',    key: 'preparando' },
    { label: 'Listos',      count: statusCounts['listo'] || 0,       dot: 'bg-cm-success', key: 'listo' },
    { label: 'En camino',   count: statusCounts['en_camino'] || 0,   dot: 'bg-cm-accent',  key: 'en_camino' },
  ];

  return (
    <div className="min-h-screen bg-cm-bg pb-16">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-cm-lg border flex items-center gap-2 animate-slide-up ${
          toast.ok ? 'bg-cm-success/15 border-cm-success/30 text-cm-success' : 'bg-cm-error/15 border-cm-error/30 text-cm-error'
        }`}>
          {toast.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="text-xs font-bold">{toast.msg}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 pt-5 space-y-5">

        {/* ── BIENVENIDA + RELOJ ── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-cm-muted font-semibold uppercase tracking-widest">
              {currentTime.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-xl font-black text-cm-text mt-0.5">
              Hola, {user?.name?.split(' ')[0] || 'Compañero'} 👋
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black bg-cm-accent/10 text-cm-accent px-2.5 py-0.5 rounded-full border border-cm-accent/20 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cm-accent animate-pulse" />
                {activeBranchName}
              </span>
              {isInShift && (
                <span className="text-[10px] font-black bg-cm-success/10 text-cm-success px-2.5 py-0.5 rounded-full border border-cm-success/20 uppercase tracking-wider flex items-center gap-1.5">
                  <Timer className="w-3 h-3" />
                  {shiftDuration} en turno
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-black text-cm-text font-mono tabular-nums tracking-tight">
              {currentTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-cm-muted font-mono">
              {currentTime.toLocaleTimeString('es-PE', { second: '2-digit' })}s
            </p>
          </div>
        </div>

        {/* ── TABLÓN DE ANUNCIOS ── */}
        {(announcement || defaultPhrase) && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-700 to-blue-800 p-4 shadow-cm-md border border-white/5">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #a78bfa 0%, transparent 50%)' }} />
            <div className="relative flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white/10 border border-white/15 text-white shrink-0">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-purple-200 mb-1">
                  {announcement ? 'Comunicado del Local' : 'Frase del Turno'}
                </p>
                <p className="text-sm font-bold text-white leading-relaxed">
                  {announcement || defaultPhrase}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── GRID PRINCIPAL ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* ── CONTROL DE ASISTENCIA (2 cols) ── */}
          <div className="md:col-span-2 bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-cm-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-cm-muted uppercase tracking-widest block mb-0.5">Control de Asistencia</span>
                <h2 className="text-sm font-bold text-cm-text">Tu Turno de Hoy</h2>
              </div>
              <div className="flex items-center gap-1.5 text-cm-accent bg-cm-accent/5 px-2.5 py-1 rounded-lg border border-cm-accent/15 text-xs font-mono font-bold">
                <Clock className="w-3.5 h-3.5" />
                {currentTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-cm-bg-alt border border-cm-border rounded-xl">
              <div className="flex-1 text-center sm:text-left space-y-1">
                {todayAttendance?.clockIn ? (
                  <>
                    <p className="text-sm font-black text-cm-success flex items-center gap-1.5 justify-center sm:justify-start">
                      <span className={`w-2.5 h-2.5 rounded-full ${isInShift ? 'bg-cm-success animate-pulse' : 'bg-cm-border'}`} />
                      {isInShift ? 'En Turno Activo' : 'Turno Completado'}
                    </p>
                    <p className="text-[11px] text-cm-text-secondary">
                      Entrada: <strong>{formatTime(todayAttendance.clockIn)}</strong>
                      {todayAttendance.clockOut && (
                        <> · Salida: <strong>{formatTime(todayAttendance.clockOut)}</strong></>
                      )}
                    </p>
                    {isInShift && shiftDuration && (
                      <p className="text-[11px] text-cm-accent font-bold flex items-center gap-1">
                        <Timer className="w-3 h-3" /> {shiftDuration} trabajando
                      </p>
                    )}
                    {todayAttendance.clockOut && (
                      <p className="text-[11px] text-cm-muted">
                        Duración: <strong>{formatDuration(todayAttendance.clockOut - todayAttendance.clockIn)}</strong>
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-black text-cm-error flex items-center gap-1.5 justify-center sm:justify-start">
                      <span className="w-2.5 h-2.5 rounded-full bg-cm-error" />
                      Fuera de Turno
                    </p>
                    <p className="text-[11px] text-cm-muted">No has marcado tu entrada hoy.</p>
                  </>
                )}
              </div>

              <div className="w-full sm:w-auto">
                {isInShift ? (
                  <button
                    onClick={handleClockOut}
                    disabled={attendanceLoading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-black rounded-xl hover:shadow-lg hover:shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    Terminar Turno
                  </button>
                ) : (
                  <button
                    onClick={handleClockIn}
                    disabled={!!todayAttendance?.clockOut || attendanceLoading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Iniciar Turno
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── HISTORIAL DE ASISTENCIAS ── */}
          <div className="bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-cm-sm">
            <span className="text-[10px] font-black text-cm-muted uppercase tracking-widest block mb-1">Registro</span>
            <h2 className="text-sm font-bold text-cm-text mb-3">Turnos Recientes</h2>
            <div className="space-y-2">
              {attendanceHistory.length === 0 ? (
                <div className="text-center py-5 border border-dashed border-cm-border rounded-xl">
                  <Calendar className="w-4 h-4 text-cm-muted mx-auto mb-1 opacity-40" />
                  <p className="text-[11px] text-cm-muted">Sin registros previos</p>
                </div>
              ) : (
                attendanceHistory.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-cm-bg-alt/50 border border-cm-border/50 rounded-xl">
                    <div>
                      <p className="text-[11px] font-bold text-cm-text capitalize">
                        {new Date(item.date + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-[10px] text-cm-muted font-mono">
                        {formatTime(item.clockIn)} – {formatTime(item.clockOut)}
                      </p>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                      item.clockOut ? 'bg-cm-border/50 text-cm-muted border-cm-border' : 'bg-cm-success/10 text-cm-success border-cm-success/20'
                    }`}>
                      {item.clockOut ? formatDuration(item.clockOut - item.clockIn) : 'Activo'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── MÓDULOS DE TRABAJO ── */}
        {userRoles.filter(r => r in ROLE_CONFIG).length > 0 && (
          <div>
            <p className="text-[10px] font-black text-cm-muted uppercase tracking-widest mb-3">Tus Módulos de Trabajo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {userRoles.map((role) => {
                const cfg = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
                if (!cfg) return null;

                const kpiLabel = role === 'kitchen'
                  ? `${statusCounts['recibido'] || 0} recibidos · ${statusCounts['preparando'] || 0} en cocina`
                  : role === 'mozo'
                  ? `${activeOrders.filter(o => o.tableNumber).length} mesas activas`
                  : role === 'vendedor' || role === 'cajero'
                  ? `S/ ${kpis.totalRevenue.toFixed(2)} facturado hoy`
                  : role === 'dispatch'
                  ? `${statusCounts['listo'] || 0} listo(s) para despachar`
                  : role === 'delivery'
                  ? `${statusCounts['en_camino'] || 0} en ruta actualmente`
                  : undefined;

                return (
                  <button
                    key={role}
                    onClick={() => navigate(cfg.route)}
                    className={`group relative bg-cm-surface rounded-xl border ${cfg.border} p-4 text-left hover:shadow-cm-md hover:scale-[1.01] transition-all duration-200 active:scale-[0.98]`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white shrink-0`}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-cm-text text-sm">{cfg.title}</h3>
                        <p className="text-[11px] text-cm-muted mt-0.5 truncate">{cfg.description}</p>
                      </div>
                      <ArrowRight className={`w-4 h-4 ${cfg.accent} opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0`} />
                    </div>
                    {kpiLabel && (
                      <p className={`mt-2.5 text-[11px] font-bold ${cfg.accent} flex items-center gap-1 border-t ${cfg.border} pt-2.5`}>
                        <Zap className="w-3 h-3 shrink-0" />
                        {kpiLabel}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MÉTRICAS DE OPERACIÓN EN TIEMPO REAL ── */}
        <div className="bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-cm-sm space-y-4">
          <div className="flex items-center justify-between border-b border-cm-border/60 pb-3">
            <div>
              <span className="text-[10px] font-black text-cm-muted uppercase tracking-widest block mb-0.5">En Tiempo Real</span>
              <h2 className="text-sm font-bold text-cm-text flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cm-accent" />
                Estado de Operaciones
              </h2>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-black text-cm-success bg-cm-success/10 px-2.5 py-1 rounded-full border border-cm-success/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cm-success animate-pulse" />
              LIVE
            </span>
          </div>

          {/* Pipeline de estados */}
          <div className="grid grid-cols-4 gap-3">
            {orderMetrics.map(({ label, count, dot, key }) => (
              <div key={key} className="text-center">
                <div className="relative mb-1">
                  <div className={`w-2 h-2 rounded-full ${dot} mx-auto ${count > 0 ? 'animate-pulse' : 'opacity-30'}`} />
                </div>
                <p className="text-2xl font-black text-cm-text tabular-nums">{count}</p>
                <p className="text-[9px] text-cm-muted font-bold uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>

          {/* Feed de pedidos activos */}
          <div>
            <p className="text-[10px] font-black text-cm-muted uppercase tracking-widest mb-2">Últimos Pedidos Activos</p>
            {recentActiveOrders.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-cm-border rounded-xl">
                <Coffee className="w-5 h-5 text-cm-muted mx-auto mb-1.5 opacity-30" />
                <p className="text-xs text-cm-muted">Sin pedidos activos ahora mismo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentActiveOrders.map((order) => {
                  const st = STATUS_DISPLAY[order.status] || STATUS_DISPLAY['recibido'];
                  const total = order.financials?.total;
                  return (
                    <div
                      key={order.id}
                      className="flex items-center gap-3 p-3 bg-cm-bg-alt/60 border border-cm-border/50 rounded-xl hover:border-cm-accent/20 transition-colors"
                    >
                      <span className={`w-2 h-2 rounded-full ${st.dot} shrink-0 ${order.status === 'recibido' ? 'animate-pulse' : ''}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-cm-text truncate">
                          {order.customerName || 'Cliente'}{order.tableNumber ? ` · Mesa ${order.tableNumber}` : ''}
                        </p>
                        <p className="text-[10px] text-cm-muted">
                          #{order.id.slice(-5).toUpperCase()}
                          {order.type === 'delivery' ? <span className="ml-1.5 text-purple-400">📦 Delivery</span> : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${st.badge}`}>
                          {st.label}
                        </span>
                        {total != null && (
                          <p className="text-[10px] font-bold text-cm-text mt-0.5">S/ {total.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── DESEMPEÑO DEL TRABAJADOR ── */}
        <div className="bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-cm-sm space-y-4">
          <div className="flex items-center justify-between border-b border-cm-border/60 pb-3">
            <div>
              <span className="text-[10px] font-black text-cm-muted uppercase tracking-widest block mb-0.5">Tus Métricas</span>
              <h2 className="text-sm font-bold text-cm-text flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                Desempeño del Turno
              </h2>
            </div>
            <span className="text-[10px] font-black text-cm-muted bg-cm-bg-alt px-2.5 py-1 rounded-lg uppercase">
              {currentTime.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Órdenes', value: kpis.totalOrders.toString(), icon: <ShoppingBag className="w-4 h-4 text-cm-accent" />, sub: 'procesadas hoy' },
              { label: 'Facturado', value: `S/ ${kpis.totalRevenue.toFixed(0)}`, icon: <TrendingUp className="w-4 h-4 text-emerald-500" />, sub: 'volumen bruto' },
              { label: 'Ticket Medio', value: `S/ ${kpis.avgOrderValue.toFixed(0)}`, icon: <BarChart3 className="w-4 h-4 text-amber-500" />, sub: 'por orden' },
              { label: 'Canceladas', value: kpis.cancellations.toString(), icon: <AlertCircle className="w-4 h-4 text-red-500" />, sub: 'anuladas' },
            ].map(({ label, value, icon, sub }) => (
              <div key={label} className="bg-cm-bg-alt/50 border border-cm-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-cm-text-secondary text-[10px] font-black uppercase tracking-wider">
                  {icon} {label}
                </div>
                <p className="text-xl font-black text-cm-text tabular-nums">{value}</p>
                <p className="text-[9px] text-cm-muted">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── ACCESOS RÁPIDOS ── */}
        <div className="bg-cm-surface rounded-2xl border border-cm-border p-5 shadow-cm-sm">
          <span className="text-[10px] font-black text-cm-muted uppercase tracking-widest block mb-3">Accesos Rápidos</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { label: 'Panel Admin', icon: <Flame className="w-3.5 h-3.5" />, path: '/admin', adminOnly: true },
              { label: 'Carta Digital', icon: <ClipboardList className="w-3.5 h-3.5" />, path: '/carta', adminOnly: false },
              { label: 'Rastrear Pedido', icon: <MapPin className="w-3.5 h-3.5" />, path: '/rastreo', adminOnly: false },
            ]
              .filter(l => !l.adminOnly || userRole === 'admin')
              .map(({ label, icon, path }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="p-3 rounded-xl bg-cm-bg-alt border border-cm-border flex items-center justify-between text-xs font-bold text-cm-text hover:border-cm-accent/40 hover:text-cm-accent transition-all group"
                >
                  <span className="flex items-center gap-2">{icon}{label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-cm-muted group-hover:text-cm-accent transition-colors" />
                </button>
              ))}
          </div>
        </div>

      </div>
    </div>
  );
}
