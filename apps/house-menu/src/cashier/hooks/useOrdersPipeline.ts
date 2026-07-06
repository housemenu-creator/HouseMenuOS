import { useState, useEffect, useCallback, useRef } from 'react';
import { ordersService } from '../../lib/ordersService';
import type { Order, OrderKPIs } from '../types';

interface OrdersState {
  orders: Order[];
  loading: boolean;
  error: string | null;
}

function computeKPIs(orders: Order[], _branchId: string | null): OrderKPIs {
  const paid = orders.filter(
    (o) => o.payment_status === 'pagado' || o.payment_status === 'partial'
  );
  const cancelled = orders.filter((o) => o.status === 'cancelado');

  const totalEfectivo = paid
    .filter((o) => o.payment_method === 'Efectivo')
    .reduce((sum, o) => sum + (o.financials?.total || 0), 0);
  const totalYapePlin = paid
    .filter((o) => o.payment_method === 'Yape/Plin')
    .reduce((sum, o) => sum + (o.financials?.total || 0), 0);
  const totalPos = paid
    .filter((o) => o.payment_method === 'Tarjeta (POS)')
    .reduce((sum, o) => sum + (o.financials?.total || 0), 0);
  const totalIngresos = totalEfectivo + totalYapePlin + totalPos;

  const totalPendiente = orders
    .filter((o) => o.payment_status === 'pendiente')
    .reduce((sum, o) => sum + (o.financials?.total || 0), 0);

  const totalPorVerificar = orders
    .filter((o) => o.payment_status === 'por_verificar')
    .reduce((sum, o) => sum + (o.financials?.total || 0), 0);

  const porVerificar = orders.filter((o) => o.payment_status === 'por_verificar');
  const pendingOrders = orders.filter((o) => o.payment_status === 'pendiente');

  const paidCount = paid.length;
  const cancelledCount = cancelled.length;
  const averageTicket = paidCount > 0 ? totalIngresos / paidCount : 0;

  return {
    totalEfectivo,
    totalYapePlin,
    totalPos,
    totalPendiente,
    totalPorVerificar,
    totalIngresos,
    expectedCash: totalEfectivo,
    porVerificar,
    pendingOrders,
    paidCount,
    cancelledCount,
    averageTicket,
  };
}

export function useOrdersPipeline(branchId: string | null) {
  const [state, setState] = useState<OrdersState>({
    orders: [],
    loading: true,
    error: null,
  });
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!branchId) {
      setState({ orders: [], loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    const unsub = ordersService.subscribeToOrders(branchId, (orders: Order[]) => {
      setState({ orders, loading: false, error: null });
    });
    unsubRef.current = unsub;

    return () => {
      unsub();
      unsubRef.current = null;
    };
  }, [branchId]);

  const createOrder = useCallback(
    async (orderData: Record<string, unknown>) => {
      if (!branchId) return { success: false as const, error: 'No branch selected' };
      const result = await ordersService.createOrder(branchId, orderData, 'cashier');
      return result as { success: boolean; orderId?: string; error?: string };
    },
    [branchId]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: string, userEmail: string, cancelReason?: string) => {
      if (!branchId) return { success: false as const, error: 'No branch selected' };
      const result = await ordersService.updateOrderStatus(branchId, orderId, newStatus, userEmail, cancelReason);
      return result as { success: boolean; error?: string };
    },
    [branchId]
  );

  const markAsPaid = useCallback(
    async (orderId: string, paymentMethod: string, userEmail: string, discount?: Record<string, unknown>) => {
      if (!branchId) return { success: false as const, error: 'No branch selected' };
      const result = await ordersService.markAsPaid(branchId, orderId, paymentMethod, userEmail, discount);
      return result as { success: boolean; error?: string };
    },
    [branchId]
  );

  const processRefund = useCallback(
    async (orderId: string, refundData: { amount: number; method: string; reason: string }) => {
      if (!branchId) return { success: false as const, error: 'No branch selected' };
      const result = await ordersService.processRefund(branchId, orderId, refundData, 'cashier');
      return result as { success: boolean; error?: string };
    },
    [branchId]
  );

  const getOrder = useCallback(
    async (orderId: string) => {
      if (!branchId) return null;
      const result = await ordersService.getOrder(branchId, orderId);
      return result as Order | null;
    },
    [branchId]
  );

  const kpis = computeKPIs(state.orders, branchId);

  return {
    orders: state.orders,
    kpis,
    loading: state.loading,
    error: state.error,
    createOrder,
    updateOrderStatus,
    markAsPaid,
    processRefund,
    getOrder,
  };
}
