import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Printer, DollarSign, ShieldCheck, X, Loader2,
  ChevronDown, ChevronUp, ShoppingBag, AlertTriangle, RefreshCw,
  TrendingUp, Clock, Package
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
import CobrarModal from '../components/orders/CobrarModal';
import VerifyPaymentModal from '../components/orders/VerifyPaymentModal';
import useOrdersDisplay from '../hooks/orders/useOrdersDisplay';
import useKeyboardNav from '../hooks/orders/useKeyboardNav';
import EditOrderModal from '../../components/EditOrderModal';
import NotesModal from '../components/orders/NotesModal';
import RefundModal from '../components/orders/RefundModal';
import { printOrderTicket } from '../../lib/printTicket';

// ── Animated Counter ──
function AnimatedCounter({ value, prefix = '', decimals = 2, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  const startTime = useRef(null);
  const from = useRef(0);

  useEffect(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    from.current = display;
    startTime.current = null;
    const step = (ts) => {
      if (!startTime.current) startTime.current = ts;
      const elapsed = ts - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(from.current + (value - from.current) * eased);
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);

  return <>{prefix}{display.toFixed(decimals)}</>;
}

function IntCounter({ value }) { return <AnimatedCounter value={value} decimals={0} duration={600} />; }

// ── Constantes ──
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

// ── Print helper (engine-first, fallback browser) ──
function printOrder(order, branchName) {
  printOrderTicket(order, branchName).then(r => {
    if (r?.engine) return;
    // Fallback: browser print
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Comanda #${(order.id || '').slice(-4).toUpperCase()}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0; padding: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th { border-bottom: 1px dashed #000; text-align: left; padding: 4px 8px; font-size: 11px; }
        h2 { text-align: center; margin: 0 0 4px; }
        .header { text-align: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #000; }
        .footer { text-align: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #000; font-size: 10px; }
      </style></head><body>
        <div class="header"><h2>${branchName}</h2>
          <small>${new Date(order.createdAt).toLocaleString('es-PE')}</small><br>
          <small>${order.customerName || 'Anonimo'}${order.location ? ' — ' + order.location : ''}</small>
        </div>
        <table><thead><tr><th>Producto</th><th style="text-align:center">Cant</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${(order.items || []).map(i => `
          <tr>
            <td style="padding:4px 8px">${i.name}${i.details?.length ? '<br><small>' + i.details.join(', ') + '</small>' : ''}</td>
            <td style="padding:4px 8px;text-align:center">x${Number(i.quantity || 1)}</td>
            <td style="padding:4px 8px;text-align:right">S/ ${(Number(i.price || 0) * Number(i.quantity || 1)).toFixed(2)}</td>
          </tr>`).join('')}</tbody></table>
        <div class="footer">
          <strong>Total: S/ ${(order.financials?.total || order.total || 0).toFixed(2)}</strong><br>
          ${order.payment_method ? '<small>Pago: ' + order.payment_method + '</small>' : ''}
        </div>
        <script>window.print();window.close();</script>
      </body></html>
    `);
    win.document.close();
  });
}

export default function OrdersTab({
  allOrders, searchQuery, onSearchQueryChange, statusFilter, onStatusFilterChange,
  paymentFilter, onPaymentFilterChange, filteredOrders, onCancelOrder,
  exportToCSV, activeBranchId, activeBranchName
}) {
  const { can, user } = useAuth();
  const { showToast } = useToast();
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState(null);
  const [showCobrarModal, setShowCobrarModal] = useState(false);
  const [cobrarOrder, setCobrarOrder] = useState(null);
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

  // ── Stats ──
  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayOrders = (allOrders || []).filter(o => {
      try { return new Date(o.createdAt).toDateString() === todayStr; }
      catch { return false; }
    });
    const revenue = todayOrders.reduce((s, o) => s + ((o.financials?.total || o.total || 0) - (o.refund?.amount || 0)), 0);
    const pendingCount = todayOrders.filter(o => o.status === 'pendiente' || o.status === 'en preparacion').length;
    const avgTicket = todayOrders.length > 0 ? revenue / todayOrders.length : 0;
    return { count: todayOrders.length, revenue, pendingCount, avgTicket };
  }, [allOrders]);

  // ── Handlers ──
  const handleQuickStatus = useCallback(async (orderId, newStatus) => {
    try {
      if (newStatus === 'cancelado') { await onCancelOrder(orderId); return; }
      const r = await ordersService.updateOrderStatus(activeBranchId, orderId, newStatus, user?.email);
      if (r.success) showToast('Estado actualizado');
      else showToast('Error al actualizar estado', 'error');
    } catch (e) { showToast(e.message, 'error'); }
  }, [activeBranchId, onCancelOrder, showToast, user?.email]);

  const handleVerifyPayment = useCallback(async () => {
    if (!verifyOrder || !activeBranchId) return;
    setVerifyLoading(true);
    try {
      const r = await ordersService.verifyPayment(activeBranchId, verifyOrder.id, user?.email);
      if (r.success) { setShowVerifyModal(false); showToast('Pago verificado'); }
      else showToast('Error al verificar pago', 'error');
    } catch (err) { showToast(err.message, 'error'); }
    setVerifyLoading(false);
  }, [verifyOrder, activeBranchId, user?.email, showToast]);

  const handleRejectPayment = useCallback(async () => {
    if (!verifyOrder || !activeBranchId) return;
    setRejectLoading(true);
    try {
      const r = await ordersService.rejectPayment(activeBranchId, verifyOrder.id, rejectReason, user?.email);
      if (r.success) { setShowVerifyModal(false); setShowRejectInput(false); setRejectReason(''); showToast('Pago rechazado'); }
      else showToast('Error al rechazar pago', 'error');
    } catch (err) { showToast(err.message, 'error'); }
    setRejectLoading(false);
  }, [verifyOrder, activeBranchId, rejectReason, user?.email, showToast]);

  const handleCobrar = useCallback(async () => {
    if (!cobrarOrder || !activeBranchId) return;
    setCobrarLoading(true);
    try {
      const r = await ordersService.markAsPaid(activeBranchId, cobrarOrder.id, 'Efectivo', user?.email);
      if (r.success) { setShowCobrarModal(false); showToast('Cobro registrado'); }
      else showToast('Error al cobrar', 'error');
    } catch (err) { showToast(err.message, 'error'); }
    setCobrarLoading(false);
  }, [cobrarOrder, activeBranchId, user?.email, showToast]);

  const handleEditSave = useCallback(async (items, total) => {
    if (!editOrder || !activeBranchId) return;
    setEditSaving(true);
    try {
      const subtotal = items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);
      const financials = { ...editOrder.financials, subtotal, total: subtotal + (editOrder.financials?.deliveryFee || 0) + (editOrder.financials?.packaging_total || 0) };
      const r = await ordersService.updateOrderItems(activeBranchId, editOrder.id, { items, financials, total: financials.total }, user?.email);
      if (r.success) { setShowEditModal(false); setEditOrder(null); showToast('Cambios guardados'); }
      else showToast('Error al guardar cambios', 'error');
    } catch (err) { showToast(err.message, 'error'); }
    setEditSaving(false);
  }, [editOrder, activeBranchId, user?.email, showToast]);

  const handleNotesSave = useCallback(async (text) => {
    if (!notesOrder || !activeBranchId) return;
    setNotesSaving(true);
    try {
      const r = await ordersService.addOrderNote(activeBranchId, notesOrder.id, text, user?.email);
      if (r.success) { setShowNotesModal(false); showToast('Nota guardada'); }
      else showToast('Error al guardar nota', 'error');
    } catch (err) { showToast(err.message, 'error'); }
    setNotesSaving(false);
  }, [notesOrder, activeBranchId, user?.email, showToast]);

  const handleRefundConfirm = useCallback(async ({ amount, method, reason }) => {
    if (!refundOrder || !activeBranchId) return;
    if (!(await confirmDialog(`Procesar reembolso de ${formatCurrency(amount)} para ${formatOrderId(refundOrder.id)}?`))) return;
    setRefundProcessing(true);
    try {
      const r = await ordersService.processRefund(activeBranchId, refundOrder.id, { amount, method, reason }, user?.email);
      if (r.success) { setShowRefundModal(false); showToast('Reembolso procesado'); }
      else showToast('Error al procesar reembolso', 'error');
    } catch (err) { showToast(err.message, 'error'); }
    setRefundProcessing(false);
  }, [refundOrder, activeBranchId, user?.email, showToast]);

  const renderDetailPanel = useCallback((order) => (
    <OrderDetailPanel
      order={order}
      branchId={activeBranchId}
      can={can}
      onStatusChange={handleQuickStatus}
      onEdit={() => { setEditOrder(order); setShowEditModal(true); }}
      onNotes={() => { setNotesOrder(order); setShowNotesModal(true); }}
      onPrint={() => printOrder(order, activeBranchName)}
      onRefund={() => { setRefundOrder(order); setShowRefundModal(true); }}
      onCobrar={() => { setCobrarOrder(order); setShowCobrarModal(true); }}
      onVerify={() => { setVerifyOrder(order); setShowVerifyModal(true); setShowRejectInput(false); setRejectReason(''); }}
    />
  ), [activeBranchId, activeBranchName, can, handleQuickStatus]);

  const canRefund = (order) => order.payment_status === 'pagado' && !order.refund;
  const canEdit = (order) => order.status !== 'cancelado' && order.status !== 'entregado';
  const isEmpty = !allOrders?.length;
  const hasError = !!error;

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-cm-error/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-cm-error" />
        </div>
        <h2 className="text-lg font-bold text-cm-text">Error al cargar pedidos</h2>
        <p className="text-sm text-cm-muted font-medium mt-1">{error}</p>
        <button onClick={() => setError(null)} className="mt-6 px-5 py-2.5 bg-cm-accent text-white rounded-xl text-sm font-bold hover:bg-cm-accent-hover transition-colors flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ── Stats Bar ── */}
      {!isEmpty && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-cm-surface rounded-xl border border-cm-border p-3">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4 text-cm-accent" />
              <span className="text-[10px] font-semibold text-cm-text-secondary uppercase tracking-wider">Hoy</span>
            </div>
            <p className="text-xl font-black text-cm-text"><IntCounter value={stats.count} /> pedidos</p>
          </div>
          <div className="bg-cm-surface rounded-xl border border-cm-border p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-cm-success" />
              <span className="text-[10px] font-semibold text-cm-text-secondary uppercase tracking-wider">Ingresos</span>
            </div>
            <p className="text-xl font-black text-cm-text">S/ <AnimatedCounter value={stats.revenue} /></p>
          </div>
          <div className="bg-cm-surface rounded-xl border border-cm-border p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-cm-warning" />
              <span className="text-[10px] font-semibold text-cm-text-secondary uppercase tracking-wider">Pendientes</span>
            </div>
            <p className="text-xl font-black text-cm-text flex items-center gap-2">
              <IntCounter value={stats.pendingCount} />
              {stats.pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-cm-warning animate-pulse" />}
            </p>
          </div>
          <div className="bg-cm-surface rounded-xl border border-cm-border p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-cm-info" />
              <span className="text-[10px] font-semibold text-cm-text-secondary uppercase tracking-wider">Ticket prom.</span>
            </div>
            <p className="text-xl font-black text-cm-text">S/ <AnimatedCounter value={stats.avgTicket} /></p>
          </div>
        </motion.div>
      )}

      {/* ── Toolbar ── */}
      <motion.div variants={itemVariants}>
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
      </motion.div>

      {/* ── Table / Empty ── */}
      {isEmpty ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cm-accent/10 flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-cm-accent" />
          </div>
          <h2 className="text-lg font-bold text-cm-text">No hay pedidos todavía</h2>
          <p className="text-sm text-cm-muted font-medium mt-1 max-w-sm">
            Los pedidos aparecerán aquí a medida que los clientes realicen órdenes.
          </p>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
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
        </motion.div>
      )}

      {/* ── Modals ── */}
      <CobrarModal isOpen={showCobrarModal} order={cobrarOrder} onClose={() => setShowCobrarModal(false)}
        onConfirm={async (orderId, method) => {
          setCobrarLoading(true);
          const r = await ordersService.markAsPaid(activeBranchId, orderId, method, user?.email);
          setCobrarLoading(false);
          if (r.success) { setShowCobrarModal(false); showToast('Cobro registrado'); }
          else showToast('Error al cobrar', 'error');
        }} loading={cobrarLoading} />

      <VerifyPaymentModal isOpen={showVerifyModal} order={verifyOrder} onClose={() => setShowVerifyModal(false)}
        onConfirm={handleVerifyPayment} onReject={handleRejectPayment}
        confirmLoading={verifyLoading} rejectLoading={rejectLoading} />

      <EditOrderModal isOpen={showEditModal} order={editOrder} onClose={() => setShowEditModal(false)}
        onSave={handleEditSave} saving={editSaving} />

      <NotesModal isOpen={showNotesModal} order={notesOrder} onClose={() => setShowNotesModal(false)}
        onSave={handleNotesSave} saving={notesSaving} />

      <RefundModal isOpen={showRefundModal} order={refundOrder} onClose={() => setShowRefundModal(false)}
        onConfirm={handleRefundConfirm} processing={refundProcessing} />
    </motion.div>
  );
}
