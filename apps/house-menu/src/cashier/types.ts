// Cashier Module — Domain Types
export type CashSessionStatus = 'open' | 'closed';
export type PaymentMethod = 'Efectivo' | 'Yape/Plin' | 'Tarjeta (POS)';
export type PaymentStatus = 'pendiente' | 'pagado' | 'por_verificar' | 'reembolsado' | 'partial';
export type OrderStatus =
  | 'recibido' | 'preparando' | 'listo' | 'entregado'
  | 'cancelado' | 'pendiente_pago' | 'programado';

export interface CashSession {
  id: string;
  openedAt: number;
  openingBalance: number;
  closedAt: number | null;
  closingBalance: number | null;
  expectedCash: number | null;
  difference: number | null;
  status: CashSessionStatus;
  openedBy: string;
  closedBy: string | null;
  notes: string;
}

export interface ItemDiscount {
  type: 'percentage' | 'fixed';
  value: number;
  reason: string;
}

export interface OrderItem {
  name?: string;
  productName?: string;
  productId?: string;
  quantity: number;
  price: number;
  selectedOptions?: { name: string }[];
  discount?: ItemDiscount;
  subtotal?: number;
}

export interface OrderNote {
  text: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
}

export interface SplitDiner {
  name: string;
  items: number[];
  total: number;
  method: PaymentMethod;
  status: 'pending' | 'paid';
}

export interface Order {
  id: string;
  customerName?: string;
  mesa?: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  financials?: { total: number; [key: string]: unknown };
  totalAfterDiscount?: number;
  discount?: { type: string; value: number };
  items?: OrderItem[];
  notes?: OrderNote[];
  createdAt?: string;
  location?: string;
  payment_details?: {
    wallet_type?: string;
    operation_number?: string;
    voucherUrl?: string;
  };
  splits?: Record<string, SplitDiner>;
  refund?: {
    amount: number;
    method: string;
    reason: string;
    items?: number[];
  };
}

export interface OrderKPIs {
  totalEfectivo: number;
  totalYapePlin: number;
  totalPos: number;
  totalPendiente: number;
  totalPorVerificar: number;
  totalIngresos: number;
  expectedCash: number;
  porVerificar: Order[];
  pendingOrders: Order[];
  paidCount: number;
  cancelledCount: number;
  averageTicket: number;
}

export type ModalName =
  | 'session'
  | 'quickPay'
  | 'splitBill'
  | 'verifyPayment'
  | 'cancelOrder'
  | 'transferTable'
  | 'receipt'
  | null;

export interface ModalStackItem {
  name: Exclude<ModalName, null>;
  props: Record<string, unknown>;
}

export type DiscountType = 'none' | 'percentage' | 'fixed';

export type SessionAction = 'closed' | 'opening' | 'open' | 'closing';

export type DisplayMode = 'total' | 'payment' | 'idle' | 'closed';
