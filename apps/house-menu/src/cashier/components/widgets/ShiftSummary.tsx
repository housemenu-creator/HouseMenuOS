import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText } from 'lucide-react';
import type { KPIs } from '../../services/calculator';
import { buildShiftReport, generateShiftCSV, generateShiftSummary, downloadCSV, downloadText } from '../../services/reportGenerator';

interface ShiftSummaryProps {
  openingBalance: number;
  totalEfectivo: number;
  totalYapePlin: number;
  totalPos: number;
  totalIngresos: number;
  expectedCash: number;
  closingBalance?: number;
  difference?: number;
  paidCount: number;
  cancelledCount: number;
  openedAt: number;
  closedAt?: number;
  /** KPIs object for full report generation — if provided, enables CSV/print export */
  kpis?: KPIs;
  /** Session ID for report filename */
  sessionId?: string;
}

export function ShiftSummary(props: ShiftSummaryProps) {
  const {
    openingBalance, totalEfectivo, totalYapePlin, totalPos, totalIngresos,
    expectedCash, closingBalance, difference: diffProp, paidCount, cancelledCount,
    openedAt, closedAt, kpis, sessionId,
  } = props;

  const diff = diffProp ?? (closingBalance != null ? closingBalance - expectedCash : null);
  const reportLabel = sessionId ? `turno-${sessionId.slice(-8)}` : 'turno';

  const handleExportCSV = useCallback(() => {
    if (!kpis) return;
    const report = buildShiftReport(kpis, {
      id: sessionId || 'unknown', openedAt, closedAt: closedAt ?? null,
      openingBalance, closingBalance: closingBalance ?? null, expectedCash,
    });
    const csv = generateShiftCSV(report);
    downloadCSV(csv, `reporte-${reportLabel}`);
  }, [kpis, sessionId, openedAt, closedAt, openingBalance, closingBalance, expectedCash, reportLabel]);

  const handlePrint = useCallback(() => {
    if (!kpis) return;
    const report = buildShiftReport(kpis, {
      id: sessionId || 'unknown', openedAt, closedAt: closedAt ?? null,
      openingBalance, closingBalance: closingBalance ?? null, expectedCash,
    });
    const text = generateShiftSummary(report);
    downloadText(text, `reporte-${reportLabel}`);
  }, [kpis, sessionId, openedAt, closedAt, openingBalance, closingBalance, expectedCash, reportLabel]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="cashier-panel border border-[var(--cashier-border)] rounded-2xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-[var(--cashier-border)] bg-[var(--cashier-surface)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--cashier-text)]">
              Resumen de Turno
            </h3>
            <p className="text-[10px] font-bold text-[var(--cashier-text-secondary)] mt-0.5">
              Abierto: {new Date(openedAt).toLocaleString('es-PE')}
            </p>
          </div>
          {kpis && (
            <div className="flex gap-1.5">
              <button onClick={handleExportCSV}
                className="flex items-center gap-1 px-2.5 py-1.5 border border-[var(--cashier-border)] text-[var(--cashier-text-secondary)] text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-[var(--cashier-bg)] hover:border-[var(--cashier-accent)] transition-all"
                title="Exportar CSV">
                <Download size={12} /> CSV
              </button>
              <button onClick={handlePrint}
                className="flex items-center gap-1 px-2.5 py-1.5 border border-[var(--cashier-border)] text-[var(--cashier-text-secondary)] text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-[var(--cashier-bg)] hover:border-[var(--cashier-accent)] transition-all"
                title="Exportar TXT">
                <FileText size={12} /> TXT
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        <Row label="Saldo Inicial" value={openingBalance} />
        <div className="border-t border-[var(--cashier-border)]/50 pt-3 space-y-2">
          <Row label="Efectivo" value={totalEfectivo} color="var(--cashier-success)" />
          <Row label="Yape/Plin" value={totalYapePlin} color="var(--cashier-info)" />
          <Row label="Tarjeta (POS)" value={totalPos} color="var(--cashier-accent)" />
        </div>
        <Row label="Total Ingresos" value={totalIngresos} large />
        <Row label="Esperado en Caja" value={expectedCash} />
        <div className="border-t border-[var(--cashier-border)]/50 pt-3" />

        {diff !== null && (
          <div className={`flex items-center justify-between ${diff === 0 ? 'text-[var(--cashier-success)]' : Math.abs(diff) < 1 ? 'text-[var(--cashier-warning)]' : 'text-[var(--cashier-error)]'}`}>
            <span className="text-xs font-bold uppercase tracking-wider">Diferencia</span>
            <span className="font-mono font-black text-lg">
              {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex justify-between text-[10px] font-bold text-[var(--cashier-text-secondary)] pt-1">
          <span>{paidCount} cobros</span>
          <span>{cancelledCount} cancelaciones</span>
        </div>
      </div>
    </motion.div>
  );
}

function Row({ label, value, color, large }: {
  label: string;
  value: number;
  color?: string;
  large?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs font-bold uppercase tracking-wider ${color ? '' : 'text-[var(--cashier-text-secondary)]'}`}
        style={color ? { color } : undefined}>
        {label}
      </span>
      <span className={`font-mono ${large ? 'text-lg' : 'text-sm'} font-black text-[var(--cashier-text)]`}
        style={color ? { color } : undefined}>
        S/ {value.toFixed(2)}
      </span>
    </div>
  );
}
