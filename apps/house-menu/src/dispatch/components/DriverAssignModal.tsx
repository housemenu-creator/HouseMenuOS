import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Phone, Bike, Car, Footprints } from 'lucide-react';
import { DeliveryDriver, Order } from '../../worker/workerTypes';

const VEHICLE_ICONS: Record<string, any> = { Moto: Bike, Auto: Car, Bicicleta: Bike, 'A Pie': Footprints, Car };

interface DriverAssignModalProps {
  order: Order | null;
  drivers: DeliveryDriver[];
  onAssign: (order: Order, driver: DeliveryDriver) => void;
  onClose: () => void;
}

export default function DriverAssignModal({ order, drivers, onAssign, onClose }: DriverAssignModalProps) {
  if (!order) return null;
  const availableDrivers = drivers.filter((d) => d.available !== false);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-cm-surface rounded-2xl w-full max-w-sm overflow-hidden border border-cm-border shadow-cm-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-cm-info/10 p-6 border-b-2 border-cm-info/20">
            <div className="w-14 h-14 bg-cm-info/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-cm-info/30">
              <Truck className="w-7 h-7 text-cm-info" />
            </div>
            <h2 className="text-xl font-black text-cm-text text-center">Asignar Repartidor</h2>
            <p className="text-cm-muted text-sm text-center mt-1">
              #{order.id?.slice(-4).toUpperCase()} — {order.customerName}
            </p>
          </div>
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {availableDrivers.length === 0 ? (
              <p className="text-center text-sm text-cm-muted py-6">No hay repartidores disponibles</p>
            ) : (
              availableDrivers.map((d) => {
                const VIcon = VEHICLE_ICONS[d.vehicle] || Bike;
                return (
                  <button key={d.id} onClick={() => onAssign(order, d)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-cm-border hover:border-cm-info/30 hover:bg-cm-info/10 transition-all text-left active:scale-[0.98]">
                    <div className="w-10 h-10 bg-cm-info/20 rounded-full flex items-center justify-center border-2 border-cm-info/30 shrink-0">
                      <VIcon className="w-5 h-5 text-cm-info" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-cm-text">{d.name}</p>
                      <div className="flex items-center gap-3 text-xs text-cm-muted">
                        {d.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{d.phone}</span>}
                        <span>{d.vehicle}</span>
                        <span>{d.totalDeliveries || 0} entregas</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="p-4 border-t border-cm-border">
            <button onClick={onClose}
              className="w-full py-3 rounded-xl font-black text-sm border border-cm-border text-cm-muted hover:bg-cm-bg transition-colors">
              CANCELAR
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
