import { Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';

const ORDER_TYPE_PILLS = [
  { key: '', label: 'Todos' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'pickup', label: 'Recojo' },
  { key: 'local', label: 'Local' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'recibido', label: 'Recibido' },
  { value: 'preparando', label: 'Preparando' },
  { value: 'listo', label: 'Listo' },
  { value: 'en_camino', label: 'En camino' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const PAYMENT_OPTIONS = [
  { value: '', label: 'Todos los pagos' },
  { value: 'pendiente', label: 'Pendiente de pago' },
  { value: 'por_verificar', label: 'Por verificar' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'reembolsado', label: 'Reembolsado' },
];

function PaginationInfo({ pageStart, pageEnd, totalCount, page, totalPages, onPageChange }) {
  if (totalCount === 0) {
    return <span className="text-xs text-cm-text-secondary font-medium">0 resultados</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-cm-text-secondary font-medium">
        Mostrando {pageStart}–{pageEnd} de {totalCount}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1 rounded text-cm-text-secondary hover:text-cm-text hover:bg-cm-accent/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {generatePageNumbers(page, totalPages).map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-cm-text-tertiary">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[28px] h-7 rounded text-xs font-semibold transition-colors ${
                p === page
                  ? 'bg-cm-accent text-white shadow-cm-sm'
                  : 'text-cm-text-secondary hover:text-cm-text hover:bg-cm-accent/10'
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1 rounded text-cm-text-secondary hover:text-cm-text hover:bg-cm-accent/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function generatePageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...');
    pages.push(total);
  } else if (current >= total - 3) {
    pages.push(1);
    pages.push('...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push('...');
    for (let i = current - 1; i <= current + 1; i++) pages.push(i);
    pages.push('...');
    pages.push(total);
  }
  return pages;
}

export default function OrdersToolbar({
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  paymentFilter,
  onPaymentFilterChange,
  orderTypeFilter,
  onOrderTypeFilterChange,
  totalCount,
  page,
  totalPages,
  onPageChange,
  pageStart,
  pageEnd,
  onExportCSV,
  allOrders,
  branchName,
}) {
  return (
    <div className="space-y-3">
      {/* ── Top row: search + filters + export ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar por cliente, ID o ubicación..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text placeholder:text-cm-text-tertiary focus:outline-none focus:border-cm-accent transition-colors"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Payment filter */}
        <select
          value={paymentFilter}
          onChange={(e) => onPaymentFilterChange(e.target.value)}
          className="px-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
        >
          {PAYMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Export CSV */}
        {onExportCSV && (
          <button
            onClick={() => onExportCSV(allOrders, branchName)}
            className="flex items-center gap-2 px-3 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        )}
      </div>

      {/* ── Order type pills ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        {ORDER_TYPE_PILLS.map((pill) => (
          <button
            key={pill.key}
            onClick={() => onOrderTypeFilterChange(pill.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              orderTypeFilter === pill.key
                ? 'bg-cm-accent text-white shadow-cm-sm'
                : 'bg-cm-surface border border-cm-border text-cm-text-secondary hover:bg-cm-accent/5'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* ── Bottom row: pagination ── */}
      <div className="flex items-center justify-between">
        <PaginationInfo
          pageStart={pageStart}
          pageEnd={pageEnd}
          totalCount={totalCount}
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
