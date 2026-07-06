import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { CashierDisplay } from './CashierDisplay';
import { OrderListItem } from './widgets';
import { ShiftSummary } from './widgets';
import type { Order, CashSession, CatalogState, CatalogProduct, CartItem, OrderPayload } from '../types';
import type { KPIs } from '../services/calculator';
import type { CustomerResult } from '../hooks/useCustomerSearch';
import { Search, X, Plus, Minus, Loader2, ShoppingCart } from 'lucide-react';
import '../../styles/cashier-theme.css';

/* ── Lazy modals ── */
const QuickPayModal = lazy(() => import('./modals/QuickPayModal').then(m => ({ default: m.QuickPayModal })));
const CancelOrderModal = lazy(() => import('./modals/CancelOrderModal').then(m => ({ default: m.CancelOrderModal })));
const TransferTableModal = lazy(() => import('./modals/TransferTableModal').then(m => ({ default: m.TransferTableModal })));
const VerifyPaymentModal = lazy(() => import('./modals/VerifyPaymentModal').then(m => ({ default: m.VerifyPaymentModal })));
const ReceiptModal = lazy(() => import('./modals/ReceiptModal').then(m => ({ default: m.ReceiptModal })));
const SplitBillModal = lazy(() => import('./modals/SplitBillModal').then(m => ({ default: m.SplitBillModal })));
const NewOrderModal = lazy(() => import('./modals/NewOrderModal').then(m => ({ default: m.NewOrderModal })));

/* ── Props ── */
interface CashierUIProps {
  session: CashSession | null;
  allSessions: CashSession[];
  orders: Order[];
  sessionOrders: Order[];
  filteredOrders: Order[];
  kpis: KPIs;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  userEmail: string;
  branchName: string;
  branchId: string | null;
  sessionDuration: string | null;
  onRefresh: () => void;
  onLogout: () => Promise<void>;
  modal: {
    activeModal: string | null;
    open: (name: string, props?: Record<string, unknown>) => void;
    close: () => void;
  };
  onPay: (orderId: string, method: string, discount: Record<string, unknown> | null) => Promise<{ success: boolean }>;
  onCancel: (orderId: string, reason: string) => Promise<{ success: boolean }>;
  onRefund?: (orderId: string, itemIndices: number[], reason: string) => Promise<{ success: boolean }>;
  onTransfer: (orderId: string, targetTable: string) => Promise<void>;
  onVerify: (orderId: string) => Promise<{ success: boolean }>;
  onSplit: (orderId: string, splits: Array<{ name: string; items: number[]; method: string }>) => Promise<{ success: boolean }>;
  onOpenSession: (data: { openingBalance: number; openedBy: string; notes: string }) => Promise<{ success: boolean }>;
  onCloseSession: (sessionId: string, data: { closingBalance: number; expectedCash: number; closedBy: string; notes: string }) => Promise<{ success: boolean }>;
  catalogState?: CatalogState & { searchQuery?: string; setSearchQuery?: (q: string) => void; filteredProducts?: CatalogProduct[]; retry?: () => void };
  orderBuilder?: {
    items: CartItem[];
    customerName: string;
    mesa: string;
    notes: string;
    itemCount: number;
    total: number;
    isEmpty: boolean;
    valid: boolean;
    warnings?: string[];
    addItem: (product: CatalogProduct, variation?: { name: string; adjustPrice: number }) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, qty: number) => void;
    setItemVariation: (productId: string, variation: { name: string; adjustPrice: number }) => void;
    setItemModifiers: (productId: string, modifiers: Array<{ name: string; price: number }>) => void;
    setCustomerName: (name: string) => void;
    setMesa: (mesa: string) => void;
    setNotes: (notes: string) => void;
    clearCart: () => void;
    buildPayload: (sessionId: string, source?: string) => OrderPayload;
    reset: () => void;
  };
  handleCreateOrder?: (payload: OrderPayload) => Promise<{ success: boolean; orderId?: string; error?: string }>;
  onOpenQuickPay?: (orderId: string) => void;
  orderingMode: boolean;
  setOrderingMode: (v: boolean) => void;
  catalog: CatalogState & { searchQuery?: string; setSearchQuery?: (q: string) => void; filteredProducts?: CatalogProduct[]; retry?: () => void };
  customerSearch: {
    query: string;
    setQuery: (q: string) => void;
    results: CustomerResult[];
    loading: boolean;
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    selectCustomer: (customer: CustomerResult) => { name: string; phone: string; email: string; mesa: string };
    closeSearch: () => void;
  };
  onHandleCreateOrder: (payAfterCreate?: boolean) => Promise<{ success: boolean; orderId?: string; error?: string }>;
}

/* ── Constants ── */
const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const modalFallback = (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="w-8 h-8 border-2 border-[var(--cashier-accent)] border-t-transparent rounded-full animate-spin" />
  </div>
);

/* ════════════════════════════════════════ */
/*  MAIN COMPONENT                          */
/* ════════════════════════════════════════ */
export function CashierUI({
  session, allSessions, orders, sessionOrders, filteredOrders, kpis, loading,
  searchQuery, setSearchQuery, userEmail, branchName, branchId, sessionDuration,
  onRefresh, onLogout,
  modal, onPay, onCancel, onRefund, onTransfer, onVerify, onSplit,
  onOpenSession, onCloseSession,
  catalogState, orderBuilder, handleCreateOrder, onOpenQuickPay,
  orderingMode, setOrderingMode, catalog, customerSearch, onHandleCreateOrder,
}: CashierUIProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  const dateStr = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  const userName = userEmail ? userEmail.split('@')[0] : 'Cajero';
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  // Modal actions
  const handleQuickPay = (o: Order) => { setSelectedOrder(o); modal.open('quickPay', { order: o }); };
  const handleCancel = (o: Order) => { setSelectedOrder(o); modal.open('cancelOrder', { order: o }); };
  const handleTransfer = (o: Order) => { setSelectedOrder(o); modal.open('transferTable', { order: o }); };
  const handleVerify = (o: Order) => { setSelectedOrder(o); modal.open('verifyPayment', { order: o }); };
  const handleSplit = (o: Order) => { setSelectedOrder(o); modal.open('splitBill', { order: o }); };
  const handleOpenSession = () => modal.open('session', { action: 'open' });
  const handleCloseSession = () => modal.open('session', { action: 'close' });

  // Orders
  const displayOrders = useMemo(() => {
    if (searchQuery) return filteredOrders;
    if (session?.status === 'open') return sessionOrders;
    return orders;
  }, [searchQuery, filteredOrders, session, sessionOrders, orders]);

  const pendingOrders = displayOrders.filter(o =>
    o.status !== 'cancelado' && o.payment_status !== 'pagado' &&
    o.payment_status !== 'reembolsado' && o.payment_status !== 'por_verificar'
  );
  const paidOrders = displayOrders.filter(o => o.payment_status === 'pagado' && o.status !== 'cancelado');
  const cancelledOrders = displayOrders.filter(o => o.status === 'cancelado');

  // Closed sessions (history)
  const closedSessions = useMemo(() =>
    allSessions.filter(s => s.status === 'closed').slice(0, 8),
  [allSessions]);

  // Income progress
  const chartIncome = useMemo(() => {
    if (!session) return null;
    const target = Math.max(session.openingBalance || 0, kpis.expectedCash || 1);
    const pct = Math.min((kpis.totalIngresos / target) * 100, 100);
    return { pct, target, current: kpis.totalIngresos };
  }, [session, kpis]);

  /* ── Loading ── */
  if (loading && orders.length === 0) {
    return (
      <div className="cashier-theme min-h-screen bg-[var(--cashier-bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--cashier-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-[var(--cashier-text-secondary)] uppercase tracking-widest">Cargando caja...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cashier-theme min-h-screen bg-[var(--cashier-bg)] text-[var(--cashier-text)]">

      {/* ══════ TOP BAR ══════ */}
      <header className="sticky top-0 z-40 bg-[var(--cashier-surface)]/90 backdrop-blur-lg border-b border-[var(--cashier-border)]">
        <div className="flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center text-white shrink-0 font-bold text-sm">S/</div>
            <div className="min-w-0">
              <h1 className="text-sm font-black uppercase tracking-wider truncate leading-tight">Cajero</h1>
              <p className="text-[10px] font-bold text-[var(--cashier-text-secondary)] truncate">{branchName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (session) setOrderingMode(v => !v); }}
              disabled={!session}
              title={!session ? 'Abrí una caja primero' : orderingMode ? 'Volver a órdenes' : 'Nuevo Pedido'}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 ${
                orderingMode
                  ? 'bg-[var(--cashier-error)]/10 text-[var(--cashier-error)] border border-[var(--cashier-error)]/30'
                  : 'bg-gradient-to-r from-[var(--cashier-accent)] to-emerald-600 text-white hover:opacity-90'
              }`}
            >
              {orderingMode ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
              <span className="hidden sm:inline">{orderingMode ? 'Cancelar' : 'Nuevo Pedido'}</span>
            </button>
            {orderBuilder && orderBuilder.itemCount > 0 && (
              <button
                onClick={() => { if (session) setOrderingMode(v => !v); }}
                className="relative p-2 rounded-xl hover:bg-[var(--cashier-bg)] transition-colors"
                title="Ver carrito"
              >
                <svg className="w-4 h-4 text-[var(--cashier-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-[var(--cashier-accent)] text-white text-[8px] font-black flex items-center justify-center">
                  {orderBuilder.itemCount}
                </span>
              </button>
            )}
            <button onClick={onRefresh} title="Recargar" className="p-2 rounded-xl hover:bg-[var(--cashier-bg)] transition-colors">
              <svg className="w-4 h-4 text-[var(--cashier-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <span className="hidden sm:inline-flex text-[11px] font-mono font-bold text-[var(--cashier-text-secondary)] bg-[var(--cashier-bg)] px-2.5 py-1 rounded-lg border border-[var(--cashier-border)]">{timeStr}</span>
            <div className="text-right mr-1">
              <p className="text-[9px] font-bold text-[var(--cashier-text-secondary)] uppercase tracking-wider">Esperado</p>
              <p className="text-sm font-mono font-black text-[var(--cashier-success)]">S/ {kpis.expectedCash.toFixed(2)}</p>
            </div>
            {branchId && userEmail && <NotificationBellWrapper branchId={branchId} userId={userEmail} />}
            <button onClick={onLogout} title="Salir"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--cashier-error)] border border-[var(--cashier-error)]/30 rounded-xl hover:bg-[var(--cashier-error)]/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* ══════ TWO-COLUMN BODY ══════ */}
      <div className="max-w-7xl mx-auto p-4 md:grid md:grid-cols-12 md:gap-6 pb-32">

        {/* ─── LEFT COLUMN: Dashboard (sticky) ─── */}
        <aside className="md:col-span-4 space-y-4 md:sticky md:top-20 md:self-start">
          {/* Welcome */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[var(--cashier-text-secondary)] uppercase">{dateStr}</p>
              <p className="text-lg font-black text-[var(--cashier-text)] mt-0.5">Hola, {displayName}</p>
            </div>
            {session?.status === 'open' && sessionDuration && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--cashier-success)] bg-[var(--cashier-success)]/10 px-3 py-1.5 rounded-full border border-[var(--cashier-success)]/20">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {sessionDuration}
              </div>
            )}
          </div>

          {/* Session Card */}
          <div className={`rounded-2xl border-2 p-4 ${
            session?.status === 'open'
              ? 'bg-[var(--cashier-success)]/5 border-[var(--cashier-success)]/30'
              : 'bg-[var(--cashier-warning)]/10 border-[var(--cashier-warning)]/30'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  session?.status === 'open'
                    ? 'bg-[var(--cashier-success)]/20 text-[var(--cashier-success)]'
                    : 'bg-[var(--cashier-warning)]/20 text-[var(--cashier-warning)]'
                }`}>
                  {session?.status === 'open' ? (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-black ${session?.status === 'open' ? 'text-[var(--cashier-success)]' : 'text-[var(--cashier-warning)]'}`}>
                    {session?.status === 'open' ? 'Caja Abierta' : 'Caja Cerrada'}
                  </p>
                  <p className="text-[10px] font-semibold text-[var(--cashier-text-secondary)] mt-0.5 truncate">
                    {session?.status === 'open'
                      ? `S/ ${(session.openingBalance || 0).toFixed(2)} · ${new Date(session.openedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
                      : 'Abrí una sesión para contabilizar'
                    }
                  </p>
                </div>
              </div>
              <button onClick={session?.status === 'open' ? handleCloseSession : handleOpenSession}
                className={`shrink-0 px-3 py-2 text-[10px] font-black rounded-xl text-white transition-all active:scale-95 ${
                  session?.status === 'open'
                    ? 'bg-gradient-to-r from-red-500 to-rose-600'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600'
                }`}>
                {session?.status === 'open' ? 'Cerrar' : 'Abrir'}
              </button>
            </div>
            {session?.status === 'open' && chartIncome && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[9px] font-bold text-[var(--cashier-text-secondary)] mb-1">
                  <span>Progreso</span>
                  <span>S/ {chartIncome.current.toFixed(0)} / S/ {chartIncome.target.toFixed(0)}</span>
                </div>
                <div className="h-1.5 bg-[var(--cashier-bg)] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[var(--cashier-success)] to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(chartIncome.pct, 100)}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Por Verificar Alert */}
          {kpis.porVerificar.length > 0 && (
            <div className="flex items-start gap-2 bg-[var(--cashier-accent)]/10 border border-[var(--cashier-accent)]/30 rounded-xl px-3 py-2.5">
              <svg className="w-4 h-4 text-[var(--cashier-accent)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-[var(--cashier-accent)]">
                  {kpis.porVerificar.length} pago{kpis.porVerificar.length > 1 ? 's' : ''} · S/ {kpis.totalPorVerificar.toFixed(2)}
                </p>
                <p className="text-[9px] text-[var(--cashier-text-muted)] mt-1">Verificá cada orden para confirmar</p>
              </div>
            </div>
          )}

          {/* KPI Cards (2xN grid in left sidebar) */}
          <div className="grid grid-cols-2 gap-2">
            <KpiCardSmall icon="cash" label="Efectivo" value={kpis.totalEfectivo} color="success" />
            <KpiCardSmall icon="phone" label="Yape / Plin" value={kpis.totalYapePlin} color="info" />
            <KpiCardSmall icon="card" label="Tarjeta POS" value={kpis.totalPos} color="accent" />
            <KpiCardSmall icon="clock" label="Pendiente" value={kpis.totalPendiente} color={kpis.totalPendiente > 0 ? 'warning' : 'muted'} />
          </div>

          {/* LED Display (compact) */}
          <CashierDisplay
            total={kpis.totalIngresos}
            itemCount={kpis.paidCount}
            mode={session?.status === 'open' ? 'total' : 'closed'}
            statusText={session?.status === 'open' ? 'CAJA ABIERTA' : 'CAJA CERRADA'}
            clock={timeStr}
          />

          {/* Sessions history */}
          {closedSessions.length > 0 && (
            <div className="bg-[var(--cashier-surface)] border border-[var(--cashier-border)] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--cashier-border)]">
                <h3 className="text-[11px] font-bold text-[var(--cashier-text)] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[var(--cashier-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Historial
                </h3>
              </div>
              <div className="divide-y divide-[var(--cashier-border)]">
                {closedSessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--cashier-bg)]/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-[var(--cashier-text)]">
                        {new Date(s.openedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-[9px] text-[var(--cashier-text-secondary)]">
                        {new Date(s.openedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} - {new Date(s.closedAt!).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      {s.difference !== null && (
                        <p className={`text-[11px] font-black ${s.difference >= 0 ? 'text-[var(--cashier-success)]' : 'text-[var(--cashier-error)]'}`}>
                          {s.difference >= 0 ? '+' : ''}S/ {s.difference.toFixed(0)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ─── RIGHT COLUMN: Orders or Ordering UI ─── */}
        <main className="md:col-span-8 space-y-4 mt-4 md:mt-0">
          {orderingMode && catalog && orderBuilder && customerSearch && session ? (
            <OrderingLayout
              catalog={catalog}
              orderBuilder={orderBuilder}
              customerSearch={customerSearch}
              onConfirm={() => onHandleCreateOrder(false)}
              onConfirmAndPay={() => onHandleCreateOrder(true)}
              onCancel={() => { setOrderingMode(false); orderBuilder?.reset(); }}
            />
          ) : (
            <>
              {/* Search (sticky within right column) */}
              <div className="sticky top-20 z-30 bg-[var(--cashier-bg)] pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por #orden, cliente o mesa..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--cashier-surface)] border border-[var(--cashier-border)] rounded-xl text-sm font-bold text-[var(--cashier-text)] placeholder:text-[var(--cashier-text-muted)] focus:outline-none focus:border-[var(--cashier-accent)] transition-colors"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--cashier-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Orders */}
              {displayOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--cashier-text-secondary)]">
                  <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm font-bold">{searchQuery ? 'Sin resultados' : 'No hay órdenes'}</p>
                  <p className="text-xs mt-1 font-semibold text-[var(--cashier-text-muted)]">
                    {searchQuery ? 'Probá con otro término' : 'Las órdenes aparecerán automáticamente'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pending orders */}
                  {pendingOrders.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2 px-1">
                        <h3 className="text-[11px] font-bold text-[var(--cashier-warning)] uppercase tracking-wider">
                        ⚡ Pendientes · {pendingOrders.length}
                        </h3>
                        <span className="text-[9px] font-bold text-[var(--cashier-text-muted)]">
                          S/ {pendingOrders.reduce((s, o) => s + (o.financials?.total || 0), 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {pendingOrders.map(order => (
                          <OrderListItem
                            key={order.id} order={order}
                            onQuickPay={() => handleQuickPay(order)}
                            onCancel={() => handleCancel(order)}
                            onTransfer={() => handleTransfer(order)}
                            onVerify={() => handleVerify(order)}
                            onSplit={() => handleSplit(order)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Paid orders (compact) */}
                  {paidOrders.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2 px-1">
                        <h3 className="text-[11px] font-bold text-[var(--cashier-success)] uppercase tracking-wider">
                        ✓ Pagadas · {paidOrders.length}
                        </h3>
                        <span className="text-[9px] font-bold text-[var(--cashier-text-muted)]">
                          S/ {paidOrders.reduce((s, o) => s + (o.financials?.total || 0), 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {paidOrders.map(order => (
                          <OrderListItem
                            key={order.id} order={order}
                            onQuickPay={() => handleQuickPay(order)}
                            onCancel={() => handleCancel(order)}
                            onTransfer={() => handleTransfer(order)}
                            onVerify={() => handleVerify(order)}
                            onSplit={() => handleSplit(order)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cancelled (collapsed) */}
                  {cancelledOrders.length > 0 && (
                    <details className="group">
                      <summary className="text-[10px] font-bold text-[var(--cashier-text-muted)] cursor-pointer hover:text-[var(--cashier-text-secondary)] transition-colors list-none flex items-center gap-1.5 px-1 py-1">
                        <svg className="w-3 h-3 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Canceladas · {cancelledOrders.length}
                      </summary>
                      <div className="mt-1.5 space-y-1 opacity-60">
                        {cancelledOrders.map(order => (
                          <OrderListItem
                            key={order.id} order={order}
                            onQuickPay={() => {}}
                            onCancel={() => {}}
                            onTransfer={() => {}}
                            onVerify={() => {}}
                            onSplit={() => {}}
                          />
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Summary */}
                  <p className="text-[10px] font-bold text-[var(--cashier-text-muted)] text-center pt-1">
                    {displayOrders.length} orden{displayOrders.length !== 1 ? 'es' : ''}
                    {session?.status === 'open' ? ' en esta sesión' : ''}
                  </p>
                </div>
              )}
            </>
          )}
        </main>

      </div>

      {/* ══════ LAZY MODALS ══════ */}
      <Suspense fallback={modalFallback}>
        {modal.activeModal === 'quickPay' && selectedOrder && <QuickPayModal order={selectedOrder} onPay={onPay} onClose={modal.close} />}
        {modal.activeModal === 'cancelOrder' && selectedOrder && <CancelOrderModal order={selectedOrder} onCancel={onCancel} onRefund={onRefund} onClose={modal.close} />}
        {modal.activeModal === 'transferTable' && selectedOrder && <TransferTableModal order={selectedOrder} tables={TABLES} onTransfer={async (oid, t) => { await onTransfer(oid, t); }} onClose={modal.close} />}
        {modal.activeModal === 'verifyPayment' && selectedOrder && <VerifyPaymentModal order={selectedOrder} onVerify={onVerify} onClose={modal.close} />}
        {modal.activeModal === 'receipt' && selectedOrder && <ReceiptModal order={selectedOrder} branchName={branchName} onClose={modal.close} />}
        {modal.activeModal === 'splitBill' && selectedOrder && <SplitBillModal order={selectedOrder} onSplit={onSplit} onClose={modal.close} />}
        {modal.activeModal === 'session' && (
          <SessionModal action={session?.status === 'open' ? 'close' : 'open'} session={session} onOpen={onOpenSession} onClose={onCloseSession} onDismiss={modal.close} />
        )}
        {modal.activeModal === 'closeSummary' && session && (
          <CloseSummaryModal session={session} kpis={kpis} onDismiss={modal.close} />
        )}
        {modal.activeModal === 'newOrder' && catalogState && orderBuilder && handleCreateOrder && (
          <NewOrderModal
            catalog={catalogState}
            orderBuilder={orderBuilder}
            sessionId={session?.id || null}
            onClose={modal.close}
            onCreateOrder={handleCreateOrder}
            onOpenQuickPay={onOpenQuickPay}
          />
        )}
      </Suspense>
    </div>
  );
}

/* ════════════════════════════════════════ */
/*  SUB-COMPONENTS                          */
/* ════════════════════════════════════════ */

/* ── Compact KPI Card (with icon) ── */
const KPI_ICONS: Record<string, string> = {
  cash: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  phone: 'M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  card: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
};

function KpiCardSmall({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    success: 'text-[var(--cashier-success)]',
    info: 'text-[var(--cashier-info)]',
    accent: 'text-[var(--cashier-accent)]',
    warning: 'text-[var(--cashier-warning)]',
    muted: 'text-[var(--cashier-text-muted)]',
  };
  return (
    <div className="bg-[var(--cashier-surface)] border border-[var(--cashier-border)] rounded-xl p-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg bg-[var(--cashier-bg)] flex items-center justify-center shrink-0 ${colorMap[color]}`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={KPI_ICONS[icon] || KPI_ICONS.cash} />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-[var(--cashier-text-secondary)] uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-mono font-black ${colorMap[color] || 'text-[var(--cashier-text)]'}`}>S/ {value.toFixed(2)}</p>
      </div>
    </div>
  );
}

/* ── NotificationBell wrapper ── */
function NotificationBellWrapper({ branchId, userId }: { branchId: string; userId: string }) {
  const [Comp, setComp] = useState<React.ComponentType<{ branchId: string; userId: string; className?: string }> | null>(null);
  useEffect(() => {
    import('../../components/NotificationBell').then(m => setComp(() => m.default));
  }, []);
  if (!Comp) return <div className="w-9 h-9" />;
  return <Comp branchId={branchId} userId={userId} />;
}

/* ── Session Modal ── */
interface SessionModalProps {
  action: 'open' | 'close';
  session: CashSession | null;
  onOpen: (data: { openingBalance: number; openedBy: string; notes: string }) => Promise<{ success: boolean }>;
  onClose: (sessionId: string, data: { closingBalance: number; expectedCash: number; closedBy: string; notes: string }) => Promise<{ success: boolean }>;
  onDismiss: () => void;
}

function SessionModal({ action, session, onOpen, onClose, onDismiss }: SessionModalProps) {
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const expectedCash = action === 'close' ? (session?.openingBalance || 0) : 0;
  const handleConfirm = async () => {
    setProcessing(true);
    try {
      if (action === 'open') {
        await onOpen({ openingBalance: parseFloat(balance) || 0, openedBy: 'cajero', notes });
      } else if (session) {
        await onClose(session.id, { closingBalance: parseFloat(balance) || 0, expectedCash, closedBy: 'cajero', notes });
      }
    } finally {
      setProcessing(false);
      onDismiss();
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onDismiss}>
      <div className="bg-[var(--cashier-surface)] border border-[var(--cashier-border)] rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-black uppercase tracking-wider mb-4">{action === 'open' ? 'Abrir Caja' : 'Cerrar Caja'}</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-[var(--cashier-text-secondary)] uppercase tracking-wider block mb-1">
              {action === 'open' ? 'Saldo Inicial' : 'Saldo Final'}
            </label>
            <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl text-lg font-mono font-black text-[var(--cashier-text)] focus:outline-none focus:border-[var(--cashier-accent)] transition-colors" placeholder="0.00" autoFocus />
          </div>
          {action === 'close' && (
            <div className="text-xs font-semibold text-[var(--cashier-text-secondary)] p-3 bg-[var(--cashier-bg)] rounded-xl border border-[var(--cashier-border)]">
              <span className="text-[var(--cashier-text-muted)]">Esperado: </span>
              <span className="font-black text-[var(--cashier-text)]">S/ {expectedCash.toFixed(2)}</span>
            </div>
          )}
          <div>
            <label className="text-[10px] font-bold text-[var(--cashier-text-secondary)] uppercase tracking-wider block mb-1">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-2 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl text-sm text-[var(--cashier-text)] focus:outline-none focus:border-[var(--cashier-accent)] transition-colors resize-none" rows={2} placeholder="Observaciones opcionales..." />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onDismiss} disabled={processing}
            className="flex-1 py-3 border border-[var(--cashier-border)] text-[var(--cashier-text-secondary)] text-xs font-black uppercase tracking-wider rounded-xl hover:bg-[var(--cashier-bg)] transition-colors disabled:opacity-50">Cancelar</button>
          <button onClick={handleConfirm} disabled={processing}
            className={`flex-1 py-3 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              action === 'open' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-red-500 to-rose-600'
            }`}>
            {processing ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Procesando...</> : (action === 'open' ? 'Abrir Caja' : 'Cerrar Caja')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Close Summary Modal ── */
interface CloseSummaryProps { session: CashSession; kpis: KPIs; onDismiss: () => void; }

function CloseSummaryModal({ session, kpis, onDismiss }: CloseSummaryProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onDismiss}>
      <div className="bg-[var(--cashier-surface)] border border-[var(--cashier-border)] rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-black uppercase tracking-wider mb-1">Resumen de Cierre</h3>
        <p className="text-[11px] font-bold text-[var(--cashier-text-secondary)] mb-4">{new Date(session.closedAt || Date.now()).toLocaleString('es-PE')}</p>
        <ShiftSummary
          openingBalance={session.openingBalance || 0} totalEfectivo={kpis.totalEfectivo}
          totalYapePlin={kpis.totalYapePlin} totalPos={kpis.totalPos} totalIngresos={kpis.totalIngresos}
          expectedCash={session.expectedCash || 0} closingBalance={session.closingBalance || 0}
          difference={session.difference ?? undefined} paidCount={kpis.paidCount} cancelledCount={kpis.cancelledCount}
          openedAt={session.openedAt} closedAt={session.closedAt || undefined} sessionId={session.id}
        />
        <button onClick={onDismiss}
          className="w-full mt-4 py-3 bg-[var(--cashier-accent)] text-white text-xs font-black uppercase tracking-wider rounded-xl hover:opacity-90 transition-all active:scale-95">Cerrar</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════ */
/*  OrderingLayout Sub-Component            */
/* ════════════════════════════════════════ */

interface OrderingLayoutProps {
  catalog: CatalogState & {
    searchQuery?: string;
    setSearchQuery?: (q: string) => void;
    filteredProducts?: CatalogProduct[];
    retry?: () => void;
  };
  orderBuilder: NonNullable<CashierUIProps['orderBuilder']>;
  customerSearch: CashierUIProps['customerSearch'];
  onConfirm: () => void;
  onConfirmAndPay: () => void;
  onCancel: () => void;
}

function OrderingLayout({
  catalog,
  orderBuilder,
  customerSearch,
  onConfirm,
  onConfirmAndPay,
  onCancel,
}: OrderingLayoutProps) {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [variationProduct, setVariationProduct] = useState<CatalogProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Determine which products to display
  const sourceProducts = catalog.filteredProducts ?? catalog.products;

  const displayProducts = useMemo(() => {
    let filtered = sourceProducts;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }
    if (activeCategory !== 'Todos') {
      filtered = filtered.filter(p => p.category === activeCategory);
    }
    return filtered;
  }, [sourceProducts, search, activeCategory]);

  const handleAddProduct = useCallback((product: CatalogProduct) => {
    if (product.variations || product.steps) {
      setVariationProduct(product);
    } else {
      orderBuilder.addItem(product);
    }
  }, [orderBuilder]);

  const handleSelectVariation = useCallback((variation: { name: string; adjustPrice: number }) => {
    if (variationProduct) {
      orderBuilder.addItem(variationProduct, variation);
      setVariationProduct(null);
    }
  }, [variationProduct, orderBuilder]);

  const handleConfirm = useCallback(async () => {
    if (orderBuilder.isEmpty || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }, [orderBuilder, submitting, onConfirm]);

  const handleConfirmAndPay = useCallback(async () => {
    if (orderBuilder.isEmpty || submitting) return;
    setSubmitting(true);
    try {
      await onConfirmAndPay();
    } finally {
      setSubmitting(false);
    }
  }, [orderBuilder, submitting, onConfirmAndPay]);

  // Handle customer search selection
  const handleCustomerSelect = useCallback((customer: CustomerResult) => {
    const result = customerSearch.selectCustomer(customer);
    orderBuilder.setCustomerName(result.name);
    if (result.mesa) {
      orderBuilder.setMesa(result.mesa);
    }
  }, [customerSearch, orderBuilder]);

  // Variation product name lookup
  const variationData = useMemo(() => {
    if (!variationProduct) return null;
    const entries = Object.entries(variationProduct.variations || {});
    return { product: variationProduct, entries };
  }, [variationProduct]);

  const cartCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const item of orderBuilder.items) {
      m[item.productId] = (m[item.productId] || 0) + item.quantity;
    }
    return m;
  }, [orderBuilder.items]);

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-12rem)]">
      {/* ── Variation Sheet Overlay ── */}
      {variationData && (
        <VariationsSheet
          product={variationData.product}
          entries={variationData.entries}
          onSelect={handleSelectVariation}
          onClose={() => setVariationProduct(null)}
        />
      )}

      {/* ── TOP: Search + Category Tabs + Product Grid ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Search */}
        <div className="relative shrink-0 mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--cashier-text-muted)]" />
          <input
            type="text"
            placeholder="Buscar producto... (1-9 para atajos)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--cashier-surface)] border border-[var(--cashier-border)] rounded-xl text-xs font-bold text-[var(--cashier-text)] placeholder:text-[var(--cashier-text-muted)] focus:outline-none focus:border-[var(--cashier-accent)] transition-colors"
          />
        </div>

        {/* Category tabs */}
        <div className="shrink-0 overflow-x-auto scrollbar-none mb-2">
          <div className="flex gap-1.5">
            {['Todos', ...catalog.categories].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full border transition-all ${
                  activeCategory === cat
                    ? 'bg-[var(--cashier-accent)] text-white border-[var(--cashier-accent)]'
                    : 'bg-[var(--cashier-surface)] text-[var(--cashier-text-secondary)] border-[var(--cashier-border)] hover:border-[var(--cashier-accent)]/30'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {catalog.loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--cashier-accent)]" />
                <p className="text-sm font-bold text-[var(--cashier-text-secondary)]">Cargando catálogo...</p>
              </div>
            </div>
          ) : catalog.error ? (
            <div className="flex items-center justify-center py-16 text-center">
              <div>
                <p className="text-sm font-bold text-[var(--cashier-error)]">{catalog.error}</p>
                {catalog.retry && (
                  <button onClick={catalog.retry}
                    className="mt-3 px-4 py-2 bg-[var(--cashier-accent)] text-white text-xs font-black rounded-xl hover:opacity-90 transition-all">
                    Reintentar
                  </button>
                )}
              </div>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-bold text-[var(--cashier-text-secondary)]">
                {search.trim() ? 'Sin resultados' : 'No hay productos'}
              </p>
              <p className="text-[11px] text-[var(--cashier-text-muted)] mt-1">
                {search.trim() ? 'Probá con otro término' : 'Esta categoría está vacía'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
              {displayProducts.slice(0, 18).map((product, index) => {
                const inCart = cartCounts[product.id];
                const hasVariations = !!(product.variations || product.steps);
                return (
                  <button
                    key={product.id}
                    onClick={() => handleAddProduct(product)}
                    className="relative flex flex-col items-start text-left p-3 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl hover:border-[var(--cashier-accent)]/40 hover:bg-[var(--cashier-bg)]/80 transition-all active:scale-[0.98] gap-1"
                    aria-label={`Agregar ${product.name}`}
                  >
                    {index < 9 && (
                      <span className="absolute top-1 left-1 w-4 h-4 rounded bg-[var(--cashier-surface)] border border-[var(--cashier-border)] text-[9px] font-bold text-[var(--cashier-text-muted)] flex items-center justify-center">
                        {index + 1}
                      </span>
                    )}
                    {inCart && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--cashier-accent)] text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg">
                        {inCart}
                      </span>
                    )}
                    {hasVariations && (
                      <span className="absolute top-1 right-1 text-[10px]" title="Tiene variaciones">⚡</span>
                    )}
                    {product.image && (
                      <img src={product.image} alt={product.name}
                        className="w-full h-16 object-cover rounded-lg mb-1" />
                    )}
                    <span className="text-xs font-bold text-[var(--cashier-text)] leading-tight line-clamp-2">
                      {product.name}
                    </span>
                    <span className="text-[11px] font-mono font-black text-[var(--cashier-accent)]">
                      S/ {(product.price ?? product.base_price).toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM: Cart Panel ── */}
      <div className="shrink-0 bg-[var(--cashier-surface)] border border-[var(--cashier-border)] rounded-2xl overflow-hidden">
        {/* Cart header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--cashier-border)]">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-[var(--cashier-text)] flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5 text-[var(--cashier-accent)]" />
            Pedido
            {orderBuilder.itemCount > 0 && (
              <span className="text-[10px] font-bold text-[var(--cashier-text-secondary)] ml-1">
                · {orderBuilder.itemCount} ítem{orderBuilder.itemCount !== 1 ? 's' : ''}
              </span>
            )}
          </h3>
        </div>

        {/* Cart items */}
        <div className="max-h-40 overflow-y-auto px-4 py-2 space-y-1.5">
          {orderBuilder.isEmpty ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <p className="text-[11px] font-bold text-[var(--cashier-text-secondary)]">Carrito vacío</p>
              <p className="text-[10px] text-[var(--cashier-text-muted)]">Seleccioná productos del catálogo</p>
            </div>
          ) : (
            orderBuilder.items.map(item => (
              <div key={item.productId}
                className="flex items-center gap-2 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl px-3 py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-[var(--cashier-text)] truncate leading-tight">{item.name}</p>
                  {item.selectedVariation && (
                    <p className="text-[9px] text-[var(--cashier-accent)] font-semibold">{item.selectedVariation.name}</p>
                  )}
                  <p className="text-[10px] font-mono font-bold text-[var(--cashier-text-secondary)]">
                    S/ {item.unitPrice.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => orderBuilder.updateQuantity(item.productId, item.quantity - 1)}
                    className="w-5 h-5 flex items-center justify-center rounded-lg bg-[var(--cashier-surface)] border border-[var(--cashier-border)] text-[var(--cashier-text-secondary)] hover:bg-[var(--cashier-bg)] transition-colors"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <span className="w-5 text-center text-[11px] font-mono font-black text-[var(--cashier-text)]">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => orderBuilder.updateQuantity(item.productId, item.quantity + 1)}
                    className="w-5 h-5 flex items-center justify-center rounded-lg bg-[var(--cashier-surface)] border border-[var(--cashier-border)] text-[var(--cashier-text-secondary)] hover:bg-[var(--cashier-bg)] transition-colors"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
                <p className="text-[11px] font-mono font-black text-[var(--cashier-text)] w-12 text-right shrink-0">
                  S/ {item.total.toFixed(2)}
                </p>
                <button
                  onClick={() => orderBuilder.removeItem(item.productId)}
                  className="p-0.5 rounded-lg hover:bg-[var(--cashier-error)]/10 text-[var(--cashier-text-muted)] hover:text-[var(--cashier-error)] transition-colors shrink-0"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Customer fields */}
        <div className="px-4 py-2 space-y-2 border-t border-[var(--cashier-border)]">
          <div className="relative">
            <input
              type="text"
              placeholder="Nombre del cliente"
              value={orderBuilder.customerName}
              onChange={e => {
                orderBuilder.setCustomerName(e.target.value);
                customerSearch.setQuery(e.target.value);
                customerSearch.setIsOpen(e.target.value.trim().length > 0);
              }}
              className="w-full px-3 py-2 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl text-xs font-bold text-[var(--cashier-text)] placeholder:text-[var(--cashier-text-muted)] focus:outline-none focus:border-[var(--cashier-accent)] transition-colors"
            />
            {customerSearch.isOpen && customerSearch.results.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-[var(--cashier-surface)] border border-[var(--cashier-border)] rounded-xl shadow-xl overflow-hidden">
                {customerSearch.results.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleCustomerSelect(c)}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-[var(--cashier-text)] hover:bg-[var(--cashier-bg)] transition-colors border-b border-[var(--cashier-border)] last:border-b-0"
                  >
                    <span>{c.name}</span>
                    {c.phone && <span className="text-[var(--cashier-text-muted)] ml-2">{c.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Mesa"
              value={orderBuilder.mesa}
              onChange={e => orderBuilder.setMesa(e.target.value)}
              className="flex-1 px-3 py-2 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl text-xs font-bold text-[var(--cashier-text)] placeholder:text-[var(--cashier-text-muted)] focus:outline-none focus:border-[var(--cashier-accent)] transition-colors"
            />
          </div>
          <textarea
            placeholder="Notas del pedido..."
            value={orderBuilder.notes}
            onChange={e => orderBuilder.setNotes(e.target.value)}
            rows={1}
            className="w-full px-3 py-2 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl text-xs font-bold text-[var(--cashier-text)] placeholder:text-[var(--cashier-text-muted)] focus:outline-none focus:border-[var(--cashier-accent)] transition-colors resize-none"
          />
        </div>

        {/* Total + Actions */}
        <div className="border-t border-[var(--cashier-border)] px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--cashier-text-secondary)] uppercase tracking-wider">Total</span>
            <span className="text-base font-mono font-black text-[var(--cashier-text)]">
              S/ {orderBuilder.total.toFixed(2)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={submitting}
              className="flex-1 py-2.5 border border-[var(--cashier-border)] text-[var(--cashier-text-secondary)] text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-[var(--cashier-bg)] transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={orderBuilder.isEmpty || submitting}
              className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Enviando...</>
              ) : (
                'Enviar a Cocina'
              )}
            </button>
            <button
              onClick={handleConfirmAndPay}
              disabled={orderBuilder.isEmpty || submitting}
              className="flex-1 py-2.5 bg-gradient-to-r from-[var(--cashier-accent)] to-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Enviando...</>
              ) : (
                'Cobrar y Enviar'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════ */
/*  VariationsSheet Sub-Component           */
/* ════════════════════════════════════════ */

interface VariationsSheetProps {
  product: CatalogProduct;
  entries: [string, { name: string; adjustPrice: number }][];
  onSelect: (variation: { name: string; adjustPrice: number }) => void;
  onClose: () => void;
}

function VariationsSheet({ product, entries, onSelect, onClose }: VariationsSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}>
      <div className="bg-[var(--cashier-surface)] border border-[var(--cashier-border)] rounded-2xl w-full max-w-sm p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-[var(--cashier-text)]">
            {product.name}
          </h3>
          <button onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--cashier-bg)] text-[var(--cashier-text-secondary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] font-bold text-[var(--cashier-text-secondary)] uppercase tracking-wider mb-3">
          Variaciones
        </p>
        <div className="space-y-1.5">
          {entries.map(([key, v]) => {
            const totalPrice = (product.price ?? product.base_price ?? 0) + v.adjustPrice;
            return (
              <button
                key={key}
                onClick={() => onSelect(v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl hover:border-[var(--cashier-accent)]/40 transition-all text-left"
              >
                <span className="text-xs font-bold text-[var(--cashier-text)]">{v.name}</span>
                <span className="text-xs font-mono font-black text-[var(--cashier-accent)]">
                  S/ {totalPrice.toFixed(2)}
                </span>
              </button>
            );
          })}
        </div>
        <button onClick={onClose}
          className="w-full mt-4 py-2.5 border border-[var(--cashier-border)] text-[var(--cashier-text-secondary)] text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-[var(--cashier-bg)] transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}
