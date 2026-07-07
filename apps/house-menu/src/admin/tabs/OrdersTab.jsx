import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Download, DollarSign, Trash2, ChevronDown, ChevronUp, Printer,
  StickyNote, Undo2, Edit3, X, Plus, Minus, Save, AlertTriangle, Loader2, Receipt, ShieldCheck
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { ordersService } from '../../lib/ordersService';
import { formatCurrency, formatOrderId } from '../../lib/format';
import { useToast } from '../../components/ToastContext';
import { confirmDialog } from '../../components/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

function ItemRow({ item, index, editMode, onChange }) {
  const qty = Number(item.quantity || 1);
  const price = Number(item.price || 0);

  if (!editMode) {
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

  return (
    <tr className="border-b border-cm-border/50 last:border-0">
      <td className="py-2">
        <input type="text" value={item.name} onChange={e => onChange(index, 'name', e.target.value)}
          className="w-full bg-cm-bg-alt border border-cm-border rounded px-2 py-1 text-sm text-cm-text focus:outline-none focus:border-cm-accent" />
      </td>
      <td className="py-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => onChange(index, 'quantity', Math.max(1, qty - 1))} className="p-0.5 text-cm-text-secondary hover:text-cm-accent"><Minus className="w-3 h-3" /></button>
          <span className="w-6 text-center text-sm font-semibold text-cm-text">{qty}</span>
          <button onClick={() => onChange(index, 'quantity', qty + 1)} className="p-0.5 text-cm-text-secondary hover:text-cm-accent"><Plus className="w-3 h-3" /></button>
        </div>
      </td>
      <td className="py-2 text-sm text-cm-text-secondary">{item.details?.join(', ') || '-'}</td>
      <td className="py-2 text-right">
        <input type="number" step="0.5" value={price} onChange={e => onChange(index, 'price', Math.max(0, parseFloat(e.target.value) || 0))}
          className="w-20 text-right bg-cm-bg-alt border border-cm-border rounded px-2 py-1 text-sm text-cm-text focus:outline-none focus:border-cm-accent" />
      </td>
      <td className="py-2 text-right font-semibold text-sm text-cm-text">{formatCurrency((qty * price))}</td>
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
  const [editItems, setEditItems] = useState([]);

  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesOrder, setNotesOrder] = useState(null);
  const [notesText, setNotesText] = useState('');

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundOrder, setRefundOrder] = useState(null);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('Efectivo');
  const [refundLoading, setRefundLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  // Yape/Plin verification modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyOrder, setVerifyOrder] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);

  const PAYMENT_STATUS_CONFIG = {
    pendiente: { label: 'Pendiente', dot: 'bg-yellow-500', bg: 'bg-yellow-500/10 text-yellow-600' },
    por_verificar: { label: 'Por verificar', dot: 'bg-cm-accent', bg: 'bg-cm-accent/10 text-cm-accent' },
    pagado: { label: 'Pagado', dot: 'bg-green-500', bg: 'bg-green-500/10 text-green-600' },
    reembolsado: { label: 'Reembolsado', dot: 'bg-orange-400', bg: 'bg-orange-400/10 text-orange-600' },
  };

  const paymentCounts = useMemo(() => {
    const counts = { pendiente: 0, por_verificar: 0, pagado: 0, reembolsado: 0 };
    allOrders.forEach(o => {
      const ps = o.payment_status;
      if (ps && ps in counts) counts[ps]++;
    });
    return counts;
  }, [allOrders]);

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
    setEditItems((order.items || []).map(i => ({ ...i, quantity: Number(i.quantity || 1) })));
    setShowEditModal(true);
  };

  const handleEditItemChange = (index, field, value) => {
    setEditItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleEditItemRemove = (index) => {
    if (editItems.length <= 1) return;
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const saveEdit = async () => {
    if (!editOrder || !activeBranchId) return;
    setActionLoading(true);
    try {
      const subtotal = editItems.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);
      const financials = {
        ...editOrder.financials,
        subtotal,
        total: subtotal + (editOrder.financials?.deliveryFee || 0) + (editOrder.financials?.packaging_total || 0),
      };
      const r = await ordersService.updateOrderItems(activeBranchId, editOrder.id, { items: editItems, financials, total: financials.total }, user?.email);
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
    setActionLoading(false);
  };

  const openNotes = (order) => {
    setNotesOrder(order);
    const latestNote = Array.isArray(order.notes) && order.notes.length > 0 ? order.notes[order.notes.length - 1].text : '';
    setNotesText(latestNote || order.internalNote || '');
    setShowNotesModal(true);
  };

  const saveNotes = async () => {
    if (!notesOrder || !activeBranchId) return;
    setActionLoading(true);
    const r = await ordersService.addOrderNote(activeBranchId, notesOrder.id, notesText, user?.email);
    if (r.success) { setShowNotesModal(false); showToast('Nota guardada'); }
    else showToast('Error al guardar nota', 'error');
    setActionLoading(false);
  };

  const openRefund = (order) => {
    setRefundOrder(order);
    setRefundAmount(order.financials?.total || 0);
    setRefundReason('');
    setShowRefundModal(true);
  };

  const processRefund = async () => {
    if (!refundOrder || !activeBranchId) return;
    if (!(await confirmDialog(`Procesar reembolso de ${formatCurrency(refundAmount)} para ${formatOrderId(refundOrder.id)}?`))) return;
    setRefundLoading(true);
    const r = await ordersService.processRefund(activeBranchId, refundOrder.id, {
      amount: refundAmount,
      method: refundMethod,
      reason: refundReason,
    }, user?.email);
    if (r.success) { setShowRefundModal(false); showToast('Reembolso procesado'); }
    else showToast('Error al procesar reembolso', 'error');
    setRefundLoading(false);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-cm-text">Pedidos</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => exportToCSV(allOrders, activeBranchName)} className="flex items-center gap-2 px-3 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
          <span className="text-xs text-cm-text-secondary font-medium">{allOrders.length} total</span>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary" />
          <input type="text" placeholder="Buscar por cliente, ID o ubicacion..." value={searchQuery} onChange={e => onSearchQueryChange(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
        </div>
        <select value={statusFilter} onChange={e => onStatusFilterChange(e.target.value)} className="px-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors">
          <option value="">Todos</option>
          <option value="recibido">Recibido</option>
          <option value="preparando">Preparando</option>
          <option value="listo">Listo</option>
          <option value="en_camino">En camino</option>
          <option value="entregado">Entregado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select value={paymentFilter} onChange={e => onPaymentFilterChange(e.target.value)} className="px-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors">
          <option value="">Todos los pagos</option>
          <option value="pendiente">Pendiente de pago</option>
          <option value="por_verificar">Por verificar</option>
          <option value="pagado">Pagado</option>
          <option value="reembolsado">Reembolsado</option>
        </select>
      </div>

      {/* Payment summary + quick filter pills */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-cm-bg-alt/50 rounded-lg">
        <span className="text-[10px] font-black text-cm-text-secondary uppercase tracking-widest mr-1">Pagos:</span>
        {[
          { key: '', label: `Todos (${allOrders.length})` },
          { key: 'pendiente', label: `Pendientes (${paymentCounts.pendiente})` },
          { key: 'por_verificar', label: `Por verificar (${paymentCounts.por_verificar})` },
          { key: 'pagado', label: `Pagados (${paymentCounts.pagado})` },
          { key: 'reembolsado', label: `Reembolsados (${paymentCounts.reembolsado})` },
        ].map(p => (
          <button
            key={p.key}
            onClick={() => onPaymentFilterChange(p.key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              paymentFilter === p.key
                ? 'bg-cm-accent text-white shadow-cm-sm'
                : 'bg-cm-surface border border-cm-border text-cm-text-secondary hover:bg-cm-accent/5'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cm-border bg-cm-bg-alt">
                <th className="w-8 px-2 py-3"></th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">ID</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Cliente</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider hidden md:table-cell">Ubicacion</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Estado</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Total</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider hidden md:table-cell">Fecha</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cm-border">
              {filteredOrders.map(o => (
                <>
                  <tr key={o.id} className="hover:bg-cm-accent/5 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}>
                    <td className="px-2 py-3 text-cm-text-tertiary">
                      {expandedId === o.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-cm-text-secondary">{formatOrderId(o.id)}</td>
                    <td className="px-3 py-3 font-semibold text-cm-text">
                      {o.customerName || 'Anonimo'}
                      {(o.notes?.length > 0 || o.internalNote) && <StickyNote className="w-3 h-3 inline ml-1 text-cm-warning" />}
                    </td>
                    <td className="px-3 py-3 text-cm-text-secondary hidden md:table-cell">{o.location || '-'}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={o.status} />
                        {o.payment_status && PAYMENT_STATUS_CONFIG[o.payment_status] && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold leading-tight ${PAYMENT_STATUS_CONFIG[o.payment_status].bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${PAYMENT_STATUS_CONFIG[o.payment_status].dot}`} />
                            {PAYMENT_STATUS_CONFIG[o.payment_status].label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">{formatCurrency((o.financials?.total || o.total || 0))}</td>
                    <td className="px-3 py-3 text-right text-cm-text-secondary text-xs hidden md:table-cell">{new Date(o.createdAt).toLocaleString('es-PE')}</td>
                    <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        {o.payment_status === 'por_verificar' && can('orders:mark_paid') && (
                          <button
                            onClick={() => { setVerifyOrder(o); setShowVerifyModal(true); setShowRejectInput(false); setRejectReason(''); }}
                            className="text-cm-accent hover:text-cm-accent/80 transition-colors p-1 animate-pulse"
                            title="Verificar pago Yape/Plin"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}
                        {o.payment_status === 'pendiente' && can('orders:mark_paid') && (
                          <button onClick={() => { setCobrarOrder(o); setCobrarMethod('Efectivo'); setShowCobrarModal(true); }}
                            className="text-cm-success hover:text-cm-success/80 transition-colors p-1" title="Cobrar">
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                        {o.status !== 'cancelado' && o.status !== 'entregado' && can('orders:cancel') && (
                          <button onClick={() => onCancelOrder(o.id)} className="text-cm-error hover:text-cm-error/80 transition-colors p-1" title="Cancelar pedido">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === o.id && (
                    <tr key={`${o.id}-detail`}>
                      <td colSpan={8} className="px-6 py-4 bg-cm-bg-alt/50">
                        <div className="space-y-4">
                          {/* Items table */}
                          <div>
                            <h4 className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-2">Items del pedido</h4>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-cm-border">
                                  <th className="text-left py-1.5 text-xs font-semibold text-cm-text-secondary">Producto</th>
                                  <th className="text-center py-1.5 text-xs font-semibold text-cm-text-secondary">Cant</th>
                                  <th className="text-left py-1.5 text-xs font-semibold text-cm-text-secondary hidden sm:table-cell">Detalles</th>
                                  <th className="text-right py-1.5 text-xs font-semibold text-cm-text-secondary">P.Unit</th>
                                  <th className="text-right py-1.5 text-xs font-semibold text-cm-text-secondary">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(o.items || []).map((item, idx) => (
                                  <ItemRow key={idx} item={item} index={idx} editMode={false} />
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Summary + Actions */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="text-sm space-y-0.5">
                              {o.financials && (
                                <>
                                  <p className="text-cm-text-secondary">Subtotal: <span className="text-cm-text">{formatCurrency((o.financials.subtotal || 0))}</span></p>
                                  {o.financials.deliveryFee > 0 && <p className="text-cm-text-secondary">Delivery: <span className="text-cm-text">{formatCurrency(o.financials.deliveryFee)}</span></p>}
                                  {o.financials.packaging_total > 0 && <p className="text-cm-text-secondary">Empaques: <span className="text-cm-text">{formatCurrency(o.financials.packaging_total)}</span></p>}
                                  <p className="font-bold text-cm-text">Total: {formatCurrency((o.financials.total || 0))}</p>
                                </>
                              )}
                              {o.payment_method && (
                                <p className="text-xs text-cm-text-secondary flex items-center gap-1">
                                  Pago: <strong>{o.payment_method}</strong>
                                  {o.payment_status === 'pagado' && <span className="text-green-500 font-bold">✓ Verificado</span>}
                                  {o.payment_status === 'por_verificar' && <span className="text-cm-accent font-bold animate-pulse">⏳ Por verificar</span>}
                                  {o.payment_status === 'reembolsado' && <span className="text-orange-400 font-bold">↩ Reembolsado</span>}
                                  {o.payment_status === 'pendiente' && <span className="text-yellow-500 font-bold">⚠ Pendiente</span>}
                                </p>
                              )}
                              {/* Yape/Plin verification details */}
                              {o.payment_details && (
                                <div className="mt-2 p-3 bg-cm-accent/5 border border-cm-accent/20 rounded-xl space-y-1">
                                  <p className="text-[10px] font-black text-cm-accent uppercase tracking-widest">Comprobante Yape / Plin</p>
                                  <p className="text-xs text-cm-text">
                                    Billetera: <strong className="uppercase">{o.payment_details.wallet_type || 'N/A'}</strong>
                                  </p>
                                  {o.payment_details.operation_number && (
                                    <p className="text-xs text-cm-text">
                                      N° Operación: <strong className="font-mono tracking-wider">{o.payment_details.operation_number}</strong>
                                    </p>
                                  )}
                                  <p className="text-xs text-cm-text-secondary">
                                    Comprobante foto: {o.payment_details.voucher_uploaded ? '✅ Subido' : '❌ No subido'}
                                  </p>
                                </div>
                              )}
                              {(o.notes?.length > 0 || o.internalNote) && <p className="text-xs text-cm-warning mt-1"><StickyNote className="w-3 h-3 inline mr-1" />{o.notes?.[o.notes.length - 1]?.text || o.internalNote}</p>}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {canEdit(o) && can('orders:edit') && (
                                <button onClick={() => openEdit(o)} className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-accent/10 text-cm-accent text-xs font-semibold rounded-lg hover:bg-cm-accent/20 transition-colors">
                                  <Edit3 className="w-3.5 h-3.5" /> Editar
                                </button>
                              )}
                              {can('orders:edit') && (
                                <button onClick={() => openNotes(o)} className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-info/10 text-cm-info text-xs font-semibold rounded-lg hover:bg-cm-info/20 transition-colors">
                                  <StickyNote className="w-3.5 h-3.5" /> Nota
                                </button>
                              )}
                              <button onClick={() => printOrder(o)} className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-surface border border-cm-border text-cm-text text-xs font-semibold rounded-lg hover:bg-cm-accent/5 transition-colors">
                                <Printer className="w-3.5 h-3.5" /> Imprimir
                              </button>
                              {canRefund(o) && can('orders:refund') && (
                                <button onClick={() => openRefund(o)} className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-warning/10 text-cm-warning text-xs font-semibold rounded-lg hover:bg-cm-warning/20 transition-colors">
                                  <Undo2 className="w-3.5 h-3.5" /> Reembolsar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {!filteredOrders.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-cm-text-secondary">No se encontraron pedidos</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cobrar Modal */}
      <AnimatePresence>
        {showCobrarModal && cobrarOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCobrarModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-cm-text mb-2">Cobrar pedido</h3>
              <p className="text-sm text-cm-text-secondary mb-4">{formatOrderId(cobrarOrder.id)} — {formatCurrency((cobrarOrder.financials?.total || 0))}</p>
              <p className="text-xs font-semibold text-cm-text-secondary mb-2 uppercase tracking-wider">¿Con qué método se cobró?</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { key: 'Efectivo', label: 'Efectivo' },
                  { key: 'Yape/Plin', label: 'Yape / Plin' },
                  { key: 'Tarjeta (POS)', label: 'Tarjeta (POS)' },
                ].map(m => (
                  <button key={m.key} onClick={() => setCobrarMethod(m.key)}
                    className={`py-3 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                      cobrarMethod === m.key
                        ? 'bg-cm-accent border-cm-accent text-white shadow-cm-sm'
                        : 'bg-cm-accent/5 border-cm-border text-cm-text-secondary hover:bg-cm-accent/10'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowCobrarModal(false)} className="flex-1 py-2.5 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
                <button onClick={handleCobrar} disabled={cobrarLoading} className="flex-1 py-2.5 bg-cm-success text-white text-sm font-semibold rounded-lg hover:bg-cm-success/80 transition-colors disabled:opacity-50">{cobrarLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Cobrar'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && editOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowEditModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-cm-surface rounded-xl shadow-cm-lg w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-cm-surface border-b border-cm-border px-6 py-4 flex items-center justify-between z-10">
                <h3 className="text-lg font-bold text-cm-text">Editar Pedido</h3>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-cm-accent/10 rounded transition-colors"><X className="w-5 h-5 text-cm-text-secondary" /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-cm-text-secondary">{formatOrderId(editOrder.id)} — {editOrder.customerName || 'Anonimo'}</p>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cm-border">
                      <th className="text-left py-2 text-xs font-semibold text-cm-text-secondary">Producto</th>
                      <th className="text-center py-2 text-xs font-semibold text-cm-text-secondary">Cant</th>
                      <th className="text-left py-2 text-xs font-semibold text-cm-text-secondary hidden sm:table-cell">Detalles</th>
                      <th className="text-right py-2 text-xs font-semibold text-cm-text-secondary">P.Unit</th>
                      <th className="text-right py-2 text-xs font-semibold text-cm-text-secondary">Subtotal</th>
                      <th className="w-8 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editItems.map((item, idx) => (
                      <ItemRow key={idx} item={item} index={idx} editMode={true} onChange={handleEditItemChange} />
                    ))}
                  </tbody>
                </table>

                <div className="text-right text-sm font-bold text-cm-text pt-2 border-t border-cm-border">
                  Nuevo Total: {formatCurrency(editItems.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
                  <button onClick={saveEdit} disabled={actionLoading} className="flex-1 py-2.5 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes Modal */}
      <AnimatePresence>
        {showNotesModal && notesOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowNotesModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-cm-surface rounded-xl shadow-cm-lg w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-cm-border">
                <h3 className="text-lg font-bold text-cm-text">Nota interna</h3>
                <p className="text-xs text-cm-text-secondary">{formatOrderId(notesOrder.id)} — {notesOrder.customerName || 'Anonimo'}</p>
              </div>
              <div className="p-6">
                <textarea value={notesText} onChange={e => setNotesText(e.target.value)} rows={4}
                  className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:border-cm-accent resize-none"
                  placeholder="Nota visible solo para administradores..." />
              </div>
              <div className="px-6 py-4 border-t border-cm-border flex gap-3">
                <button onClick={() => setShowNotesModal(false)} className="flex-1 py-2.5 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
                <button onClick={saveNotes} disabled={actionLoading} className="flex-1 py-2.5 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refund Modal */}
      <AnimatePresence>
        {showRefundModal && refundOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowRefundModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-cm-surface rounded-xl shadow-cm-lg w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-cm-border">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-cm-warning" />
                  <h3 className="text-lg font-bold text-cm-text">Reembolsar pedido</h3>
                </div>
                <p className="text-xs text-cm-text-secondary mt-1">{formatOrderId(refundOrder.id)} — {refundOrder.customerName || 'Anonimo'}</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Monto a reembolsar</p>
                  <input type="number" step="0.5" value={refundAmount} onChange={e => setRefundAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:border-cm-accent" />
                  <p className="text-xs text-cm-text-secondary mt-1">Máximo: {formatCurrency((refundOrder.financials?.total || 0))}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-2">Método de reembolso</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['Efectivo', 'Yape/Plin', 'Transferencia'].map(m => (
                      <button key={m} onClick={() => setRefundMethod(m)}
                        className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                          refundMethod === m
                            ? 'bg-cm-warning border-cm-warning text-white'
                            : 'bg-cm-accent/5 border-cm-border text-cm-text-secondary hover:bg-cm-accent/10'
                        }`}
                      >{m}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Motivo (opcional)</p>
                  <input type="text" value={refundReason} onChange={e => setRefundReason(e.target.value)}
                    className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:border-cm-accent"
                    placeholder="Ej: Cliente insatisfecho, error en pedido..." />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-cm-border flex gap-3">
                <button onClick={() => setShowRefundModal(false)} className="flex-1 py-2.5 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
                <button onClick={processRefund} disabled={refundLoading} className="flex-1 py-2.5 bg-cm-warning text-white text-sm font-semibold rounded-lg hover:bg-cm-warning/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {refundLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />} Reembolsar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Yape/Plin Verification Modal */}
      <AnimatePresence>
        {showVerifyModal && verifyOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowVerifyModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-cm-surface rounded-2xl shadow-cm-lg p-6 w-full max-w-sm mx-4 border-2 border-cm-accent/30" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-cm-accent/15 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-cm-accent" />
                </div>
                <div>
                  <h3 className="text-base font-black text-cm-text">Verificar Pago Yape / Plin</h3>
                  <p className="text-xs text-cm-text-secondary">{formatOrderId(verifyOrder.id)} — {verifyOrder.customerName || 'Anónimo'}</p>
                </div>
              </div>

              <div className="bg-cm-bg rounded-xl p-4 mb-4 space-y-3 border border-cm-border">
                <div className="flex justify-between text-sm">
                  <span className="text-cm-text-secondary">Total a verificar</span>
                  <span className="font-black text-cm-text text-base">{formatCurrency((verifyOrder.financials?.total || 0))}</span>
                </div>
                {verifyOrder.payment_details && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-cm-text-secondary">Billetera</span>
                      <span className="font-bold uppercase text-cm-accent">{verifyOrder.payment_details.wallet_type || 'N/A'}</span>
                    </div>
                    {verifyOrder.payment_details.operation_number && (
                      <div className="flex justify-between text-xs">
                        <span className="text-cm-text-secondary">N° Operación</span>
                        <span className="font-mono font-bold text-cm-text tracking-wider">{verifyOrder.payment_details.operation_number}</span>
                      </div>
                    )}

                    {/* Voucher image */}
                    {verifyOrder.payment_details.voucher_uploaded && verifyOrder.payment_details.voucher_url ? (
                      <div className="pt-1">
                        <p className="text-[10px] font-bold text-cm-text-secondary uppercase tracking-wider mb-1.5">Comprobante</p>
                        <a href={verifyOrder.payment_details.voucher_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={verifyOrder.payment_details.voucher_url}
                            alt="Voucher Yape/Plin"
                            className="w-full h-40 object-cover rounded-xl border border-cm-border bg-cm-bg-alt hover:opacity-90 transition-opacity cursor-pointer"
                          />
                        </a>
                        <p className="text-[10px] text-cm-text-tertiary mt-1">Click para ver completo</p>
                      </div>
                    ) : (
                      <div className="flex justify-between text-xs">
                        <span className="text-cm-text-secondary">Comprobante foto</span>
                        <span className="font-bold text-orange-400">❌ No subido</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Reject input */}
              {showRejectInput ? (
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-bold text-cm-error">¿Motivo del rechazo?</p>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Ej: N° operación inválido, monto incorrecto..."
                    className="w-full bg-cm-bg-alt border border-cm-error/50 rounded-xl px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:border-cm-error placeholder:text-cm-text-tertiary"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                      className="flex-1 py-2 border border-cm-border text-xs font-bold text-cm-text rounded-xl hover:bg-cm-surface-hover transition-colors"
                    >
                      Volver
                    </button>
                    <button
                      onClick={handleRejectPayment}
                      disabled={rejectLoading}
                      className="flex-1 py-2 bg-cm-error text-white text-xs font-black rounded-xl hover:bg-cm-error/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {rejectLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                      {rejectLoading ? 'Rechazando...' : 'Confirmar Rechazo'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-cm-text-secondary text-center mb-4">
                    Al confirmar, el pedido quedará marcado como <strong>pagado</strong> y se contabilizará en caja.
                  </p>
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => setShowRejectInput(true)}
                      className="flex-1 py-2.5 border-2 border-cm-error/40 text-cm-error text-sm font-bold rounded-xl hover:bg-cm-error/5 transition-colors"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={handleVerifyPayment}
                      disabled={verifyLoading}
                      className="flex-1 py-2.5 bg-cm-accent text-white text-sm font-black rounded-xl hover:bg-cm-accent/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {verifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      {verifyLoading ? 'Verificando...' : 'Confirmar Pago'}
                    </button>
                  </div>
                  <button onClick={() => setShowVerifyModal(false)} className="w-full py-2 text-xs font-bold text-cm-text-secondary hover:text-cm-text transition-colors">
                    Cancelar
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
