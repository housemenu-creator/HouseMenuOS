import {
  LayoutDashboard, ClipboardList, UtensilsCrossed, Package, Store, Users,
  DollarSign, TrendingUp, Warehouse, Truck, Receipt, Megaphone,
  Settings, ShieldCheck, History, Calendar, BarChart3, Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface TabDef {
  label: string;
  icon: LucideIcon;
  perm?: string;
}

export const TAB_DEFS: Record<string, TabDef> = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard },
  orders: { label: 'Pedidos', icon: ClipboardList, perm: 'orders:read' },
  menu: { label: 'Menu', icon: UtensilsCrossed, perm: 'menu:read' },
  inventory: { label: 'Inventario', icon: Warehouse, perm: 'inventory:read' },
  caja: { label: 'Caja', icon: DollarSign, perm: 'orders:read' },
  finanzas: { label: 'Finanzas', icon: TrendingUp },
  sucursales: { label: 'Sucursales', icon: Store, perm: 'config:manage' },
  delivery: { label: 'Delivery', icon: Truck },
  fiscal: { label: 'Facturación', icon: Receipt, perm: 'config:manage' },
  users: { label: 'Usuarios', icon: Users, perm: 'users:manage' },
  marketing: { label: 'Marketing', icon: Megaphone, perm: 'marketing:read' },
  analytics: { label: 'Analytics', icon: TrendingUp, perm: 'analytics:read' },
  customers: { label: 'Clientes', icon: Users, perm: 'analytics:read' },
  'customer-analytics': { label: 'Customer Analytics', icon: BarChart3, perm: 'analytics:read' },
  logistics: { label: 'Logística', icon: Package, perm: 'inventory:read' },
  employees: { label: 'Personal', icon: Users, perm: 'users:manage' },
  settings: { label: 'Config', icon: Settings, perm: 'config:manage' },
  roles: { label: 'Roles', icon: ShieldCheck, perm: 'system:manage' },
  audit: { label: 'Auditoría', icon: History, perm: 'system:audit' },
  reservations: { label: 'Reservas', icon: Calendar, perm: 'orders:read' },
  branding: { label: 'Theme', icon: Sparkles, perm: 'config:manage' },
};
