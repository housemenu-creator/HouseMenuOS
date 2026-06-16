import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { Clock, CheckCircle2, CookingPot, ChevronDown, Monitor, Loader2 } from 'lucide-react';
import { useBranch } from '../context/BranchContext';

/**
 * MonitorView — Pantalla de TV para clientes
 * Muestra pedidos en preparación y listos para recoger, en tiempo real.
 * Optimizada para lectura a distancia con texto grande.
 */
export default function MonitorView() {
  const { branches, activeBranchId, setActiveBranchId, activeBranch, isLoading: branchLoading } = useBranch();
  const [branchOpen, setBranchOpen] = useState(false);
  // Almacena el branchId persistido para TV
  const [persistedBranch, setPersistedBranch] = useState(() => {
    try { return localStorage.getItem('monitor_branchId') || activeBranchId || ''; } catch { return ''; }
  });

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Effectivo branchId: persisted > activeBranchId > primera branch
  const effectiveBranchId = persistedBranch || activeBranchId || branches[0]?.id || '';

  // Persistir branch y actualizar contexto
  const switchBranch = (id) => {
    setPersistedBranch(id);
    try { localStorage.setItem('monitor_branchId', id); } catch {}
    setActiveBranchId(id);
    setBranchOpen(false);
  };

  // Auto-seleccionar primera branch si no hay ninguna
  useEffect(() => {
    if (!persistedBranch && !activeBranchId && branches.length > 0) {
      switchBranch(branches[0].id);
    }
  }, [branches, persistedBranch, activeBranchId]);

  // Suscripción a pedidos
  useEffect(() => {
    if (!effectiveBranchId) return;
    setLoading(true);
    const ordersRef = ref(db, `branches/${effectiveBranchId}/orders`);
    const unsub = onValue(ordersRef, (snap) => {
      const data = snap.val();
      if (!data) { setOrders([]); setLoading(false); return; }
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ta - tb;
      });
      setOrders(list);
      setLoading(false);
    }, (err) => {
      console.warn('MonitorView: error subscribing to orders:', err);
      setLoading(false);
    });
    return unsub;
  }, [effectiveBranchId]);

  // Tick del reloj para elapsed time
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const branchName = branches.find(b => b.id === effectiveBranchId)?.name || effectiveBranchId;

  // Filtrar solo pedidos activos (no entregados ni cancelados)
  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status === 'preparando' || o.status === 'listo');
  }, [orders]);

  const preparando = useMemo(() => activeOrders.filter(o => o.status === 'preparando'), [activeOrders]);
  const listos = useMemo(() => activeOrders.filter(o => o.status === 'listo'), [activeOrders]);

  // Sonido cuando un nuevo pedido se marca como listo
  const prevListoCount = useRef(0);
  useEffect(() => {
    if (prevListoCount.current > 0 && listos.length > prevListoCount.current) {
      try {
        const audio = new AudioContext();
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.frequency.setValueAtTime(880, audio.currentTime);
        gain.gain.setValueAtTime(0.3, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.5);
        osc.start();
        osc.stop(audio.currentTime + 0.5);
      } catch {}
    }
    prevListoCount.current = listos.length;
  }, [listos.length]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    const ms = now - new Date(dateStr).getTime();
    if (ms < 0) return '0s';
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      return `${h}h ${mins % 60}m`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const shortId = (id) => (id ? id.slice(-6).toUpperCase() : '——');

  // ── Loading ──
  if (branchLoading) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cm-accent animate-spin" />
      </div>
    );
  }

  // ── Branch selector (first visit / no branch) ──
  if (!effectiveBranchId) {
    return (
      <div className="min-h-screen bg-cm-bg flex flex-col items-center justify-center p-8 gap-6">
        <Monitor className="w-16 h-16 text-cm-accent" />
        <h1 className="text-3xl font-black text-cm-text">Monitor de Pedidos</h1>
        <p className="text-cm-muted text-lg">Seleccioná una sucursal para empezar</p>
        <div className="flex flex-wrap justify-center gap-3 max-w-lg">
          {branches.map(b => (
            <button
              key={b.id}
              onClick={() => switchBranch(b.id)}
              className="px-8 py-4 bg-cm-surface border-2 border-cm-border hover:border-cm-accent rounded-2xl text-cm-text font-bold text-lg transition-all hover:shadow-cm-md"
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (!loading && activeOrders.length === 0) {
    return (
      <div className="min-h-screen bg-cm-bg flex flex-col items-center justify-center p-8">
        <div className="flex items-center gap-3 mb-4">
          <Monitor className="w-8 h-8 text-cm-accent" />
          <h1 className="text-3xl font-black text-cm-text">{branchName}</h1>
        </div>
        <div className="w-24 h-24 bg-cm-muted/10 rounded-full flex items-center justify-center mb-4 border-2 border-cm-muted/20">
          <CheckCircle2 className="w-12 h-12 text-cm-success" />
        </div>
        <p className="text-2xl font-bold text-cm-text">No hay pedidos activos</p>
        <p className="text-cm-muted text-base mt-2">Los pedidos aparecerán acá automáticamente</p>
        <p className="text-6xl font-black text-cm-muted/20 mt-8 tracking-[0.3em] uppercase">Esperando...</p>
      </div>
    );
  }

  // ── Main display ──
  return (
    <div className="min-h-screen bg-cm-bg overflow-hidden select-none">
      {/* Top bar minimal */}
      <div className="flex items-center justify-center gap-3 px-6 py-3 border-b border-cm-border/10">
        <Monitor className="w-5 h-5 text-cm-accent" />
        <h1 className="text-base font-black text-cm-text tracking-wider uppercase">Monitor — {branchName}</h1>
        <div className="relative ml-4">
          <button
            onClick={() => setBranchOpen(!branchOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cm-surface border border-cm-border/40 text-xs font-bold text-cm-muted hover:text-cm-text transition-colors"
          >
            Cambiar sucursal <ChevronDown className={`w-3 h-3 transition-transform ${branchOpen ? 'rotate-180' : ''}`} />
          </button>
          {branchOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-cm-surface border border-cm-border rounded-xl shadow-cm-lg p-1 min-w-[180px]">
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => switchBranch(b.id)}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                    b.id === effectiveBranchId ? 'bg-cm-accent text-white' : 'text-cm-muted hover:text-cm-text hover:bg-cm-muted/5'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs text-cm-muted/40 ml-auto">{loading ? 'conectando...' : `${activeOrders.length} activo${activeOrders.length !== 1 ? 's' : ''}`}</span>
      </div>

      {/* Loading overlay on refresh */}
      {loading && (
        <div className="absolute inset-0 z-40 bg-cm-bg/60 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
        </div>
      )}

      {/* Two-column grid */}
      <div className="h-[calc(100vh-3.5rem)] flex flex-col md:flex-row gap-0">
        {/* ── PREPARANDO ── */}
        <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6 lg:p-8 overflow-hidden">
          <div className="flex items-center gap-2.5 mb-4 shrink-0">
            <CookingPot className="w-5 h-5 text-cm-warning" />
            <h2 className="text-lg font-black text-cm-text tracking-wide uppercase">En Preparación</h2>
            <span className="text-sm font-bold text-cm-muted/50 bg-cm-muted/10 px-2 py-0.5 rounded-full">{preparando.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
            {preparando.length === 0 ? (
              <div className="flex items-center justify-center h-full text-cm-muted/30 text-sm font-bold tracking-widest uppercase">
                Sin pedidos
              </div>
            ) : (
              preparando.map(order => (
                <div
                  key={order.id}
                  className="bg-cm-surface rounded-2xl border border-cm-border/30 p-5 transition-colors hover:border-cm-warning/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-3xl font-black text-cm-text tabular-nums tracking-wider">#{shortId(order.id)}</span>
                        <span className="px-2.5 py-1 bg-cm-warning/10 text-cm-warning text-xs font-black rounded-full uppercase tracking-wider">
                          Preparando
                        </span>
                      </div>
                      <p className="text-xl font-bold text-cm-text truncate">{order.customerName || 'Cliente'}</p>
                      {order.items && order.items.length > 0 && (
                        <p className="text-sm text-cm-muted mt-1 truncate">
                          {order.items.slice(0, 3).map(i => `${i.quantity || 1}x ${i.name}`).join(', ')}
                          {order.items.length > 3 && <span className="text-cm-muted/50"> +{order.items.length - 3} más</span>}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Clock className="w-5 h-5 text-cm-warning" />
                      <span className="text-2xl font-black text-cm-warning tabular-nums">
                        {formatTime(order.createdAt)}
                      </span>
                    </div>
                  </div>
                  {/* Barra de progreso visual */}
                  <div className="mt-3 h-1 bg-cm-muted/10 rounded-full overflow-hidden">
                    <div className="h-full bg-cm-warning rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Separador vertical (solo md+) */}
        <div className="hidden md:block w-px bg-cm-border/10 self-stretch mx-0" />

        {/* ── LISTOS ── */}
        <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6 lg:p-8 overflow-hidden">
          <div className="flex items-center gap-2.5 mb-4 shrink-0">
            <CheckCircle2 className="w-5 h-5 text-cm-success" />
            <h2 className="text-lg font-black text-cm-text tracking-wide uppercase">Listos para Recoger</h2>
            <span className="text-sm font-bold text-cm-muted/50 bg-cm-success/10 text-cm-success px-2 py-0.5 rounded-full">{listos.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
            {listos.length === 0 ? (
              <div className="flex items-center justify-center h-full text-cm-muted/30 text-sm font-bold tracking-widest uppercase">
                Sin pedidos
              </div>
            ) : (
              listos.map(order => (
                <div
                  key={order.id}
                  className="bg-cm-success/5 rounded-2xl border-2 border-cm-success/30 p-6 transition-all hover:border-cm-success/60 hover:shadow-cm-md hover:shadow-cm-success/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-4xl font-black text-cm-text tabular-nums tracking-wider">#{shortId(order.id)}</span>
                        <span className="px-3 py-1 bg-cm-success text-white text-xs font-black rounded-full uppercase tracking-wider animate-pulse">
                          Listo
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-cm-text">{order.customerName || 'Cliente'}</p>
                      {order.items && order.items.length > 0 && (
                        <p className="text-base text-cm-muted mt-1">
                          {order.items.slice(0, 3).map(i => `${i.quantity || 1}x ${i.name}`).join(', ')}
                          {order.items.length > 3 && <span className="text-cm-muted/50"> +{order.items.length - 3} más</span>}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-cm-success" />
                      <span className="text-2xl font-black text-cm-success tabular-nums">
                        {formatTime(order.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-xs font-bold text-cm-muted/40 uppercase tracking-wider">Listo desde</span>
                    <span className="text-sm font-bold text-cm-text tabular-nums">
                      {order.updatedAt ? new Date(order.updatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
