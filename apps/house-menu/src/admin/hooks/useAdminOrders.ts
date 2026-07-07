import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ordersService } from '../../lib/ordersService';
import { createNotification } from '../../lib/notificationService';
import { playChime } from '../../lib/notificationSound';
import { confirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastContext';

interface UseAdminOrdersReturn {
  allOrders: any[];
  loading: boolean;
  pendingVerificationCount: number;
  cancelOrder: (orderId: string) => Promise<void>;
}

export function useAdminOrders(activeBranchId: string | null, user: { email?: string } | null, can: (perm: string) => boolean): UseAdminOrdersReturn {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // ── Ref para detectar nuevos pedidos ──
  const prevOrderIdsRef = useRef(new Set<string>());

  // ── Suscripción a órdenes ──
  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = ordersService.subscribeToOrders(activeBranchId, (data: any[]) => {
      setAllOrders(data);
      setLoading(false);

      // Notificar nuevos pedidos
      const prevIds = prevOrderIdsRef.current;
      for (const order of data) {
        if (!order.id || prevIds.has(order.id)) continue;

        // Delivery notifications
        const isDelivery = (order.type || order.order_type || '').toLowerCase().includes('delivery');
        if (isDelivery && (order.status === 'recibido' || order.status === 'listo')) {
          createNotification({
            branchId: activeBranchId,
            userId: user?.email,
            type: 'order_new',
            title: '¡Nuevo pedido delivery!',
            body: `${order.customerName || 'Cliente'} — ${order.location || 'sin dirección'} — S/ ${(order.financials?.total ?? order.total ?? 0).toFixed(2)}`,
            orderId: order.id,
            url: '/admin?tab=orders',
          });
        }

        // Yape/Plin payment pending verification
        if (order.payment_status === 'por_verificar') {
          createNotification({
            branchId: activeBranchId,
            userId: user?.email,
            type: 'order_new',
            title: '💳 Pago por verificar',
            body: `${order.customerName || 'Cliente'} — Yape/Plin S/ ${(order.financials?.total ?? order.total ?? 0).toFixed(2)} — toca para verificar`,
            orderId: order.id,
            url: '/admin?tab=orders',
          });
        }
      }
      prevOrderIdsRef.current = new Set(data.map((o: any) => o.id));
    });
    return unsub;
  }, [activeBranchId]);

  // ── Pedidos pendientes de verificación ──
  const pendingVerificationCount = useMemo(
    () => allOrders.filter((o) => o.payment_status === 'por_verificar').length,
    [allOrders]
  );

  // ── Ref + efecto para chime en nuevos por_verificar ──
  const prevPendingRef = useRef(0);
  useEffect(() => {
    if (prevPendingRef.current > 0 && pendingVerificationCount > prevPendingRef.current) {
      playChime();
    }
    prevPendingRef.current = pendingVerificationCount;
  }, [pendingVerificationCount]);

  // ── Cancelar pedido ──
  const cancelOrder = useCallback(async (orderId: string) => {
    if (!can('orders:cancel')) return;
    if (!(await confirmDialog('¿Estás seguro de cancelar este pedido?'))) return;
    const result = await ordersService.updateOrderStatus(activeBranchId!, orderId, 'cancelado', user?.email);
    if (result.success) {
      showToast('Pedido cancelado');
    } else {
      showToast('Error al cancelar el pedido', 'error');
    }
  }, [activeBranchId, user?.email, can, showToast]);

  return { allOrders, loading, pendingVerificationCount, cancelOrder };
}
