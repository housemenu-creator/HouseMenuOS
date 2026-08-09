import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, ShieldCheck, DollarSign, CreditCard, Smartphone, Clock, RefreshCw,
  Wallet, TrendingUp, TrendingDown, Eye, EyeOff,
} from 'lucide-react';
import { cashService } from '../../lib/cashService';
import { formatCurrency } from '../../lib/format';
import { useToast } from '../../components/ToastContext';

// ── Animated Counter (rAF, shared) ──
function AnimCounter({ value, decimals = 2, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  const st = useRef(null);
  const from = useRef(0);
  useEffect(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    from.current = display; st.current = null;
    const step = (ts) => {
      if (!st.current) st.current = ts;
      const p = Math.min((ts - st.current) / duration, 1);
      const e = 1 - (1 - p) * (1 - p);
      setDisplay(from.current + (value - from.current) * e);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);
  return <>{display.toFixed(decimals)}</>;
}

function IntCounter({ value }) { return <AnimCounter value={value} decimals={0} duration={600} />; }

const cv = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const iv = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

function formatSoles(n) {
  const sign = n < 0 ? '-S/ ' : 'S/ ';
  return sign + Math.abs(n).toFixed(2);
}

export default function CajaTab({ cashSessions, allOrders, activeBranchId, user }) {
  const { showToast } = useToast();
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashOpeningBalance, setCashOpeningBalance] = useState('');
  const [cashClosingBalance, setCashClosingBalance] = useState('');
  const [cashNotes, setCashNotes] = useState('');
  const [error, setError] = useState(null);

  const activeSession = cashSessions?.find(s => s.status === 'open');

  const sessionOrders = useMemo(() => {
    if (!activeSession || !allOrders?.length) return [];
    return allOrders.filter(o => {
      try { return new Date(o.createdAt).getTime() >= activeSession.openedAt; }
      catch { return false; }
    });
  }, [allOrders, activeSession]);

  const totalEfectivo = useMemo(() => {
    const paid = sessionOrders.filter(o => o.status !== 'cancelado' && o.payment_method === 'Efectivo' && o.payment_status === 'pagado')
      .reduce((s, o) => s + (o.financials?.total || 0), 0);
    const refunds = sessionOrders.filter(o => o.status !== 'cancelado' && o.refund?.method === 'Efectivo')
      .reduce((s, o) => s + (o.refund.amount || 0), 0);
    return paid - refunds;
  }, [sessionOrders]);

  const totalYapePlin = useMemo(() => {
    const paid = sessionOrders.filter(o => o.status !== 'cancelado' && o.payment_method === 'Yape/Plin' && o.payment_status === 'pagado')
      .reduce((s, o) => s + (o.financials?.total || 0), 0);
    const refunds = sessionOrders.filter(o => o.status !== 'cancelado' && o.refund?.method === 'Yape/Plin')
      .reduce((s, o) => s + (o.refund.amount || 0), 0);
    return paid - refunds;
  }, [sessionOrders]);

  const totalPos = useMemo(() => {
    const paid = sessionOrders.filter(o => o.status !== 'cancelado' && o.payment_method === 'Tarjeta (POS)' && o.payment_status === 'pagado')
      .reduce((s, o) => s + (o.financials?.total || 0), 0);
    const refunds = sessionOrders.filter(o => o.status !== 'cancelado' && o.refund?.method === 'Tarjeta (POS)')
      .reduce((s, o) => s + (o.refund.amount || 0), 0);
    return paid - refunds;
  }, [sessionOrders]);

  const totalPendiente = useMemo(() =>
    sessionOrders.filter(o => o.status !== 'cancelado' && !['pagado', 'reembolsado', 'por_verificar'].includes(o.payment_status))
      .reduce((s, o) => s + (o.financials?.total || 0), 0), [sessionOrders]);

  const porVerificar = useMemo(() => (allOrders || []).filter(o => o.payment_status === 'por_verificar'), [allOrders]);
  const totalPorVerificar = useMemo(() => porVerificar.reduce((s, o) => s + (o.financials?.total || 0), 0), [porVerificar]);
  const totalIngresos = totalEfectivo + totalYapePlin + totalPos;

  const handleOpenSession = async () => {
    const val = parseFloat(cashOpeningBalance);
    if (cashOpeningBalance.trim() === '' || isNaN(val) || val < 0) {
      showToast('Ingresa un monto inicial válido (≥ 0)', 'error'); return;
    }
    try {
      const r = await cashService.openSession(activeBranchId, { openingBalance: val, openedBy: user?.email || 'admin', notes: cashNotes });
      if (r.success) { setShowCashModal(false); setCashOpeningBalance(''); setCashNotes(''); showToast('Sesión iniciada'); }
      else showToast(r.error || 'Error al abrir caja', 'error');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleCloseSession = async (session) => {
    const val = parseFloat(cashClosingBalance);
    if (cashClosingBalance.trim() === '' || isNaN(val) || val < 0) {
      showToast('Ingresa un monto final válido (≥ 0)', 'error'); return;
    }
    try {
      const r = await cashService.closeSession(activeBranchId, session.id, {
        closingBalance: val, expectedCash: (session.openingBalance || 0) + totalEfectivo,
        closedBy: user?.email || 'admin', notes: cashNotes,
      });
      if (r.success) { setShowCashModal(false); setCashClosingBalance(''); setCashNotes(''); showToast('Sesión cerrada'); }
      else showToast(r.error || 'Error al cerrar caja', 'error');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const isLoading = cashSessions == null;
  const isEmpty = !isLoading && !cashSessions?.length && !allOrders?.length;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-cm-error/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-cm-error" />
        </div>
        <h2 className="text-lg font-bold text-cm-text">Error al cargar caja</h2>
        <p className="text-sm text-cm-muted font-medium mt-1">{error}</p>
        <button onClick={() => setError(null)} className="mt-6 px-5 py-2.5 bg-cm-accent text-white rounded-xl text-sm font-bold hover:bg-cm-accent-hover transition-colors flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <motion.div variants={cv} initial="hidden" animate="show" className="space-y-4">
      {/* ── Hero: Total Income Bar ── */}
      <motion.div variants={iv} className="bg-cm-surface rounded-2xl border border-cm-border shadow-cm-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-[10px] font-semibold text-cm-text-secondary uppercase tracking-widest">
                {activeSession ? 'Ingresos de la sesión' : 'Total registrado'}
              </p>
              <p className="text-3xl md:text-4xl font-black text-cm-text mt-0.5 tabular-nums">
                S/ <AnimCounter value={totalIngresos} />
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeSession ? (
                <button onClick={() => { setCashClosingBalance(''); setCashNotes(''); setShowCashModal(true); }}
                  className="px-4 py-2 bg-cm-error/10 text-cm-error border border-cm-error/30 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-cm-error/20 transition-all active:scale-95">
                  Cerrar
                </button>
              ) : (
                <button onClick={() => { setCashOpeningBalance(''); setCashNotes(''); setShowCashModal(true); }}
                  className="px-4 py-2 bg-cm-success/10 text-cm-success border border-cm-success/30 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-cm-success/20 transition-all active:scale-95">
                  Abrir
                </button>
              )}
            </div>
          </div>

          {/* Session status pill */}
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
              activeSession
                ? 'bg-cm-success/10 text-cm-success ring-1 ring-cm-success/20'
                : 'bg-cm-bg-alt text-cm-text-tertiary'
            }`}>
              {activeSession ? (
                <><span className="w-1.5 h-1.5 rounded-full bg-cm-success animate-pulse" /> Abierta</>
              ) : (
                <><EyeOff className="w-3 h-3" /> Cerrada</>
              )}
            </span>
            {activeSession && (
              <span className="text-[9px] font-medium text-cm-text-secondary">
                {new Date(activeSession.openedAt).toLocaleString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Mini progress bar towards daily target (opening balance * 2 as rough target) */}
        {activeSession && (
          <div className="h-1 bg-cm-border/50">
            <div
              className="h-full bg-gradient-to-r from-cm-success to-emerald-400 rounded-r-full transition-all duration-700"
              style={{ width: `${Math.min((totalIngresos / Math.max(activeSession.openingBalance * 2, 1)) * 100, 100)}%` }}
            />
          </div>
        )}
      </motion.div>

      {/* ── Alert: sin sesión ── */}
      {!activeSession && (
        <motion.div variants={iv} className="flex items-center gap-3 bg-cm-warning/10 border border-cm-warning/30 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-cm-warning shrink-0" />
          <p className="text-sm font-semibold text-cm-warning">No hay una sesión de caja abierta. Los pedidos se registran pero no se contabilizan hasta que abras caja.</p>
        </motion.div>
      )}

      {/* ── Alert: por verificar ── */}
      {porVerificar.length > 0 && (
        <motion.div variants={iv} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 bg-cm-accent/10 border-2 border-cm-accent/30 rounded-xl px-4 py-3">
          <ShieldCheck className="w-5 h-5 text-cm-accent shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-black text-cm-accent">{porVerificar.length} pago{porVerificar.length > 1 ? 's' : ''} Yape/Plin por verificar — {formatSoles(totalPorVerificar)}</p>
            <div className="mt-2 space-y-1">
              {porVerificar.map(o => (
                <div key={o.id} className="flex justify-between items-center text-xs">
                  <span className="text-cm-accent/80 font-medium">
                    #{(o.id || '').slice(-4).toUpperCase()} — {o.customerName || 'Anónimo'}
                    {o.payment_details?.wallet_type && <span className="ml-1 uppercase font-bold">({o.payment_details.wallet_type})</span>}
                    {o.payment_details?.operation_number && <span className="ml-1 font-mono">#{o.payment_details.operation_number}</span>}
                  </span>
                  <span className="font-black text-cm-accent">{formatSoles(o.financials?.total || 0)}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-cm-accent/70 mt-2">→ Ve a Pedidos y usa el botón <strong>🛡 Verificar</strong> para confirmar cada uno.</p>
          </div>
        </motion.div>
      )}

      {/* ── KPIs Grid ── */}
      <motion.div variants={iv} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4 hover:shadow-cm-md transition-all">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-cm-success" />
            <p className="text-[10px] font-semibold text-cm-text-secondary uppercase tracking-wider">Efectivo</p>
          </div>
          <p className="text-xl md:text-2xl font-black text-cm-text tabular-nums">S/ <AnimCounter value={totalEfectivo} /></p>
          <div className="mt-1.5 flex items-center gap-1 text-[9px] font-medium text-cm-text-tertiary">
            <TrendingUp className="w-2.5 h-2.5" />
            {totalIngresos > 0 ? `${((totalEfectivo / totalIngresos) * 100).toFixed(0)}%` : '—'}
          </div>
        </div>
        <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4 hover:shadow-cm-md transition-all">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-cm-info" />
            <p className="text-[10px] font-semibold text-cm-text-secondary uppercase tracking-wider">Yape / Plin</p>
          </div>
          <p className="text-xl md:text-2xl font-black text-cm-text tabular-nums">S/ <AnimCounter value={totalYapePlin} /></p>
          <div className="mt-1.5 flex items-center gap-1 text-[9px] font-medium text-cm-text-tertiary">
            <TrendingUp className="w-2.5 h-2.5" />
            {totalIngresos > 0 ? `${((totalYapePlin / totalIngresos) * 100).toFixed(0)}%` : '—'}
          </div>
        </div>
        <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4 hover:shadow-cm-md transition-all">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-cm-accent" />
            <p className="text-[10px] font-semibold text-cm-text-secondary uppercase tracking-wider">Tarjeta (POS)</p>
          </div>
          <p className="text-xl md:text-2xl font-black text-cm-text tabular-nums">S/ <AnimCounter value={totalPos} /></p>
          <div className="mt-1.5 flex items-center gap-1 text-[9px] font-medium text-cm-text-tertiary">
            <TrendingUp className="w-2.5 h-2.5" />
            {totalIngresos > 0 ? `${((totalPos / totalIngresos) * 100).toFixed(0)}%` : '—'}
          </div>
        </div>
        <div className={`bg-cm-surface rounded-xl border shadow-cm-sm p-4 hover:shadow-cm-md transition-all ${
          totalPendiente > 0 ? 'border-cm-warning/30' : 'border-cm-border'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className={`w-4 h-4 ${totalPendiente > 0 ? 'text-cm-warning' : 'text-cm-muted'}`} />
            <p className="text-[10px] font-semibold text-cm-text-secondary uppercase tracking-wider">Pendiente</p>
          </div>
          <p className={`text-xl md:text-2xl font-black tabular-nums ${totalPendiente > 0 ? 'text-cm-warning' : 'text-cm-text-tertiary'}`}>
            {totalPendiente > 0 ? <>S/ <AnimCounter value={totalPendiente} /></> : 'S/ 0.00'}
          </p>
          <div className="mt-1.5 flex items-center gap-1 text-[9px] font-medium text-cm-text-tertiary">
            {totalPendiente > 0 ? (
              <><TrendingDown className="w-2.5 h-2.5 text-cm-warning" /> Por cobrar</>
            ) : (
              'Al día'
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Session Detail ── */}
      {activeSession && (
        <motion.div variants={iv} className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm px-5 py-3.5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-[9px] font-semibold text-cm-text-secondary uppercase tracking-wider">Inicial</p>
              <p className="text-sm font-black text-cm-text mt-0.5">{formatSoles(activeSession.openingBalance)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-cm-text-secondary uppercase tracking-wider">Ingresos</p>
              <p className="text-sm font-black text-cm-success mt-0.5">{formatSoles(totalIngresos)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-cm-text-secondary uppercase tracking-wider">Pedidos</p>
              <p className="text-sm font-black text-cm-text mt-0.5"><IntCounter value={sessionOrders.filter(o => o.payment_status === 'pagado').length} /></p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-cm-text-secondary uppercase tracking-wider">Esperado</p>
              <p className="text-sm font-black text-cm-accent mt-0.5">{formatSoles((activeSession.openingBalance || 0) + totalEfectivo)}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── History Table ── */}
      <motion.div variants={iv} className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm overflow-hidden">
        <div className="p-4 border-b border-cm-border">
          <h3 className="text-sm font-bold text-cm-text">Historial de caja</h3>
        </div>
        {!cashSessions?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="w-10 h-10 text-cm-muted mb-3" />
            <p className="text-sm font-medium text-cm-text-secondary">No hay sesiones de caja registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cm-border bg-cm-bg-alt">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Apertura</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Cierre</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Inicial</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Final</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Diferencia</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cm-border">
                {cashSessions.map(s => (
                  <tr key={s.id} className="hover:bg-cm-accent/5 transition-colors">
                    <td className="px-4 py-3 text-xs text-cm-text-secondary">{new Date(s.openedAt).toLocaleString('es-PE')}</td>
                    <td className="px-4 py-3 text-xs text-cm-text-secondary">{s.closedAt ? new Date(s.closedAt).toLocaleString('es-PE') : '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatSoles(s.openingBalance || 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatSoles(s.closingBalance || 0)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${(s.difference || 0) !== 0 ? 'text-cm-warning' : 'text-cm-success'}`}>
                      {s.difference != null ? formatSoles(s.difference) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === 'open' ? 'bg-cm-success/10 text-cm-success' : 'bg-cm-bg-alt text-cm-text-secondary'
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
      </motion.div>

      {/* ── Modal ── */}
      <AnimatePresence>
        {showCashModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCashModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              {activeSession ? (
                <>
                  <h3 className="text-lg font-bold text-cm-text mb-4">Cerrar Caja</h3>
                  <div className="space-y-4">
                    <div className="bg-cm-bg-alt p-4 rounded-lg space-y-2 text-sm">
                      <p className="flex justify-between"><span className="text-cm-text-secondary">Efectivo:</span><span className="font-semibold text-cm-success">{formatSoles(totalEfectivo)}</span></p>
                      <p className="flex justify-between"><span className="text-cm-text-secondary">Yape/Plin:</span><span className="font-semibold text-cm-info">{formatSoles(totalYapePlin)}</span></p>
                      <p className="flex justify-between"><span className="text-cm-text-secondary">Tarjeta (POS):</span><span className="font-semibold text-cm-accent">{formatSoles(totalPos)}</span></p>
                      {totalPendiente > 0 && (
                        <p className="flex justify-between"><span className="text-cm-text-secondary">Pendiente:</span><span className="font-semibold text-cm-warning">{formatSoles(totalPendiente)}</span></p>
                      )}
                      <div className="border-t border-cm-border pt-2 mt-2">
                        <p className="flex justify-between"><span className="text-cm-text-secondary">Total ingresos:</span><span className="font-semibold text-cm-text">{formatSoles(totalIngresos)}</span></p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Monto final (efectivo)</label>
                      <input type="number" step="0.01" value={cashClosingBalance} onChange={e => setCashClosingBalance(e.target.value)}
                        className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Notas</label>
                      <textarea value={cashNotes} onChange={e => setCashNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm text-cm-text focus:outline-none focus:border-cm-accent" rows={2} placeholder="Observaciones..." />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowCashModal(false)} className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover">Cancelar</button>
                      <button onClick={() => handleCloseSession(activeSession)} className="flex-1 py-2 bg-cm-error text-white text-sm font-semibold rounded-lg hover:bg-cm-error/80">Cerrar Caja</button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-cm-text mb-4">Abrir Caja</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Monto inicial</label>
                      <input type="number" step="0.01" value={cashOpeningBalance} onChange={e => setCashOpeningBalance(e.target.value)}
                        className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Notas</label>
                      <textarea value={cashNotes} onChange={e => setCashNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm text-cm-text focus:outline-none focus:border-cm-accent" rows={2} placeholder="Opcional..." />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowCashModal(false)} className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover">Cancelar</button>
                      <button onClick={handleOpenSession} className="flex-1 py-2 bg-cm-success text-white text-sm font-semibold rounded-lg hover:bg-cm-success/80">Abrir Caja</button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
