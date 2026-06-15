import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ChefHat, Clock, MapPin, Phone, Printer, UtensilsCrossed } from "lucide-react";
import { useOrders } from "../../hooks/useOrders";
import ComandaPrint from "./ComandaPrint";
import type { Order } from "../../types";

export default function CocinaMode() {
  const { orders, loading } = useOrders();
  const [notified, setNotified] = useState<Order[]>([]);
  const [prevCount, setPrevCount] = useState(0);

  const pendientes = orders.filter((o) => o.status === "recibido" || o.status === "preparando");
  const completados = orders.filter((o) => o.status === "listo" || o.status === "entregado");

  // Sound + notification for new orders
  useEffect(() => {
    if (pendientes.length > prevCount && prevCount > 0) {
      const newOnes = pendientes.slice(0, pendientes.length - prevCount);
      setNotified((prev) => [...newOnes, ...prev].slice(0, 5));
      
      // Clean audio context handling
      const playNotification = () => {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1100, audioCtx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
        
        // Close context after playback
        setTimeout(() => audioCtx.close(), 500);
      };

      try {
        playNotification();
      } catch (e) {
        console.warn("Audio playback failed:", e);
      }

      // Auto-dismiss after 8s
      setTimeout(() => setNotified((prev) => prev.slice(newOnes.length)), 8000);
    }
    setPrevCount(pendientes.length);
  }, [pendientes.length, prevCount]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-cm-text-secondary">Cargando pedidos...</div>;

  return (
    <div className="min-h-screen bg-cm-bg p-8 font-sans">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-10 glass p-8 rounded-[2.5rem] border border-cm-border shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cm-accent/10 text-cm-accent">
            <ChefHat size={40} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter">Kitchen Mode</h1>
            <p className="text-sm text-cm-text-secondary font-bold uppercase tracking-widest opacity-60">Control de Producción</p>
          </div>
        </div>
        <div className="flex items-center gap-10">
          <div className="text-center">
            <div className="text-4xl font-black text-cm-warning tracking-tighter">{pendientes.length}</div>
            <div className="text-[10px] font-bold text-cm-text-secondary uppercase tracking-widest mt-1">Pendientes</div>
          </div>
          <div className="h-10 w-px bg-cm-border/50" />
          <div className="text-center">
            <div className="text-4xl font-black text-cm-success tracking-tighter">{completados.length}</div>
            <div className="text-[10px] font-bold text-cm-text-secondary uppercase tracking-widest mt-1">Listos</div>
          </div>
        </div>
      </div>

      {/* ── Toast Notifications ── */}
      <AnimatePresence>
        {notified.map((o) => (
          <motion.div
            key={o.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-4 right-4 z-50 bg-cm-surface border-2 border-cm-success rounded-2xl p-5 shadow-2xl min-w-[300px]"
          >
            <div className="flex items-start gap-3">
              <Bell size={24} className="text-cm-success animate-pulse shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-lg">¡Nuevo pedido!</div>
                <p className="text-sm text-cm-text mt-1">{o.cliente}</p>
                <p className="text-xs text-cm-text-secondary mt-1">
                  S/ {Number(o.total).toFixed(2)} — {o.tipo}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Pendientes ── */}
      <h2 className="text-sm font-semibold text-cm-warning mb-4 flex items-center gap-2">
        <Clock size={14} /> PENDIENTES ({pendientes.length})
      </h2>
      {pendientes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-cm-text-secondary">
          <ChefHat size={64} className="mb-4 opacity-20" />
          <p className="text-lg">Todo al día</p>
          <p className="text-sm">No hay pedidos pendientes</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
        {pendientes.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {/* ── Últimos completados ── */}
      {completados.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-cm-success mb-4 flex items-center gap-2 mt-8">
            <UtensilsCrossed size={14} /> COMPLETADOS ({completados.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {completados.slice(0, 6).map((order) => (
              <OrderCard key={order.id} order={order} completed />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OrderCard({ order, completed = false }: { order: Order; completed?: boolean }) {
  const timeAgo = order.createdAt
    ? Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000)
    : 0;

  const isUrgent = timeAgo > 15 && !completed;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className={`glass rounded-[2rem] p-6 shadow-xl border-2 transition-all duration-300 ${
        completed
          ? "border-cm-success/20 opacity-40 scale-[0.98]"
          : isUrgent
          ? "border-cm-error bg-cm-error/5 shadow-cm-error/20"
          : "border-cm-border hover:border-cm-accent/40"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-black text-xl tracking-tight uppercase line-clamp-1">{order.cliente}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-cm-text-secondary uppercase tracking-widest">
            <Clock size={12} />
            <span>{timeAgo < 1 ? "Ahora mismo" : `Hace ${timeAgo} minutos`}</span>
            {order.tipo && <span className="text-cm-accent">· {order.tipo}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black tracking-tighter">S/ {Number(order.total).toFixed(0)}</div>
          <div className="flex items-center gap-2 mt-2 justify-end">
            {!completed && <ComandaPrint order={order} />}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-6 bg-cm-bg/40 rounded-2xl p-4 border border-cm-border/50">
        {(order.items || []).map((item, i) => (
          <div key={i} className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-cm-accent text-white font-black text-[10px]">
                {item.quantity}
              </span>
              <span className="font-bold text-cm-text">{item.name}</span>
            </div>
            <span className="text-xs font-bold text-cm-text-secondary">S/ {(item.price * item.quantity).toFixed(0)}</span>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="flex flex-col gap-2">
        {order.direccion && (
          <div className="flex items-center gap-2 text-[10px] font-bold text-cm-text-secondary uppercase tracking-tight">
            <MapPin size={12} className="text-cm-accent" />
            <span className="line-clamp-1">{order.direccion}</span>
          </div>
        )}
        {order.nota && (
          <div className="mt-2 p-3 rounded-xl bg-cm-warning/10 border border-cm-warning/20 text-xs font-bold text-cm-warning italic">
             " {order.nota} "
          </div>
        )}
      </div>

      {/* Action Area */}
      {!completed && (
        <div className="mt-6">
          <button className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all ${
            order.status === "preparando" 
              ? "bg-cm-success text-white shadow-lg shadow-cm-success/20" 
              : "bg-cm-accent text-white shadow-lg shadow-cm-accent/20"
          }`}>
            {order.status === "recibido" ? "Empezar Preparación" : "Marcar como Listo"}
          </button>
        </div>
      )}
    </motion.div>
  );
}
