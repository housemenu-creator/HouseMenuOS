import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Plus, Minus, ShoppingCart, Loader2 } from 'lucide-react';
import type { CatalogState, CartItem, CatalogProduct, OrderPayload } from '../../types';

/* ── Props ── */
interface NewOrderModalProps {
  catalog: CatalogState & {
    searchQuery?: string;
    setSearchQuery?: (q: string) => void;
    filteredProducts?: CatalogProduct[];
    retry?: () => void;
  };
  orderBuilder: {
    items: CartItem[];
    customerName: string;
    mesa: string;
    notes: string;
    itemCount: number;
    total: number;
    isEmpty: boolean;
    addItem: (product: CatalogProduct) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, qty: number) => void;
    setCustomerName: (name: string) => void;
    setMesa: (mesa: string) => void;
    setNotes: (notes: string) => void;
    clearCart: () => void;
    buildPayload: (sessionId: string, source?: string) => OrderPayload;
    reset: () => void;
  };
  sessionId: string | null;
  onClose: () => void;
  onCreateOrder: (payload: OrderPayload) => Promise<{ success: boolean; orderId?: string; error?: string }>;
  onOpenQuickPay?: (orderId: string) => void;
}

/* ════════════════════════════════════════ */
/*  NewOrderModal                            */
/* ════════════════════════════════════════ */
export function NewOrderModal({
  catalog,
  orderBuilder,
  sessionId,
  onClose,
  onCreateOrder,
  onOpenQuickPay,
}: NewOrderModalProps) {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [submitting, setSubmitting] = useState(false);
  const [cobrarAhora, setCobrarAhora] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!sessionId || orderBuilder.isEmpty || submitting) return;
    setSubmitting(true);
    try {
      const payload = orderBuilder.buildPayload(sessionId, 'cashier');
      const result = await onCreateOrder(payload);
      if (result.success) {
        const createdOrderId = result.orderId;
        orderBuilder.reset();
        onClose();
        if (cobrarAhora && createdOrderId && onOpenQuickPay) {
          onOpenQuickPay(createdOrderId);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }, [sessionId, orderBuilder, submitting, onCreateOrder, onClose, cobrarAhora, onOpenQuickPay]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-testid="modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[var(--cashier-surface)] border border-[var(--cashier-border)] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--cashier-border)] shrink-0">
            <h2 className="text-base font-black uppercase tracking-wider text-[var(--cashier-text)] flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[var(--cashier-accent)]" />
              Nuevo Pedido
            </h2>
            <div className="flex items-center gap-3">
              {orderBuilder.itemCount > 0 && (
                <span className="text-[11px] font-bold text-[var(--cashier-text-secondary)] bg-[var(--cashier-bg)] px-2.5 py-1 rounded-full border border-[var(--cashier-border)]">
                  {orderBuilder.itemCount} ítem{orderBuilder.itemCount !== 1 ? 's' : ''}
                </span>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-[var(--cashier-bg)] text-[var(--cashier-text-secondary)] transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Body: two-column layout ── */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            {/* ── LEFT: Catalog Browser ── */}
            <div className="flex-1 overflow-hidden flex flex-col border-r-0 lg:border-r border-[var(--cashier-border)]">
              {catalog.loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--cashier-accent)]" />
                    <p className="text-sm font-bold text-[var(--cashier-text-secondary)]">Cargando catálogo...</p>
                  </div>
                </div>
              ) : catalog.error ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 py-16 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-[var(--cashier-error)]/10 flex items-center justify-center">
                      <X className="w-6 h-6 text-[var(--cashier-error)]" />
                    </div>
                    <p className="text-sm font-bold text-[var(--cashier-error)]">{catalog.error}</p>
                    {catalog.retry && (
                      <button
                        onClick={catalog.retry}
                        className="px-4 py-2 bg-[var(--cashier-accent)] text-white text-xs font-black rounded-xl hover:opacity-90 transition-all active:scale-95"
                      >
                        Reintentar
                      </button>
                    )}
                  </div>
                </div>
              ) : catalog.isEmpty ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <ShoppingCart className="w-10 h-10 text-[var(--cashier-text-muted)] opacity-30" />
                    <p className="text-sm font-bold text-[var(--cashier-text-secondary)]">No hay productos disponibles</p>
                    <p className="text-[11px] text-[var(--cashier-text-muted)]">El catálogo está vacío para esta sucursal</p>
                  </div>
                </div>
              ) : (
                <CatalogBrowser
                  catalog={catalog}
                  activeCategory={activeCategory}
                  onSelectCategory={setActiveCategory}
                  onAddProduct={orderBuilder.addItem}
                  cartItems={orderBuilder.items}
                />
              )}
            </div>

            {/* ── RIGHT: Cart Panel ── */}
            <div className="w-full lg:w-80 shrink-0 overflow-y-auto flex flex-col border-t lg:border-t-0 border-[var(--cashier-border)]">
              <CartPanel
                items={orderBuilder.items}
                customerName={orderBuilder.customerName}
                mesa={orderBuilder.mesa}
                notes={orderBuilder.notes}
                total={orderBuilder.total}
                isEmpty={orderBuilder.isEmpty}
                submitting={submitting}
                cobrarAhora={cobrarAhora}
                sessionId={sessionId}
                onCustomerNameChange={orderBuilder.setCustomerName}
                onMesaChange={orderBuilder.setMesa}
                onNotesChange={orderBuilder.setNotes}
                onRemoveItem={orderBuilder.removeItem}
                onUpdateQuantity={orderBuilder.updateQuantity}
                onCobrarAhoraChange={setCobrarAhora}
                onConfirm={handleConfirm}
                onCancel={onClose}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ════════════════════════════════════════ */
/*  CatalogBrowser Sub-Component             */
/* ════════════════════════════════════════ */
interface CatalogBrowserProps {
  catalog: CatalogState & {
    searchQuery?: string;
    setSearchQuery?: (q: string) => void;
    filteredProducts?: CatalogProduct[];
    retry?: () => void;
  };
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  onAddProduct: (product: CatalogProduct) => void;
  cartItems: CartItem[];
}

function CatalogBrowser({
  catalog,
  activeCategory,
  onSelectCategory,
  onAddProduct,
  cartItems,
}: CatalogBrowserProps) {
  const [search, setSearch] = useState('');

  // Compute cart product counts for badges
  const cartCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const item of cartItems) {
      m[item.productId] = item.quantity;
    }
    return m;
  }, [cartItems]);

  // Determine which products to show based on category and search
  const sourceProducts = catalog.filteredProducts ?? catalog.products;

  const displayProducts = useMemo(() => {
    let filtered = sourceProducts;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }

    // Category filter
    if (activeCategory !== 'Todos') {
      filtered = filtered.filter(p => p.category === activeCategory);
    }

    return filtered;
  }, [sourceProducts, search, activeCategory]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search input */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--cashier-text-muted)]" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl text-xs font-bold text-[var(--cashier-text)] placeholder:text-[var(--cashier-text-muted)] focus:outline-none focus:border-[var(--cashier-accent)] transition-colors"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-4 pb-2 shrink-0 overflow-x-auto scrollbar-none">
        <div className="flex gap-1.5">
          <button
            onClick={() => onSelectCategory('Todos')}
            className={`shrink-0 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full border transition-all ${
              activeCategory === 'Todos'
                ? 'bg-[var(--cashier-accent)] text-white border-[var(--cashier-accent)]'
                : 'bg-[var(--cashier-surface)] text-[var(--cashier-text-secondary)] border-[var(--cashier-border)] hover:border-[var(--cashier-accent)]/30'
            }`}
          >
            Todos
          </button>
          {catalog.categories.map(cat => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
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
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {displayProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-bold text-[var(--cashier-text-secondary)]">
              {search.trim() ? 'Sin resultados' : 'No hay productos'}
            </p>
            <p className="text-[11px] text-[var(--cashier-text-muted)] mt-1">
              {search.trim() ? 'Probá con otro término' : 'Esta categoría está vacía'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {displayProducts.map(product => {
              const inCart = cartCounts[product.id];
              return (
                <button
                  key={product.id}
                  onClick={() => onAddProduct(product)}
                  className="relative flex flex-col items-start text-left p-3 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl hover:border-[var(--cashier-accent)]/40 hover:bg-[var(--cashier-bg)]/80 transition-all active:scale-[0.98] gap-1"
                  aria-label={`Agregar ${product.name}`}
                >
                  {inCart && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--cashier-accent)] text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg">
                      {inCart}
                    </span>
                  )}
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-16 object-cover rounded-lg mb-1"
                    />
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
  );
}

/* ════════════════════════════════════════ */
/*  CartPanel Sub-Component                  */
/* ════════════════════════════════════════ */
interface CartPanelProps {
  items: CartItem[];
  customerName: string;
  mesa: string;
  notes: string;
  total: number;
  isEmpty: boolean;
  submitting: boolean;
  cobrarAhora: boolean;
  sessionId: string | null;
  onCustomerNameChange: (name: string) => void;
  onMesaChange: (mesa: string) => void;
  onNotesChange: (notes: string) => void;
  onRemoveItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, qty: number) => void;
  onCobrarAhoraChange: (v: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function CartPanel({
  items,
  customerName,
  mesa,
  notes,
  total,
  isEmpty,
  submitting,
  cobrarAhora,
  sessionId,
  onCustomerNameChange,
  onMesaChange,
  onNotesChange,
  onRemoveItem,
  onUpdateQuantity,
  onCobrarAhoraChange,
  onConfirm,
  onCancel,
}: CartPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Cart header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-[var(--cashier-text)] flex items-center gap-1.5">
          <ShoppingCart className="w-3.5 h-3.5 text-[var(--cashier-accent)]" />
          Pedido
        </h3>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4 space-y-1.5 min-h-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ShoppingCart className="w-8 h-8 text-[var(--cashier-text-muted)] opacity-20 mb-2" />
            <p className="text-[11px] font-bold text-[var(--cashier-text-secondary)]">Carrito vacío</p>
            <p className="text-[10px] text-[var(--cashier-text-muted)] mt-0.5">Seleccioná productos del catálogo</p>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.productId}
              className="flex items-center gap-2 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-[var(--cashier-text)] truncate leading-tight">{item.name}</p>
                <p className="text-[10px] font-mono font-bold text-[var(--cashier-text-secondary)]">
                  S/ {item.unitPrice.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-[var(--cashier-surface)] border border-[var(--cashier-border)] text-[var(--cashier-text-secondary)] hover:bg-[var(--cashier-bg)] transition-colors"
                  aria-label={`Reducir cantidad de ${item.name}`}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center text-[11px] font-mono font-black text-[var(--cashier-text)]">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-[var(--cashier-surface)] border border-[var(--cashier-border)] text-[var(--cashier-text-secondary)] hover:bg-[var(--cashier-bg)] transition-colors"
                  aria-label={`Aumentar cantidad de ${item.name}`}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[11px] font-mono font-black text-[var(--cashier-text)] w-14 text-right shrink-0">
                S/ {item.total.toFixed(2)}
              </p>
              <button
                onClick={() => onRemoveItem(item.productId)}
                className="p-1 rounded-lg hover:bg-[var(--cashier-error)]/10 text-[var(--cashier-text-muted)] hover:text-[var(--cashier-error)] transition-colors shrink-0"
                aria-label={`Quitar ${item.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Customer fields */}
      <div className="shrink-0 px-4 pt-3 pb-2 space-y-2">
        <input
          type="text"
          placeholder="Nombre del cliente"
          value={customerName}
          onChange={e => onCustomerNameChange(e.target.value)}
          className="w-full px-3 py-2 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl text-xs font-bold text-[var(--cashier-text)] placeholder:text-[var(--cashier-text-muted)] focus:outline-none focus:border-[var(--cashier-accent)] transition-colors"
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Mesa"
            value={mesa}
            onChange={e => onMesaChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl text-xs font-bold text-[var(--cashier-text)] placeholder:text-[var(--cashier-text-muted)] focus:outline-none focus:border-[var(--cashier-accent)] transition-colors"
          />
        </div>
        <textarea
          placeholder="Notas del pedido..."
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl text-xs font-bold text-[var(--cashier-text)] placeholder:text-[var(--cashier-text-muted)] focus:outline-none focus:border-[var(--cashier-accent)] transition-colors resize-none"
        />
      </div>

      {/* Total + Cobrar ahora + Actions */}
      <div className="shrink-0 border-t border-[var(--cashier-border)] px-4 py-3 space-y-3">
        {/* Subtotal */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[var(--cashier-text-secondary)] uppercase tracking-wider">Total</span>
          <span className="text-base font-mono font-black text-[var(--cashier-text)]">
            S/ {total.toFixed(2)}
          </span>
        </div>

        {/* Cobrar ahora checkbox */}
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={cobrarAhora}
            onChange={e => onCobrarAhoraChange(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--cashier-border)] bg-[var(--cashier-bg)] text-[var(--cashier-accent)] focus:ring-[var(--cashier-accent)] cursor-pointer"
          />
          <span className="text-[10px] font-bold text-[var(--cashier-text-secondary)] group-hover:text-[var(--cashier-text)] transition-colors">
            Cobrar ahora — abrir QuickPay al crear
          </span>
        </label>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-2.5 border border-[var(--cashier-border)] text-[var(--cashier-text-secondary)] text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-[var(--cashier-bg)] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isEmpty || submitting || !sessionId}
            className="flex-1 py-2.5 bg-gradient-to-r from-[var(--cashier-accent)] to-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-1.5"
          >
            {submitting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
            ) : (
              'Enviar a Cocina'
            )}
          </button>
        </div>

        {/* Session tooltip */}
        {!sessionId && (
          <p className="text-[9px] text-[var(--cashier-warning)] font-bold text-center">
            Abrí una caja primero para crear pedidos
          </p>
        )}
      </div>
    </div>
  );
}
