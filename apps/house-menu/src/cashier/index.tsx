// Cashier Module — Container
// Orchestrates hooks → passes props to presenter

import { useMemo, useState, useCallback } from 'react';
import { ref, update } from 'firebase/database';
import { realtimeDB } from '@house/db';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { ordersService } from '../lib/ordersService';
import { useSessionState } from './hooks/useSessionState';
import { useOrdersPipeline } from './hooks/useOrdersPipeline';
import { useModalStack } from './hooks/useModalStack';
import { useCatalog } from './hooks/useCatalog';
import { useOrderBuilder } from './hooks/useOrderBuilder';
import { useCustomerSearch } from './hooks/useCustomerSearch';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { printHTML, buildKitchenTicketHTML } from './services/printService';
import { CashierUI } from './components/CashierUI';
import type { OrderPayload } from './types';

export default function CashierView() {
  const { user, logout } = useAuth();
  const { activeBranchId, branches } = useBranch();
  const [searchQuery, setSearchQuery] = useState('');
  const [orderingMode, setOrderingMode] = useState(false);

  const branchId = activeBranchId;
  const userEmail = user?.email || '';
  const branchList = (branches || []) as Array<{ id: string; name: string }>;
  const branchName = branchId
    ? branchList.find(b => b.id === branchId)?.name || 'Sucursal'
    : 'Sin sucursal';

  const sessionState = useSessionState(branchId, userEmail);
  const pipeline = useOrdersPipeline(branchId);
  const modal = useModalStack();
  const catalogState = useCatalog(branchId);
  const orderBuilder = useOrderBuilder();
  const customerSearch = useCustomerSearch();

  // Combine loading from both hooks
  const loading = sessionState.loading || pipeline.loading;

  // Session-scoped orders
  const sessionOrders = useMemo(() => {
    if (!sessionState.session?.openedAt) return [];
    return pipeline.orders.filter(o => {
      const t = o.createdAt ? new Date(o.createdAt).getTime() : 0;
      return t >= sessionState.session!.openedAt;
    });
  }, [pipeline.orders, sessionState.session]);

  // Session duration
  const sessionDuration = useMemo(() => {
    if (!sessionState.session?.openedAt) return null;
    const ms = Date.now() - sessionState.session.openedAt;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }, [sessionState.session]);

  // Filtered orders for search
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return pipeline.orders;
    const q = searchQuery.toLowerCase();
    return pipeline.orders.filter(o =>
      (o.id && o.id.toLowerCase().includes(q)) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.mesa && o.mesa.includes(q))
    );
  }, [pipeline.orders, searchQuery]);

  // Refresh: re-mount key available for future use
  const [, setRefreshKey] = useState(0);
  const handleRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // ── Handlers ──
  const handlePay = async (orderId: string, method: string, discount: Record<string, unknown> | null) => {
    if (!branchId) return { success: false };
    const disc = discount ? { type: String(discount.type), value: Number(discount.value), originalTotal: Number(discount.originalTotal || 0) } : null;
    return await ordersService.markAsPaid(branchId, orderId, method, userEmail, disc);
  };

  const handleCancel = async (orderId: string, reason: string) => {
    if (!branchId) return { success: false };
    return await ordersService.updateOrderStatus(branchId, orderId, 'cancelado', userEmail, reason);
  };

  const handleRefund = async (orderId: string, itemIndices: number[], reason: string) => {
    if (!branchId) return { success: false };
    const order = pipeline.orders.find(o => o.id === orderId);
    if (!order?.items) return { success: false };
    const amount = itemIndices.reduce((sum, i) => {
      const item = order.items![i];
      return sum + (item ? (item.price || 0) * (item.quantity || 1) : 0);
    }, 0);
    return await ordersService.processRefund(branchId, orderId, {
      amount,
      method: order.payment_method || 'Efectivo',
      reason,
      items: itemIndices,
    }, userEmail);
  };

  const handleTransfer = async (orderId: string, targetTable: string) => {
    if (!branchId) return;
    const orderRef = ref(realtimeDB, `branches/${branchId}/orders/${orderId}`);
    await update(orderRef, { mesa: targetTable, updatedAt: new Date().toISOString() });
  };

  const handleVerify = async (orderId: string) => {
    if (!branchId) return { success: false };
    return await ordersService.verifyPayment(branchId, orderId, userEmail);
  };

  const handleSplit = async (orderId: string, splits: Array<{ name: string; items: number[]; method: string }>) => {
    if (!branchId) return { success: false };
    const orderRef = ref(realtimeDB, `branches/${branchId}/orders/${orderId}`);
    await update(orderRef, {
      splits: Object.fromEntries(splits.map((s, i) => [i, { ...s, total: 0, status: 'pending' }])),
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  };

  const handleCreateOrder = useCallback(async (payAfterCreate?: boolean) => {
    if (!branchId) return { success: false, error: 'No hay sucursal activa' };
    if (!sessionState.session?.id) return { success: false, error: 'No active session' };
    try {
      const payload = orderBuilder.buildPayload(sessionState.session.id);
      const result = await pipeline.createOrder(payload);

      if (result.success) {
        // Auto-print kitchen ticket (non-blocking)
        try {
          const ticketHtml = buildKitchenTicketHTML({
            orderId: result.orderId!,
            mesa: orderBuilder.mesa,
            customerName: orderBuilder.customerName,
            items: orderBuilder.items.map(i => ({
              name: i.name,
              quantity: i.quantity,
              details: i.selectedVariation ? [i.selectedVariation.name] : undefined,
            })),
            notes: orderBuilder.notes,
          });
          printHTML(ticketHtml).catch(() => {});
        } catch {
          // print failure is non-critical
        }

        orderBuilder.reset();
        setOrderingMode(false);

        if (payAfterCreate && result.orderId) {
          // Will be handled by CashierUI opening QuickPay
        }
      }

      return result;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al crear pedido' };
    }
  }, [branchId, sessionState.session, orderBuilder, pipeline]);

  const handleCreateOrderPayload = useCallback(async (payload: OrderPayload) => {
    if (!branchId) return { success: false, error: 'No hay sucursal activa' };
    try {
      return await pipeline.createOrder(payload);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al crear pedido' };
    }
  }, [branchId, pipeline]);

  const handleOpenQuickPay = useCallback((orderId: string) => {
    const order = pipeline.orders.find(o => o.id === orderId);
    if (order) {
      modal.open('quickPay', { order });
    }
  }, [pipeline.orders, modal]);

  // Keyboard shortcuts (only active in ordering mode)
  useKeyboardShortcuts(orderingMode, {
    onNewOrder: () => {
      if (!sessionState.session) return;
      setOrderingMode(v => !v);
    },
    onConfirm: () => {
      if (!orderBuilder.isEmpty) {
        handleCreateOrder(false);
      }
    },
    onCancel: () => {
      setOrderingMode(false);
      orderBuilder.reset();
    },
    onProduct: (index) => {
      const products = catalogState.filteredProducts.length > 0
        ? catalogState.filteredProducts
        : catalogState.products;
      if (products[index]) {
        orderBuilder.addItem(products[index]);
      }
    },
  });

  return (
    <CashierUI
      session={sessionState.session}
      allSessions={sessionState.allSessions}
      orders={pipeline.orders}
      sessionOrders={sessionOrders}
      filteredOrders={filteredOrders}
      kpis={pipeline.kpis}
      loading={loading}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      userEmail={userEmail}
      branchName={branchName}
      branchId={branchId}
      sessionDuration={sessionDuration}
      onRefresh={handleRefresh}
      onLogout={logout}
      modal={{
        activeModal: modal.activeModal,
        open: modal.open as (name: string | null, props?: Record<string, unknown>) => void,
        close: modal.close,
      }}
      onPay={handlePay}
      onCancel={handleCancel}
      onRefund={handleRefund}
      onTransfer={handleTransfer}
      onVerify={handleVerify}
      onSplit={handleSplit}
      onOpenSession={sessionState.openSession}
      onCloseSession={sessionState.closeSession}
      catalogState={catalogState}
      orderBuilder={orderBuilder}
      handleCreateOrder={handleCreateOrderPayload}
      onOpenQuickPay={handleOpenQuickPay}
      orderingMode={orderingMode}
      setOrderingMode={setOrderingMode}
      catalog={catalogState}
      customerSearch={customerSearch}
      onHandleCreateOrder={handleCreateOrder}
    />
  );
}
