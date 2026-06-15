export interface DeliveryAddress {
  id: string;
  label: string;
  address: string;
  reference?: string;
  lat?: number;
  lng?: number;
}

export interface ContactPerson {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
}

export type CuentaType = 'minorista' | 'mayorista' | 'corporativo';

export type CuentaStatus = 'activa' | 'inactiva' | 'suspendida';

export type PaymentTerms = 'contado' | '15d' | '30d' | '60d';

export interface VendedorCuenta {
  id: string;
  name: string;
  type: CuentaType;
  status: CuentaStatus;
  isActive: boolean;

  phone?: string;
  email?: string;

  legalName?: string;
  taxId?: string;
  fiscalAddress?: string;

  deliveryAddresses?: DeliveryAddress[];
  contacts?: ContactPerson[];

  assignedVendedor: string;
  priceList?: string;
  creditLimit?: number;
  creditUsed?: number;
  paymentTerms?: PaymentTerms;

  tags?: string[];
  notes?: string;
  lastOrderAt?: number;
  totalOrders?: number;
  totalSpent?: number;

  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

export type CuentaFilter = 'todas' | 'activas' | 'pendientes';

export interface VendedorUIState {
  selectedCuentaId: string | null;
  searchQuery: string;
  filter: CuentaFilter;
  showNewOrder: boolean;
}

export const CUENTA_TYPE_LABELS: Record<CuentaType, string> = {
  minorista: 'Minorista',
  mayorista: 'Mayorista',
  corporativo: 'Corporativo',
};

export const CUENTA_STATUS_LABELS: Record<CuentaStatus, string> = {
  activa: 'Activa',
  inactiva: 'Inactiva',
  suspendida: 'Suspendida',
};

export const CUENTA_STATUS_COLORS: Record<CuentaStatus, string> = {
  activa: 'text-cm-success bg-cm-success/10',
  inactiva: 'text-cm-muted bg-cm-muted/10',
  suspendida: 'text-cm-error bg-cm-error/10',
};
