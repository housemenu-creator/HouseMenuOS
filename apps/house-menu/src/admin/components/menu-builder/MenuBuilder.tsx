import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, PackageOpen, Soup, Sparkles } from 'lucide-react';
import MenuCategoryBlock from './MenuCategoryBlock';
import { PromptModal } from '../ConfirmModal';
import { Skeleton } from '../Skeleton';
import { SmartCreateModal } from '../ai/SmartCreateModal';
import { CampaignQuickWizard } from '../ai/CampaignQuickWizard';
import type { MenuProduct } from '../../types';

interface MenuBuilderProps {
  products: Record<string, MenuProduct>;
  toggleAvailability: (productId: string) => void;
  updateField: (productId: string, field: string, value: unknown) => Promise<void>;
  createProduct: (category: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  duplicateProduct: (productId: string) => Promise<void>;
  onConfigureWizard: (productId: string) => void;
  activeBranchId: string;
  categoriesConfig: Record<string, { name: string; image?: string }>;
  notify?: (message: string, type?: 'success' | 'error') => void;
  onMoveItem?: (productId: string, direction: 'up' | 'down') => void;
  onReorder?: (sourceId: string, targetId: string) => void;
  renameCategory: (oldName: string, newName: string) => Promise<void>;
  createCategory: (name: string) => Promise<void>;
  catalogLoading?: boolean;
}

function BuilderSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search skeleton */}
      <Skeleton className="h-11 w-full rounded-xl" />
      {/* Category block skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-cm-surface rounded-xl border border-cm-border shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="space-y-2 pl-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MenuBuilder({
  products,
  toggleAvailability,
  updateField,
  createProduct,
  deleteProduct,
  duplicateProduct,
  onConfigureWizard,
  activeBranchId,
  categoriesConfig = {},
  notify,
  onMoveItem,
  onReorder,
  renameCategory,
  createCategory,
  catalogLoading,
}: MenuBuilderProps) {
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSmartCreate, setShowSmartCreate] = useState(false);
  const [campaignProduct, setCampaignProduct] = useState<MenuProduct & { id: string } | null>(null);

  const handleCreateCampaign = useCallback((product: MenuProduct & { id: string }) => {
    setCampaignProduct(product);
  }, []);

  const handleCampaignCreated = useCallback(() => {
    setCampaignProduct(null);
    notify?.('Campaña activada exitosamente', 'success');
  }, [notify]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return Object.fromEntries(
      Object.entries(products).filter(([_, p]) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      )
    );
  }, [products, searchQuery]);

  const grouped = useMemo(() => {
    const groups: Record<string, Array<MenuProduct & { id: string }>> = {};
    Object.entries(filteredProducts).forEach(([id, p]) => {
      const cat = p.category || 'Sin Categoría';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ ...p, id });
    });
    Object.values(groups).forEach(arr => arr.sort((a, b) => {
      const orderA = a.sortOrder ?? 0;
      const orderB = b.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    }));
    return groups;
  }, [filteredProducts]);

  const totalProducts = Object.keys(products).length;
  const filteredCount = Object.keys(filteredProducts).length;
  const hasFilter = searchQuery.trim().length > 0;
  const hasAnyProducts = totalProducts > 0;

  // Loading state
  if (catalogLoading) {
    return <BuilderSkeleton />;
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search bar + AI Smart Create (always shown) */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, categoría o descripción..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-cm-border bg-cm-surface text-sm font-bold text-cm-text focus:border-cm-accent focus:outline-none transition-colors placeholder:text-cm-muted"
            />
          </div>
          <button
            onClick={() => setShowSmartCreate(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] text-cm-success text-[0.6rem] font-black uppercase tracking-wider hover:brightness-125 transition-all shadow-[inset_0_0_15px_rgba(34,197,94,0.08)]"
            style={{ textShadow: '0 0 6px rgba(34,197,94,0.2)' }}
            title="Crear producto con AI desde foto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Smart Create
          </button>
          {hasFilter && (
            <span className="text-xs font-bold text-cm-muted whitespace-nowrap">
              {filteredCount} de {totalProducts}
            </span>
          )}
        </div>

        {/* Empty state: no products at all */}
        {!hasAnyProducts && !hasFilter && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 border-2 border-dashed border-cm-border rounded-xl bg-cm-surface/50"
          >
            <Soup className="w-16 h-16 text-cm-muted mx-auto mb-4" />
            <p className="text-base font-bold text-cm-text mb-2">Menú vacío</p>
            <p className="text-sm text-cm-text-secondary mb-6 max-w-sm mx-auto">
              Crea tu primer producto para empezar a construir el menú de tu restaurante.
            </p>
            <button
              onClick={() => createProduct('')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-cm-accent text-cm-primary text-sm font-bold rounded-xl hover:bg-cm-accent-hover transition-all shadow-cm-sm"
            >
              <Plus className="w-4 h-4" />
              Crear primer producto
            </button>
          </motion.div>
        )}

        {/* Empty state: no results after filter */}
        {hasAnyProducts && Object.keys(grouped).length === 0 && hasFilter && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 border-2 border-dashed border-cm-border rounded-xl bg-cm-surface/50"
          >
            <PackageOpen className="w-14 h-14 text-cm-muted mx-auto mb-3" />
            <p className="text-base font-bold text-cm-text mb-1">No hay productos que coincidan</p>
            <p className="text-sm text-cm-text-secondary mb-4">
              Intenta con otros términos de búsqueda.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-cm-accent bg-cm-accent/10 rounded-xl hover:bg-cm-accent/20 transition-colors"
            >
              <Search className="w-4 h-4" />
              Limpiar búsqueda
            </button>
          </motion.div>
        )}

        {/* Category blocks */}
        {hasAnyProducts && Object.keys(grouped).length > 0 && (
          <AnimatePresence mode="popLayout">
            {Object.entries(grouped).map(([category, items], idx) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16, scale: 0.95 }}
                transition={{ delay: idx * 0.05, duration: 0.2 }}
              >
                <MenuCategoryBlock
                  category={category}
                  items={items}
                  toggleAvailability={toggleAvailability}
                  updateField={updateField}
                  createProduct={createProduct}
                  deleteProduct={deleteProduct}
                  duplicateProduct={duplicateProduct}
                  onConfigureWizard={onConfigureWizard}
                  onCreateCampaign={handleCreateCampaign}
                  renameCategory={renameCategory}
                  activeBranchId={activeBranchId}
                  categoriesConfig={categoriesConfig}
                  notify={notify}
                  onMoveItem={onMoveItem}
                  onReorder={onReorder}
                  categoryIndex={idx}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Add category button */}
        {hasAnyProducts && (
          <button
            onClick={() => setShowCategoryModal(true)}
            className="w-full py-4 border-2 border-dashed border-cm-border rounded-xl text-cm-muted font-bold hover:text-cm-accent hover:border-cm-accent transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Nueva Categoría de Menú
          </button>
        )}
      </div>

      <SmartCreateModal
        isOpen={showSmartCreate}
        onClose={() => setShowSmartCreate(false)}
        branchId={activeBranchId}
        categories={Object.keys(categoriesConfig)}
        onProductCreated={() => setShowSmartCreate(false)}
      />

      {campaignProduct && (
        <CampaignQuickWizard
          isOpen={!!campaignProduct}
          onClose={() => setCampaignProduct(null)}
          branchId={activeBranchId}
          product={campaignProduct}
          onCampaignCreated={handleCampaignCreated}
        />
      )}

      <PromptModal
        open={showCategoryModal}
        title="Nueva Categoría"
        label="Ingresa el nombre de la nueva categoría (ej. POSTRES)"
        placeholder="Ej. BEBIDAS, ENTRADAS, POSTRES..."
        onConfirm={(val: string) => { if (val.trim()) createCategory(val.trim()); setShowCategoryModal(false); }}
        onCancel={() => setShowCategoryModal(false)}
      />
    </>
  );
}
