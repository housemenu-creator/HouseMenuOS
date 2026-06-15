import { useEffect, useMemo, useRef } from 'react';
import { cuentaService } from '../../lib/cuentaService';
import useVendedorStore from '../store/vendedorStore';
import useOrderStore from '../../worker/store/orderStore';
import type { Order } from '../../worker/workerTypes';

interface UseVendedorSyncOptions {
  branchId?: string;
}

export function useOrdersByCuentaId(cuentaId: string | null) {
  const orders = useOrderStore((s) => s.orders);
  const orderIndex = useOrderStore((s) => s.orderIndex);

  return useMemo(() => {
    if (!cuentaId) return [];
    return orderIndex
      .map((id) => orders[id])
      .filter((o): o is Order => o != null && (o as any).cuentaId === cuentaId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [cuentaId, orderIndex, orders]);
}

export function useCuentaStats(vendedorEmail: string) {
  const cuentas = useVendedorStore((s) => s.cuentas);
  const orders = useOrderStore((s) => s.orders);
  const orderIndex = useOrderStore((s) => s.orderIndex);

  return useMemo(() => {
    const misCuentas = cuentas.filter((c) => c.assignedVendedor === vendedorEmail);
    const cuentaIds = new Set(misCuentas.map((c) => c.id));

    const pendingOrders = orderIndex.filter((id) => {
      const o = orders[id];
      return o && (o as any).cuentaId && cuentaIds.has((o as any).cuentaId) && o.status !== 'entregado' && o.status !== 'cancelado';
    }).length;

    const totalSales = misCuentas.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const totalCreditUsed = misCuentas.reduce((sum, c) => sum + (c.creditUsed || 0), 0);

    return {
      totalCuentas: misCuentas.length,
      activeCuentas: misCuentas.filter((c) => c.status === 'activa' && c.isActive !== false).length,
      pendingOrders,
      totalSales,
      totalCreditUsed,
    };
  }, [cuentas, vendedorEmail, orders, orderIndex]);
}

export default function useVendedorSync(options?: UseVendedorSyncOptions) {
  const branchId = options?.branchId;
  const applyAdd = useVendedorStore((s) => s.applyAdd);
  const applyChange = useVendedorStore((s) => s.applyChange);
  const applyRemove = useVendedorStore((s) => s.applyRemove);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!branchId) return;

    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    const unsubCuentas = cuentaService.subscribeCuentas(branchId, {
      onAdd: (raw: Record<string, unknown> & { id: string }) => applyAdd(raw),
      onChange: (raw: Record<string, unknown> & { id: string }) => applyChange(raw),
      onRemove: (id: string) => applyRemove(id),
    });

    unsubRef.current = unsubCuentas;

    return () => {
      unsubCuentas();
      useVendedorStore.getState().reset();
    };
  }, [branchId, applyAdd, applyChange, applyRemove]);
}
