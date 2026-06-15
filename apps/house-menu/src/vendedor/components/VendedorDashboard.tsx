import { motion, AnimatePresence } from 'framer-motion';
import { Search, FilterX, Building2, Package, DollarSign, Users, Loader2 } from 'lucide-react';
import type { VendedorCuenta, CuentaFilter } from '../vendedorTypes';
import { CUENTA_TYPE_LABELS, CUENTA_STATUS_COLORS } from '../vendedorTypes';

interface CuentaStats {
  totalCuentas: number;
  activeCuentas: number;
  pendingOrders: number;
  totalSales: number;
  totalCreditUsed: number;
}

interface VendedorDashboardProps {
  cuentas: VendedorCuenta[];
  stats: CuentaStats;
  filter: CuentaFilter;
  searchQuery: string;
  loading: boolean;
  onSearchChange: (q: string) => void;
  onFilterChange: (f: CuentaFilter) => void;
  onSelectCuenta: (id: string) => void;
}

function formatCurrency(amount: number): string {
  return `S/ ${amount.toFixed(2)}`;
}

export default function VendedorDashboard({
  cuentas, stats, filter, searchQuery, loading,
  onSearchChange, onFilterChange, onSelectCuenta,
}: VendedorDashboardProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-cm-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-cm-accent mb-2">
            <Building2 className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cm-text-secondary">Cuentas</span>
          </div>
          <p className="text-2xl font-black text-cm-text">{stats.activeCuentas}<span className="text-sm font-semibold text-cm-text-secondary">/{stats.totalCuentas}</span></p>
        </div>

        <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-cm-warning mb-2">
            <Package className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cm-text-secondary">Pendientes</span>
          </div>
          <p className="text-2xl font-black text-cm-text">{stats.pendingOrders}</p>
        </div>

        <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-cm-success mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cm-text-secondary">Ventas</span>
          </div>
          <p className="text-2xl font-black text-cm-text">{formatCurrency(stats.totalSales)}</p>
        </div>

        <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-cm-info mb-2">
            <Users className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cm-text-secondary">Crédito</span>
          </div>
          <p className="text-2xl font-black text-cm-text">{formatCurrency(stats.totalCreditUsed)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary" />
          <input
            type="text" value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, RUC, teléfono..."
            className="w-full pl-9 pr-4 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent"
          />
        </div>
        <div className="flex gap-1">
          {(['activas', 'todas'] as CuentaFilter[]).map((f) => (
            <button key={f} onClick={() => onFilterChange(f)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                filter === f
                  ? 'bg-cm-accent text-white'
                  : 'bg-cm-surface border border-cm-border text-cm-text-secondary hover:bg-cm-accent/5'
              }`}>
              {f === 'activas' ? 'Activas' : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      {cuentas.length === 0 ? (
        <div className="text-center py-16">
          <FilterX className="w-12 h-12 text-cm-text-tertiary mx-auto mb-3" />
          <p className="font-semibold text-cm-text-secondary">
            {searchQuery ? 'Sin resultados para esta búsqueda' : 'No hay cuentas asignadas'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {cuentas.map((cuenta) => (
              <motion.button
                key={cuenta.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => onSelectCuenta(cuenta.id)}
                className="bg-cm-surface border border-cm-border rounded-xl p-4 text-left hover:border-cm-accent/40 transition-all w-full"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-cm-text truncate">{cuenta.name}</h3>
                      <span className={`text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full ${CUENTA_STATUS_COLORS[cuenta.status] || 'text-cm-muted bg-cm-muted/10'}`}>
                        {cuenta.status === 'activa' ? 'Activa' : cuenta.status === 'inactiva' ? 'Inactiva' : 'Suspendida'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-cm-text-secondary">
                      {cuenta.type && <span>{CUENTA_TYPE_LABELS[cuenta.type]}</span>}
                      {cuenta.taxId && <span>RUC {cuenta.taxId}</span>}
                      {cuenta.phone && <span>{cuenta.phone}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-cm-text">{formatCurrency(cuenta.totalSpent || 0)}</p>
                    <p className="text-[0.55rem] text-cm-text-tertiary">
                      {cuenta.totalOrders || 0} pedido{cuenta.totalOrders !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      <p className="text-xs text-cm-text-tertiary text-right">{cuentas.length} resultado{cuentas.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
