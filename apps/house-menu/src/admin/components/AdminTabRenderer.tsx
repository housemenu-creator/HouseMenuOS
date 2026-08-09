import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { TAB_DEFS } from '../config/tabDefs';
import ErrorBoundary from '../../components/ErrorBoundary';

// Lazy imports — mismo patrón que en AdminView
import { lazy } from 'react';
const DashboardTab = lazy(() => import('../tabs/DashboardTab'));
const OrdersTab = lazy(() => import('../tabs/OrdersTab'));
const MenuTab = lazy(() => import('../tabs/MenuTab'));
const InventoryTab = lazy(() => import('../tabs/InventoryTab'));
const CajaTab = lazy(() => import('../tabs/CajaTab'));
const FinanzasTab = lazy(() => import('../tabs/FinanzasTab'));
const SucursalesTab = lazy(() => import('../tabs/SucursalesTab'));
const DeliveryManager = lazy(() => import('../components/DeliveryManager'));
const FiscalManager = lazy(() => import('../components/FiscalManager'));
const UserManager = lazy(() => import('../components/UserManager'));
const MarketingTab = lazy(() => import('../tabs/MarketingTab'));
const AnalyticsTab = lazy(() => import('../tabs/AnalyticsTab'));
const CrmView = lazy(() => import('./crm/CrmView'));
const CustomerAnalyticsTab = lazy(() => import('../tabs/CustomerAnalyticsTab'));
const LogisticsTab = lazy(() => import('../tabs/LogisticsTab'));
const EmployeesTab = lazy(() => import('../tabs/EmployeesTab'));
const SystemConfigTab = lazy(() => import('../tabs/config'));
const RolesTab = lazy(() => import('../tabs/RolesTab'));
const AuditTab = lazy(() => import('../tabs/AuditTab'));
const ReservationsTab = lazy(() => import('../tabs/ReservationsTab'));
const BrandingTab = lazy(() => import('../tabs/BrandingTab'));
const PipelineTab = lazy(() => import('../tabs/PipelineTab'));
const BotTab = lazy(() => import('../tabs/BotTab'));

// ── Props ──

interface TabData {
  kpiData: any;
  funnelData: any[];
  kioskEnabled: boolean;
  toggleKiosk: () => void;
  allOrders: any[];
  now: Date;
  activeBranchName: string;
  userRole?: string;
  cashSessions: any[];
  activeBranchId: string;
  user: any;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (f: string) => void;
  paymentFilter: string;
  onPaymentFilterChange: (f: string) => void;
  filteredOrders: any[];
  onCancelOrder: (id: string) => Promise<void>;
  exportToCSV: (orders: any[], branchName: string) => void;
  catalog: any;
  dailyMenus: any;
  onUpdateField: (id: string, field: string, value: any) => Promise<void>;
  branches: any[];
}

interface Props {
  activeTab: string;
  can: (perm: string) => boolean;
  data: TabData;
}

// ── Componente ──

function tabContent(activeTab: string, can: (perm: string) => boolean, d: TabData) {
  const tabDef = TAB_DEFS[activeTab];
  if (!tabDef) return null;
  if (tabDef.perm && !can(tabDef.perm)) {
    return <div className="text-center py-12 text-sm text-cm-text-secondary">No tienes permiso para ver esta sección</div>;
  }

  switch (activeTab) {
    case 'dashboard':
      return <DashboardTab kpiData={d.kpiData} funnelData={d.funnelData} kioskEnabled={d.kioskEnabled} toggleKiosk={d.toggleKiosk} allOrders={d.allOrders} now={d.now} activeBranchName={d.activeBranchName} userRole={d.userRole} cashSessions={d.cashSessions} activeBranchId={d.activeBranchId} user={d.user} />;
    case 'orders':
      return <OrdersTab allOrders={d.allOrders} searchQuery={d.searchQuery} onSearchQueryChange={d.onSearchQueryChange} statusFilter={d.statusFilter} onStatusFilterChange={d.onStatusFilterChange} paymentFilter={d.paymentFilter} onPaymentFilterChange={d.onPaymentFilterChange} filteredOrders={d.filteredOrders} onCancelOrder={d.onCancelOrder} exportToCSV={d.exportToCSV} activeBranchId={d.activeBranchId} activeBranchName={d.activeBranchName} />;
    case 'menu':
      return <MenuTab activeBranchId={d.activeBranchId} catalog={d.catalog} dailyMenus={d.dailyMenus} onUpdateField={d.onUpdateField} />;
    case 'inventory':
      return <InventoryTab catalog={d.catalog} />;
    case 'caja':
      return <CajaTab cashSessions={d.cashSessions} allOrders={d.allOrders} activeBranchId={d.activeBranchId} user={d.user} />;
    case 'finanzas':
      return <FinanzasTab allOrders={d.allOrders} activeBranchId={d.activeBranchId} activeBranchName={d.activeBranchName} />;
    case 'sucursales':
      return <SucursalesTab branches={d.branches} activeBranchId={d.activeBranchId} />;
    case 'delivery':
      return d.activeBranchId ? <DeliveryManager branchId={d.activeBranchId} /> : <p className="text-sm text-cm-muted text-center py-8">Selecciona una sucursal para gestionar el delivery</p>;
    case 'fiscal':
      return d.activeBranchId ? <FiscalManager branchId={d.activeBranchId} /> : <p className="text-sm text-cm-muted text-center py-8">Selecciona una sucursal para gestionar la facturación</p>;
    case 'users':
      return <UserManager />;
    case 'marketing':
      return d.activeBranchId ? <MarketingTab activeBranchId={d.activeBranchId} branches={d.branches} /> : <p className="text-sm text-cm-muted text-center py-8">Selecciona una sucursal para gestionar marketing</p>;
    case 'analytics':
      return <AnalyticsTab allOrders={d.allOrders} />;
    case 'customers':
      return <CrmView activeBranchId={d.activeBranchId} allOrders={d.allOrders} analyticsTab={CustomerAnalyticsTab} />;
    case 'customer-analytics':
      return <CustomerAnalyticsTab />;
    case 'logistics':
      return <LogisticsTab />;
    case 'employees':
      return <EmployeesTab allOrders={d.allOrders} />;
    case 'roles':
      return <RolesTab />;
    case 'audit':
      return <AuditTab />;
    case 'reservations':
      return <ReservationsTab />;
    case 'settings':
      return <SystemConfigTab />;
    case 'branding':
      return <BrandingTab />;
    case 'pipeline':
      return <PipelineTab branchId={d.activeBranchId} />;
    case 'bot':
      return <BotTab />;
    default:
      return null;
  }
}

export default function AdminTabRenderer({ activeTab, can, data }: Props) {
  const tabDef = TAB_DEFS[activeTab];

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
      </div>
    }>
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="h-full"
      >
        <ErrorBoundary message={`Error en ${tabDef?.label || activeTab}`}>
          {tabContent(activeTab, can, data)}
        </ErrorBoundary>
      </motion.div>
    </Suspense>
  );
}
