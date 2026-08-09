import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Search,
  AlertTriangle,
  RefreshCw,
  Users,
  Download,
} from 'lucide-react';
import CustomerTableRow from './CustomerTableRow';
import type { Customer, SortField, SortDir, CustomerFilters } from '../../hooks/crm/useCustomerList';

// ── Helpers ──

const TIER_CONFIG = {
  bronze: { label: 'Bronce' },
  silver: { label: 'Plata' },
  gold: { label: 'Oro' },
  platinum: { label: 'Platino' },
};

const COLUMNS = [
  { field: 'name', label: 'Cliente', defaultDir: 'asc', align: 'left' },
  { field: 'tier', label: 'Tier', defaultDir: 'desc', align: 'left' },
  { field: 'totalSpent', label: 'Gasto total', defaultDir: 'desc', align: 'right' },
  { field: 'orderCount', label: 'Pedidos', defaultDir: 'desc', align: 'right' },
  { field: 'points', label: 'Puntos', defaultDir: 'desc', align: 'right', hideMobile: true },
  { field: 'lastOrderAt', label: 'Últ. pedido', defaultDir: 'desc', align: 'right', hideMobile: true },
];

function formatDate(date: string | number): string {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

// ── Skeleton ──

function SkeletonRows() {
  return Array.from({ length: 6 }).map((_, i) => (
    <tr key={i} className="animate-pulse">
      <td className="px-2 py-3"><div className="h-3.5 w-3.5 rounded bg-cm-border" /></td>
      <td className="px-3 py-3"><div className="h-4 w-32 rounded bg-cm-border" /></td>
      <td className="px-3 py-3"><div className="h-4 w-16 rounded bg-cm-border" /></td>
      <td className="px-3 py-3"><div className="ml-auto h-4 w-16 rounded bg-cm-border" /></td>
      <td className="px-3 py-3"><div className="ml-auto h-4 w-10 rounded bg-cm-border" /></td>
      <td className="hidden px-3 py-3 md:table-cell"><div className="ml-auto h-4 w-12 rounded bg-cm-border" /></td>
      <td className="hidden px-3 py-3 lg:table-cell"><div className="ml-auto h-4 w-20 rounded bg-cm-border" /></td>
    </tr>
  ));
}

// ── SortHeader ──

function SortHeader({
  column,
  sortField,
  sortDir,
  onSort,
}: {
  column: typeof COLUMNS[number];
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: string, defaultDir?: string) => void;
}) {
  const isActive = sortField === column.field;
  const Icon = isActive ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : null;
  const alignClass = column.align === 'right' ? 'text-right' : 'text-left';
  const hideClass = column.hideMobile ? 'hidden lg:table-cell' : '';

  return (
    <th
      className={`cursor-pointer select-none px-3 py-3 ${alignClass} ${hideClass} text-xs font-semibold text-cm-text-secondary uppercase tracking-wider hover:text-cm-text transition-colors`}
      onClick={() => onSort(column.field, sortField === column.field ? undefined : column.defaultDir)}
    >
      <span className="inline-flex items-center gap-1">
        {column.label}
        {isActive && Icon && <Icon className="w-3 h-3" />}
      </span>
    </th>
  );
}

// ── Pagination ──

function PaginationBar({
  page,
  totalPages,
  pageStart,
  pageEnd,
  totalCount,
  onPage,
}: {
  page: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  totalCount: number;
  onPage: (p: number) => void;
}) {
  if (totalCount === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-cm-border bg-cm-bg-alt px-4 py-3">
      <p className="text-xs text-cm-text-secondary">
        {pageStart}–{pageEnd} de {totalCount}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(1)}
          disabled={page <= 1}
          className="rounded p-1 text-cm-text-secondary transition-colors hover:text-cm-text disabled:opacity-30"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[3rem] text-center text-xs font-semibold text-cm-text">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPage(totalPages)}
          disabled={page >= totalPages}
          className="rounded p-1 text-cm-text-secondary transition-colors hover:text-cm-text disabled:opacity-30"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Mobile Card ──

function MobileCustomerCard({ customer, onSelect, formatDate }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-cm-border bg-cm-surface p-4 shadow-cm-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-cm-text">{customer.name || 'Sin nombre'}</p>
          {customer.email && (
            <p className="text-xs text-cm-text-secondary">{customer.email}</p>
          )}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
          customer.tier === 'platinum' ? 'bg-indigo-500/20 text-indigo-600' :
          customer.tier === 'gold' ? 'bg-yellow-500/20 text-yellow-600' :
          customer.tier === 'silver' ? 'bg-slate-400/20 text-slate-500' :
          'bg-amber-700/20 text-amber-600'
        }`}>
          {customer.tier || 'bronce'}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-cm-text-secondary">Gasto: </span>
          <span className="font-semibold text-cm-text">
            {customer.totalSpent != null ? `S/ ${customer.totalSpent.toFixed(2)}` : '—'}
          </span>
        </div>
        <div>
          <span className="text-cm-text-secondary">Pedidos: </span>
          <span className="font-semibold text-cm-text">{customer.orderCount ?? 0}</span>
        </div>
        <div>
          <span className="text-cm-text-secondary">Puntos: </span>
          <span className="font-semibold text-cm-accent">{customer.points ?? 0}</span>
        </div>
        <div>
          <span className="text-cm-text-secondary">Últ. pedido: </span>
          <span className="text-cm-text">{formatDate(customer.lastOrderAt)}</span>
        </div>
      </div>
      <button
        onClick={() => onSelect(customer)}
        className="mt-3 w-full rounded-lg bg-cm-accent/10 py-2 text-xs font-semibold text-cm-accent transition-colors hover:bg-cm-accent/20"
      >
        Ver perfil
      </button>
    </motion.div>
  );
}

// ── Main Component ──

export default function CustomerTable({
  customers = [],
  page = 1,
  totalPages = 1,
  pageStart = 0,
  pageEnd = 0,
  totalCount = 0,
  sortField = 'lastOrderAt' as SortField,
  sortDir = 'desc' as SortDir,
  onSort = () => {},
  onPage = () => {},
  onSelectCustomer = () => {},
  filters,
  onFilterChange,
  onResetFilters,
  onExportCSV,
  loading = false,
  error = null as string | null,
  onRetry = null as (() => void) | null,
}) {
  const handleSort = (field: string, defaultDir?: string) => {
    if (sortField === field) {
      onSort(field, sortDir === 'asc' ? 'desc' : 'asc');
    } else if (defaultDir) {
      onSort(field, defaultDir);
    }
  };

  // Table columns (shared between desktop skeleton + populated)
  const tableHead = (
    <thead>
      <tr className="border-b border-cm-border bg-cm-bg-alt">
        <th className="w-8 px-2 py-3" />
        {COLUMNS.map((col) => (
          <SortHeader
            key={col.field}
            column={col}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
          />
        ))}
      </tr>
    </thead>
  );

  // ── Error state ──
  if (error) {
    return (
      <div className="rounded-xl border border-cm-border bg-cm-surface shadow-cm-sm">
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <AlertTriangle className="h-10 w-10 text-cm-error" />
          <p className="text-sm font-semibold text-cm-text-secondary">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 rounded-lg bg-cm-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-cm-accent-hover"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-cm-border bg-cm-surface shadow-cm-sm">
        {/* Filters skeleton */}
        <div className="flex flex-wrap items-center gap-3 border-b border-cm-border bg-cm-bg-alt/50 px-4 py-3">
          <div className="h-9 w-48 animate-pulse rounded-lg bg-cm-border" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-cm-border" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-cm-border" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {tableHead}
            <tbody className="divide-y divide-cm-border">
              <SkeletonRows />
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (!customers.length) {
    return (
      <div className="rounded-xl border border-cm-border bg-cm-surface shadow-cm-sm">
        {/* Filters toolbar (even when empty, show it) */}
        <div className="flex flex-wrap items-center gap-3 border-b border-cm-border bg-cm-bg-alt/50 px-4 py-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cm-text-secondary" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={filters?.search || ''}
              onChange={(e) => onFilterChange?.('search', e.target.value)}
              className="w-full rounded-lg border border-cm-border bg-cm-surface py-2 pl-9 pr-3 text-xs text-cm-text placeholder:text-cm-text-secondary focus:border-cm-accent focus:outline-none"
            />
          </div>
          <button
            onClick={onResetFilters}
            className="rounded-lg border border-cm-border px-3 py-2 text-xs font-semibold text-cm-text-secondary transition-colors hover:bg-cm-accent/5"
          >
            Limpiar filtros
          </button>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Users className="h-10 w-10 text-cm-text-tertiary" />
          <p className="text-sm font-semibold text-cm-text-secondary">
            {filters?.search || filters?.tier ? 'Sin resultados para estos filtros' : 'No hay clientes registrados'}
          </p>
          <p className="text-xs text-cm-text-tertiary">
            {filters?.search || filters?.tier
              ? 'Probá con otros términos o limpiá los filtros'
              : 'Los clientes aparecerán cuando realicen su primer pedido'}
          </p>
        </div>
      </div>
    );
  }

  // ── Populated state ──
  return (
    <div className="rounded-xl border border-cm-border bg-cm-surface shadow-cm-sm">
      {/* Filters toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-cm-border bg-cm-bg-alt/50 px-4 py-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cm-text-secondary" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            value={filters?.search || ''}
            onChange={(e) => onFilterChange?.('search', e.target.value)}
            className="w-full rounded-lg border border-cm-border bg-cm-surface py-2 pl-9 pr-3 text-xs text-cm-text placeholder:text-cm-text-secondary focus:border-cm-accent focus:outline-none"
          />
        </div>

        <select
          value={filters?.tier || ''}
          onChange={(e) => onFilterChange?.('tier', e.target.value)}
          className="rounded-lg border border-cm-border bg-cm-surface px-3 py-2 text-xs text-cm-text focus:border-cm-accent focus:outline-none"
        >
          <option value="">Todos los tiers</option>
          {Object.entries(TIER_CONFIG).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <button
          onClick={onResetFilters}
          className="rounded-lg border border-cm-border px-3 py-2 text-xs font-semibold text-cm-text-secondary transition-colors hover:bg-cm-accent/5"
        >
          Limpiar
        </button>

        {onExportCSV && (
          <button
            onClick={onExportCSV}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-cm-accent/10 px-3 py-2 text-xs font-semibold text-cm-accent transition-colors hover:bg-cm-accent/20"
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          {tableHead}
          <tbody className="divide-y divide-cm-border">
            <AnimatePresence>
              {customers.map((customer: Customer) => (
                <CustomerTableRow
                  key={customer.id}
                  customer={customer}
                  isExpanded={false}
                  onToggleExpand={() => {}}
                  onSelect={onSelectCustomer}
                  formatDate={formatDate}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 p-4 md:hidden">
        <AnimatePresence>
          {customers.map((customer: Customer) => (
            <MobileCustomerCard
              key={customer.id}
              customer={customer}
              onSelect={onSelectCustomer}
              formatDate={formatDate}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      <PaginationBar
        page={page}
        totalPages={totalPages}
        pageStart={pageStart}
        pageEnd={pageEnd}
        totalCount={totalCount}
        onPage={onPage}
      />
    </div>
  );
}
