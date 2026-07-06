import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import useOrderStore from '../store/orderStore';
import { ACTIVE_STATUSES } from '../workerTypes';
import { computeEmployeeKPI } from '../../lib/employeeService';
import { ClipboardList, ChefHat, Truck, Bike, CircleDollarSign, Coins, ArrowRight, Zap } from 'lucide-react';
import { STAFF_ROUTES } from '../../lib/routes';
import WelcomeHeader from './sections/WelcomeHeader';
import AnnouncementBanner from './sections/AnnouncementBanner';
import AttendanceCard from './sections/AttendanceCard';
import OrderMetricsPanel from './sections/OrderMetricsPanel';
import KPISection from './sections/KPISection';
import QuickAccess from './sections/QuickAccess';

// ── Configuración de módulos por rol ──────────────────────────────────────────

const ROLE_CONFIG = {
  mozo: {
    title: 'Mozo / Mesas',
    description: 'Tomar pedidos y gestionar mesas',
    route: STAFF_ROUTES.MOZO,
    icon: <ClipboardList className="w-5 h-5" />,
    gradient: 'from-emerald-500 to-teal-600',
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  kitchen: {
    title: 'Cocina (KDS)',
    description: 'Ver y preparar pedidos en tiempo real',
    route: STAFF_ROUTES.COCINA,
    icon: <ChefHat className="w-5 h-5" />,
    gradient: 'from-orange-500 to-red-600',
    accent: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  dispatch: {
    title: 'Despacho',
    description: 'Asignar repartidores y despachar',
    route: STAFF_ROUTES.DESPACHO,
    icon: <Truck className="w-5 h-5" />,
    gradient: 'from-blue-500 to-indigo-600',
    accent: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  delivery: {
    title: 'Repartidor',
    description: 'Mis entregas y rutas asignadas',
    route: STAFF_ROUTES.DELIVERY,
    icon: <Bike className="w-5 h-5" />,
    gradient: 'from-purple-500 to-violet-600',
    accent: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  vendedor: {
    title: 'Vendedor / POS',
    description: 'Punto de venta y cuadre de caja',
    route: STAFF_ROUTES.VENDEDOR,
    icon: <CircleDollarSign className="w-5 h-5" />,
    gradient: 'from-amber-500 to-yellow-600',
    accent: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  cajero: {
    title: 'Cajero',
    description: 'Cobrar pedidos y gestionar caja',
    route: STAFF_ROUTES.CAJA,
    icon: <Coins className="w-5 h-5" />,
    gradient: 'from-lime-500 to-green-600',
    accent: 'text-lime-400',
    bg: 'bg-lime-500/10',
    border: 'border-lime-500/20',
  },
} as const;

const MOTIVATIONAL: Record<string, string> = {
  mozo:     '🍽️ Haz que cada mesa se sienta especial. ¡Tú pones el sabor a la experiencia!',
  kitchen:  '👨‍🍳 El KDS es tu centro de mando. ¡Precisión, ritmo y sabor hoy!',
  dispatch: '📦 Despacha rápido y con precisión. Cada minuto cuenta para el cliente.',
  delivery: '🛵 Ruta segura, entrega feliz. ¡Lleva el mejor sabor a casa!',
  vendedor: '💳 Registra cada venta con precisión. Tu exactitud es la base del negocio.',
  cajero:   '🏦 Caja al día, negocio en orden. ¡Excelente turno hoy!',
  admin:    '⭐ Mantén las operaciones optimizadas. El equipo confía en tu liderazgo.',
};

// ── Secciones visibles por rol ────────────────────────────────────────────────
// Cada entrada lista las secciones del dashboard que aplican a ese rol.
// Las secciones no listadas se omiten del render.
const VISIBLE_SECTIONS: Record<string, string[]> = {
  mozo:     ['welcome', 'announcement', 'attendance', 'quick', 'modules', 'pipeline', 'kpi'],
  kitchen:  ['welcome', 'announcement', 'attendance', 'quick', 'modules', 'pipeline', 'kpi'],
  dispatch: ['welcome', 'announcement', 'attendance', 'quick', 'modules', 'pipeline', 'kpi'],
  delivery: ['welcome', 'announcement', 'attendance', 'quick', 'modules', 'kpi'],
  vendedor: ['welcome', 'announcement', 'attendance', 'quick', 'modules', 'kpi'],
  cajero:   ['welcome', 'announcement', 'attendance', 'quick', 'modules', 'kpi'],
};

// ── Componente Principal ──────────────────────────────────────────────────────

export default function WorkerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeBranchId, branches } = useBranch();

  // ── Store selectors ──
  const ordersMap  = useOrderStore((s) => s.orders);
  const orderIndex = useOrderStore((s) => s.orderIndex);

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

  // ── Clock tick ──
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Anuncios ──
  const [announcement, setAnnouncement] = useState<string | null>(null);
  useEffect(() => {
    if (!activeBranchId) return;
    const annRef = ref(db, `branches_config/${activeBranchId}/announcement`);
    const unsubAnn = onValue(annRef, (snap) => setAnnouncement(snap.val()));
    return () => unsubAnn();
  }, [activeBranchId]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    if (!user?.id) return { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, cancellations: 0 };
    return computeEmployeeKPI(Object.values(ordersMap), user.id, user.name || '');
  }, [ordersMap, user?.id, user?.name]);

  // ── Derivados ──
  const userRole = user?.role || '';
  const userRoles = userRole ? [userRole] : [];
  const activeBranchName = useMemo(
    () => branches.find((b: any) => b.id === activeBranchId)?.name || 'Principal',
    [branches, activeBranchId]
  );
  const defaultPhrase = MOTIVATIONAL[userRole] || MOTIVATIONAL['admin'];

  // ── KPI label por rol para módulos ──
  const roleKpiLabel = (role: string) => {
    switch (role) {
      case 'kitchen': return `${statusCounts['recibido'] || 0} recibidos · ${statusCounts['preparando'] || 0} en cocina`;
      case 'mozo':    return `${activeOrders.filter(o => o.tableNumber).length} mesas activas`;
      case 'vendedor': case 'cajero': return `S/ ${kpis.totalRevenue.toFixed(2)} facturado hoy`;
      case 'dispatch': return `${statusCounts['listo'] || 0} listo(s) para despachar`;
      case 'delivery': return `${statusCounts['en_camino'] || 0} en ruta actualmente`;
      default:         return undefined;
    }
  };

  const visible = VISIBLE_SECTIONS[userRole] || VISIBLE_SECTIONS.mozo;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-cm-bg pb-6">
      <div className="w-full px-6 pt-5 space-y-5">

        {visible.includes('welcome') && (
          <WelcomeHeader
            currentTime={currentTime}
            user={user}
            activeBranchName={activeBranchName}
          />
        )}

        {visible.includes('announcement') && (
          <AnnouncementBanner
            announcement={announcement}
            defaultPhrase={defaultPhrase}
          />
        )}

        {visible.includes('attendance') && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <AttendanceCard currentTime={currentTime} />
          </div>
        )}

        {visible.includes('quick') && (
          <QuickAccess userRole={userRole} />
        )}

        {visible.includes('modules') && userRoles.filter(r => r in ROLE_CONFIG).length > 0 && (
          <div>
            <p className="text-[10px] font-black text-cm-muted uppercase tracking-widest mb-3">Tus Módulos de Trabajo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {userRoles.map((role) => {
                const cfg = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
                if (!cfg) return null;
                const kpiLabel = roleKpiLabel(role);
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

        {visible.includes('pipeline') && (
          <OrderMetricsPanel
            statusCounts={statusCounts}
            activeOrders={activeOrders}
          />
        )}

        {visible.includes('kpi') && (
          <KPISection
            kpis={kpis}
            currentTime={currentTime}
          />
        )}

      </div>
    </div>
  );
}
