import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { cashService } from '../../lib/cashService';
import { formatCurrency } from '../../lib/format';
import { useToast } from '../../components/ToastContext';

export default function CajaTab({ cashSessions, allOrders, activeBranchId, user }) {
  const { showToast } = useToast();
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashOpeningBalance, setCashOpeningBalance] = useState('');
  const [cashClosingBalance, setCashClosingBalance] = useState('');
  const [cashNotes, setCashNotes] = useState('');

  const activeSession = cashSessions.find(s => s.status === 'open');
  
  const sessionOrders = useMemo(() => {
    if (!activeSession) return [];
    return allOrders.filter(o => {
      const createdAt = new Date(o.createdAt).getTime();
      return createdAt >= activeSession.openedAt;
    });
  }, [allOrders, activeSession]);

  // 1. Efectivo: Pedidos no cancelados, pagados en efectivo, restando reembolsos en efectivo
  const cashPaidTotal = useMemo(() => sessionOrders
    .filter(o => o.status !== 'cancelado' && o.payment_method === 'Efectivo' && o.payment_status === 'pagado')
    .reduce((s, o) => s + (o.financials?.total || 0), 0), [sessionOrders]);
    
  const cashRefundsTotal = useMemo(() => sessionOrders
    .filter(o => o.status !== 'cancelado' && o.refund && o.refund.method === 'Efectivo')
    .reduce((s, o) => s + (o.refund.amount || 0), 0), [sessionOrders]);

  const totalEfectivo = cashPaidTotal - cashRefundsTotal;

  // 2. Yape/Plin: Pedidos no cancelados, pagados por Yape/Plin, restando reembolsos en Yape/Plin
  const yapePlinPaidTotal = useMemo(() => sessionOrders
    .filter(o => o.status !== 'cancelado' && o.payment_method === 'Yape/Plin' && o.payment_status === 'pagado')
    .reduce((s, o) => s + (o.financials?.total || 0), 0), [sessionOrders]);

  const yapePlinRefundsTotal = useMemo(() => sessionOrders
    .filter(o => o.status !== 'cancelado' && o.refund && o.refund.method === 'Yape/Plin')
    .reduce((s, o) => s + (o.refund.amount || 0), 0), [sessionOrders]);

  const totalYapePlin = yapePlinPaidTotal - yapePlinRefundsTotal;

  // 3. Tarjeta (POS): Pedidos no cancelados, pagados con POS, restando reembolsos en POS
  const posPaidTotal = useMemo(() => sessionOrders
    .filter(o => o.status !== 'cancelado' && o.payment_method === 'Tarjeta (POS)' && o.payment_status === 'pagado')
    .reduce((s, o) => s + (o.financials?.total || 0), 0), [sessionOrders]);

  const posRefundsTotal = useMemo(() => sessionOrders
    .filter(o => o.status !== 'cancelado' && o.refund && o.refund.method === 'Tarjeta (POS)')
    .reduce((s, o) => s + (o.refund.amount || 0), 0), [sessionOrders]);

  const totalPos = posPaidTotal - posRefundsTotal;

  // 4. Pendiente: Pedidos no cancelados de la sesión que NO están pagados ni reembolsados ni por verificar
  const totalPendiente = useMemo(() => sessionOrders
    .filter(o => o.status !== 'cancelado' && o.payment_status !== 'pagado' && o.payment_status !== 'reembolsado' && o.payment_status !== 'por_verificar')
    .reduce((s, o) => s + (o.financials?.total || 0), 0), [sessionOrders]);

  // 5. Alerta de pagos por verificar Yape/Plin (global sobre todos los pedidos de la sucursal, no solo la sesión)
  const porVerificar = useMemo(() => allOrders.filter(o => o.payment_status === 'por_verificar'), [allOrders]);
  const totalPorVerificar = useMemo(() => porVerificar.reduce((s, o) => s + (o.financials?.total || 0), 0), [porVerificar]);

  const totalIngresos = totalEfectivo + totalYapePlin + totalPos;

  const handleOpenSession = async () => {
    const openingVal = parseFloat(cashOpeningBalance);
    if (cashOpeningBalance.trim() === '' || isNaN(openingVal) || openingVal < 0) {
      showToast('Por favor, ingresa un monto inicial válido (mayor o igual a 0)', 'error');
      return;
    }
    try {
      const result = await cashService.openSession(activeBranchId, {
        openingBalance: openingVal,
        openedBy: user?.email || 'admin',
        notes: cashNotes,
      });
      if (result.success) {
        setShowCashModal(false);
        setCashOpeningBalance('');
        setCashNotes('');
        showToast('Sesión iniciada');
      } else {
        showToast(result.error || 'Error al abrir caja', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error al abrir caja', 'error');
    }
  };

  const handleCloseSession = async (session) => {
    const balanceVal = parseFloat(cashClosingBalance);
    if (cashClosingBalance.trim() === '' || isNaN(balanceVal) || balanceVal < 0) {
      showToast('Por favor, ingresa un monto final válido (mayor o igual a 0)', 'error');
      return;
    }
    const expectedCash = (session.openingBalance || 0) + totalEfectivo;
    try {
      const result = await cashService.closeSession(activeBranchId, session.id, {
        closingBalance: balanceVal,
        expectedCash,
        closedBy: user?.email || 'admin',
        notes: cashNotes,
      });
      if (result.success) {
        setShowCashModal(false);
        setCashClosingBalance('');
        setCashNotes('');
        showToast('Sesión cerrada');
      } else {
        showToast(result.error || 'Error al cerrar caja', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error al cerrar caja', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-cm-text">Caja</h2>
        <div className="flex items-center gap-2">
          {activeSession ? (
            <button onClick={() => { setCashClosingBalance(''); setCashNotes(''); setShowCashModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-cm-error text-white text-sm font-semibold rounded-lg hover:bg-cm-error/80 transition-colors">
              Cerrar Caja
            </button>
          ) : (
            <button onClick={() => { setCashOpeningBalance(''); setCashNotes(''); setShowCashModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-cm-success text-white text-sm font-semibold rounded-lg hover:bg-cm-success/80 transition-colors">
              Abrir Caja
            </button>
          )}
        </div>
      </div>

      {!activeSession && (
        <div className="flex items-center gap-3 bg-cm-warning/10 border border-cm-warning/30 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-cm-warning shrink-0" />
          <p className="text-sm font-semibold text-cm-warning">No hay una sesion de caja abierta. Los pedidos se estan registrando pero no se contabilizan hasta que abras caja.</p>
        </div>
      )}

      {/* Por Verificar Alert */}
      {porVerificar.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 bg-cm-accent/10 border-2 border-cm-accent/30 rounded-xl px-4 py-3"
        >
          <ShieldCheck className="w-5 h-5 text-cm-accent shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-black text-cm-accent">
              {porVerificar.length} pago{porVerificar.length > 1 ? 's' : ''} de Yape/Plin por verificar — {formatCurrency(totalPorVerificar)}
            </p>
            <div className="mt-2 space-y-1">
              {porVerificar.map(o => (
                <div key={o.id} className="flex justify-between items-center text-xs">
                  <span className="text-cm-accent/80 font-medium">
                    #{(o.id || '').slice(-4).toUpperCase()} — {o.customerName || 'Anónimo'}
                    {o.payment_details?.wallet_type && <span className="ml-1 uppercase font-bold">({o.payment_details.wallet_type})</span>}
                    {o.payment_details?.operation_number && <span className="ml-1 font-mono">#{o.payment_details.operation_number}</span>}
                  </span>
                  <span className="font-black text-cm-accent">{formatCurrency((o.financials?.total || 0))}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-cm-accent/70 mt-2">→ Ve a Pedidos y usa el botón <strong>🛡 Verificar</strong> para confirmar cada uno.</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4">
          <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Efectivo</p>
          <p className="text-2xl font-extrabold text-cm-success">{formatCurrency(totalEfectivo)}</p>
        </div>
        <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4">
          <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Yape / Plin</p>
          <p className="text-2xl font-extrabold text-cm-info">{formatCurrency(totalYapePlin)}</p>
        </div>
        <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4">
          <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Tarjeta (POS)</p>
          <p className="text-2xl font-extrabold text-cm-accent">{formatCurrency(totalPos)}</p>
        </div>
        <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4">
          <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Pendiente</p>
          <p className={`text-2xl font-extrabold ${totalPendiente > 0 ? 'text-cm-warning' : 'text-cm-text-tertiary'}`}>
            {totalPendiente > 0 ? formatCurrency(totalPendiente) : '—'}
          </p>
        </div>
        {porVerificar.length > 0 && (
          <div className="bg-cm-accent/5 rounded-xl border-2 border-cm-accent/30 shadow-cm-sm p-4 col-span-2 md:col-span-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-cm-accent uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 animate-pulse" /> Por Verificar (Yape/Plin)
              </p>
              <p className="text-2xl font-extrabold text-cm-accent">{formatCurrency(totalPorVerificar)}</p>
            </div>
            <p className="text-[10px] text-cm-accent/60 mt-1">{porVerificar.length} pedido{porVerificar.length > 1 ? 's' : ''} pendiente{porVerificar.length > 1 ? 's' : ''} de confirmación</p>
          </div>
        )}
      </div>

      <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-cm-text">
            {activeSession ? 'Caja abierta' : 'Caja cerrada'}
          </h3>
          {activeSession && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-cm-success">
              <span className="w-2 h-2 bg-cm-success rounded-full animate-pulse" />
              Abierta desde {new Date(activeSession.openedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="text-sm text-cm-text-secondary">
          {activeSession ? (
            <p>Monto inicial: <strong className="text-cm-text">{formatCurrency(activeSession.openingBalance)}</strong></p>
          ) : (
            <p>No hay una sesion de caja abierta. Abre una para registrar los movimientos del dia.</p>
          )}
        </div>
      </div>

      <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm overflow-hidden">
        <div className="p-4 border-b border-cm-border">
          <h3 className="text-sm font-semibold text-cm-text">Historial de caja</h3>
        </div>
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
                  <td className="px-4 py-3 text-xs text-cm-text-secondary">{s.closedAt ? new Date(s.closedAt).toLocaleString('es-PE') : '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency((s.openingBalance || 0))}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency((s.closingBalance || 0))}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${(s.difference || 0) !== 0 ? 'text-cm-warning' : 'text-cm-success'}`}>
                    {s.difference != null ? formatCurrency(s.difference) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`bdg ${s.status === 'open' ? 'bdg-success' : 'bdg-neutral'}`}>
                      {s.status === 'open' ? 'Abierta' : 'Cerrada'}
                    </span>
                  </td>
                </tr>
              ))}
              {!cashSessions.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-cm-text-secondary">No hay sesiones de caja registradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showCashModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCashModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              {activeSession ? (
                <>
                  <h3 className="text-lg font-bold text-cm-text mb-4">Cerrar Caja</h3>
                  <div className="space-y-4">
                    <div className="bg-cm-bg-alt p-4 rounded-lg space-y-2 text-sm">
                      <p className="flex justify-between"><span className="text-cm-text-secondary">Ingresos del dia (Efectivo):</span><span className="font-semibold text-cm-success">{formatCurrency(totalEfectivo)}</span></p>
                      <p className="flex justify-between"><span className="text-cm-text-secondary">Yape/Plin:</span><span className="font-semibold text-cm-info">{formatCurrency(totalYapePlin)}</span></p>
                      <p className="flex justify-between"><span className="text-cm-text-secondary">Tarjeta (POS):</span><span className="font-semibold text-cm-accent">{formatCurrency(totalPos)}</span></p>
                      {totalPendiente > 0 && (
                        <p className="flex justify-between"><span className="text-cm-text-secondary">Pendiente de cobro:</span><span className="font-semibold text-cm-warning">{formatCurrency(totalPendiente)}</span></p>
                      )}
                      <div className="border-t border-cm-border pt-2 mt-2">
                        <p className="flex justify-between"><span className="text-cm-text-secondary">Total ingresos:</span><span className="font-semibold text-cm-text">{formatCurrency(totalIngresos)}</span></p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Monto final en caja (efectivo)</label>
                      <input type="number" step="0.01" value={cashClosingBalance} onChange={e => setCashClosingBalance(e.target.value)} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Notas</label>
                      <textarea value={cashNotes} onChange={e => setCashNotes(e.target.value)} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm text-cm-text focus:outline-none focus:border-cm-accent transition-colors" rows={2} placeholder="Observaciones..." />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowCashModal(false)} className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
                      <button onClick={() => handleCloseSession(activeSession)} className="flex-1 py-2 bg-cm-error text-white text-sm font-semibold rounded-lg hover:bg-cm-error/80 transition-colors">Cerrar Caja</button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-cm-text mb-4">Abrir Caja</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Monto inicial en caja</label>
                      <input type="number" step="0.01" value={cashOpeningBalance} onChange={e => setCashOpeningBalance(e.target.value)} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Notas</label>
                      <textarea value={cashNotes} onChange={e => setCashNotes(e.target.value)} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm text-cm-text focus:outline-none focus:border-cm-accent transition-colors" rows={2} placeholder="Opcional..." />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowCashModal(false)} className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
                      <button onClick={handleOpenSession} className="flex-1 py-2 bg-cm-success text-white text-sm font-semibold rounded-lg hover:bg-cm-success/80 transition-colors">Abrir Caja</button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
