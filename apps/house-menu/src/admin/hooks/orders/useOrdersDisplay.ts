import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

interface UseOrdersDisplayProps {
  allOrders: any[];
  pageSize?: number;
}

interface UseOrdersDisplayReturn {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  totalCount: number;

  sortField: 'createdAt' | 'total' | 'status' | 'customerName';
  sortDir: 'asc' | 'desc';
  setSort: (field: string) => void;

  displayOrders: any[];

  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  paymentFilter: string;
  setPaymentFilter: (p: string) => void;
  orderTypeFilter: string;
  setOrderTypeFilter: (t: string) => void;
}

function getOrderType(order: any): string {
  const type = order.type || order.order_type || 'local';
  const t = (type ?? '').toLowerCase();
  if (t.includes('pickup') || t.includes('recojo')) return 'pickup';
  if (t.includes('delivery')) return 'delivery';
  return 'local';
}

type SortField = 'createdAt' | 'total' | 'status' | 'customerName';

const VALID_SORT_FIELDS: readonly SortField[] = ['createdAt', 'total', 'status', 'customerName'];

export default function useOrdersDisplay({
  allOrders,
  pageSize = 50,
}: UseOrdersDisplayProps): UseOrdersDisplayReturn {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // ── Reset page to 1 when any filter changes ──
  const filtersKey = `${searchQuery}|${statusFilter}|${paymentFilter}|${orderTypeFilter}`;
  const prevFiltersKey = useRef(filtersKey);
  useEffect(() => {
    if (prevFiltersKey.current !== filtersKey) {
      prevFiltersKey.current = filtersKey;
      setPage(1);
    }
  }, [filtersKey]);

  // ── Sorting toggle ──
  const setSort = useCallback(
    (field: string) => {
      if (field === sortField) {
        setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else if ((VALID_SORT_FIELDS as readonly string[]).includes(field)) {
        setSortField(field as SortField);
        setSortDir('desc');
      }
    },
    [sortField],
  );

  // ── Filter + sort pipeline ──
  const filteredAndSorted = useMemo(() => {
    let result = [...allOrders];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          (o.customerName || '').toLowerCase().includes(q) ||
          (o.id || '').toLowerCase().includes(q) ||
          (o.location || '').toLowerCase().includes(q),
      );
    }

    // Status
    if (statusFilter) {
      result = result.filter((o) => o.status === statusFilter);
    }

    // Payment
    if (paymentFilter) {
      result = result.filter((o) => o.payment_status === paymentFilter);
    }

    // Order type
    if (orderTypeFilter) {
      result = result.filter((o) => getOrderType(o) === orderTypeFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'createdAt': {
          aVal = new Date(a.createdAt || 0).getTime();
          bVal = new Date(b.createdAt || 0).getTime();
          break;
        }
        case 'total': {
          aVal = a.financials?.total ?? a.total ?? 0;
          bVal = b.financials?.total ?? b.total ?? 0;
          break;
        }
        case 'status': {
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        }
        case 'customerName': {
          aVal = (a.customerName || '').toLowerCase();
          bVal = (b.customerName || '').toLowerCase();
          break;
        }
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allOrders, searchQuery, statusFilter, paymentFilter, orderTypeFilter, sortField, sortDir]);

  // ── Derived pagination values ──
  const totalCount = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageStart = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(page * pageSize, totalCount);
  const displayOrders = filteredAndSorted.slice((page - 1) * pageSize, page * pageSize);

  return {
    page,
    setPage,
    totalPages,
    pageStart,
    pageEnd,
    totalCount,
    sortField,
    sortDir,
    setSort,
    displayOrders,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    paymentFilter,
    setPaymentFilter,
    orderTypeFilter,
    setOrderTypeFilter,
  };
}
