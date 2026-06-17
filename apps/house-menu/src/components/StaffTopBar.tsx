import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BranchSwitcher from './BranchSwitcher';
import { useAuth } from '../context/AuthContext';
import { ChefHat, ClipboardList, Truck, Bike, TrendingUp, LogOut, LayoutDashboard, Users } from 'lucide-react';
import logo from '../assets/logo.jpg';

interface RoleLink {
  path: string;
  label: string;
  icon: ReactNode;
  roles: string[];
}

const ROLE_LINKS: RoleLink[] = [
  { path: '/staff', label: 'Panel', icon: <LayoutDashboard className="w-3.5 h-3.5" />, roles: ['kitchen', 'mozo', 'dispatch', 'delivery', 'vendedor', 'admin', 'cajero'] },
  { path: '/staff/mozo', label: 'Mozo', icon: <ClipboardList className="w-3.5 h-3.5" />, roles: ['mozo'] },
  { path: '/staff/cocina', label: 'Cocina', icon: <ChefHat className="w-3.5 h-3.5" />, roles: ['kitchen'] },
  { path: '/staff/despacho', label: 'Despacho', icon: <Truck className="w-3.5 h-3.5" />, roles: ['dispatch'] },
  { path: '/staff/delivery', label: 'Delivery', icon: <Bike className="w-3.5 h-3.5" />, roles: ['delivery'] },
  { path: '/staff/vendedor', label: 'Ventas', icon: <TrendingUp className="w-3.5 h-3.5" />, roles: ['vendedor', 'cajero'] },
  { path: '/staff/empleados', label: 'Empleados', icon: <Users className="w-3.5 h-3.5" />, roles: ['admin', 'superadmin'] },
];

export default function StaffTopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const availableLinks = ROLE_LINKS.filter(
    (link) => user?.role === 'admin' || link.roles.includes(user?.role || '')
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cm-surface border-b border-cm-border">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/staff')}
            className="flex items-center gap-2 font-bold text-cm-text hover:text-cm-accent transition-colors text-sm">
            <img src={logo} alt="House Logo" className="w-7 h-7 rounded object-cover border border-cm-border shadow-cm-sm" />
            <span className="hidden sm:inline">House</span>
          </button>

          <nav className="flex items-center gap-1 ml-3">
            {availableLinks.map((link) => {
              const isActive = location.pathname === link.path
                || (link.path !== '/staff' && location.pathname.startsWith(link.path));
              return (
                <button key={link.path} onClick={() => navigate(link.path)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-cm-accent text-white shadow-cm-sm'
                      : 'text-cm-muted hover:bg-cm-accent/5 hover:text-cm-text'
                  }`}>
                  {link.icon}
                  <span className="hidden sm:inline">{link.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
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
