import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
import BranchSwitcher from './BranchSwitcher';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { useAuth } from '../context/AuthContext';
import { ChefHat, ClipboardList, Truck, Bike, TrendingUp, LogOut, LayoutDashboard, Users, ShoppingCart } from 'lucide-react';
import { ROUTES, STAFF_ROUTES } from '../lib/routes';
import logo from '../assets/logo.jpg';

interface RoleLink {
  path: string;
  label: string;
  icon: ReactNode;
  roles: string[];
}

const ROLE_LINKS: RoleLink[] = [
  { path: STAFF_ROUTES.ROOT, label: 'Panel', icon: <LayoutDashboard className="w-3.5 h-3.5" />, roles: ['kitchen', 'mozo', 'dispatch', 'delivery', 'vendedor', 'admin', 'cajero'] },
  { path: STAFF_ROUTES.MOZO, label: 'Mozo', icon: <ClipboardList className="w-3.5 h-3.5" />, roles: ['mozo'] },
  { path: STAFF_ROUTES.COCINA, label: 'Cocina', icon: <ChefHat className="w-3.5 h-3.5" />, roles: ['kitchen'] },
  { path: STAFF_ROUTES.PREPEDIDOS, label: 'Pre-pedidos', icon: <ShoppingCart className="w-3.5 h-3.5" />, roles: ['kitchen'] },
  { path: STAFF_ROUTES.DESPACHO, label: 'Despacho', icon: <Truck className="w-3.5 h-3.5" />, roles: ['dispatch'] },
  { path: STAFF_ROUTES.DELIVERY, label: 'Delivery', icon: <Bike className="w-3.5 h-3.5" />, roles: ['delivery'] },
  { path: STAFF_ROUTES.VENDEDOR, label: 'Ventas', icon: <TrendingUp className="w-3.5 h-3.5" />, roles: ['vendedor', 'cajero'] },
  { path: STAFF_ROUTES.EMPLEADOS, label: 'Empleados', icon: <Users className="w-3.5 h-3.5" />, roles: ['admin', 'superadmin'] },
];

interface Props {
  /** Slot para contenido inyectado por la página activa vía useShell().setTopBarSlot() */
  slot?: ReactNode;
}

export default function StaffTopBar({ slot }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const availableLinks = ROLE_LINKS.filter(
    (link) => user?.role === 'admin' || user?.role === 'superadmin' || link.roles.includes(user?.role || '')
  );

  const isActive = (path: string) =>
    path === STAFF_ROUTES.ROOT
      ? location.pathname === STAFF_ROUTES.ROOT || /^\/staff\/\w+\/dashboard$/.test(location.pathname)
      : location.pathname.startsWith(path);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cm-surface border-b border-cm-border">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo / Brand */}
          <button onClick={() => navigate(STAFF_ROUTES.ROOT)}
            className="flex items-center gap-2 font-bold text-cm-text hover:text-cm-accent transition-colors text-sm shrink-0">
            <img src={logo} alt="House Logo" className="w-7 h-7 rounded object-cover border border-cm-border shadow-cm-sm" />
            <span className="hidden sm:inline">House</span>
          </button>

          {/* Navegación con tabs animados (igual que admin) */}
          <LayoutGroup id="staff-topbar">
            <nav className="flex items-center gap-0.5 ml-1">
              {availableLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <button key={link.path} onClick={() => navigate(link.path)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      active
                        ? 'text-white'
                        : 'text-cm-muted hover:bg-cm-accent/5 hover:text-cm-text'
                    }`}>
                    {active && (
                      <motion.div layoutId="active-staff-tab"
                        className="absolute inset-0 bg-cm-accent rounded-lg shadow-cm-sm"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      {link.icon}
                      <span className="hidden sm:inline">{link.label}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </LayoutGroup>

          {/* Slot — las páginas pueden inyectar controles extras vía useShell() */}
          {slot && (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-cm-border/40">
              {slot}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <WorkspaceSwitcher />
          <BranchSwitcher variant="minimal" />
          <span className="hidden sm:inline text-xs text-cm-muted font-semibold px-2">
            {user?.name || user?.email}
          </span>
          <button onClick={logout}
            className="p-1.5 rounded-lg text-cm-muted hover:text-cm-error hover:bg-cm-error/10 transition-colors"
            title="Cerrar sesión">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
