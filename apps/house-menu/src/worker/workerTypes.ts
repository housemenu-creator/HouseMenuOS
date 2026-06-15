export interface WorkerSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  roles: string[];
  branchId: string;
  permissions: Record<string, boolean>;
  tenantId: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  productId?: string;
  details?: string[];
  station?: string;
}

export interface OrderFinancials {
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  tax_igv?: number;
  discount_total?: number;
  tip_total?: number;
  packaging_total?: number;
}

export interface Order {
  id: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  customerName: string;
  items: OrderItem[];
  financials?: OrderFinancials;
  branchId?: string;
  location?: string;
  type?: string;
  order_type?: string;
  tableNumber?: string;
  driverId?: string;
  driverName?: string;
  priority?: string;
  pacingStatus?: string;
  observaciones?: string;
  allergens?: string[];
  deliveryDate?: string;
  source?: string;
  statusTimestamps?: Record<string, string>;
  station?: string;
  dueTime?: number;
  payment_status?: string;
  payment_method?: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  base_price: number;
  available: boolean;
  description?: string;
  image?: string;
  isWizard?: boolean;
  steps?: WizardStep[];
  trackStock?: boolean;
  stock?: number;
}

export interface WizardStep {
  id: string;
  title: string;
  type: 'single' | 'multiple' | 'auto';
  options: WizardOption[];
}

export interface WizardOption {
  id: string;
  name: string;
  price: number;
  trackStock?: boolean;
  stock?: number;
}

export interface DeliveryDriver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  active: boolean;
  available: boolean;
  totalDeliveries: number;
  lastPosition?: {
    lat: number;
    lng: number;
    accuracy: number;
    updatedAt: number;
  };
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  estimatedMinutes: number;
  active: boolean;
  priority: number;
}

export const PRIORITY = {
  RUSH: 'rush',
  NORMAL: 'normal',
  LOW: 'low',
} as const;

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; pulse: boolean; order: number }> = {
  [PRIORITY.RUSH]: { label: 'Rush', color: 'text-cm-error', bg: 'bg-cm-error/10', border: 'border-cm-error/20', pulse: true, order: 0 },
  [PRIORITY.NORMAL]: { label: 'Normal', color: 'text-cm-info', bg: 'bg-cm-info/10', border: 'border-cm-info/20', pulse: false, order: 1 },
  [PRIORITY.LOW]: { label: 'Baja', color: 'text-cm-muted', bg: 'bg-cm-muted/10', border: 'border-cm-border', pulse: false, order: 2 },
};

export const ORDER_STATUSES = [
  { value: 'recibido', label: 'Recibido', color: 'bg-yellow-400' },
  { value: 'preparando', label: 'Preparando', color: 'bg-blue-400' },
  { value: 'listo', label: 'Listo', color: 'bg-green-400' },
  { value: 'en_camino', label: 'En Camino', color: 'bg-purple-400' },
  { value: 'entregado', label: 'Entregado', color: 'bg-gray-400' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-400' },
  { value: 'programado', label: 'Programado', color: 'bg-indigo-400' },
] as const;

export const STATUS_WORKFLOW = ['recibido', 'preparando', 'listo', 'en_camino', 'entregado'];

export const STATUS_FLOW_INDEX: Record<string, number> = Object.fromEntries(
  STATUS_WORKFLOW.map((s, i) => [s, i])
);

export const ACTIVE_STATUSES = ['recibido', 'preparando', 'listo', 'en_camino'];
export const FINAL_STATUSES = ['entregado', 'cancelado'];
