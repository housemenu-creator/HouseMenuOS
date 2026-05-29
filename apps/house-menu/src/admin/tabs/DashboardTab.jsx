import { Clock, DollarSign, TrendingUp, TrendingDown, Package } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import FunnelRow from '../components/FunnelRow';
import StatusBadge from '../components/StatusBadge';

export default function DashboardTab({ kpiData, funnelData, kioskEnabled, toggleKiosk, allOrders, now, activeBranchName }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-cm-text">Dashboard</h2>
          <p className="text-xs text-cm-text-secondary mt-0.5">{activeBranchName}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-cm-text-secondary">
          <Clock className="w-4 h-4" />
          <span className="font-medium">{now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs font-medium">{kioskEnabled ? 'Kiosko activo' : 'Kiosko apagado'}</span>
            <button onClick={toggleKiosk} className={`toggle-cm ${kioskEnabled ? 'active' : ''}`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Ingresos hoy" value={`S/ ${kpiData.revenue.toFixed(2)}`} sub="Procesado en el dia" icon={<DollarSign className="w-4 h-4" />} iconClass="icon-success" />
        <KpiCard label="Ticket promedio" value={`S/ ${kpiData.avgTicket.toFixed(2)}`} sub="Por pedido" icon={<TrendingUp className="w-4 h-4" />} iconClass="icon-info" />
        <KpiCard label="Proyectado" value={`S/ ${kpiData.projected.toFixed(2)}`} sub="Estimado fin de dia" icon={<TrendingDown className="w-4 h-4" />} iconClass="icon-warning" />
        <KpiCard label="Pedidos activos" value={kpiData.activeOrders} sub="En preparacion / ruta" icon={<Package className="w-4 h-4" />} iconClass="icon-accent" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-cm-surface rounded-xl shadow-cm-sm p-[--cm-space-md]">
          <span className="text-[0.65rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-4 block">Funnel de pedidos</span>
          <div className="space-y-3">
            {funnelData.map(s => <FunnelRow key={s.key} icon={s.icon} label={s.label} count={s.count} barColor={s.color} total={s.total} />)}
          </div>
        </div>

        <div className="bg-cm-surface rounded-xl shadow-cm-sm p-[--cm-space-md]">
          <span className="text-[0.65rem] font-semibold text-cm-text-secondary uppercase tracking-wider mb-4 block">Ultimos pedidos</span>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allOrders.slice(0, 10).map(o => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-cm-border last:border-0">
                <div className="flex items-center gap-3">
                  <StatusBadge status={o.status} />
                  <div>
                    <p className="text-sm font-semibold text-cm-text">{o.customerName || 'Anonimo'}</p>
                    <p className="text-xs text-cm-text-secondary">S/ {(o.financials?.total || 0).toFixed(2)}</p>
                  </div>
                </div>
                <span className="text-xs text-cm-text-secondary">{new Date(o.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
            {!allOrders.length && <p className="text-sm text-cm-text-secondary text-center py-4">No hay pedidos hoy</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
