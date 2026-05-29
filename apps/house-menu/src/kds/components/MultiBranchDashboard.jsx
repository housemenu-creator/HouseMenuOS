import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Store, DollarSign, Activity, ShoppingBag, TrendingUp, ChevronDown, ChevronRight, Globe } from 'lucide-react';
import { useBranch } from '../../context/BranchContext';
import { useMultiBranchOrders } from '../hooks/useMultiBranchOrders';
import EmptyState from '../../components/EmptyState';

function KpiCard({ icon, label, value, sub, color }) {
  return (
    <div className={`bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border p-5 border-l-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-cm-muted uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-extrabold text-cm-text mt-1">{value}</p>
          {sub && <p className="text-xs text-cm-muted mt-0.5">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg bg-cm-border">{icon}</div>
      </div>
    </div>
  );
}

export default function MultiBranchDashboard() {
  const { branches, setActiveBranchId } = useBranch();
  const { summary, loading } = useMultiBranchOrders(branches);
  const [expandedBranch, setExpandedBranch] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-cm-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const branchCount = Object.keys(summary.branchKpis).length;

  return (
    <div className="animate-[fadeIn_0.4s_ease] space-y-8 max-w-6xl mx-auto">
      {/* Global KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KpiCard
          icon={<Globe className="w-5 h-5 text-cm-info" />}
          label="Sucursales"
          value={branchCount}
          sub={`${branches.length} registradas`}
          color="border-l-blue-500"
        />
        <KpiCard
          icon={<ShoppingBag className="w-5 h-5 text-cm-accent" />}
          label="Total Pedidos"
          value={summary.totalOrders}
          sub={`${summary.totalActive} activos`}
          color="border-l-cm-accent"
        />
        <KpiCard
          icon={<DollarSign className="w-5 h-5 text-cm-success" />}
          label="Ingresos Totales"
          value={`S/ ${summary.totalRevenue.toFixed(2)}`}
          color="border-l-green-500"
        />
        <KpiCard
          icon={<Activity className="w-5 h-5 text-cm-accent" />}
          label="Promedio Global"
          value={branchCount > 0 ? `S/ ${(summary.totalRevenue / branchCount).toFixed(2)}` : 'S/ 0.00'}
          sub="por sucursal"
          color="border-l-cm-accent"
        />
      </div>

      {/* Branch detail cards */}
      {Object.keys(summary.branchKpis).length === 0 ? (
        <EmptyState icon={Store} title="Sin datos" description="No hay sucursales con actividad registrada." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Object.entries(summary.branchKpis).map(([id, kpi]) => {
            const isExpanded = expandedBranch === id;
            return (
              <motion.div
                key={id}
                layout
                className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border overflow-hidden cursor-pointer"
                onClick={() => setExpandedBranch(isExpanded ? null : id)}
              >
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cm-accent/10">
                      <Store className="w-5 h-5 text-cm-accent" />
                    </div>
                    <div>
                      <h3 className="font-bold text-cm-text">{kpi.name}</h3>
                      <p className="text-xs text-cm-muted">{kpi.total} pedidos · S/ {kpi.revenue.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-cm-accent">{kpi.active}</p>
                      <p className="text-[10px] text-cm-muted uppercase tracking-wider">Activos</p>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-cm-muted" /> : <ChevronRight className="w-4 h-4 text-cm-muted" />}
                  </div>
                </div>

                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="px-5 pb-5 pt-3 border-t border-cm-border space-y-2"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-cm-muted">Completados</span>
                      <span className="font-bold text-cm-text">{kpi.completed}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-cm-muted">Ticket Promedio</span>
                      <span className="font-bold text-cm-text">S/ {kpi.avgTicket.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveBranchId(id); }}
                      className="w-full mt-2 py-2 rounded-lg bg-cm-accent/10 text-cm-accent text-sm font-bold hover:bg-cm-accent/20 transition-colors"
                    >
                      Ver Detalle
                    </button>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
