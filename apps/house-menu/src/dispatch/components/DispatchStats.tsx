import { Truck, Package, CheckCircle2, Users } from 'lucide-react';

interface DispatchStatsProps {
  enCaminoCount: number;
  listosCount: number;
  sessionDeliveries: number;
  availableDrivers: number;
  totalDrivers: number;
}

export default function DispatchStats({
  enCaminoCount, listosCount, sessionDeliveries, availableDrivers, totalDrivers,
}: DispatchStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
        <div className="flex items-center gap-2 text-cm-info mb-1.5">
          <Truck className="w-4 h-4" />
          <span className="text-[0.55rem] font-bold uppercase tracking-widest text-cm-text-secondary">En ruta</span>
        </div>
        <p className="text-2xl font-black text-cm-text">{enCaminoCount}</p>
      </div>

      <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
        <div className="flex items-center gap-2 text-cm-warning mb-1.5">
          <Package className="w-4 h-4" />
          <span className="text-[0.55rem] font-bold uppercase tracking-widest text-cm-text-secondary">Listos</span>
        </div>
        <p className="text-2xl font-black text-cm-text">{listosCount}</p>
      </div>

      <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
        <div className="flex items-center gap-2 text-cm-success mb-1.5">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-[0.55rem] font-bold uppercase tracking-widest text-cm-text-secondary">Hoy</span>
        </div>
        <p className="text-2xl font-black text-cm-text">{sessionDeliveries}</p>
      </div>

      <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
        <div className="flex items-center gap-2 text-cm-accent mb-1.5">
          <Users className="w-4 h-4" />
          <span className="text-[0.55rem] font-bold uppercase tracking-widest text-cm-text-secondary">Drivers</span>
        </div>
        <p className="text-2xl font-black text-cm-text">{availableDrivers}<span className="text-sm font-semibold text-cm-text-secondary">/{totalDrivers}</span></p>
      </div>
    </div>
  );
}
