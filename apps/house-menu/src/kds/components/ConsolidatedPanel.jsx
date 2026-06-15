import React, { useMemo, useState } from 'react';
import { ChefHat, ChevronRight, ChevronDown, Flame } from 'lucide-react';
import { cn } from '../../lib/utils';

const RANK_COLORS = [
  { badge: 'bg-cm-accent text-white shadow-sm', row: 'border-l-2 border-cm-accent/40' },
  { badge: 'bg-cm-warning text-white shadow-sm', row: 'border-l-2 border-cm-warning/30' },
  { badge: 'bg-cm-success text-white shadow-sm', row: 'border-l-2 border-cm-success/30' },
];
const DEFAULT_RANK = { badge: 'bg-cm-muted/20 text-cm-muted', row: '' };

export default function ConsolidatedPanel({ activeOrders, activeStation }) {
  const [isOpen, setIsOpen] = useState(true);

  const consolidatedItems = useMemo(() => {
    const counts = {};

    activeOrders.forEach((order) => {
      // Solo consolidar pedidos que se están preparando o recién recibidos
      if (order.status !== 'recibido' && order.status !== 'preparando') return;

      order.items?.forEach((item) => {
        // Si hay filtro de estación activo, filtrar los ítems individuales
        if (activeStation !== 'all' && item.station !== activeStation) return;

        const key = item.name;
        if (!counts[key]) {
          counts[key] = {
            name: item.name,
            quantity: 0,
            details: new Set(),
            station: item.station,
          };
        }
        counts[key].quantity += item.quantity || 1;
        
        // Agregar detalles como modificaciones para tener contexto
        if (item.details?.length > 0) {
          item.details.forEach(d => counts[key].details.add(d));
        }
      });
    });

    return Object.values(counts).sort((a, b) => b.quantity - a.quantity);
  }, [activeOrders, activeStation]);

  if (consolidatedItems.length === 0) return null;

  const totalQty = consolidatedItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl shadow-cm-sm transition-all duration-300 flex flex-col max-h-[30vh] md:max-h-none md:h-full overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-cm-border hover:bg-cm-surface-hover transition-colors select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cm-accent/10 flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-cm-accent" />
          </div>
          <div className="text-left">
            <h2 className="font-black text-sm tracking-tight text-cm-text uppercase leading-none">Consolidado</h2>
            <p className="text-[0.6rem] text-cm-muted font-semibold mt-0.5">{totalQty} unidades · {consolidatedItems.length} platos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 bg-cm-accent text-white text-xs font-black px-2.5 py-1 rounded-full">
            <Flame className="w-3 h-3" />
            {totalQty}
          </span>
          {isOpen ? <ChevronDown className="w-4 h-4 text-cm-muted/50" /> : <ChevronRight className="w-4 h-4 text-cm-muted/50" />}
        </div>
      </button>

      {isOpen && (
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-hide">
          {consolidatedItems.map((item, idx) => {
            const rankStyle = RANK_COLORS[idx] ?? DEFAULT_RANK;
            return (
              <div
                key={idx}
                className={cn(
                  'flex items-center justify-between gap-3 px-3 py-2.5 bg-cm-bg-alt/30 border border-cm-border/50 rounded-lg hover:border-cm-border transition-all',
                  rankStyle.row
                )}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-sm text-cm-text leading-tight block">{item.name}</span>
                  {item.details.size > 0 && (
                    <div className="mt-0.5">
                      {Array.from(item.details).slice(0, 2).map((detail, dIdx) => (
                        <p key={dIdx} className="text-[0.6rem] text-cm-muted/70 italic truncate">
                          ↳ {detail}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <span className={cn(
                  'flex items-center justify-center min-w-[2.5rem] h-9 px-2 rounded-lg font-black text-lg shrink-0',
                  rankStyle.badge
                )}>
                  ×{item.quantity}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
