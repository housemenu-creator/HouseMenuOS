/**
 * Central source of truth for menu business rules.
 * Referenced by:
 *   - /agents/orchestrator/SKILL.md   (Business Logic Specialist)
 *   - /agents/skills/reporting/SKILL.md (prices source of truth)
 *
 * Live product/price data lives in Firebase RTDB at `branches/{branchId}/catalog/`.
 * This file provides defaults, fallbacks, and static business rules.
 */

export const CATEGORIES = [
  { id: 'DESAYUNOS', label: 'Desayunos', sort: 1 },
  { id: 'ENTRADAS', label: 'Entradas', sort: 2 },
  { id: 'PLATOS_FONDO', label: 'Platos de Fondo', sort: 3 },
  { id: 'GUARNICIONES', label: 'Guarniciones', sort: 4 },
  { id: 'POSTRES', label: 'Postres', sort: 5 },
  { id: 'BEBIDAS', label: 'Bebidas', sort: 6 },
  { id: 'EXTRAS', label: 'Extras', sort: 7 },
];

export const DEFAULT_PRODUCT = {
  name: 'Nuevo Plato',
  category: 'PLATOS_FONDO',
  base_price: 0,
  available: false,
  description: '',
  image: '',
  isWizard: false,
  steps: [],
  trackStock: false,
  stock: 0,
};

export const TAX_RATE = 0.18; // 18 % IGV

export const PACKAGING_OPTIONS = [
  { id: 'bottle', name: 'Botella', icon: '🍾', price: 0.50 },
  { id: 'halfL', name: '1/2 Litro', icon: '📦', price: 1.00 },
  { id: 'liter', name: '1 Litro', icon: '📦', price: 1.00 },
];

export const ORDER_STATUSES = [
  { value: 'recibido', label: 'Recibido', color: 'bg-yellow-400' },
  { value: 'preparando', label: 'Preparando', color: 'bg-blue-400' },
  { value: 'listo', label: 'Listo', color: 'bg-green-400' },
  { value: 'en_camino', label: 'En Camino', color: 'bg-purple-400' },
  { value: 'entregado', label: 'Entregado', color: 'bg-gray-400' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-400' },
  { value: 'programado', label: 'Programado', color: 'bg-indigo-400' },
];

export const PAYMENT_METHODS = [
  'Yape/Plin',
  'Efectivo',
  'Tarjeta (POS)',
  'Pendiente',
];

export const ORDER_TYPES = [
  { value: 'Mesa', label: 'Mesa' },
  { value: 'Para Llevar', label: 'Para Llevar' },
  { value: 'Delivery', label: 'Delivery' },
];

export const DELIVERY_FEE_DEFAULT = 3.00;
