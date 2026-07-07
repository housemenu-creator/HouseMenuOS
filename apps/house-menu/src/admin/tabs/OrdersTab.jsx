import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Printer, DollarSign, ShieldCheck, X, Loader2,
  ChevronDown, ChevronUp
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { ordersService } from '../../lib/ordersService';
import { formatCurrency, formatOrderId } from '../../lib/format';
import { useToast } from '../../components/ToastContext';
import { confirmDialog } from '../../components/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import OrdersToolbar from '../components/orders/OrdersToolbar';
import OrdersTable from '../components/orders/OrdersTable';
import OrderDetailPanel from '../components/orders/OrderDetailPanel';
import QuickStatusActions from '../components/orders/QuickStatusActions';
import CobrarModal from '../components/orders/CobrarModal';
import VerifyPaymentModal from '../components/orders/VerifyPaymentModal';
import useOrdersDisplay from '../hooks/orders/useOrdersDisplay';
import useKeyboardNav from '../hooks/orders/useKeyboardNav';
import EditOrderModal from '../components/orders/EditOrderModal';
import NotesModal from '../components/orders/NotesModal';
import RefundModal from '../components/orders/RefundModal';

function ItemRow({ item, index }) {
  const qty = Number(item.quantity || 1);
  const price = Number(item.price || 0);
  return (
    <tr key={index} className="border-b border-cm-border/50 last:border-0">
      <td className="py-2 text-sm text-cm-text">{item.name}</td>
      <td className="py-2 text-sm text-cm-text-secondary text-center">x{qty}</td>
      <td className="py-2 text-sm text-cm-text-secondary">{item.details?.join(', ') || '-'}</td>
      <td className="py-2 text-sm text-cm-text text-right font-medium">{formatCurrency(price)}</td>
      <td className="py-2 text-sm text-cm-text text-right font-semibold">{formatCurrency((qty * price))}</td>
    </tr>
  );
}

export default function OrdersTab({ allOrders, searchQuery, onSearchQueryChange, statusFilter, onStatusFilterChange, paymentFilter, onPaymentFilterChange, filteredOrders, onCancelOrder, exportToCSV, activeBranchId, activeBranchName }) {
  const { can, user } = useAuth();
  const { showToast } = useToast();
  const [expandedId, setExpandedId] = useState(null);
  const [showCobrarModal, setShowCobrarModal] = useState(false);
  const [cobrarOrder, setCobrarOrder] = useState(null);
  const [cobrarMethod, setCobrarMethod] = useState('Efectivo');
  const [cobrarLoading, setCobrarLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesOrder, setNotesOrder] = useState(null);
  const [notesSaving, setNotesSaving] = useState(false);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundOrder, setRefundOrder] = useState(null);
  const [refundProcessing, setRefundProcessing] = useState(false);

  // Yape/Plin verification modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyOrder, setVerifyOrder] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);

  const {
    displayOrders, page, setPage, totalPages, pageStart, pageEnd, totalCount,
    sortField, sortDir, setSort,
    searchQuery: localSearch, setSearchQuery: setLocalSearch,
    statusFilter: localStatus, setStatusFilter: setLocalStatus,
    paymentFilter: localPayment, setPaymentFilter: setLocalPayment,
    orderTypeFilter, setOrderTypeFilter,
  } = useOrdersDisplay({ allOrders });

  const { highlightedIndex, handleKeyDown } = useKeyboardNav({
    orderIds: displayOrders.map(o => o.id),
    expandedId,
    onExpand: (id) => setExpandedId(expandedId === id ? null : id),
    onStatusChange: (orderId, status) => handleQuickStatus(orderId, status),
  });

  const handleQuickStatus = async (orderId, newStatus) => {
    if (newStatus === 'cancelado') {
      await onCancelOrder(orderId);
      return;
    }
    const r = await ordersService.updateOrderStatus(activeBranchId, orderId, newStatus, user?.email);
    if (r.success) showToast(`Estado actualizado`);
    else showToast('Error al actualizar estado', 'error');
  };

  const renderDetailPanel = (order) => (
    <OrderDetailPanel
      order={order}
      branchId={activeBranchId}
      can={can}
      onStatusChange={handleQuickStatus}
      onEdit={() => openEdit(order)}
      onNotes={() => openNotes(order)}
      onPrint={() => printOrder(order)}
      onRefund={() => openRefund(order)}
      onCobrar={() => { setCobrarOrder(order); setCobrarMethod('Efectivo'); setShowCobrarModal(true); }}
      onVerify={() => { setVerifyOrder(order); setShowVerifyModal(true); setShowRejectInput(false); setRejectReason(''); }}
    />
  );

  const handleVerifyPayment = async () => {
    if (!verifyOrder || !activeBranchId) return;
    setVerifyLoading(true);
    try {
      const r = await ordersService.verifyPayment(activeBranchId, verifyOrder.id, user?.email);
      if (r.success) { setShowVerifyModal(false); showToast('Pago verificado — pedido enviado a cocina'); }
      else showToast('Error al verificar pago', 'error');
    } catch (err) {
      showToast(err.message || 'Error al verificar pago', 'error');
    }
    setVerifyLoading(false);
  };

  const handleRejectPayment = async () => {
    if (!verifyOrder || !activeBranchId) return;
    setRejectLoading(true);
    try {
      const r = await ordersService.rejectPayment(activeBranchId, verifyOrder.id, rejectReason, user?.email);
      if (r.success) {
        setShowVerifyModal(false);
        setShowRejectInput(false);
        setRejectReason('');
        showToast('Pago rechazado — pendiente');
      } else showToast('Error al rechazar pago', 'error');
    } catch (err) {
      showToast(err.message || 'Error al rechazar pago', 'error');
    }
    setRejectLoading(false);
  };

  const handleCobrar = async () => {
    if (!cobrarOrder || !activeBranchId) return;
    setCobrarLoading(true);
    try {
      const r = await ordersService.markAsPaid(activeBranchId, cobrarOrder.id, cobrarMethod, user?.email);
      if (r.success) { setShowCobrarModal(false); showToast('Cobro registrado'); }
      else showToast('Error al cobrar', 'error');
    } catch (err) {
      showToast(err.message || 'Error al cobrar', 'error');
    }
    setCobrarLoading(false);
  };

  const openEdit = (order) => {
    setEditOrder(order);
    setShowEditModal(true);
  };

  const handleEditSave = async (items, total) => {
    if (!editOrder || !activeBranchId) return;
    setEditSaving(true);
    try {
      const subtotal = items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);
      const financials = {
        ...editOrder.financials,
        subtotal,
        total: subtotal + (editOrder.financials?.deliveryFee || 0) + (editOrder.financials?.packaging_total || 0),
      };
      const r = await ordersService.updateOrderItems(activeBranchId, editOrder.id, { items, financials, total: financials.total }, user?.email);
      if (r.success) {
        setShowEditModal(false);
        setEditOrder(null);
        showToast('Cambios guardados');
      } else {
        showToast('Error al guardar cambios', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error al guardar cambios', 'error');
    }
    setEditSaving(false);
  };

  const openNotes = (order) => {
    setNotesOrder(order);
    setShowNotesModal(true);
  };

  const handleNotesSave = async (text) => {
    if (!notesOrder || !activeBranchId) return;
    setNotesSaving(true);
    try {
      const r = await ordersService.addOrderNote(activeBranchId, notesOrder.id, text, user?.email);
      if (r.success) { setShowNotesModal(false); showToast('Nota guardada'); }
      else showToast('Error al guardar nota', 'error');
    } catch (err) {
      showToast(err.message || 'Error al guardar nota', 'error');
    }
    setNotesSaving(false);
  };

  const openRefund = (order) => {
    setRefundOrder(order);
    setShowRefundModal(true);
  };

  const handleRefundConfirm = async ({ amount, method, reason }) => {
    if (!refundOrder || !activeBranchId) return;
    if (!(await confirmDialog(`Procesar reembolso de ${formatCurrency(amount)} para ${formatOrderId(refundOrder.id)}?`))) return;
    setRefundProcessing(true);
    try {
      const r = await ordersService.processRefund(activeBranchId, refundOrder.id, { amount, method, reason }, user?.email);
      if (r.success) { setShowRefundModal(false); showToast('Reembolso procesado'); }
      else showToast('Error al procesar reembolso', 'error');
    } catch (err) {
      showToast(err.message || 'Error al procesar reembolso', 'error');
    }
    setRefundProcessing(false);
  };

  const printOrder = (order) => {
    const itemsHtml = (order.items || []).map(i => `
      <tr>
        <td style="padding:4px 8px">${i.name}${i.details?.length ? '<br><small>' + i.details.join(', ') + '</small>' : ''}</td>
        <td style="padding:4px 8px;text-align:center">x${Number(i.quantity || 1)}</td>
        <td style="padding:4px 8px;text-align:right">S/ ${(Number(i.price || 0) * Number(i.quantity || 1)).toFixed(2)}</td>
      </tr>
    `).join('');

    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html><head><title>Comanda #${(order.id || '').slice(-4).toUpperCase()}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0; padding: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th { border-bottom: 1px dashed #000; text-align: left; padding: 4px 8px; font-size: 11px; }
        h2 { text-align: center; margin: 0 0 4px; }
        .header { text-align: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #000; }
        .footer { text-align: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #000; font-size: 10px; }
      </style></head><body>
        <div class="header">
          <h2>${activeBranchName}</h2>
          <small>${new Date(order.createdAt).toLocaleString('es-PE')}</small><br>
          <small>${order.customerName || 'Anonimo'}${order.location ? ' — ' + order.location : ''}</small>
        </div>
        <table>
          <thead><tr><th>Producto</th><th style="text-align:center">Cant</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="footer">
          <strong>Total: S/ ${(order.financials?.total || order.total || 0).toFixed(2)}</strong><br>
          ${order.payment_method ? '<small>Pago: ' + order.payment_method + '</small>' : ''}
        </div>
        <script>window.print();window.close();</script>
      </body></html>
    `);
    printWin.document.close();
  };

  const canRefund = (order) => order.payment_status === 'pagado' && !order.refund;
  const canEdit = (order) => order.status !== 'cancelado' && order.status !== 'entregado';

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Header + Toolbar */}
      <OrdersToolbar
        searchQuery={localSearch}
        onSearchQueryChange={setLocalSearch}
        statusFilter={localStatus}
        onStatusFilterChange={setLocalStatus}
        paymentFilter={localPayment}
        onPaymentFilterChange={setLocalPayment}
        orderTypeFilter={orderTypeFilter}
        onOrderTypeFilterChange={setOrderTypeFilter}
        totalCount={totalCount}
        page={page}
        totalPages={totalPages}
        pageStart={pageStart}
        pageEnd={pageEnd}
        onPageChange={setPage}
        onExportCSV={() => exportToCSV(allOrders, activeBranchName)}
        allOrders={allOrders}
        branchName={activeBranchName}
      />

      {/* Orders Table */}
      <OrdersTable
        orders={displayOrders}
        expandedId={expandedId}
        onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
        sortField={sortField}
        sortDir={sortDir}
        onSort={setSort}
        highlightedIndex={highlightedIndex}
        renderDetailPanel={renderDetailPanel}
        can={can}
      />

      {/* Modals */}
      <CobrarModal
        isOpen={showCobrarModal}
        order={cobrarOrder}
        onClose={() => setShowCobrarModal(false)}
        onConfirm={async (orderId, method) => {
          setCobrarLoading(true);
          const r = await ordersService.markAsPaid(activeBranchId, orderId, method, user?.email);
          setCobrarLoading(false);
          if (r.success) { setShowCobrarModal(false); showToast('Cobro registrado'); }
          else showToast('Error al cobrar', 'error');
        }}
        loading={cobrarLoading}
      />

      <VerifyPaymentModal
        isOpen={showVerifyModal}
        order={verifyOrder}
        onClose={() => setShowVerifyModal(false)}
        onConfirm={handleVerifyPayment}
        onReject={handleRejectPayment}
        confirmLoading={verifyLoading}
        rejectLoading={rejectLoading}
      />

      <EditOrderModal
        isOpen={showEditModal}
        order={editOrder}
        onClose={() => setShowEditModal(false)}
        onSave={async (items, total) => {
          setEditSaving(true);
          const r = await ordersService.updateOrderItems(activeBranchId, editOrder.id, { items, financials: { ...editOrder.financials, total }, total }, user?.email);
          setEditSaving(false);
          if (r.success) { setShowEditModal(false); setEditOrder(null); showToast('Cambios guardados'); }
          else showToast('Error al guardar cambios', 'error');
        }}
        saving={editSaving}
      />

      <NotesModal
        isOpen={showNotesModal}
        order={notesOrder}
        onClose={() => setShowNotesModal(false)}
        onSave={async (text) => {
          setNotesSaving(true);
          const r = await ordersService.addOrderNote(activeBranchId, notesOrder.id, text, user?.email);
          setNotesSaving(false);
          if (r.success) { setShowNotesModal(false); showToast('Nota guardada'); }
          else showToast('Error al guardar nota', 'error');
        }}
        saving={notesSaving}
      />

      <RefundModal
        isOpen={showRefundModal}
        order={refundOrder}
        onClose={() => setShowRefundModal(false)}
        onConfirm={async ({ amount, method, reason }) => {
          if (!(await confirmDialog(`Procesar reembolso de ${formatCurrency(amount)} para ${formatOrderId(refundOrder.id)}?`))) return;
          setRefundProcessing(true);
          const r = await ordersService.processRefund(activeBranchId, refundOrder.id, { amount, method, reason }, user?.email);
          setRefundProcessing(false);
          if (r.success) { setShowRefundModal(false); showToast('Reembolso procesado'); }
          else showToast('Error al procesar reembolso', 'error');
        }}
        processing={refundProcessing}
      />
    </div>
  );
}
