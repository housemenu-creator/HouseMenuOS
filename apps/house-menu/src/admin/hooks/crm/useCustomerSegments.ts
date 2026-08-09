import { useState, useMemo, useCallback, useEffect } from 'react';
import { subscribeCustomers, addCustomerPoints } from '../../../lib/customerService';
import type { Customer } from './useCustomerList';

// ── Types ──

export interface SegmentFilters {
  tiers: string[];           // 'bronze' | 'silver' | 'gold' | 'platinum'
  minSpent: number | null;
  maxSpent: number | null;
  minOrders: number | null;
  recencyDays: number | null; // customers who haven't ordered in X days
}

export interface SavedSegment {
  id: string;
  name: string;
  filters: SegmentFilters;
  createdAt: number;
}

interface BulkResult {
  success: number;
  failed: number;
  errors: string[];
}

interface UseCustomerSegmentsReturn {
  allCustomers: Customer[];
  loading: boolean;

  // Segment builder
  segmentFilters: SegmentFilters;
  setSegmentFilter: (key: keyof SegmentFilters, value: any) => void;
  resetSegmentFilters: () => void;

  // Preview
  segmentCount: number;
  segmentCustomers: Customer[];

  // Saved segments
  savedSegments: SavedSegment[];
  saveSegment: (name: string) => void;
  loadSegment: (segment: SavedSegment) => void;
  deleteSegment: (id: string) => void;

  // Bulk actions
  bulkAddPoints: (points: number) => Promise<BulkResult>;
  bulkExport: () => Customer[];
}

const DEFAULT_FILTERS: SegmentFilters = {
  tiers: [],
  minSpent: null,
  maxSpent: null,
  minOrders: null,
  recencyDays: null,
};

function matchesSegment(c: Customer, filters: SegmentFilters): boolean {
  // Tier
  if (filters.tiers.length > 0) {
    const ct = c.tier || 'bronze';
    if (!filters.tiers.includes(ct)) return false;
  }

  // Spend range
  if (filters.minSpent !== null && (c.totalSpent ?? 0) < filters.minSpent) return false;
  if (filters.maxSpent !== null && (c.totalSpent ?? 0) > filters.maxSpent) return false;

  // Min orders
  if (filters.minOrders !== null && (c.orderCount ?? 0) < filters.minOrders) return false;

  // Recency (customers who haven't ordered in X days)
  if (filters.recencyDays !== null) {
    if (!c.lastOrderAt) return true; // never ordered counts as inactive
    const daysSince = Math.floor((Date.now() - new Date(c.lastOrderAt).getTime()) / 86400000);
    if (daysSince < filters.recencyDays) return false;
  }

  return true;
}

// Try to load saved segments from localStorage
function loadSavedSegments(): SavedSegment[] {
  try {
    const raw = localStorage.getItem('crm_saved_segments');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSavedSegments(segments: SavedSegment[]) {
  try {
    localStorage.setItem('crm_saved_segments', JSON.stringify(segments));
  } catch {}
}

export default function useCustomerSegments(): UseCustomerSegmentsReturn {
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [segmentFilters, setSegmentFilters] = useState<SegmentFilters>({ ...DEFAULT_FILTERS });
  const [savedSegments, setSavedSegments] = useState<SavedSegment[]>(loadSavedSegments);

  // ── Subscribe to customers ──

  useEffect(() => {
    const unsub = subscribeCustomers((data: Customer[]) => {
      setAllCustomers(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Filter setter ──

  const setSegmentFilter = useCallback((key: keyof SegmentFilters, value: any) => {
    setSegmentFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetSegmentFilters = useCallback(() => {
    setSegmentFilters({ ...DEFAULT_FILTERS });
  }, []);

  // ── Preview ──

  const segmentCustomers = useMemo(() => {
    return allCustomers.filter((c) => matchesSegment(c, segmentFilters));
  }, [allCustomers, segmentFilters]);

  const segmentCount = segmentCustomers.length;

  // ── Saved segments ──

  const saveSegment = useCallback(
    (name: string) => {
      const segment: SavedSegment = {
        id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        filters: { ...segmentFilters },
        createdAt: Date.now(),
      };
      const updated = [...savedSegments, segment];
      setSavedSegments(updated);
      persistSavedSegments(updated);
    },
    [segmentFilters, savedSegments],
  );

  const loadSegment = useCallback((segment: SavedSegment) => {
    setSegmentFilters({ ...segment.filters });
  }, []);

  const deleteSegment = useCallback(
    (id: string) => {
      const updated = savedSegments.filter((s) => s.id !== id);
      setSavedSegments(updated);
      persistSavedSegments(updated);
    },
    [savedSegments],
  );

  // ── Bulk actions ──

  const bulkAddPoints = useCallback(
    async (points: number): Promise<BulkResult> => {
      const result: BulkResult = { success: 0, failed: 0, errors: [] };

      for (const customer of segmentCustomers) {
        try {
          await addCustomerPoints(customer.id, points);
          result.success++;
        } catch (err: any) {
          result.failed++;
          result.errors.push(`${customer.name || customer.id}: ${err.message}`);
        }
      }

      return result;
    },
    [segmentCustomers],
  );

  const bulkExport = useCallback((): Customer[] => {
    return segmentCustomers;
  }, [segmentCustomers]);

  return {
    allCustomers,
    loading,
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
  };
}
