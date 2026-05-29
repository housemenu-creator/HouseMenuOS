import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Package, Search, AlertTriangle, Edit3, Save, X, ChevronDown, ChevronRight, Box } from 'lucide-react';
import { ref, update } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { useBranch } from '../../context/BranchContext';
import EmptyState from '../../components/EmptyState';

const LOW_STOCK_THRESHOLD = 5;

export default function InventoryPanel({ catalog }) {
  const { activeBranchId } = useBranch();
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editStock, setEditStock] = useState(0);
  const [editPrice, setEditPrice] = useState(0);
  const [saving, setSaving] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Organize products by category
  const productsByCategory = useMemo(() => {
    if (!catalog?.products) return {};
    const cats = {};
    Object.entries(catalog.products).forEach(([id, p]) => {
      const cat = p.category || 'General';
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push({ id, ...p });
    });
    return cats;
  }, [catalog]);

  // Apply filters
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const entries = Object.entries(productsByCategory).map(([cat, prods]) => {
      let filtered = prods;
      if (q) filtered = filtered.filter((p) => p.name?.toLowerCase().includes(q));
      if (lowOnly) filtered = filtered.filter((p) => p.trackStock && Number(p.stock) <= LOW_STOCK_THRESHOLD);
      return [cat, filtered];
    });
    return Object.fromEntries(entries.filter(([_, p]) => p.length > 0));
  }, [productsByCategory, search, lowOnly]);

  const totalLow = useMemo(
    () => Object.values(productsByCategory).flat().filter((p) => p.trackStock && Number(p.stock) <= LOW_STOCK_THRESHOLD).length,
    [productsByCategory]
  );

  const handleSave = useCallback(async (productId) => {
    if (!activeBranchId) return;
    setSaving(true);
    const updates = {};
    updates[`branches/${activeBranchId}/catalog/products/${productId}/stock`] = Number(editStock);
    updates[`branches/${activeBranchId}/catalog/products/${productId}/base_price`] = Number(editPrice);
    if (Number(editStock) > 0) {
      updates[`branches/${activeBranchId}/catalog/products/${productId}/available`] = true;
    }
    if (Number(editStock) <= 0 && Number(editStock) === 0) {
      updates[`branches/${activeBranchId}/catalog/products/${productId}/available`] = false;
    }
    try {
      await update(ref(db), updates);
      setEditId(null);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }, [activeBranchId, editStock, editPrice]);

  const toggleCategory = (name) => {
    setExpandedCategory((prev) => (prev === name ? null : name));
  };

  if (!catalog?.products) {
    return <EmptyState icon={Box} title="Catálogo no disponible" description="No hay productos cargados." />;
  }

  const hasData = Object.keys(filtered).length > 0;

  return (
    <div className="animate-[fadeIn_0.4s_ease] space-y-6 max-w-5xl mx-auto pb-40">
      {/* Header + Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cm-accent/10 rounded-lg">
            <Package className="w-4 h-4 text-cm-accent" />
            <span className="text-sm font-bold text-cm-accent">
              {Object.values(productsByCategory).flat().length} productos
            </span>
          </div>
          {totalLow > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-error/10 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-cm-error" />
              <span className="text-sm font-bold text-cm-error">{totalLow} sin stock</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-cm-surface border-2 border-cm-border text-sm text-cm-text outline-none focus:border-cm-accent transition-colors"
          />
        </div>
        <button
          onClick={() => setLowOnly(!lowOnly)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
            lowOnly
              ? 'bg-cm-error text-white border-cm-error'
              : 'bg-cm-surface text-cm-muted border-cm-border'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Stock Bajo
        </button>
      </div>

      {!hasData && (
        <EmptyState
          icon={Search}
          title="Sin resultados"
          description={lowOnly ? 'No hay productos con stock bajo.' : 'Ningún producto coincide con la búsqueda.'}
        />
      )}

      {/* Product List by Category */}
      {Object.entries(filtered).map(([category, products]) => (
        <div key={category} className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border overflow-hidden">
          <button
            onClick={() => toggleCategory(category)}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-cm-border hover:bg-cm-border transition-colors"
          >
            <div className="flex items-center gap-3">
              {expandedCategory === category ? <ChevronDown className="w-4 h-4 text-cm-muted" /> : <ChevronRight className="w-4 h-4 text-cm-muted" />}
              <h3 className="font-bold text-cm-text capitalize">{category}</h3>
              <span className="text-xs text-cm-muted bg-cm-border px-2 py-0.5 rounded-full">{products.length}</span>
            </div>
          </button>

          {expandedCategory === category && (
            <div className="divide-y divide-cm-border">
              {products.map((product) => {
                const isLow = product.trackStock && Number(product.stock) <= LOW_STOCK_THRESHOLD;
                const isEditing = editId === product.id;
                return (
                  <div key={product.id} className={`px-5 py-3 flex items-center justify-between gap-4 ${isLow ? 'bg-cm-error/5' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-cm-text truncate">{product.name}</h4>
                      <p className="text-xs text-cm-muted">
                        S/ {(product.base_price ?? product.price ?? 0).toFixed(2)} {product.trackStock && `· ${product.stock ?? 0} en stock`} {product.unit ? `· ${product.unit}` : ''}
                      </p>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-end gap-0.5">
                          <input
                            type="number"
                            value={editStock}
                            onChange={(e) => setEditStock(Number(e.target.value))}
                            className="w-16 px-2 py-1 text-xs font-bold text-center rounded border border-cm-border bg-cm-surface text-cm-text outline-none"
                            min="0"
                          />
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(Number(e.target.value))}
                            className="w-16 px-2 py-1 text-xs font-bold text-center rounded border border-cm-border bg-cm-surface text-cm-text outline-none"
                            min="0"
                            step="0.5"
                          />
                        </div>
                        <button
                          onClick={() => handleSave(product.id)}
                          disabled={saving}
                          className="p-1.5 rounded-lg bg-cm-success text-white hover:brightness-110 transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="p-1.5 rounded-lg bg-cm-border text-cm-muted hover:bg-cm-border/80 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 shrink-0">
                        {product.trackStock && (
                          <div className="text-right">
                            <div className={`text-sm font-bold ${isLow ? 'text-cm-error' : 'text-cm-text'}`}>
                              {product.stock ?? 0}
                            </div>
                            <div className="text-[10px] text-cm-muted uppercase tracking-wider">Stock</div>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setEditId(product.id);
                            setEditStock(Number(product.stock || 0));
                            setEditPrice(Number(product.base_price ?? product.price ?? 0));
                          }}
                          className="p-1.5 rounded-lg bg-cm-accent/10 text-cm-accent hover:bg-cm-accent/20 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
