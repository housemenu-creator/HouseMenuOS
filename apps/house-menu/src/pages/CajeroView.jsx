import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { ordersService } from '../lib/ordersService';
import { cashService } from '../lib/cashService';
import { useFCM } from '../hooks/useFCM';
import NotificationBell from '../components/NotificationBell';
import { Loader2, DollarSign, LogOut, Wallet, CreditCard, Smartphone, AlertTriangle, ShieldCheck, Clock, Timer, Receipt, History, Plus, X } from 'lucide-react';
import { formatCurrency, formatTime } from '../lib/format';
import { useToast } from '../components/ToastContext';

export default function CajeroView() {
  const { user, logout } = useAuth();
  const { activeBranchId, branches } = useBranch();
  const { showToast } = useToast();
  const [allOrders, setAllOrders] = useState([]);
  const [cashSessions, setCashSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cashNotes, setCashNotes] = useState('');

  useFCM({ branchId: activeBranchId, userId: user?.email });

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!activeBranchId) return;
    setLoading(true);
    const unsubOrders = ordersService.subscribeToOrders(activeBranchId, (data) => {
      setAllOrders(data);
      setLoading(false);
    });
    const unsubCash = cashService.subscribeToSessions(activeBranchId, setCashSessions);
    return () => { unsubOrders(); unsubCash(); };
  }, [activeBranchId]);

  const activeSession = cashSessions.find(s => s.status === 'open');
  const branchName = branches.find(b => b.id === activeBranchId)?.name || 'Sucursal';

  // Sesión activa — duración
  const sessionDuration = useMemo(() => {
    if (!activeSession?.openedAt) return null;
    const ms = Date.now() - activeSession.openedAt;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }, [activeSession, currentTime]);

  // Órdenes de la sesión activa
  const sessionOrders = useMemo(() => {
    if (!activeSession) return [];
    return allOrders.filter(o => {
      const t = o.createdAt ? new Date(o.createdAt).getTime() : 0;
      return t >= activeSession.openedAt;
    });
  }, [allOrders, activeSession]);

  // Cálculos financieros
  const { totalEfectivo, totalYapePlin, totalPos, totalPendiente, totalPorVerificar, porVerificar } = useMemo(() => {
    const efectivo = sessionOrders
      .filter(o => o.status !== 'cancelado' && o.payment_method === 'Efectivo' && o.payment_status === 'pagado')
      .reduce((s, o) => s + (o.financials?.total || 0), 0);
    const efectivoRefund = sessionOrders
      .filter(o => o.status !== 'cancelado' && o.refund?.method === 'Efectivo')
      .reduce((s, o) => s + (o.refund.amount || 0), 0);
    const yape = sessionOrders
      .filter(o => o.status !== 'cancelado' && o.payment_method === 'Yape/Plin' && o.payment_status === 'pagado')
      .reduce((s, o) => s + (o.financials?.total || 0), 0);
    const yapeRefund = sessionOrders
      .filter(o => o.status !== 'cancelado' && o.refund?.method === 'Yape/Plin')
      .reduce((s, o) => s + (o.refund.amount || 0), 0);
    const pos = sessionOrders
      .filter(o => o.status !== 'cancelado' && o.payment_method === 'Tarjeta (POS)' && o.payment_status === 'pagado')
      .reduce((s, o) => s + (o.financials?.total || 0), 0);
    const posRefund = sessionOrders
      .filter(o => o.status !== 'cancelado' && o.refund?.method === 'Tarjeta (POS)')
      .reduce((s, o) => s + (o.refund.amount || 0), 0);
    const pendiente = sessionOrders
      .filter(o => o.status !== 'cancelado' && o.payment_status !== 'pagado' && o.payment_status !== 'reembolsado' && o.payment_status !== 'por_verificar')
      .reduce((s, o) => s + (o.financials?.total || 0), 0);
    const pv = allOrders.filter(o => o.payment_status === 'por_verificar');
    const pvTotal = pv.reduce((s, o) => s + (o.financials?.total || 0), 0);
    return { totalEfectivo: efectivo - efectivoRefund, totalYapePlin: yape - yapeRefund, totalPos: pos - posRefund, totalPendiente: pendiente, totalPorVerificar: pvTotal, porVerificar: pv };
  }, [sessionOrders, allOrders]);

  const totalIngresos = totalEfectivo + totalYapePlin + totalPos;
  const expectedCash = (activeSession?.openingBalance || 0) + totalEfectivo;

  const handleOpenSession = async () => {
    const val = parseFloat(cashAmount);
    if (cashAmount.trim() === '' || isNaN(val) || val < 0) {
      showToast('Ingresa un monto inicial válido (≥ 0)', 'error');
      return;
    }
    const r = await cashService.openSession(activeBranchId, {
      openingBalance: val,
      openedBy: user?.email || 'cajero',
      notes: cashNotes,
    });
    if (r.success) { setShowModal(false); setCashAmount(''); setCashNotes(''); showToast('Caja abierta'); }
    else showToast(r.error || 'Error al abrir caja', 'error');
  };

  const handleCloseSession = async () => {
    const val = parseFloat(cashAmount);
    if (cashAmount.trim() === '' || isNaN(val) || val < 0) {
      showToast('Ingresa el monto final en caja', 'error');
      return;
    }
    const r = await cashService.closeSession(activeBranchId, activeSession.id, {
      closingBalance: val,
      expectedCash,
      closedBy: user?.email || 'cajero',
      notes: cashNotes,
    });
    if (r.success) { setShowModal(false); setCashAmount(''); setCashNotes(''); showToast('Caja cerrada'); }
    else showToast(r.error || 'Error al cerrar caja', 'error');
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
          <p className="text-xs font-bold text-cm-muted uppercase tracking-widest">Cargando caja...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cm-bg">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-40 bg-cm-surface/80 backdrop-blur-xl border-b border-cm-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center text-white shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-cm-text truncate leading-tight">Módulo de Caja</h1>
              <p className="text-[10px] text-cm-muted font-semibold truncate">{branchName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono font-bold text-cm-muted bg-cm-bg-alt px-2.5 py-1 rounded-lg border border-cm-border/50">
              <Clock className="w-3 h-3" />
              {currentTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <NotificationBell branchId={activeBranchId} userId={user?.email} />
            <button onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-cm-error border border-cm-error/30 rounded-lg hover:bg-cm-error/10 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-4 pb-24">

        {/* ── Bienvenida ── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-cm-muted font-semibold">
              {currentTime.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h2 className="text-lg font-black text-cm-text mt-0.5">
              Hola, {user?.name?.split(' ')[0] || 'Cajero'}
            </h2>
          </div>
          {activeSession && sessionDuration && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-cm-success bg-cm-success/10 px-3 py-1.5 rounded-full border border-cm-success/20">
              <Timer className="w-3.5 h-3.5" />
              {sessionDuration}
            </div>
          )}
        </div>

        {/* ── Estado de Sesión ── */}
        <motion.div layout className={`rounded-2xl border-2 p-5 ${
          activeSession
            ? 'bg-cm-success/5 border-cm-success/30'
            : 'bg-cm-warning/10 border-cm-warning/30'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {activeSession ? (
                <div className="w-10 h-10 rounded-xl bg-cm-success/20 flex items-center justify-center text-cm-success shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-cm-warning/20 flex items-center justify-center text-cm-warning shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              <div>
                <p className={`text-sm font-black ${activeSession ? 'text-cm-success' : 'text-cm-warning'}`}>
                  {activeSession ? 'Caja Abierta' : 'Caja Cerrada'}
                </p>
                <p className="text-xs text-cm-text-secondary mt-0.5">
                  {activeSession
                    ? `Abierta ${formatTime(activeSession.openedAt)} — Monto inicial ${formatCurrency(activeSession.openingBalance || 0)}`
                    : 'No hay una sesión de caja abierta. Los pedidos se registran pero no se contabilizan.'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => { setCashAmount(''); setCashNotes(''); setShowModal(true); }}
              className={`shrink-0 px-4 py-2 text-xs font-black rounded-xl text-white transition-all active:scale-95 ${
                activeSession
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:shadow-lg hover:shadow-red-500/20'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/20'
              }`}
            >
              {activeSession ? 'Cerrar Caja' : 'Abrir Caja'}
            </button>
          </div>
        </motion.div>

        {/* ── Por Verificar Alert ── */}
        {porVerificar.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-cm-accent/10 border-2 border-cm-accent/30 rounded-xl px-4 py-3">
            <ShieldCheck className="w-5 h-5 text-cm-accent shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-cm-accent">
                {porVerificar.length} pago{porVerificar.length > 1 ? 's' : ''} Yape/Plin por verificar — {formatCurrency(totalPorVerificar)}
              </p>
              <div className="mt-2 space-y-1">
                {porVerificar.map(o => (
                  <div key={o.id} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-cm-accent/80 font-medium truncate">
                      #{(o.id || '').slice(-4).toUpperCase()} — {o.customerName || 'Anónimo'}
                      {o.payment_details?.operation_number && <span className="font-mono ml-1">#{o.payment_details.operation_number}</span>}
                    </span>
                    <span className="font-black text-cm-accent shrink-0">{formatCurrency(o.financials?.total || 0)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-cm-accent/70 mt-2">→ Ve a Pedidos y usa el botón <strong>🛡 Verificar</strong> para confirmar cada pago.</p>
            </div>
          </motion.div>
        )}

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card label="Efectivo" value={formatCurrency(totalEfectivo)} className="text-cm-success" icon={<Wallet className="w-4 h-4" />} />
          <Card label="Yape / Plin" value={formatCurrency(totalYapePlin)} className="text-cm-info" icon={<Smartphone className="w-4 h-4" />} />
          <Card label="Tarjeta (POS)" value={formatCurrency(totalPos)} className="text-cm-accent" icon={<CreditCard className="w-4 h-4" />} />
          <Card label="Pendiente" value={totalPendiente > 0 ? formatCurrency(totalPendiente) : '—'} className={totalPendiente > 0 ? 'text-cm-warning' : 'text-cm-text-tertiary'} icon={<Receipt className="w-4 h-4" />} />
          <Card label="Total Ingresos" value={formatCurrency(totalIngresos)} className="text-cm-text font-black!" icon={<DollarSign className="w-4 h-4" />} highlight />
        </div>

        {/* ── Órdenes de la Sesión ── */}
        {activeSession && (
          <div className="bg-cm-surface border border-cm-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-cm-border">
              <h3 className="text-sm font-bold text-cm-text flex items-center gap-2">
                <Receipt className="w-4 h-4 text-cm-accent" />
                Órdenes de la Sesión
              </h3>
              <span className="text-xs font-bold text-cm-muted">{sessionOrders.length} orden{sessionOrders.length !== 1 ? 'es' : ''}</span>
            </div>
            {sessionOrders.length === 0 ? (
              <div className="text-center py-10">
                <Receipt className="w-6 h-6 text-cm-muted/30 mx-auto mb-2" />
                <p className="text-xs text-cm-muted">No hay órdenes en esta sesión aún</p>
              </div>
            ) : (
              <div className="divide-y divide-cm-border">
                {sessionOrders.slice(-10).reverse().map(o => (
                  <div key={o.id} className="flex items-center justify-between px-5 py-3 hover:bg-cm-bg-alt/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-cm-text">#{o.id.slice(-6).toUpperCase()}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          o.status === 'cancelado' ? 'bg-cm-error/10 text-cm-error' :
                          o.status === 'entregado' || o.status === 'listo' ? 'bg-cm-success/10 text-cm-success' :
                          'bg-cm-warning/10 text-cm-warning'
                        }`}>
                          {o.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-cm-text-secondary truncate mt-0.5">
                        {o.customerName || 'Cliente'} · {o.payment_method || '—'}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-cm-text">{formatCurrency(o.financials?.total || 0)}</p>
                      <p className="text-[10px] text-cm-text-secondary">{o.createdAt ? formatTime(new Date(o.createdAt).getTime()) : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Historial de Sesiones ── */}
        <div className="bg-cm-surface border border-cm-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-cm-border">
            <h3 className="text-sm font-bold text-cm-text flex items-center gap-2">
              <History className="w-4 h-4 text-cm-muted" />
              Historial de Caja
            </h3>
          </div>
          {cashSessions.length === 0 ? (
            <div className="text-center py-10">
              <History className="w-6 h-6 text-cm-muted/30 mx-auto mb-2" />
              <p className="text-xs text-cm-muted">No hay sesiones de caja registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cm-border bg-cm-bg-alt/50">
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-cm-muted uppercase tracking-wider">Apertura</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-cm-muted uppercase tracking-wider">Cierre</th>
                    <th className="text-right px-5 py-3 text-[10px] font-bold text-cm-muted uppercase tracking-wider">Inicial</th>
                    <th className="text-right px-5 py-3 text-[10px] font-bold text-cm-muted uppercase tracking-wider">Final</th>
                    <th className="text-right px-5 py-3 text-[10px] font-bold text-cm-muted uppercase tracking-wider">Dif.</th>
                    <th className="text-center px-5 py-3 text-[10px] font-bold text-cm-muted uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cm-border">
                  {cashSessions.map(s => (
                    <tr key={s.id} className="hover:bg-cm-bg-alt/30 transition-colors">
                      <td className="px-5 py-3 text-xs text-cm-text-secondary">{new Date(s.openedAt).toLocaleString('es-PE')}</td>
                      <td className="px-5 py-3 text-xs text-cm-text-secondary">{s.closedAt ? new Date(s.closedAt).toLocaleString('es-PE') : '-'}</td>
                      <td className="px-5 py-3 text-xs text-right font-bold text-cm-text">{formatCurrency(s.openingBalance || 0)}</td>
                      <td className="px-5 py-3 text-xs text-right font-bold text-cm-text">{formatCurrency(s.closingBalance || 0)}</td>
                      <td className={`px-5 py-3 text-xs text-right font-bold ${(s.difference || 0) !== 0 ? 'text-cm-warning' : 'text-cm-success'}`}>
                        {s.difference != null ? formatCurrency(s.difference) : '-'}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.status === 'open'
                            ? 'bg-cm-success/10 text-cm-success border border-cm-success/20'
                            : 'bg-cm-border/50 text-cm-muted border border-cm-border'
                        }`}>
                          {s.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Open/Close ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-cm-surface rounded-2xl shadow-cm-lg w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}>
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-2">
                <h3 className="text-lg font-black text-cm-text">
                  {activeSession ? 'Cerrar Caja' : 'Abrir Caja'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-cm-bg-alt transition-colors">
                  <X className="w-5 h-5 text-cm-muted" />
                </button>
              </div>

              <div className="px-6 pb-6 space-y-4">
                {activeSession ? (
                  <>
                    {/* Resumen al cerrar */}
                    <div className="bg-cm-bg-alt/70 rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-cm-text-secondary">Efectivo en caja (esperado):</span>
                        <span className="font-bold text-cm-success">{formatCurrency(expectedCash)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cm-text-secondary">Yape / Plin:</span>
                        <span className="font-bold text-cm-info">{formatCurrency(totalYapePlin)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cm-text-secondary">Tarjeta (POS):</span>
                        <span className="font-bold text-cm-accent">{formatCurrency(totalPos)}</span>
                      </div>
                      {totalPendiente > 0 && (
                        <div className="flex justify-between">
                          <span className="text-cm-text-secondary">Pendiente de cobro:</span>
                          <span className="font-bold text-cm-warning">{formatCurrency(totalPendiente)}</span>
                        </div>
                      )}
                      <div className="border-t border-cm-border pt-2 mt-2">
                        <div className="flex justify-between font-black text-cm-text">
                          <span>Total ingresos:</span>
                          <span>{formatCurrency(totalIngresos)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-cm-muted mb-1.5 uppercase tracking-wider">
                        Monto final en caja (efectivo)
                      </label>
                      <input type="number" step="0.01" value={cashAmount}
                        onChange={e => setCashAmount(e.target.value)}
                        className="w-full px-4 py-2.5 bg-cm-bg-alt border border-cm-border rounded-xl text-sm font-bold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                        placeholder="0.00" autoFocus />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-cm-muted mb-1.5 uppercase tracking-wider">Notas</label>
                      <textarea value={cashNotes} onChange={e => setCashNotes(e.target.value)}
                        className="w-full px-4 py-2.5 bg-cm-bg-alt border border-cm-border rounded-xl text-sm text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                        rows={2} placeholder="Observaciones..." />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setShowModal(false)}
                        className="flex-1 py-2.5 border border-cm-border text-sm font-bold text-cm-text rounded-xl hover:bg-cm-bg-alt transition-colors">
                        Cancelar
                      </button>
                      <button onClick={handleCloseSession}
                        className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-black rounded-xl hover:shadow-lg hover:shadow-red-500/20 transition-all">
                        Cerrar Caja
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-cm-muted mb-1.5 uppercase tracking-wider">
                        Monto inicial en caja
                      </label>
                      <input type="number" step="0.01" value={cashAmount}
                        onChange={e => setCashAmount(e.target.value)}
                        className="w-full px-4 py-2.5 bg-cm-bg-alt border border-cm-border rounded-xl text-sm font-bold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                        placeholder="0.00" autoFocus />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-cm-muted mb-1.5 uppercase tracking-wider">Notas</label>
                      <textarea value={cashNotes} onChange={e => setCashNotes(e.target.value)}
                        className="w-full px-4 py-2.5 bg-cm-bg-alt border border-cm-border rounded-xl text-sm text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                        rows={2} placeholder="Opcional..." />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setShowModal(false)}
                        className="flex-1 py-2.5 border border-cm-border text-sm font-bold text-cm-text rounded-xl hover:bg-cm-bg-alt transition-colors">
                        Cancelar
                      </button>
                      <button onClick={handleOpenSession}
                        className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-black rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all">
                        Abrir Caja
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── KPI Card Component ──
function Card({ label, value, className, icon, highlight }) {
  return (
    <div className={`bg-cm-surface rounded-xl border border-cm-border p-4 ${highlight ? 'md:col-span-1 ring-2 ring-cm-accent/20' : ''}`}>
      <div className="flex items-center gap-1.5 text-cm-text-secondary mb-1">
        <span className={className}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-black tabular-nums ${className}`}>{value}</p>
    </div>
  );
}
