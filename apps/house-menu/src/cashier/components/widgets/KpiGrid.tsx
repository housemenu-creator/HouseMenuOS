import { motion } from 'framer-motion';
import { DollarSign, Wallet, Smartphone, CreditCard, Clock, AlertTriangle } from 'lucide-react';

interface KpiGridProps {
  totalEfectivo: number;
  totalYapePlin: number;
  totalPos: number;
  totalPendiente: number;
  totalPorVerificar: number;
  totalIngresos: number;
  expectedCash: number;
  paidCount: number;
  averageTicket: number;
}

const kpiCards = [
  { key: 'efectivo', label: 'Efectivo', Icon: Wallet, color: 'var(--cashier-success)', value: 0 },
  { key: 'yape', label: 'Yape/Plin', Icon: Smartphone, color: 'var(--cashier-info)', value: 0 },
  { key: 'pos', label: 'Tarjeta', Icon: CreditCard, color: 'var(--cashier-accent)', value: 0 },
  { key: 'pendiente', label: 'Pendiente', Icon: Clock, color: 'var(--cashier-warning)', value: 0 },
  { key: 'porVerificar', label: 'Por Verificar', Icon: AlertTriangle, color: 'var(--cashier-error)', value: 0 },
  { key: 'total', label: 'Total', Icon: DollarSign, color: 'var(--cashier-text)', value: 0 },
];

export function KpiGrid(props: KpiGridProps) {
  const items = [
    { ...kpiCards[0], value: props.totalEfectivo },
    { ...kpiCards[1], value: props.totalYapePlin },
    { ...kpiCards[2], value: props.totalPos },
    { ...kpiCards[3], value: props.totalPendiente },
    { ...kpiCards[4], value: props.totalPorVerificar },
    { ...kpiCards[5], value: props.totalIngresos },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      {items.map((item, i) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.2 }}
          className="cashier-panel bg-[var(--cashier-surface)] border border-[var(--cashier-border)] rounded-xl p-3"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <item.Icon size={12} style={{ color: item.color }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: item.color }}>
              {item.label}
            </span>
          </div>
          <p className="text-lg font-mono font-black text-[var(--cashier-text)]">
            S/ {item.value.toFixed(2)}
            {item.key === 'total' && props.paidCount > 0 && (
              <span className="text-[10px] font-bold text-[var(--cashier-text-secondary)] ml-1">
                ({props.paidCount} ops)
              </span>
            )}
          </p>
          {item.key === 'total' && (
            <p className="text-[10px] font-bold text-[var(--cashier-text-secondary)] mt-0.5">
              Ticket prom.: S/ {props.averageTicket.toFixed(2)}
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
