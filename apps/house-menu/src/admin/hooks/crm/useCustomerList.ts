import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { subscribeCustomers } from '../../../lib/customerService';

// ── Types ──

export interface Customer {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  totalSpent?: number;
  orderCount?: number;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  points?: number;
  lifetimePoints?: number;
  redeemedPoints?: number;
  createdAt?: string | number;
  lastOrderAt?: string | number;
  referralCode?: string;
  referredBy?: string;
  referralsCount?: number;
  bestStreak?: number;
  currentStreak?: number;
  [key: string]: any;
}

export type SortField = 'name' | 'email' | 'totalSpent' | 'orderCount' | 'tier' | 'lastOrderAt' | 'points';
export type SortDir = 'asc' | 'desc';

export interface CustomerFilters {
  tier: string;
  minSpent: string;
  maxSpent: string;
  search: string;
  dateFrom: string;
  dateTo: string;
}

const VALID_SORT_FIELDS: readonly SortField[] = [
  'name', 'email', 'totalSpent', 'orderCount', 'tier', 'lastOrderAt', 'points',
];

interface UseCustomerListReturn {
  // Customers data
  allCustomers: Customer[];
  loading: boolean;
  error: string | null;
  retry: () => void;

  // Pagination
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  totalCount: number;

  // Sorting
  sortField: SortField;
  sortDir: SortDir;
  setSort: (field: string) => void;

  // Filters
  filters: CustomerFilters;
  setFilter: (key: keyof CustomerFilters, value: string) => void;
  resetFilters: () => void;

  // Filtered + sorted + paginated output
  displayCustomers: Customer[];

  // Export
  filteredCustomers: Customer[];
}

const DEFAULT_FILTERS: CustomerFilters = {
  tier: '',
  minSpent: '',
  maxSpent: '',
  search: '',
  dateFrom: '',
  dateTo: '',
};

function getFieldValue(c: Customer, field: SortField): any {
  switch (field) {
    case 'name': return (c.name || '').toLowerCase();
    case 'email': return (c.email || '').toLowerCase();
    case 'totalSpent': return c.totalSpent ?? 0;
    case 'orderCount': return c.orderCount ?? 0;
    case 'tier': return c.tier || 'bronze';
    case 'lastOrderAt': return c.lastOrderAt ? new Date(c.lastOrderAt).getTime() : 0;
    case 'points': return c.points ?? 0;
    default: return '';
  }
}

const TIER_ORDER: Record<string, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4 };

export default function useCustomerList(pageSize = 50): UseCustomerListReturn {
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('lastOrderAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filters, setFilters] = useState<CustomerFilters>({ ...DEFAULT_FILTERS });

  const unsubRef = useRef<(() => void) | null>(null);

  const subscribe = useCallback(() => {
    setLoading(true);
    setError(null);

    if (unsubRef.current) {
      unsubRef.current();
    }

    try {
      unsubRef.current = subscribeCustomers((data: Customer[]) => {
        setAllCustomers(data);
        setLoading(false);
      });
    } catch (err: any) {
      setError(err.message || 'Error al cargar clientes');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    subscribe();
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [subscribe]);

  // Reset page when filters change
  const filtersKey = `${filters.tier}|${filters.minSpent}|${filters.maxSpent}|${filters.search}|${filters.dateFrom}|${filters.dateTo}`;
  const prevFiltersKey = useRef(filtersKey);
  useEffect(() => {
    if (prevFiltersKey.current !== filtersKey) {
      prevFiltersKey.current = filtersKey;
      setPage(1);
    }
  }, [filtersKey]);

  // ── Filter pipeline ──

  const filteredCustomers = useMemo(() => {
    let result = [...allCustomers];

    // Search (name, email, phone)
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.phone || '').includes(q),
      );
    }

    // Tier
    if (filters.tier) {
      result = result.filter((c) => (c.tier || 'bronze') === filters.tier);
    }

    // Spend range
    if (filters.minSpent) {
      const min = Number(filters.minSpent);
      if (!isNaN(min)) result = result.filter((c) => (c.totalSpent ?? 0) >= min);
    }
    if (filters.maxSpent) {
      const max = Number(filters.maxSpent);
      if (!isNaN(max)) result = result.filter((c) => (c.totalSpent ?? 0) <= max);
    }

    // Date range (lastOrderAt)
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom).getTime();
      if (!isNaN(from)) result = result.filter((c) => c.lastOrderAt ? new Date(c.lastOrderAt).getTime() >= from : false);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo).setHours(23, 59, 59, 999);
      if (!isNaN(to)) result = result.filter((c) => c.lastOrderAt ? new Date(c.lastOrderAt).getTime() <= to : false);
    }

    return result;
  }, [allCustomers, filters]);

  // ── Sort ──

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

  const sortedCustomers = useMemo(() => {
    const result = [...filteredCustomers];
    result.sort((a, b) => {
      let aVal = getFieldValue(a, sortField);
      let bVal = getFieldValue(b, sortField);

      // Special handling for tier
      if (sortField === 'tier') {
        aVal = TIER_ORDER[aVal] ?? 0;
        bVal = TIER_ORDER[bVal] ?? 0;
      }

      // Nulls last
      if (aVal === null || aVal === undefined || aVal === 0 || aVal === '') {
        // Only treat as null if truly empty, not for actual values
        if (sortField === 'lastOrderAt' && !a.lastOrderAt) return sortDir === 'asc' ? 1 : -1;
        if (sortField === 'name' && !a.name) return sortDir === 'asc' ? 1 : -1;
        if (sortField === 'email' && !a.email) return sortDir === 'asc' ? 1 : -1;
      }
      if (bVal === null || bVal === undefined || bVal === 0 || bVal === '') {
        if (sortField === 'lastOrderAt' && !b.lastOrderAt) return sortDir === 'asc' ? -1 : 1;
        if (sortField === 'name' && !b.name) return sortDir === 'asc' ? -1 : 1;
        if (sortField === 'email' && !b.email) return sortDir === 'asc' ? -1 : 1;
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [filteredCustomers, sortField, sortDir]);

  // ── Pagination ──

  const totalCount = sortedCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageStart = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(page * pageSize, totalCount);
  const displayCustomers = sortedCustomers.slice((page - 1) * pageSize, page * pageSize);

  // ── Filter helpers ──

  const setFilter = useCallback((key: keyof CustomerFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  const retry = useCallback(() => {
    subscribe();
  }, [subscribe]);

  return {
    allCustomers,
    loading,
    error,
    retry,
    page,
    setPage,
    totalPages,
    pageStart,
    pageEnd,
    totalCount,
    sortField,
    sortDir,
    setSort,
    filters,
    setFilter,
    resetFilters,
    displayCustomers,
    filteredCustomers,
  };
}
