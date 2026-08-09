import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import {
  subscribeIngredients,
  subscribePurchaseOrders,
  createPreOrder,
  cancelPurchaseOrder,
} from '../../lib/logisticsService';
import {
  Search,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ShoppingCart,
  Plus,
  Package,
  ChevronRight,
} from 'lucide-react';

const fmtCurrency = (n: number) => `S/ ${Number(n).toFixed(2)}`;

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock?: number;
  minStock?: number;
  cost?: number;
}

interface Order {
  id: string;
  status: string;
  supplierId?: string | null;
  supplierName?: string | null;
  requestedBy?: string | null;
  notes?: string;
  cancelReason?: string;
  cancelledBy?: string | null;
  orderedAt?: string;
  total?: number;
  items?: Record<string, { name: string; quantity: number; unit: string; unitCost: number }>;
}

interface SelectedItem {
  selected: boolean;
  quantity: number;
  unitCost: number;
  name: string;
  unit: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pre_pedido: { label: 'Enviado', cls: 'bg-amber-500/10 text-amber-600', icon: <Clock className="w-3 h-3" /> },
  pendiente: { label: 'Confirmado', cls: 'bg-blue-500/10 text-blue-600', icon: <CheckCircle2 className="w-3 h-3" /> },
  recibido: { label: 'Recibido', cls: 'bg-emerald-500/10 text-emerald-600', icon: <Package className="w-3 h-3" /> },
  cancelado: { label: 'Cancelado', cls: 'bg-rose-500/10 text-rose-600', icon: <XCircle className="w-3 h-3" /> },
};

const cv = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const iv = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function PrepedidosView() {
  const { user } = useAuth();
  const { activeBranchId } = useBranch();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ingSearch, setIngSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, SelectedItem>>({});
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!activeBranchId) return;
    let mounted = true;
    setError(null);
    try {
      const unsubIng = subscribeIngredients(activeBranchId, (data: Ingredient[]) => {
        if (!mounted) return;
        setIngredients(data);
        setLoading(false);
      });
      const unsubOrd = subscribePurchaseOrders(activeBranchId, (data: Order[]) => {
        if (mounted) setOrders(data);
      });
      return () => {
        mounted = false;
        unsubIng();
        unsubOrd();
      };
    } catch (e: any) {
      setError(e?.message || 'Error al cargar insumos');
      setLoading(false);
    }
  }, [activeBranchId]);

  const filtered = useMemo(() => {
    let result = ingredients;
    if (ingSearch.trim()) {
      const q = ingSearch.toLowerCase();
      result = result.filter(i => (i.name || '').toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [ingredients, ingSearch]);

  const total = useMemo(
    () => Object.values(selected).filter(s => s.selected).reduce((sum, s) => sum + s.quantity * s.unitCost, 0),
    [selected]
  );
  const count = useMemo(() => Object.values(selected).filter(s => s.selected).length, [selected]);

  const handleToggle = (ing: Ingredient, checked: boolean) => {
    setSelected(prev => ({
      ...prev,
      [ing.id]: {
        selected: checked,
        quantity: checked ? Math.max(0, (ing.minStock || 0) - (ing.stock || 0)) : 0,
        unitCost: ing.cost || 0,
        name: ing.name,
        unit: ing.unit,
      },
    }));
  };

  const handleSend = async () => {
    if (!activeBranchId || !user?.email) return;
    const items = Object.entries(selected)
      .filter(([, v]) => v.selected && v.quantity > 0)
      .map(([ingredientId, v]) => ({
        ingredientId,
        name: v.name,
        quantity: v.quantity,
        unit: v.unit,
        unitCost: v.unitCost,
      }));
    if (items.length === 0) {
      setFeedback({ ok: false, text: 'Seleccioná al menos un insumo con cantidad mayor a 0.' });
      return;
    }
    setSending(true);
    setFeedback(null);
    try {
      await createPreOrder(activeBranchId, items, notes, user.email);
      setFeedback({ ok: true, text: 'Pre-pedido enviado. El administrador lo confirmará con el proveedor.' });
      setSelected({});
      setNotes('');
    } catch (e: any) {
      setFeedback({ ok: false, text: e?.message || 'No se pudo enviar el pre-pedido.' });
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (order: Order) => {
    if (!activeBranchId || !user?.email) return;
    if (!window.confirm('¿Cancelar este pre-pedido?')) return;
    await cancelPurchaseOrder(activeBranchId, order.id, user.email);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <AlertTriangle className="w-10 h-10 text-cm-error mb-3" />
        <p className="text-sm font-bold text-cm-text mb-1">No pudimos cargar los insumos</p>
        <p className="text-xs text-cm-muted mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg">
          Reintentar
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Cargando insumos">
        <Loader2 className="w-6 h-6 text-cm-accent animate-spin" />
      </div>
    );
  }

  const myPreOrders = orders.filter(o => o.status === 'pre_pedido' || o.status === 'pendiente' || o.status === 'recibido' || o.status === 'cancelado');

  return (
    <motion.div variants={cv} initial="hidden" animate="show" className="w-full px-4 sm:px-6 pt-5 pb-8 space-y-5">
      <motion.div variants={iv}>
        <h1 className="text-lg font-black text-cm-text">Pre-pedidos de insumos</h1>
        <p className="text-xs text-cm-muted mt-0.5">
          Pedí lo que falta en cocina. El administrador lo confirma con el proveedor.
        </p>
      </motion.div>

      {/* ── Form: armar pre-pedido ── */}
      <motion.div variants={iv} className="bg-cm-surface border border-cm-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black text-cm-muted uppercase tracking-widest">Nuevo pedido</span>
          {count > 0 && (
            <span className="text-[10px] font-bold text-cm-accent">{count} insumo{count !== 1 ? 's' : ''}</span>
          )}
        </div>

        {ingredients.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-8 h-8 text-cm-muted mx-auto mb-2" />
            <p className="text-xs text-cm-muted">No hay insumos registrados. Avisá al administrador para que los cargue.</p>
          </div>
        ) : (
          <>
            <div className="relative max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-cm-muted" />
              <input
                type="text"
                placeholder="Buscar insumo..."
                value={ingSearch}
                onChange={e => setIngSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 bg-cm-bg border border-cm-border rounded-lg text-xs text-cm-text placeholder:text-cm-muted focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 outline-none"
              />
            </div>

            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-xs border-collapse min-w-[420px]">
                <thead>
                  <tr className="text-[0.55rem] font-bold text-cm-muted uppercase tracking-wider border-b border-cm-border text-left">
                    <th className="py-1.5 pr-1 w-9"></th>
                    <th className="py-1.5 pr-2">Insumo</th>
                    <th className="py-1.5 pr-2 text-right">Stock</th>
                    <th className="py-1.5 pr-2 text-right">Mín</th>
                    <th className="py-1.5 pr-2 text-right">Falta</th>
                    <th className="py-1.5 pr-2 text-right">Cant.</th>
                    <th className="py-1.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-xs text-cm-muted">Sin resultados para "{ingSearch}"</td>
                    </tr>
                  )}
                  {filtered.map(ing => {
                    const sel = selected[ing.id] || { selected: false, quantity: 0, unitCost: 0 };
                    const deficit = Math.max(0, (ing.minStock || 0) - (ing.stock || 0));
                    return (
                      <tr key={ing.id} className={`border-b border-cm-border/30 transition-colors ${sel.selected ? 'bg-cm-accent/5' : ''}`}>
                        <td className="py-1.5 pr-1 align-middle">
                          <input
                            type="checkbox"
                            aria-label={`Pedir ${ing.name}`}
                            checked={sel.selected}
                            onChange={e => handleToggle(ing, e.target.checked)}
                            className="rounded border-cm-border text-cm-accent focus:ring-cm-accent"
                          />
                        </td>
                        <td className="py-1.5 pr-2 font-medium text-cm-text whitespace-nowrap">
                          {ing.name}
                          <span className="text-cm-muted ml-1 font-normal">({ing.unit})</span>
                        </td>
                        <td className={`py-1.5 pr-2 text-right align-middle ${deficit > 0 ? 'text-amber-600 font-semibold' : 'text-cm-muted'}`}>
                          {ing.stock ?? '—'}
                        </td>
                        <td className="py-1.5 pr-2 text-right align-middle text-cm-muted">{ing.minStock ?? '—'}</td>
                        <td className={`py-1.5 pr-2 text-right align-middle font-bold ${deficit > 0 ? 'text-cm-error' : 'text-cm-muted'}`}>
                          {deficit > 0 ? deficit : '—'}
                        </td>
                        <td className="py-1 pr-2 align-middle">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={sel.quantity}
                            disabled={!sel.selected}
                            onChange={e =>
                              setSelected(prev => ({
                                ...prev,
                                [ing.id]: { ...prev[ing.id], selected: true, quantity: Math.max(0, Number(e.target.value)) },
                              }))
                            }
                            aria-label={`Cantidad de ${ing.name}`}
                            className={`w-full max-w-[4.5rem] px-2 py-1 rounded border text-right text-xs font-medium transition-colors ${
                              sel.selected
                                ? 'bg-cm-bg border-cm-border text-cm-text focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30'
                                : 'bg-cm-bg-alt border-cm-border/30 text-cm-muted cursor-not-allowed'
                            }`}
                          />
                        </td>
                        <td className="py-1.5 text-right align-middle font-semibold text-cm-text">
                          {sel.selected ? fmtCurrency(sel.quantity * sel.unitCost) : <span className="text-cm-muted">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 pt-1">
              <textarea
                placeholder="Notas (opcional) — ej: urgente, pedir de más para el fin de semana..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="flex-1 bg-cm-bg border border-cm-border rounded-lg px-3 py-2 text-xs text-cm-text resize-none placeholder:text-cm-muted"
              />
              <div className="flex items-center gap-2 shrink-0 self-end">
                <span className="text-sm font-black text-cm-text">{fmtCurrency(total)}</span>
                <button
                  onClick={handleSend}
                  disabled={sending || count === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-cm-accent text-white text-xs font-bold rounded-lg hover:bg-cm-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Enviar pre-pedido
                </button>
              </div>
            </div>

            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg ${
                    feedback.ok ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                  }`}
                >
                  {feedback.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                  {feedback.text}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>

      {/* ── Historial del equipo ── */}
      <motion.div variants={iv} className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-cm-muted uppercase tracking-widest">Pre-pedidos del equipo</span>
          <span className="text-[9px] text-cm-muted font-medium">{myPreOrders.length}</span>
        </div>

        {myPreOrders.length === 0 && (
          <div className="bg-cm-surface border border-cm-border rounded-xl text-center py-8">
            <Plus className="w-7 h-7 text-cm-muted mx-auto mb-2" />
            <p className="text-xs text-cm-muted">Todavía no hay pre-pedidos. Armá el primero arriba.</p>
          </div>
        )}

        {myPreOrders.map(order => {
          const badge = STATUS_BADGE[order.status] || { label: order.status, cls: 'bg-cm-bg-alt text-cm-muted', icon: null };
          const items = Object.values(order.items || {});
          const isMine = order.requestedBy === user?.email;
          return (
            <div key={order.id} className="bg-cm-surface border border-cm-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                      {badge.icon}
                      {badge.label}
                    </span>
                    {order.supplierName && (
                      <span className="text-xs font-bold text-cm-text truncate">{order.supplierName}</span>
                    )}
                    {!order.supplierName && order.status === 'pre_pedido' && (
                      <span className="text-[0.6rem] text-cm-muted">Esperando proveedor</span>
                    )}
                  </div>
                  <div className="text-[0.6rem] text-cm-muted mt-0.5">
                    {order.orderedAt ? new Date(order.orderedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                    {isMine ? '' : order.requestedBy ? ` · ${order.requestedBy}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm font-black text-cm-text">{fmtCurrency(order.total || 0)}</span>
                  {order.status === 'pre_pedido' && isMine && (
                    <button
                      onClick={() => handleCancel(order)}
                      className="p-1.5 rounded-lg text-cm-muted hover:text-cm-error hover:bg-rose-500/10 transition-colors"
                      title="Cancelar pre-pedido"
                      aria-label="Cancelar pre-pedido"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {items.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                  {items.map((item, i) => (
                    <div key={i} className="bg-cm-bg-alt rounded-lg px-2 py-1 text-[0.6rem]">
                      <span className="text-cm-text font-medium">{item.name}</span>
                      <span className="text-cm-muted ml-1">{item.quantity} {item.unit}</span>
                    </div>
                  ))}
                </div>
              )}
              {order.status === 'cancelado' && order.cancelReason && (
                <div className="mt-2 bg-rose-500/10 rounded-lg px-3 py-2">
                  <p className="text-[0.6rem] font-bold text-rose-600 uppercase tracking-wide">Motivo del rechazo</p>
                  <p className="text-xs text-rose-700 mt-0.5">{order.cancelReason}</p>
                  {order.cancelledBy && <p className="text-[0.55rem] text-rose-500/80 mt-1">por {order.cancelledBy}</p>}
                </div>
              )}
              {order.notes && <p className="text-[0.6rem] text-cm-muted mt-2 italic">{order.notes}</p>}
            </div>
          );
        })}
      </motion.div>

      <motion.p variants={iv} className="flex items-center gap-1 text-[0.6rem] text-cm-muted">
        <ChevronRight className="w-3 h-3" />
        Una vez confirmado por el administrador, el pedido pasa a las órdenes de compra.
      </motion.p>
    </motion.div>
  );
}
