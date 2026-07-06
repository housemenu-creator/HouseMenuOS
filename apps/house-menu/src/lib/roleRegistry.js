import { Settings, ClipboardList, ChefHat, Truck, Bike, DollarSign, TrendingUp } from 'lucide-react';

export const PERMISSIONS = {
  'orders:read': 'Ver pedidos',
  'orders:create': 'Crear pedidos',
  'orders:update_status': 'Cambiar estado de pedidos',
  'orders:cancel': 'Cancelar pedidos',
  'orders:edit': 'Editar pedidos (items, cantidades, precios)',
  'orders:mark_paid': 'Cobrar pedidos',
  'orders:refund': 'Procesar reembolsos',
  'menu:read': 'Ver menú',
  'menu:edit': 'Editar menú (precios, nombres)',
  'menu:manage': 'Gestionar catálogo (crear/eliminar productos)',
  'inventory:read': 'Ver inventario',
  'inventory:edit': 'Editar inventario (stock, precios)',
  'analytics:read': 'Ver dashboard y analítica',
  'chat:read': 'Leer chat',
  'chat:write': 'Escribir en chat',
  'users:read': 'Ver usuarios',
  'users:manage': 'Crear/editar/eliminar usuarios',
  'config:manage': 'Gestionar configuración',
  'kiosk:manage': 'Activar/desactivar modo kiosko',
  'cuentas:read': 'Ver cuentas de clientes',
  'cuentas:manage': 'Crear/editar cuentas de clientes',
  'marketing:read': 'Ver módulo de marketing',
  'marketing:manage': 'Crear/editar/eliminar contenido de marketing',
  'system:audit': 'Ver auditoría del sistema',
  'system:manage': 'Gestionar roles y configuración del sistema',
};

function allPermissions() {
  return Object.fromEntries(Object.keys(PERMISSIONS).map(k => [k, true]));
}

export const ROLE_REGISTRY = {
  superadmin: {
    name: 'Super Admin',
    key: 'superadmin',
    permissions: { ...allPermissions(), 'system:audit': true, 'system:manage': true },
    loginScreen: { title: 'Admin Hub', subtitle: 'Gestión del Sistema · House', icon: Settings },
    defaultUser: { email: 'super@house.local', name: 'Super Admin', pin: 'super' },
    adminTabs: ['dashboard', 'orders', 'menu', 'inventory', 'caja', 'finanzas', 'sucursales', 'delivery', 'fiscal', 'users', 'marketing', 'analytics', 'customers', 'logistics', 'employees', 'settings', 'roles', 'audit', 'reservations', 'branding'],
  },
  admin: {
    name: 'Administrador',
    key: 'admin',
    permissions: allPermissions(),
    loginScreen: { title: 'Admin Hub', subtitle: 'Gestión y Analítica · House', icon: Settings },
    defaultUser: { email: 'admin@house.local', name: 'Admin', pin: 'admin' },
    adminTabs: ['dashboard', 'orders', 'menu', 'inventory', 'caja', 'finanzas', 'sucursales', 'delivery', 'fiscal', 'users', 'marketing', 'analytics', 'customers', 'logistics', 'employees', 'settings', 'reservations', 'branding'],
  },
  cajero: {
    name: 'Cajero',
    key: 'cajero',
    permissions: {
      'orders:read': true,
      'orders:mark_paid': true,
      'orders:refund': true,
      'orders:cancel': true,
      'menu:read': true,
      'analytics:read': true,
      'chat:read': true,
      'chat:write': true,
    },
    loginScreen: { title: 'Caja', subtitle: 'Módulo de Cobro · House', icon: DollarSign },
    defaultUser: { email: 'caja@house.local', name: 'Cajero', pin: '2222' },
    adminTabs: ['dashboard', 'orders', 'caja'],
  },
  kitchen: {
    name: 'Cocina',
    key: 'kitchen',
    permissions: {
      'orders:read': true,
      'orders:create': true,
      'orders:update_status': true,
      'menu:read': true,
      'chat:read': true,
      'chat:write': true,
    },
    loginScreen: { title: 'House KDS', subtitle: 'Kitchen Display System', icon: ChefHat },
    defaultUser: { email: 'cocina@house.local', name: 'Cocina', pin: '1234' },
  },
  dispatch: {
    name: 'Reparto',
    key: 'dispatch',
    permissions: {
      'orders:read': true,
      'orders:update_status': true,
      'chat:read': true,
      'chat:write': true,
    },
    loginScreen: { title: 'Área Runners', subtitle: 'Ingresa tu PIN de despachador', icon: Truck },
    defaultUser: { email: 'reparto@house.local', name: 'Reparto', pin: '5678' },
  },
  mozo: {
    name: 'Mozo',
    key: 'mozo',
    permissions: {
      'orders:read': true,
      'orders:create': true,
      'orders:update_status': true,
      'menu:read': true,
      'chat:read': true,
      'chat:write': true,
    },
    loginScreen: { title: 'Mozo', subtitle: 'TomaPedidos · House', icon: ClipboardList },
    defaultUser: { email: 'mozo@house.local', name: 'Mozo', pin: '0000' },
  },
  delivery: {
    name: 'Repartidor',
    key: 'delivery',
    permissions: {
      'orders:read': true,
      'orders:update_status': true,
    },
    loginScreen: { title: 'Mis Entregas', subtitle: 'Portal del Repartidor', icon: Bike },
    defaultUser: { email: 'delivery@house.local', name: 'Repartidor', pin: '1111' },
  },
  vendedor: {
    name: 'Vendedor',
    key: 'vendedor',
    permissions: {
      'orders:read': true,
      'orders:create': true,
      'orders:update_status': true,
      'menu:read': true,
      'cuentas:read': true,
      'cuentas:manage': true,
      'chat:read': true,
      'chat:write': true,
    },
    loginScreen: { title: 'Ventas', subtitle: 'Portal del Vendedor · House', icon: TrendingUp },
    defaultUser: { email: 'ventas@house.local', name: 'Vendedor', pin: '3333' },
  },
};

export function hasPermission(userPermissions, permission) {
  if (!userPermissions) return false;
  if (userPermissions['*'] || userPermissions.admin) return true;
  if (userPermissions[permission]) return true;
  const wildcard = permission.split(':')[0] + ':*';
  if (userPermissions[wildcard]) return true;
  return false;
}

export function getAdminTabs(userRole) {
  const role = ROLE_REGISTRY[userRole];
  if (!role) return ['dashboard'];
  const allowed = role.adminTabs;
  if (!allowed) return ['dashboard'];
  if (userRole === 'admin') return allowed; // admin sees all
  return allowed;
}

export function getDefaultUsers() {
  // En producción real (Firebase Hosting o dominio público) NO exponemos dev users
  // Pero en localhost / Docker local sí los mostramos para testing
  if (import.meta.env.PROD && !location.hostname.match(/^(localhost|127\.0\.0\.1|::1)$/)) return [];
  return Object.values(ROLE_REGISTRY)
    .filter(r => r.defaultUser)
    .map(r => ({ id: `default-${r.key}`, role: r.key, ...r.defaultUser }));
}
