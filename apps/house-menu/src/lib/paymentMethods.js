// Single Source of Truth — Payment Methods
// Used by: Mozo, Caja, Admin, Driver, Kitchen, Customer (CartDrawer)

import { Wallet, Banknote, Smartphone, CreditCard, Clock, Truck } from 'lucide-react';

/**
 * Todos los métodos de pago disponibles en el sistema
 * Cada rol filtra los que le corresponden via getMethodsForRole()
 */
export const ALL_PAYMENT_METHODS = [
  {
    id: 'pendiente',
    label: 'Pendiente',
    icon: Clock,
    description: 'Pagar después en caja',
    defaultStatus: 'pendiente',
    roles: ['mozo', 'cashier', 'admin', 'customer'], // customer = kiosk
    isContraentrega: false,
    isDigital: false,
    color: 'warning',
  },
  {
    id: 'efectivo',
    label: 'Efectivo',
    icon: Banknote,
    description: 'Pago en efectivo',
    defaultStatus: 'pagado',
    roles: ['mozo', 'cashier', 'admin', 'driver', 'customer'],
    isContraentrega: false,
    isDigital: false,
    color: 'success',
  },
  {
    id: 'yape',
    label: 'Yape',
    icon: Smartphone,
    description: 'Yape — pendiente de verificar',
    defaultStatus: 'por_verificar',
    roles: ['mozo', 'cashier', 'admin', 'customer'],
    isContraentrega: false,
    isDigital: true,
    color: 'info',
  },
  {
    id: 'plin',
    label: 'Plin',
    icon: Smartphone,
    description: 'Plin — pendiente de verificar',
    defaultStatus: 'por_verificar',
    roles: ['mozo', 'cashier', 'admin', 'customer'],
    isContraentrega: false,
    isDigital: true,
    color: 'info',
  },
  {
    id: 'tarjeta',
    label: 'Tarjeta POS',
    icon: CreditCard,
    description: 'Pago con tarjeta',
    defaultStatus: 'pagado',
    roles: ['mozo', 'cashier', 'admin', 'customer'],
    isContraentrega: false,
    isDigital: false,
    color: 'primary',
  },
  {
    id: 'contraentrega',
    label: 'Contraentrega',
    icon: Truck,
    description: 'Paga al recibir el pedido',
    defaultStatus: 'contraentrega',
    roles: ['mozo', 'cashier', 'admin', 'driver', 'customer'],
    isContraentrega: true,
    isDigital: false,
    color: 'warning',
  },
];

/**
 * Filtra métodos por rol
 * @param {string} role - 'mozo' | 'cashier' | 'admin' | 'driver' | 'customer'
 * @param {boolean} includeContraentrega - si incluir contraentrega (default true)
 */
export function getMethodsForRole(role, includeContraentrega = true) {
  return ALL_PAYMENT_METHODS.filter(m =>
    m.roles.includes(role) && (includeContraentrega || !m.isContraentrega)
  );
}

/**
 * Obtiene un método por ID
 */
export function getMethodById(id) {
  return ALL_PAYMENT_METHODS.find(m => m.id === id);
}

/**
 * Mapea method_id (lo que viene del backend) a defaultStatus
 * Útil para crear pedidos: payment_status = getStatusForMethod(method_id)
 */
export function getStatusForMethod(methodId) {
  const method = getMethodById(methodId);
  return method?.defaultStatus || 'pendiente';
}

/**
 * Obtiene label para mostrar en UI
 */
export function getMethodLabel(methodId) {
  const method = getMethodById(methodId);
  return method?.label || methodId || '—';
}

/**
 * Obtiene color semántico para badges
 */
export function getMethodColor(methodId) {
  const method = getMethodById(methodId);
  return method?.color || 'muted';
}

/**
 * Verifica si es contraentrega
 */
export function isContraentrega(methodId) {
  const method = getMethodById(methodId);
  return method?.isContraentrega || false;
}

/**
 * Payment Status → config de badge (para payment_status del pedido)
 * Diferente de methodId: es el estado del pago en el order
 */
export const PAYMENT_STATUS_CONFIG = {
  pagado: {
    label: 'Pagado',
    color: 'success',
    icon: 'check',
    text: 'text-green-600',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  pendiente: {
    label: 'Pendiente',
    color: 'warning',
    icon: 'clock',
    text: 'text-amber-600',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  por_verificar: {
    label: 'Por Verificar',
    color: 'info',
    icon: 'shield-check',
    text: 'text-blue-600',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  contraentrega: {
    label: 'Contraentrega',
    color: 'warning',
    icon: 'truck',
    text: 'text-amber-600',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  reembolsado: {
    label: 'Reembolsado',
    color: 'muted',
    icon: 'rotate-ccw',
    text: 'text-gray-600',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
  },
};

export function getPaymentStatusConfig(status) {
  return PAYMENT_STATUS_CONFIG[status] || PAYMENT_STATUS_CONFIG.pendiente;
}