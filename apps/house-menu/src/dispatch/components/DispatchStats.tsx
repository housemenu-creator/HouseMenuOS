import { useState, useRef, useEffect, useMemo } from 'react';
import { Truck, Package, CheckCircle2, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface DispatchStatsProps {
  enCaminoCount: number;
  listosCount: number;
  sessionDeliveries: number;
  availableDrivers: number;
  totalDrivers: number;
  loading?: boolean;
}

function AnimCounter({ value, duration = 600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  const raf = useRef<number>();

  useEffect(() => {
    if (value === prev.current) { setDisplay(value); return; }
    const start = prev.current;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(Math.round(start + (value - start) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    prev.current = value;
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <>{display}</>;
}

const cv = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const iv = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } } };

const STATS = [
  { key: 'enCamino', label: 'En ruta', icon: Truck, color: 'text-cm-info' },
  { key: 'listos', label: 'Listos', icon: Package, color: 'text-cm-warning' },
  { key: 'hoy', label: 'Hoy', icon: CheckCircle2, color: 'text-cm-success' },
  { key: 'drivers', label: 'Drivers', icon: Users, color: 'text-cm-accent' },
] as const;

export default function DispatchStats({
  enCaminoCount, listosCount, sessionDeliveries, availableDrivers, totalDrivers, loading,
}: DispatchStatsProps) {
  const values = useMemo(() => ({
    enCamino: enCaminoCount, listos: listosCount, hoy: sessionDeliveries,
    drivers: [availableDrivers, totalDrivers] as const,
  }), [enCaminoCount, listosCount, sessionDeliveries, availableDrivers, totalDrivers]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.key} className="bg-cm-surface border border-cm-border rounded-xl p-4 animate-pulse">
            <div className="h-4 w-16 bg-cm-border rounded mb-2" />
            <div className="h-7 w-12 bg-cm-border rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div variants={cv} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {STATS.map((s) => {
        const Icon = s.icon;
        const val = values[s.key];
        return (
          <motion.div key={s.key} variants={iv}
            className="bg-cm-surface border border-cm-border rounded-xl p-4">
            <div className={`flex items-center gap-2 ${s.color} mb-1.5`}>
              <Icon className="w-4 h-4" />
              <span className="text-[0.55rem] font-bold uppercase tracking-widest text-cm-text-secondary">{s.label}</span>
            </div>
            <p className="text-2xl font-black text-cm-text tabular-nums">
              {typeof val === 'number' ? <AnimCounter value={val} /> : (
                <><AnimCounter value={val[0]} /><span className="text-sm font-semibold text-cm-text-secondary">/{val[1]}</span></>
              )}
            </p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
