/** Portal Empleados — Domain Types */

export interface Employee {
  id: string;
  name: string;
  pin: string;
  role?: string;
  active?: boolean;
  schedule?: Record<string, unknown>;
  goals?: Record<string, Goal>;
  [key: string]: unknown;
}

export interface Attendance {
  date: string;
  employeeId?: string;
  clockIn?: string;
  clockOut?: string;
  status?: string;
  [key: string]: unknown;
}

export interface Goal {
  id: string;
  title: string;
  completed?: boolean;
  dueDate?: string;
  [key: string]: unknown;
}

export type ViewId = 'dashboard' | 'attendance' | 'schedule' | 'tasks' | 'profile' | 'admin';

export interface NavItem {
  id: ViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminTab {
  id: string;
  label: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  category: string;
  base_price: number;
  stock?: number;
  minStock?: number;
  supplierId?: string;
  trackStock?: boolean;
  available?: boolean;
}

export interface PurchaseOrder {
  id: string;
  branchId: string;
  supplierId: string;
  status: string;
  items: { productId?: string; name?: string; quantity?: number; }[];
  total: number;
  createdBy: string;
  createdAt: string;
  correlationId?: string;
  statusHistory?: { status: string; timestamp: string; by: string }[];
}

export interface AutomationRule {
  id: string;
  name: string;
  eventType: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}
