import { useState, useCallback, Suspense, ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserCircle,
  SlidersHorizontal,
  BarChart3,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import useCustomerList from '../../hooks/crm/useCustomerList';
import useCustomerProfile from '../../hooks/crm/useCustomerProfile';
import useCustomerSegments from '../../hooks/crm/useCustomerSegments';
import CustomerTable from './CustomerTable';
import CustomerProfile from './CustomerProfile';
import SegmentBuilder from './SegmentBuilder';
import CrmCommunication from './CrmCommunication';
import type { Customer } from '../../hooks/crm/useCustomerList';

// ── Sub-tab config ──

interface SubTab {
  id: string;
  label: string;
  icon: React.ElementType;
}

const SUB_TABS: SubTab[] = [
  { id: 'list', label: 'Lista', icon: Users },
  { id: 'profile', label: 'Perfil', icon: UserCircle },
  { id: 'segments', label: 'Segmentos', icon: SlidersHorizontal },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'comm', label: 'Comunicar', icon: MessageCircle },
];

// ── Props ──

interface CrmViewProps {
  activeBranchId?: string;
  allOrders?: any[];
  analyticsTab: ComponentType<any>;
}

export default function CrmView({ activeBranchId, allOrders = [], analyticsTab: CustomerAnalyticsTab }: CrmViewProps) {
  const [activeSubTab, setActiveSubTab] = useState('list');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // ── Hooks ──
  const {
    loading: listLoading,
    error: listError,
    retry: listRetry,
    page, setPage,
    totalPages, pageStart, pageEnd, totalCount,
    sortField, sortDir, setSort,
    filters, setFilter, resetFilters,
    displayCustomers, filteredCustomers,
    allCustomers,
  } = useCustomerList(50);

  const {
    profile,
    loading: profileLoading,
    error: profileError,
    loadProfile,
    clearProfile,
  } = useCustomerProfile();

  const {
    loading: segmentsLoading,
    segmentFilters,
    setSegmentFilter,
    resetSegmentFilters,
    segmentCount,
    segmentCustomers,
    savedSegments,
    saveSegment,
    loadSegment,
    deleteSegment,
    bulkAddPoints,
    bulkExport,
  } = useCustomerSegments();

  // ── Handlers ──

  const handleSelectCustomer = useCallback(
    (customer: Customer) => {
      if (customer.email) {
        setSelectedCustomerId(customer.id);
        loadProfile(customer.email);
        setActiveSubTab('profile');
      }
    },
    [loadProfile],
  );

  const handleBackToList = useCallback(() => {
    setSelectedCustomerId(null);
    clearProfile();
    setActiveSubTab('list');
  }, [clearProfile]);

  const handleSort = useCallback(
    (field: string, dir: string) => {
      setSort(field);
    },
    [setSort],
  );

  // ── Render helpers ──

  const renderSubTab = () => {
    switch (activeSubTab) {
      case 'list':
        return (
          <CustomerTable
            customers={displayCustomers}
            page={page}
            totalPages={totalPages}
            pageStart={pageStart}
            pageEnd={pageEnd}
            totalCount={totalCount}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort as any}
            onPage={setPage}
            onSelectCustomer={handleSelectCustomer}
            filters={filters}
            onFilterChange={setFilter}
            onResetFilters={resetFilters}
            loading={listLoading}
            error={listError}
            onRetry={listRetry}
          />
        );

      case 'profile':
        return (
          <CustomerProfile
            profile={profile}
            loading={profileLoading}
            error={profileError}
            onBack={handleBackToList}
            onRetry={() => selectedCustomerId && profile?.customer?.email && loadProfile(profile.customer.email)}
          />
        );

      case 'segments':
        return (
          <SegmentBuilder
            segmentFilters={segmentFilters}
            setSegmentFilter={setSegmentFilter}
            resetSegmentFilters={resetSegmentFilters}
            segmentCount={segmentCount}
            segmentCustomers={segmentCustomers}
            savedSegments={savedSegments}
            onSaveSegment={saveSegment}
            onLoadSegment={loadSegment}
            onDeleteSegment={deleteSegment}
            onBulkAddPoints={bulkAddPoints}
            onBulkExport={bulkExport}
            loading={segmentsLoading}
          />
        );

      case 'analytics':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-cm-accent" /></div>}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-cm-accent" />
              <h2 className="text-lg font-bold text-cm-text">Analytics de clientes</h2>
            </div>
            <CustomerAnalyticsTab />
          </Suspense>
        );

      case 'comm':
        return (
          <CrmCommunication
            targetCustomers={segmentCustomers}
            onSend={(payload) => {
              console.log('[CRM] WhatsApp send:', payload);
            }}
            sending={false}
            messages={[]}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Sub-tab navigation ── */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-cm-border bg-cm-surface p-1 shadow-cm-sm">
        {SUB_TABS.map((tab) => {
          const isActive = activeSubTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cm-accent text-white shadow-sm'
                  : 'text-cm-text-secondary hover:text-cm-text hover:bg-cm-accent/5'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {renderSubTab()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
