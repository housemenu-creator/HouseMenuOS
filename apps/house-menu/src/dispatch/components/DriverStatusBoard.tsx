import { motion } from 'framer-motion';
import { Bike, Car, Footprints, Phone, Navigation, Loader2, FilterX } from 'lucide-react';
import type { DeliveryDriver } from '../../worker/workerTypes';

interface DriverStatusBoardProps {
  drivers: DeliveryDriver[];
  driverFilter: 'todos' | 'disponibles' | 'en_ruta';
  loading: boolean;
  onFilterChange: (f: 'todos' | 'disponibles' | 'en_ruta') => void;
}

const VEHICLE_ICONS: Record<string, any> = { Moto: Bike, Auto: Car, Bicicleta: Bike, 'A Pie': Footprints, Car };

function DriverDot({ available, active }: { available: boolean; active: boolean }) {
  if (!active) return <span className="w-2 h-2 rounded-full bg-cm-muted/40" />;
  return <span className={`w-2 h-2 rounded-full ${available ? 'bg-cm-success shadow-[0_0_6px] shadow-cm-success/60' : 'bg-cm-info shadow-[0_0_6px] shadow-cm-info/60'}`} />;
}

export default function DriverStatusBoard({ drivers, driverFilter, loading, onFilterChange }: DriverStatusBoardProps) {
  const activeDrivers = drivers.filter((d) => d.active !== false);
  const available = activeDrivers.filter((d) => d.available !== false);
  const onRoute = activeDrivers.filter((d) => d.available === false);

  let displayDrivers = activeDrivers;
  if (driverFilter === 'disponibles') displayDrivers = available;
  if (driverFilter === 'en_ruta') displayDrivers = onRoute;

  if (loading) {
    return (
      <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm text-cm-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando repartidores...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-cm-text-secondary">Repartidores</h3>
          <span className="text-xs text-cm-success font-bold">{available.length} disp.</span>
          <span className="text-xs text-cm-info font-bold">{onRoute.length} en ruta</span>
        </div>
        <div className="flex gap-1">
          {(['todos', 'disponibles', 'en_ruta'] as const).map((f) => (
            <button key={f} onClick={() => onFilterChange(f)}
              className={`px-2 py-1 rounded text-[0.5rem] font-bold uppercase tracking-wider transition-colors ${
                driverFilter === f ? 'bg-cm-accent text-white' : 'bg-cm-bg-alt text-cm-text-secondary hover:text-cm-text'
              }`}>
              {f === 'todos' ? 'Todos' : f === 'disponibles' ? 'Disp.' : 'Ruta'}
            </button>
          ))}
        </div>
      </div>

      {displayDrivers.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-cm-text-tertiary py-3">
          <FilterX className="w-3.5 h-3.5" />
          {driverFilter === 'disponibles' ? 'No hay repartidores disponibles' : 'No hay repartidores en ruta'}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {displayDrivers.map((d) => {
            const VIcon = VEHICLE_ICONS[d.vehicle] || Bike;
            return (
              <motion.div key={d.id} layout
                className="flex items-center gap-2 bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2 min-w-[140px] flex-shrink-0">
                <div className="relative">
                  <div className="w-8 h-8 bg-cm-accent/10 rounded-full flex items-center justify-center">
                    <VIcon className="w-4 h-4 text-cm-accent" />
                  </div>
                  <div className="absolute -top-0.5 -right-0.5"><DriverDot available={d.available !== false} active={d.active !== false} /></div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-cm-text truncate">{d.name}</p>
                  <div className="flex items-center gap-2 text-[0.5rem] text-cm-text-secondary">
                    <span>{d.totalDeliveries || 0} hoy</span>
                    {d.phone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{d.phone}</span>}
                    {d.lastPosition?.lat && (
                      <a href={`https://www.google.com/maps?q=${d.lastPosition.lat},${d.lastPosition.lng}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-cm-accent hover:underline" title="Ver en mapa">
                        <Navigation className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
