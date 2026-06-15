import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChefHat, PackageCheck, Truck, MapPin } from 'lucide-react';

export const STATUS_STEPS = [
  { key: 'recibido',   step: 1, title: 'Recibido',   desc: 'Tu pedido ingresó al sistema.',         icon: CheckCircle2 },
  { key: 'preparando', step: 2, title: 'Preparando', desc: 'La cocina está armando tu platillo.',   icon: ChefHat      },
  { key: 'listo',      step: 3, title: 'Listo',      desc: 'Esperando a tu repartidor.',            icon: PackageCheck },
  { key: 'en_camino',  step: 4, title: 'En Camino',  desc: 'Tu pedido está en ruta hacia ti.',      icon: Truck        },
  { key: 'entregado',  step: 5, title: 'Entregado',  desc: '¡Que disfrutes tu comida! 🎉',          icon: MapPin       },
];

function getStep(status) {
  return STATUS_STEPS.find(s => s.key === status)?.step ?? 0;
}

export default function OrderTimeline({ currentStatus }) {
  const currentStep = getStep(currentStatus);
  const isOnTheWay = currentStatus === 'en_camino';

  return (
    <div className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border p-5">
      <p className="text-[0.6rem] font-bold text-cm-muted uppercase tracking-widest mb-4">Seguimiento</p>

      <AnimatePresence>
        {isOnTheWay && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-5 p-3 bg-cm-accent/10 border-2 border-cm-accent/30 rounded-xl flex items-center gap-3"
          >
            <motion.div
              animate={{ x: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              className="text-2xl"
            >
              🛵
            </motion.div>
            <div>
              <p className="font-black text-cm-accent text-sm">¡Tu pedido viene en camino!</p>
              <p className="text-xs text-cm-muted font-bold">El repartidor ya salió hacia tu ubicación</p>
            </div>
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="ml-auto w-2.5 h-2.5 rounded-full bg-cm-accent shrink-0"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative space-y-5">
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-cm-border z-0" />
        <motion.div
          className="absolute left-4 top-2 w-0.5 bg-cm-accent z-0 origin-top"
          initial={{ height: 0 }}
          animate={{
            height: currentStep === 0
              ? '0%'
              : `${Math.min(((currentStep - 1) / (STATUS_STEPS.length - 1)) * 100, 100)}%`
          }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        {STATUS_STEPS.map(({ key, step, title, desc, icon: Icon }) => {
          const isActive = currentStep >= step;
          const isCurrent = getStep(currentStatus) === step;
          return (
            <div key={key} className="flex items-start gap-4 relative z-10">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: isActive ? 1 : 0.85, opacity: isActive ? 1 : 0.5 }}
                transition={{ duration: 0.4 }}
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-all ${
                  isActive
                    ? 'bg-cm-accent border-cm-accent text-white'
                    : 'bg-cm-surface border-cm-border text-cm-muted'
                } ${isCurrent ? 'ring-4 ring-cm-accent/20 scale-110' : ''}`}
              >
                <Icon className="w-4 h-4" />
              </motion.div>
              <div className={`pt-1 transition-opacity ${isActive ? 'opacity-100' : 'opacity-35'}`}>
                <p className={`font-black text-sm ${isActive ? 'text-cm-text' : 'text-cm-muted'}`}>
                  {title}
                  {isCurrent && <span className="ml-2 text-[0.6rem] bg-cm-accent/10 text-cm-accent px-1.5 py-0.5 rounded-full font-bold">AHORA</span>}
                </p>
                <p className="text-xs text-cm-muted font-bold mt-0.5">{desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
