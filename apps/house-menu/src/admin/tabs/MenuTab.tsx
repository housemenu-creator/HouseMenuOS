import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle2, Trash2, Loader2, CalendarDays, RotateCcw,
  UtensilsCrossed, FileEdit, FolderOpen, Sparkles, Package,
  ImageIcon,
} from 'lucide-react';
import MenuBuilder from '../components/menu-builder/MenuBuilder';
import WizardConfigModal from '../components/menu-builder/WizardConfigModal';
import { SmartCreateModal } from '../components/ai/SmartCreateModal';
import { Skeleton } from '../components/Skeleton';
import { useMenuStats } from '../hooks/useMenuStats';
import { useToast } from '../hooks/useToast';
import { menuService } from '../../lib/menuService';
import { dailyMenuService } from '../../lib/dailyMenuService';
import type { MenuCatalog, MenuProduct, DailyMenu } from '../types';

// ── Types ──

interface MenuTabProps {
  activeBranchId: string;
  catalog: MenuCatalog;
  dailyMenus: Record<string, DailyMenu>;
  onUpdateField: (id: string, field: string, value: unknown) => Promise<void>;
}

// ── Stat Card ──

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: 'cm-accent' | 'success' | 'amber' | 'info' | 'violet' | 'teal';
  dot?: boolean;
  dotColor?: string;
}

const ACCENT_CLASSES: Record<string, { bg: string; text: string; dot: string }> = {
  'cm-accent': { bg: 'bg-cm-accent/10', text: 'text-cm-accent', dot: 'bg-cm-accent' },
  success: { bg: 'bg-green-500/10', text: 'text-green-600', dot: 'bg-green-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600', dot: 'bg-amber-500' },
  info: { bg: 'bg-blue-500/10', text: 'text-blue-600', dot: 'bg-blue-500' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-600', dot: 'bg-violet-500' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-600', dot: 'bg-teal-500' },
};

function StatCard({ label, value, icon, accent, dot, dotColor }: StatCardProps) {
  const ac = ACCENT_CLASSES[accent] || ACCENT_CLASSES['cm-accent'];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-cm-surface/80 backdrop-blur-sm rounded-xl border border-cm-border shadow-cm-sm p-4 flex items-start gap-3 hover:shadow-cm-md transition-shadow"
    >
      <div className={`p-2.5 rounded-full shrink-0 ${ac.bg} ${ac.text}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor || ac.dot} shrink-0`} />}
          <p className="text-[0.6rem] font-semibold text-cm-text-secondary uppercase tracking-widest">{label}</p>
        </div>
        <p className="text-2xl font-mono font-black text-cm-text mt-0.5 leading-none tabular-nums">{value}</p>
      </div>
    </motion.div>
  );
}

// ── Stats Skeleton ──

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-cm-surface/80 rounded-xl border border-cm-border p-4 space-y-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-7 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── DailyMenuSection Sub-Component ──

interface DailyMenuSectionProps {
  dailyMenus: Record<string, DailyMenu>;
  selectedDailyDate: string;
  onDateChange: (date: string) => void;
  onClearDate: () => void;
  onToggleProduct: (productId: string) => Promise<void>;
  onRemove: () => Promise<void>;
  onCreateEdit: () => void;
  products: Array<MenuProduct & { id: string }>;
  loading?: boolean;
}

function DailyMenuSection({
  dailyMenus,
  selectedDailyDate,
  onDateChange,
  onClearDate,
  onToggleProduct,
  onRemove,
  onCreateEdit,
  products,
  loading,
}: DailyMenuSectionProps) {
  const todayMenu = dailyMenus[selectedDailyDate];
  const menuProducts = products.filter(p => (todayMenu?.productIds || []).includes(p.id));

  if (loading) {
    return (
      <div className="bg-cm-surface/80 backdrop-blur-sm rounded-xl border border-cm-border shadow-cm-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <>
      {/* Daily Menu Card */}
      <div className="bg-cm-surface/80 backdrop-blur-sm rounded-xl border border-cm-border shadow-cm-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-cm-accent" />
            <h3 className="text-sm font-semibold text-cm-text">Menú del Día</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cm-muted pointer-events-none" />
              <input
                type="date"
                value={selectedDailyDate}
                onChange={e => onDateChange(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors bg-cm-surface"
              />
            </div>
            {selectedDailyDate !== new Date().toISOString().split('T')[0] && (
              <button
                onClick={onClearDate}
                className="p-1.5 text-cm-muted hover:text-cm-accent hover:bg-cm-accent/10 rounded-lg transition-colors"
                title="Limpiar fecha (volver a hoy)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            {todayMenu && (
              <button
                onClick={onRemove}
                className="p-1.5 text-cm-error hover:text-cm-error/80 hover:bg-cm-error/10 rounded-lg transition-colors"
                title="Eliminar menú"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onCreateEdit}
              className="px-3 py-1.5 bg-cm-accent text-cm-primary text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors"
            >
              {todayMenu ? 'Editar' : 'Crear menú'}
            </button>
          </div>
        </div>

        {todayMenu ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-semibold text-cm-text">{todayMenu.name}</span>
              {todayMenu.description && <span className="text-cm-text-secondary hidden sm:inline">— {todayMenu.description}</span>}
              <span className="text-xs font-semibold bg-cm-accent/10 text-cm-accent px-2 py-0.5 rounded-full whitespace-nowrap">
                S/ {Number(todayMenu.basePrice || 0).toFixed(2)}
              </span>
            </div>
            <div className="border-t border-cm-border pt-3">
              <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-2">
                Productos incluidos ({menuProducts.length})
              </p>
              {menuProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {menuProducts.map(p => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-2 px-3 py-2 bg-cm-bg-alt rounded-lg text-sm group"
                    >
                      <div className="w-7 h-7 rounded-md bg-cm-border shrink-0 overflow-hidden flex items-center justify-center">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-cm-muted" />
                        )}
                      </div>
                      <span className="font-semibold text-cm-text truncate flex-1 min-w-0">{p.name}</span>
                      <button
                        onClick={() => onToggleProduct(p.id)}
                        className="text-cm-text-tertiary hover:text-cm-error transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 border-2 border-dashed border-cm-border rounded-xl">
                  <Package className="w-8 h-8 text-cm-muted mx-auto mb-2" />
                  <p className="text-xs font-semibold text-cm-muted">
                    Agrega productos desde la lista de abajo
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed border-cm-border rounded-xl">
            <CalendarDays className="w-10 h-10 text-cm-muted mx-auto mb-2" />
            <p className="text-sm font-semibold text-cm-text-secondary mb-1">📅 No hay menú configurado</p>
            <p className="text-xs text-cm-muted">Configura un menú del día para sugerirlo a los clientes.</p>
          </div>
        )}
      </div>

      {/* Available Products Card */}
      <div className="bg-cm-surface/80 backdrop-blur-sm rounded-xl border border-cm-border shadow-cm-sm p-5">
        <h3 className="text-sm font-semibold text-cm-text mb-4">
          Productos disponibles
          <span className="ml-2 text-xs font-bold text-cm-muted">({products.length} productos)</span>
        </h3>
        <p className="text-xs text-cm-text-secondary mb-3">Haz clic para incluir/excluir productos del menú del día.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {products.map(p => {
              const inMenu = (todayMenu?.productIds || []).includes(p.id);
              return (
                <motion.button
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => onToggleProduct(p.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all text-left ${
                    inMenu
                      ? 'bg-cm-success/10 text-cm-success border border-cm-success/30'
                      : 'bg-cm-bg-alt text-cm-text-secondary border border-transparent hover:border-cm-border'
                  }`}
                >
                  <div className="w-7 h-7 rounded-md bg-cm-border shrink-0 overflow-hidden flex items-center justify-center">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-cm-muted" />
                    )}
                  </div>
                  <span className="truncate flex-1 min-w-0">{p.name}</span>
                  {inMenu && <CheckCircle2 className="w-4 h-4 text-cm-success shrink-0" />}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

// ── Main Component ──

export default function MenuTab({ activeBranchId, catalog, dailyMenus, onUpdateField }: MenuTabProps) {
  const [selectedDailyDate, setSelectedDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyMenuForm, setDailyMenuForm] = useState({ name: '', description: '', basePrice: '' });
  const [showDailyMenuModal, setShowDailyMenuModal] = useState(false);
  const [wizardProduct, setWizardProduct] = useState<(MenuProduct & { id: string }) | null>(null);
  const [smartCreateOpen, setSmartCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(!catalog || !catalog.products);

  const stats = useMenuStats(catalog);
  const { toast, notify } = useToast();

  useEffect(() => {
    // Track catalog loading state
    setCatalogLoading(!catalog || !catalog.products);
  }, [catalog]);

  const todayMenu = dailyMenus[selectedDailyDate];

  const products = useMemo<Array<MenuProduct & { id: string }>>(() => {
    return Object.entries(catalog.products || {}).map(([id, p]) => ({ ...p, id }));
  }, [catalog.products]);

  const handleSaveDailyMenu = async () => {
    setSaving(true);
    try {
      const result = await dailyMenuService.setDailyMenu(activeBranchId, selectedDailyDate, {
        name: dailyMenuForm.name,
        description: dailyMenuForm.description,
        basePrice: parseFloat(dailyMenuForm.basePrice) || 0,
        productIds: todayMenu?.productIds || [],
      });
      if (result.success) {
        setShowDailyMenuModal(false);
        notify('Menú del día guardado');
      } else {
        notify('Error al guardar: ' + result.error, 'error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      notify('Error al guardar: ' + message, 'error');
    }
    setSaving(false);
  };

  const toggleProductInDailyMenu = async (productId: string) => {
    try {
      const current = todayMenu?.productIds || [];
      if (current.includes(productId)) {
        await dailyMenuService.removeProductFromDailyMenu(activeBranchId, selectedDailyDate, productId);
      } else {
        await dailyMenuService.addProductToDailyMenu(activeBranchId, selectedDailyDate, productId);
      }
    } catch (err) {
      notify('Error al cambiar producto del menú', 'error');
    }
  };

  const removeDailyMenu = async () => {
    if (!window.confirm('¿Eliminar el menú del día seleccionado?')) return;
    try {
      await dailyMenuService.removeDailyMenu(activeBranchId, selectedDailyDate);
      notify('Menú del día eliminado');
    } catch (err) {
      notify('Error al eliminar menú del día', 'error');
    }
  };

  const toggleAvailability = async (productId: string) => {
    const product = catalog.products[productId];
    if (!product) return;
    try {
      await menuService.updateProductAvailability(activeBranchId, productId, !product.available);
    } catch (err) {
      notify('Error al cambiar disponibilidad', 'error');
    }
  };

  const createProduct = async (category: string) => {
    try {
      await menuService.createProduct(activeBranchId, category);
    } catch (err) {
      notify('Error al crear producto', 'error');
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await menuService.deleteProduct(activeBranchId, productId);
    } catch (err) {
      notify('Error al eliminar producto', 'error');
    }
  };

  const duplicateProduct = async (productId: string) => {
    try {
      await menuService.duplicateProduct(activeBranchId, productId);
    } catch (err) {
      notify('Error al duplicar producto', 'error');
    }
  };

  const handleMoveItem = async (productId: string, direction: 'up' | 'down') => {
    const prod = catalog?.products?.[productId];
    if (!prod) return;
    const category = prod.category || 'Sin Categoría';
    const siblings = Object.entries(catalog.products)
      .filter(([_, p]) => (p.category || 'Sin Categoría') === category)
      .sort(([, a], [, b]) => {
        const oA = a.sortOrder ?? 0;
        const oB = b.sortOrder ?? 0;
        if (oA !== oB) return oA - oB;
        return (a.name || '').localeCompare(b.name || '');
      });
    const curIdx = siblings.findIndex(([id]) => id === productId);
    if (curIdx === -1) return;
    const targetIdx = direction === 'up' ? curIdx - 1 : curIdx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;
    const [targetId] = siblings[targetIdx];
    const curOrder = prod.sortOrder ?? 0;
    const targetOrder = catalog.products[targetId]?.sortOrder ?? 0;
    try {
      if (curOrder === targetOrder) {
        await Promise.all(siblings.map(([id, _], idx) =>
          menuService.updateProductField(activeBranchId, id, 'sortOrder', idx + 1)
        ));
      } else {
        await Promise.all([
          menuService.updateProductField(activeBranchId, productId, 'sortOrder', targetOrder),
          menuService.updateProductField(activeBranchId, targetId, 'sortOrder', curOrder),
        ]);
      }
    } catch (err) {
      notify('Error al reordenar', 'error');
    }
  };

  const handleReorder = useCallback(async (sourceId: string, targetId: string) => {
    const source = catalog?.products?.[sourceId];
    const target = catalog?.products?.[targetId];
    if (!source || !target) return;
    const sourceOrder = source.sortOrder ?? 0;
    const targetOrder = target.sortOrder ?? 0;
    if (sourceOrder === targetOrder) return;
    try {
      await Promise.all([
        menuService.updateProductField(activeBranchId, sourceId, 'sortOrder', targetOrder),
        menuService.updateProductField(activeBranchId, targetId, 'sortOrder', sourceOrder),
      ]);
    } catch (err) {
      notify('Error al reordenar', 'error');
    }
  }, [catalog, activeBranchId, notify]);

  const createCategory = async (name: string) => {
    try {
      await menuService.createCategory(activeBranchId, name);
    } catch (err) {
      notify('Error al crear categoría', 'error');
    }
  };

  const renameCategory = async (oldName: string, newName: string) => {
    try {
      await menuService.renameCategory(activeBranchId, oldName, newName);
    } catch (err) {
      notify('Error al renombrar categoría', 'error');
    }
  };

  const handleConfigureWizard = (productId: string) => {
    const product = catalog.products[productId];
    if (!product) return;
    setWizardProduct({ ...product, id: productId });
  };

  return (
    <div className="space-y-6">
      {/* Header + Stats Dashboard */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-cm-text">Constructor de Menú</h2>
            {!catalogLoading && (
              <span className="text-xs text-cm-text-secondary font-medium">{stats.totalProducts} productos</span>
            )}
          </div>
          <button
            onClick={() => setSmartCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-accent text-cm-primary text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Smart Create
          </button>
        </div>
        {catalogLoading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatCard
              label="Total Productos"
              value={stats.totalProducts}
              icon={<UtensilsCrossed className="w-4 h-4" />}
              accent="cm-accent"
            />
            <StatCard
              label="Activos"
              value={stats.activeProducts}
              icon={<CheckCircle2 className="w-4 h-4" />}
              accent="success"
              dot
            />
            <StatCard
              label="Borradores"
              value={stats.draftProducts}
              icon={<FileEdit className="w-4 h-4" />}
              accent="amber"
              dot
              dotColor="bg-amber-500"
            />
            <StatCard
              label="Categorías"
              value={stats.totalCategories}
              icon={<FolderOpen className="w-4 h-4" />}
              accent="info"
            />
            <StatCard
              label="Combos"
              value={stats.wizardProducts}
              icon={<Sparkles className="w-4 h-4" />}
              accent="violet"
            />
            <StatCard
              label="Stock"
              value={stats.stockManaged}
              icon={<Package className="w-4 h-4" />}
              accent="teal"
            />
          </div>
        )}
      </div>

      {activeBranchId ? (
        <>
          <DailyMenuSection
            dailyMenus={dailyMenus}
            selectedDailyDate={selectedDailyDate}
            onDateChange={setSelectedDailyDate}
            onClearDate={() => setSelectedDailyDate(new Date().toISOString().split('T')[0])}
            onToggleProduct={toggleProductInDailyMenu}
            onRemove={removeDailyMenu}
            onCreateEdit={() => {
              setDailyMenuForm({
                name: todayMenu?.name || '',
                description: todayMenu?.description || '',
                basePrice: todayMenu?.basePrice ? String(todayMenu.basePrice) : '',
              });
              setShowDailyMenuModal(true);
            }}
            products={products}
            loading={catalogLoading}
          />

          <MenuBuilder
            products={catalog.products || {}}
            toggleAvailability={toggleAvailability}
            updateField={onUpdateField}
            createProduct={createProduct}
            deleteProduct={deleteProduct}
            duplicateProduct={duplicateProduct}
            onConfigureWizard={handleConfigureWizard}
            activeBranchId={activeBranchId}
            categoriesConfig={catalog.categories ?? {}}
            notify={notify}
            onMoveItem={handleMoveItem}
            onReorder={handleReorder}
            renameCategory={renameCategory}
            createCategory={createCategory}
            catalogLoading={catalogLoading}
          />
        </>
      ) : (
        <p className="text-sm text-cm-text-secondary text-center py-8">Selecciona una sucursal para gestionar el menú</p>
      )}

      <WizardConfigModal
        open={!!wizardProduct}
        product={wizardProduct}
        onSave={(id, steps) => onUpdateField(id, 'steps', steps)}
        onClose={() => setWizardProduct(null)}
      />

      {/* Daily Menu Modal */}
      <AnimatePresence>
        {showDailyMenuModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDailyMenuModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-md mx-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-cm-text mb-4">
                {todayMenu ? 'Editar menú del día' : 'Crear menú del día'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Nombre del menú</label>
                  <input
                    type="text"
                    value={dailyMenuForm.name}
                    onChange={e => setDailyMenuForm({ ...dailyMenuForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                    placeholder="Ej. Menú Ejecutivo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Descripción</label>
                  <textarea
                    value={dailyMenuForm.description}
                    onChange={e => setDailyMenuForm({ ...dailyMenuForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                    rows={2}
                    placeholder="Descripción del menú..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Precio base</label>
                  <input
                    type="number"
                    step="0.01"
                    value={dailyMenuForm.basePrice}
                    onChange={e => setDailyMenuForm({ ...dailyMenuForm, basePrice: e.target.value })}
                    className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowDailyMenuModal(false)}
                    className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveDailyMenu}
                    disabled={saving}
                    className="flex-1 py-2 bg-cm-accent text-cm-primary text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando</> : 'Guardar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Create Modal */}
      {activeBranchId && (
        <SmartCreateModal
          isOpen={smartCreateOpen}
          onClose={() => setSmartCreateOpen(false)}
          branchId={activeBranchId}
          categories={Object.keys(catalog.categories ?? {}).length > 0
            ? Object.keys(catalog.categories ?? {})
            : [...new Set(Object.values(catalog.products ?? {}).map((p: any) => p.category).filter(Boolean))]
          }
          onProductCreated={(productId, productName) => {
            setSmartCreateOpen(false);
            notify(`✅ "${productName}" creado exitosamente`);
          }}
        />
      )}

      {/* Toast de notificación */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl shadow-cm-lg border text-sm font-semibold flex items-center gap-2 ${
              toast.type === 'error'
                ? 'bg-cm-error-soft text-cm-error border-cm-error/20'
                : 'bg-cm-success-soft text-cm-success border-cm-success/20'
            }`}
          >
            {toast.type === 'error' ? <X className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
