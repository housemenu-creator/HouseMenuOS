// useCustomerSearch — CRM customer autocomplete
// Subscribes to all customers, filters by name/phone/email with debounce

import { useState, useEffect, useMemo, useCallback } from 'react';
import { subscribeCustomers } from '../../lib/customerService';

export interface CustomerResult {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  mesa?: string;
  totalSpent?: number;
  totalOrders?: number;
  [key: string]: unknown;
}

interface CustomerSearchState {
  query: string;
  results: CustomerResult[];
  loading: boolean;
  isOpen: boolean;
}

const DEBOUNCE_MS = 300;

export function useCustomerSearch() {
  const [allCustomers, setAllCustomers] = useState<CustomerResult[]>([]);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Subscribe to all customers once
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeCustomers((customers: CustomerResult[]) => {
      setAllCustomers(customers);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Debounced filtered results
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return allCustomers
      .filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      )
      .slice(0, 10); // Max 10 results
  }, [allCustomers, query]);

  const setQueryDebounced = useCallback((value: string) => {
    setQuery(value);
    setIsOpen(value.trim().length > 0);
  }, []);

  const selectCustomer = useCallback((customer: CustomerResult) => {
    setQuery(customer.name || '');
    setIsOpen(false);
    return {
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      mesa: customer.mesa || '',
    };
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    query,
    setQuery: setQueryDebounced,
    results,
    loading,
    isOpen,
    setIsOpen,
    selectCustomer,
    closeSearch,
  };
}
