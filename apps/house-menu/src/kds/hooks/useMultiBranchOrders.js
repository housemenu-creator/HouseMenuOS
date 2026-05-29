import { useState, useEffect, useMemo } from 'react';
import { ordersService } from '../../lib/ordersService';

export function useMultiBranchOrders(branches) {
  const [allOrders, setAllOrders] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branches || branches.length === 0) return;

    const unsubs = branches.map((branch) =>
      ordersService.subscribeToOrders(branch.id, (orders) => {
        setAllOrders((prev) => ({ ...prev, [branch.id]: orders }));
      })
    );

    setLoading(false);

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [branches]);

  // Aggregate KPIs per branch and totals
  const summary = useMemo(() => {
    const branchKpis = {};
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalActive = 0;

    Object.entries(allOrders).forEach(([branchId, orders]) => {
      if (!orders) orders = [];
      const completed = orders.filter((o) => o?.status === 'entregado');
      const active = orders.filter((o) => o?.status && o.status !== 'entregado' && o.status !== 'cancelado');
      const revenue = completed.reduce((acc, o) => acc + (o?.financials?.total ?? o?.total ?? 0), 0);
      const branchName = branches.find((b) => b.id === branchId)?.name || branchId;

      branchKpis[branchId] = {
        name: branchName,
        total: orders.length,
        active: active.length,
        completed: completed.length,
        revenue,
        avgTicket: completed.length > 0 ? revenue / completed.length : 0,
      };

      totalOrders += orders.length;
      totalRevenue += revenue;
      totalActive += active.length;
    });

    return { branchKpis, totalOrders, totalRevenue, totalActive };
  }, [allOrders, branches]);

  return { allOrders, summary, loading };
}
