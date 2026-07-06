import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ordersService } from '../lib/ordersService';
import { useBranch } from '../context/BranchContext';
import {
  Play, X, ChefHat, Truck, CheckCircle2, Clock,
  UtensilsCrossed, Zap, ShoppingBag,
} from 'lucide-react';

// Demo order datasets — rotates randomly each run
const DEMO_ORDERS = [
  {
    customerName: 'Investor Demo',
    location: 'Mesa VIP 1',
    items: [
      { name: 'Pollo al Horno (Menú)', details: ['Arroz', 'Ensalada'], price: 18.5 },
      { name: 'Adicional: Huevo Frito', details: [], price: 2.0 },
    ],
    total: 20.5,
  },
  {
    customerName: 'Demo Ejecutivo',
    location: 'Mesa VIP 2',
    items: [
      { name: 'Súper Promo Pollo', details: ['Chifles', 'Sarsa criolla'], price: 18.0 },
    ],
    total: 20.0,
  },
  {
    customerName: 'Pitch Demo',
    location: 'Sala de Reuniones',
    items: [
      { name: 'Tallarín a la Huancaína', details: ['Pollo', 'Papa a la Huancaína'], price: 19.0 },
      { name: 'Adicional: Queso', details: [], price: 2.0 },
    ],
    total: 21.0,
  },
];

const STEPS = [
  { status: 'recibido',   label: 'Pedido recibido',       icon: ShoppingBag,  color: 'text-cm-accent', delay: 0    },
  { status: 'preparando', label: 'Cocina: preparando',    icon: ChefHat,       color: 'text-orange-500',       delay: 5000 },
  { status: 'listo',      label: 'Listo para despacho',   icon: UtensilsCrossed, color: 'text-yellow-600',     delay: 10000 },
  { status: 'en_camino',  label: 'Runner: en camino',     icon: Truck,         color: 'text-blue-500',         delay: 15000 },
  { status: 'entregado',  label: '¡Entregado! (+ingresos)', icon: CheckCircle2, color: 'text-green-600',       delay: 20000 },
];

export default function DemoRunner({ isOpen: controlledOpen, onClose }) {
  const { activeBranchId } = useBranch();
  const [isOpen, setIsOpen]           = useState(false);
  const [running, setRunning]         = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [demoOrderId, setDemoOrderId] = useState(null);
  const [done, setDone]               = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    if (controlledOpen !== undefined) setIsOpen(controlledOpen);
  }, [controlledOpen]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const startDemo = async () => {
    clearTimers();
    setRunning(true);
    setDone(false);
    setCurrentStep(0);
    setDemoOrderId(null);

    // Pick a random demo order
    const template = DEMO_ORDERS[Math.floor(Math.random() * DEMO_ORDERS.length)];
    const now = new Date().toISOString();

    // Create real Firebase order
    const result = await ordersService.createOrder(activeBranchId, {
      customerName: template.customerName,
      location: template.location,
      items: template.items,
      financials: {
        subtotal: template.total - 2,
        packaging: 2,
        total: template.total,
      },
      total: template.total,
      isDemo: true,
    });

    if (!result.success) {
      setRunning(false);
      return;
    }

    const orderId = result.orderId;
    setDemoOrderId(orderId);

    // Schedule status transitions
    STEPS.slice(1).forEach((step, i) => {
      const t = setTimeout(async () => {
        await ordersService.updateOrderStatus(activeBranchId, orderId, step.status);
        setCurrentStep(i + 1);
        if (step.status === 'entregado') {
          setDone(true);
          setRunning(false);
        }
      }, step.delay);
      timers.current.push(t);
    });
  };

  const reset = () => {
    clearTimers();
    setRunning(false);
    setCurrentStep(-1);
    setDemoOrderId(null);
    setDone(false);
  };

  const handleClose = () => {
    reset();
    setIsOpen(false);
    if (onClose) onClose();
  };

  return (
    <>
      {/* ── Floating Trigger Button ─────────────────── */}
      {controlledOpen === undefined && (
        <motion.button
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm text-white shadow-2xl border-b-4 border-black/20"
          style={{ background: 'linear-gradient(135deg, var(--cm-accent, #7f1d1d) 0%, var(--cm-accent-hover, #b91c1c) 100%)' }}
        >
          <Zap className="w-4 h-4 animate-pulse" />
          DEMO INVERSORES
        </motion.button>
      )}

      {/* ── Demo Panel ─────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={handleClose}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 80, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-cm-surface z-50 flex flex-col shadow-2xl border-l-4 border-cm-border"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="p-6 text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--cm-accent, #7f1d1d) 0%, var(--cm-accent-hover, #b91c1c) 100%)' }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white/60 text-[0.6rem] font-bold tracking-[0.25em] uppercase mb-1">House Menu</p>
                    <h2 className="text-2xl font-black">MODO DEMO</h2>
                    <p className="text-white/70 text-xs font-bold mt-1">Ciclo completo en 20 segundos</p>
                  </div>
                  <button onClick={handleClose} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Timer bar */}
                {running && (
                  <div className="mt-4">
                    <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 20, ease: 'linear' }}
                        className="h-full bg-cm-surface rounded-full"
                      />
                    </div>
                    <p className="text-white/50 text-[0.6rem] font-bold mt-1 text-right">~20 segundos</p>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">

                {/* Description */}
                {!running && !done && (
                  <div className="bg-cm-bg border border-cm-border rounded-xl p-4 text-sm text-cm-muted leading-relaxed">
                    <p className="font-black text-cm-text mb-2">¿Qué hace este demo?</p>
                    <ul className="space-y-1.5 text-xs font-bold">
                      <li className="flex items-center gap-2"><ShoppingBag className="w-3.5 h-3.5 text-cm-accent shrink-0" /> Crea un pedido <span className="text-cm-muted">real</span> en Firebase</li>
                      <li className="flex items-center gap-2"><ChefHat className="w-3.5 h-3.5 text-orange-500 shrink-0" /> Lo avanza a Cocina automáticamente</li>
                      <li className="flex items-center gap-2"><Truck className="w-3.5 h-3.5 text-blue-500 shrink-0" /> El runner lo despacha</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" /> Admin ve los ingresos en tiempo real</li>
                    </ul>
                    <p className="text-cm-muted text-[0.65rem] mt-3 font-bold">
                      Puedes abrir el KDS o Admin Hub en otra pestaña para ver los cambios en vivo.
                    </p>
                  </div>
                )}

                {/* Timeline */}
                {currentStep >= 0 && (
                  <div className="space-y-3">
                    <p className="text-[0.6rem] font-bold text-cm-muted uppercase tracking-widest">Pipeline en vivo</p>
                    {STEPS.map((step, i) => {
                      const Icon = step.icon;
                      const isCompleted = i < currentStep;
                      const isActive = i === currentStep;
                      const isPending = i > currentStep;

                      return (
                        <div
                          key={step.status}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                            isCompleted ? 'bg-green-50 border-green-200'
                            : isActive ? 'bg-cm-accent/10 border-cm-accent animate-pulse'
                            : 'bg-cm-bg border-cm-border opacity-40'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isCompleted ? 'bg-green-100' : isActive ? 'bg-cm-accent/20' : 'bg-cm-border'
                          }`}>
                            {isCompleted
                              ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                              : <Icon className={`w-4 h-4 ${isActive ? step.color : 'text-cm-muted'}`} />
                            }
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-black ${isCompleted ? 'text-green-700' : isActive ? 'text-cm-text' : 'text-cm-muted'}`}>
                              {step.label}
                            </p>
                            {isActive && (
                              <p className="text-xs text-cm-accent font-bold animate-pulse mt-0.5">
                                {i < STEPS.length - 1 ? `Siguiente en ${(STEPS[i + 1].delay - STEPS[i].delay) / 1000}s...` : 'Finalizando...'}
                              </p>
                            )}
                          </div>
                          {isPending && (
                            <div className="flex items-center gap-1 text-cm-muted">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="text-[0.6rem] font-bold">{step.delay / 1000}s</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Order ID */}
                {demoOrderId && (
                  <div className="bg-cm-bg border border-cm-border rounded-xl p-3 text-center">
                    <p className="text-[0.6rem] font-bold text-cm-muted uppercase tracking-widest">Firebase Order ID</p>
                    <p className="font-black text-cm-accent text-lg mt-1">#{demoOrderId.slice(-4).toUpperCase()}</p>
                    <p className="text-[0.55rem] text-cm-muted font-bold break-all mt-0.5">{demoOrderId}</p>
                  </div>
                )}

                {/* Done state */}
                {done && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border p-5 text-center"
                    style={{ backgroundColor: 'var(--cm-accent)', color: 'white' }}
                  >
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-white" />
                    <p className="font-black text-lg">¡Demo Completado!</p>
                    <p className="text-white/70 text-xs font-bold mt-1">
                      El Admin Dashboard ahora muestra los ingresos actualizados.
                    </p>
                    <div className="flex gap-2 mt-4">
                      <a
                        href={ROUTES.ADMIN}
                        className="flex-1 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition-colors border border-white/30"
                      >
                        Ver Admin Hub
                      </a>
                      <button
                        onClick={startDemo}
                        className="flex-1 py-2.5 bg-cm-surface text-cm-accent font-bold text-xs rounded-xl hover:bg-white/90 transition-colors"
                      >
                        ▶ Repetir Demo
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer CTA */}
              {!running && (
                <div className="p-6 border-t border-cm-border shrink-0">
                  <button
                    onClick={startDemo}
                    className="w-full py-4 flex items-center justify-center gap-2 bg-cm-accent text-white font-black rounded-xl hover:bg-cm-accent-hover transition-colors"
                  >
                    <Play className="w-5 h-5" />
                    {done ? 'REPETIR DEMO' : 'INICIAR DEMO'}
                  </button>
                  {done && (
                    <button onClick={reset} className="mt-2 w-full py-2 text-xs font-bold text-cm-muted hover:text-cm-muted transition-colors">
                      Resetear
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

