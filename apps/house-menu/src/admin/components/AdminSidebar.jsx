import { useMemo } from 'react';
import {
  LayoutDashboard, ClipboardList, UtensilsCrossed, Package, Store, Users,
  DollarSign, Truck, Receipt, TrendingUp, Megaphone, BarChart3, UserCircle,
  Warehouse, LogOut, ChevronRight, Boxes, ShoppingBag, X
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

// ── Definición de grupos y tabs ───────────────────────────────────────────────

const NAV_GROUPS = [
  {
    group: null, // sin título de grupo
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Operaciones',
    items: [
      { key: 'orders',    label: 'Pedidos',    icon: ClipboardList,     badge: 'activeOrders' },
      { key: 'caja',      label: 'Caja',        icon: DollarSign },
      { key: 'mesas',     label: 'Mesas',       icon: ShoppingBag },
    ],
  },
  {
    group: 'Producto',
    items: [
      { key: 'menu',      label: 'Menú',        icon: UtensilsCrossed },
      { key: 'inventory', label: 'Inventario',  icon: Warehouse },
      { key: 'logistics', label: 'Logística',   icon: Boxes },
    ],
  },
  {
    group: 'Crecimiento',
    items: [
      { key: 'analytics', label: 'Analytics',  icon: BarChart3 },
      { key: 'finanzas',  label: 'Finanzas',   icon: TrendingUp },
      { key: 'marketing', label: 'Marketing',  icon: Megaphone },
      { key: 'customers', label: 'Clientes',   icon: UserCircle },
    ],
  },
  {
    group: 'Sistema',
    items: [
      { key: 'users',      label: 'Usuarios',     icon: Users },
      { key: 'sucursales', label: 'Sucursales',   icon: Store },
      { key: 'delivery',   label: 'Delivery',     icon: Truck },
      { key: 'fiscal',     label: 'Facturación',  icon: Receipt },
      { key: 'employees',  label: 'Personal',     icon: Package },
    ],
  },
];

// ── Componente ─────────────────────────────────────────────────────────────────

export default function AdminSidebar({ activeTab, onTabChange, availableTabs, activeOrdersCount, isOpen, onClose }) {
  const { user, logout } = useAuth();

  // Filtrar los grupos para mostrar solo tabs disponibles
  const filteredGroups = useMemo(() => {
    return NAV_GROUPS.map(g => ({
      ...g,
      items: g.items.filter(item => availableTabs.includes(item.key)),
    })).filter(g => g.items.length > 0);
  }, [availableTabs]);

  return (
    <>
      {/* Backdrop para mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 flex flex-col bg-cm-surface border-r border-cm-border overflow-hidden transition-transform duration-200
        md:static md:translate-x-0 shrink-0 h-full
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* ── Branding ── */}
        <div className="px-4 py-5 border-b border-cm-border shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-cm-accent rounded-lg flex items-center justify-center font-black text-white text-sm shrink-0">
              H
            </div>
            <div>
              <p className="text-sm font-black text-cm-text leading-none">Admin Hub</p>
              <p className="text-[10px] text-cm-muted font-medium mt-0.5 truncate max-w-[100px]">
                {user?.name || user?.email}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-cm-muted hover:bg-cm-accent/10 hover:text-cm-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Navegación ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {filteredGroups.map(({ group, items }) => (
            <div key={group ?? '__root'}>
              {group && (
                <p className="text-[9px] font-black text-cm-muted/60 uppercase tracking-widest px-2 mb-1.5">
                  {group}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map(({ key, label, icon: Icon, badge }) => {
                  const isActive = activeTab === key;
                  const badgeCount = badge === 'activeOrders' ? activeOrdersCount : 0;

                  return (
                    <button
                      key={key}
                      onClick={() => {
                        onTabChange(key);
                        onClose(); // cerrar sidebar en mobile al hacer click
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 group ${
                        isActive
                          ? 'bg-cm-accent text-white shadow-sm'
                          : 'text-cm-muted hover:bg-cm-accent/8 hover:text-cm-text'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-cm-muted group-hover:text-cm-accent'}`} />
                      <span className={`flex-1 text-xs font-semibold truncate ${isActive ? 'text-white' : ''}`}>
                        {label}
                      </span>
                      {badgeCount > 0 && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                          isActive ? 'bg-white/20 text-white' : 'bg-cm-accent text-white'
                        }`}>
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                      {isActive && (
                        <ChevronRight className="w-3 h-3 text-white/60 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer: Rol + Logout ── */}
        <div className="px-3 py-3 border-t border-cm-border shrink-0 space-y-1">
          <div className="px-3 py-2 rounded-lg bg-cm-bg-alt border border-cm-border">
            <p className="text-[10px] text-cm-muted font-medium">Sesión activa como</p>
            <p className="text-xs font-black text-cm-accent capitalize">{user?.role || 'Admin'}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-cm-muted hover:bg-cm-error/10 hover:text-cm-error transition-all text-xs font-semibold group"
          >
            <LogOut className="w-3.5 h-3.5 group-hover:text-cm-error transition-colors" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
