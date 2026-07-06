import type { DisplayMode } from '../types';

interface CashierDisplayProps {
  total: number;
  itemCount: number;
  mode: DisplayMode;
  change?: number;
  statusText?: string;
  clock?: string;
  sessionStatus?: string;
}

function formatAmount(val: number): string {
  return val.toFixed(2);
}

export function CashierDisplay({
  total,
  itemCount,
  mode,
  change,
  statusText,
  clock,
  sessionStatus,
}: CashierDisplayProps) {
  const renderContent = () => {
    switch (mode) {
      case 'total':
        return (
          <>
            <div className="text-[10px] tracking-[0.2em] font-bold" style={{ color: 'var(--cashier-text-muted)' }}>
              {statusText || 'TOTAL'}
            </div>
            <div className="cashier-display-text text-4xl md:text-5xl font-black tracking-wider my-1">
              {formatAmount(total)}
            </div>
            <div className="text-xs tracking-widest font-bold" style={{ color: 'var(--cashier-text-secondary)' }}>
              {itemCount} {itemCount === 1 ? 'ARTÍCULO' : 'ARTÍCULOS'}
            </div>
          </>
        );

      case 'payment':
        return (
          <>
            <div className="text-[10px] tracking-[0.2em] font-bold" style={{ color: 'var(--cashier-text-muted)' }}>
              {change !== undefined ? 'VUELTO' : 'TOTAL A PAGAR'}
            </div>
            <div className="cashier-display-text text-4xl md:text-5xl font-black tracking-wider my-1">
              {formatAmount(change !== undefined ? change : total)}
            </div>
            {change !== undefined && (
              <div className="text-xs tracking-widest font-bold" style={{ color: 'var(--cashier-success)' }}>
                PAGADO: {formatAmount(total)}
              </div>
            )}
          </>
        );

      case 'closed':
        return (
          <>
            <div className="cashier-display-text text-3xl font-black tracking-[0.3em] mt-2" style={{ color: 'var(--cashier-text-muted)' }}>
              CAJA CERRADA
            </div>
            {statusText && (
              <div className="text-xs mt-1" style={{ color: 'var(--cashier-text-secondary)' }}>
                {statusText}
              </div>
            )}
          </>
        );

      case 'idle':
        return (
          <>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--cashier-success)' }} />
              <span className="cashier-display-text text-2xl font-black tracking-[0.2em]">
                {statusText || 'LISTO'}
              </span>
            </div>
          </>
        );
    }
  };

  return (
    <div className="cashier-display w-full px-5 py-4">
      <div className="flex flex-col items-center text-center">
        {renderContent()}
        <div className="w-full mt-2 pt-2 border-t" style={{ borderColor: '#2A2A2A' }}>
          <div className="flex items-center justify-between text-[10px] font-bold tracking-wider" style={{ color: 'var(--cashier-text-muted)' }}>
            <span>{sessionStatus || ''}</span>
            <span className="font-mono">{clock || ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
