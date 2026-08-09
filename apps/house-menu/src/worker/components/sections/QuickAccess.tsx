import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, UtensilsCrossed, MapPin, ClipboardList,
  DollarSign, Truck, Bike, Plus, QrCode, BarChart3, ChevronRight, ShoppingCart, LucideIcon
} from 'lucide-react';
import { ROUTES, STAFF_ROUTES } from '../../../lib/routes';

interface QuickLink {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  roles: string[];
  accent?: string;
  description?: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    id: 'admin-panel',
    label: 'Panel Admin',
    icon: LayoutDashboard,
    path: ROUTES.ADMIN,
    roles: ['admin', 'superadmin'],
    accent: 'from-red-500 to-rose-600',
    description: 'Gestión completa',
  },
  {
    id: 'carta-digital',
    label: 'Carta Digital',
    icon: UtensilsCrossed,
    path: ROUTES.CARTA,
    roles: ['kitchen', 'mozo', 'dispatch', 'delivery', 'vendedor', 'cajero', 'admin', 'superadmin'],
    accent: 'from-emerald-500 to-teal-600',
    description: 'Ver menú',
  },
  {
    id: 'mis-pedidos',
    label: 'Mis Pedidos',
    icon: ClipboardList,
    path: ROUTES.MIS_PEDIDOS,
    roles: ['delivery', 'vendedor', 'cajero'],
    accent: 'from-blue-500 to-indigo-600',
    description: 'Historial personal',
  },
  {
    id: 'prepedidos',
    label: 'Pre-pedidos',
    icon: ShoppingCart,
    path: STAFF_ROUTES.PREPEDIDOS,
    roles: ['kitchen', 'admin', 'superadmin'],
    accent: 'from-orange-500 to-amber-600',
    description: 'Pedir insumos',
  },
  {
    id: 'rastrear',
    label: 'Rastrear',
    icon: MapPin,
    path: ROUTES.RASTREO,
    roles: ['kitchen', 'mozo', 'dispatch', 'delivery', 'vendedor', 'cajero', 'admin', 'superadmin'],
    accent: 'from-purple-500 to-violet-600',
    description: 'Seguir pedido',
  },
  {
    id: 'caja',
    label: 'Caja',
    icon: DollarSign,
    path: STAFF_ROUTES.CAJA,
    roles: ['cajero', 'admin', 'superadmin'],
    accent: 'from-lime-500 to-green-600',
    description: 'Cuadre y cobros',
  },
  {
    id: 'despacho',
    label: 'Despacho',
    icon: Truck,
    path: STAFF_ROUTES.DESPACHO,
    roles: ['dispatch', 'admin', 'superadmin'],
    accent: 'from-amber-500 to-orange-600',
    description: 'Órdenes listas',
  },
  {
    id: 'delivery',
    label: 'Delivery',
    icon: Bike,
    path: STAFF_ROUTES.DELIVERY,
    roles: ['delivery', 'admin', 'superadmin'],
    accent: 'from-pink-500 to-rose-600',
    description: 'Mis entregas',
  },
  {
    id: 'generar-qr',
    label: 'Generar QR',
    icon: QrCode,
    path: ROUTES.ADMIN + '#mesas',
    roles: ['admin', 'superadmin'],
    accent: 'from-cyan-500 to-blue-600',
    description: 'QR de mesa',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    path: ROUTES.ADMIN + '#analytics',
    roles: ['admin', 'superadmin'],
    accent: 'from-violet-500 to-purple-600',
    description: 'Métricas',
  },
];

interface Props {
  userRole: string;
}

export default function QuickAccess({ userRole }: Props) {
  const navigate = useNavigate();

  const available = QUICK_LINKS.filter(l => l.roles.includes(userRole));
  if (available.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black text-cm-muted uppercase tracking-widest">
          Accesos Rápidos
        </span>
        <span className="text-[9px] text-cm-muted/60 font-medium">
          {available.length} disponible{available.length !== 1 ? 's' : ''}
        </span>
      </div>
      <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {available.map((link, i) => {
          const Icon = link.icon;
          return (
            <motion.button
              key={link.id}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }}
              onClick={() => navigate(link.path)}
              className="group flex flex-col items-center gap-1.5 p-3 rounded-xl bg-cm-surface border border-cm-border hover:border-cm-accent/40 hover:shadow-cm-sm transition-all duration-200 active:scale-[0.97]"
            >
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${link.accent || 'from-cm-accent to-cm-accent/80'} flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-cm-text text-center leading-tight">
                {link.label}
              </span>
              {link.description && (
                <span className="text-[8px] text-cm-muted text-center leading-tight hidden sm:block">
                  {link.description}
                </span>
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}