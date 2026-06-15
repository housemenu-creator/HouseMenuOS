import { History, CalendarDays } from 'lucide-react';
import KDSTicket from './KDSTicket';
import AnalyticsPanel from './AnalyticsPanel';

const DATE_FILTERS = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'all', label: 'Todo' },
];

export default function HistoryPanel({ orders, filteredOrders, dateFilter, onDateFilterChange }) {
  return (
    <div className="h-full overflow-y-auto pr-2 pb-10 scrollbar-hide">
      <AnalyticsPanel orders={orders} />
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="w-4 h-4 text-cm-muted/30" />
        {DATE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => onDateFilterChange(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              dateFilter === f.key
                ? 'bg-cm-accent text-white shadow-cm-md'
                : 'bg-cm-muted/5 text-cm-muted/50 hover:bg-cm-muted/10 hover:text-cm-muted/70 border border-cm-border/10'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="text-[0.6rem] text-cm-muted/30 ml-auto">
          {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-20 text-center text-cm-muted">
            <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No hay pedidos despachados aún.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <KDSTicket key={order.id} order={order} isHistory={true} />
          ))
        )}
      </div>
    </div>
  );
}
