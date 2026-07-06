import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, ImageIcon, Loader2, X, Soup } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import MenuItemRow from './MenuItemRow';
import { storageService } from '../../../lib/storageService';
import { menuService } from '../../../lib/menuService';
import type { MenuProduct } from '../../types';

interface MenuCategoryBlockProps {
  category: string;
  items: Array<MenuProduct & { id: string }>;
  toggleAvailability: (productId: string) => void;
  updateField: (productId: string, field: string, value: unknown) => Promise<void>;
  createProduct: (category: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  duplicateProduct: (productId: string) => Promise<void>;
  onConfigureWizard: (productId: string) => void;
  onCreateCampaign?: (product: MenuProduct & { id: string }) => void;
  renameCategory: (oldName: string, newName: string) => Promise<void>;
  activeBranchId: string;
  categoriesConfig: Record<string, { name: string; image?: string }>;
  notify?: (message: string, type?: 'success' | 'error') => void;
  onMoveItem?: (productId: string, direction: 'up' | 'down') => void;
  onReorder?: (sourceId: string, targetId: string) => void;
  categoryIndex?: number;
}

const ACCENT_COLORS = [
  'border-l-cm-accent',
  'border-l-green-500',
  'border-l-blue-500',
  'border-l-violet-500',
  'border-l-amber-500',
  'border-l-teal-500',
  'border-l-rose-500',
  'border-l-cyan-500',
];

function getCategorySlug(categoryName: string): string {
  return (categoryName || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function MenuCategoryBlock({
  category,
  items,
  toggleAvailability,
  updateField,
  createProduct,
  deleteProduct,
  duplicateProduct,
  onConfigureWizard,
  renameCategory,
  activeBranchId,
  categoriesConfig = {},
  notify,
  onMoveItem,
  onReorder,
  categoryIndex = 0,
}: MenuCategoryBlockProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slug = getCategorySlug(category);
  const currentImage = categoriesConfig[slug]?.image || '';
  const accentClass = ACCENT_COLORS[categoryIndex % ACCENT_COLORS.length];

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBranchId) return;
    setUploading(true);
    try {
      const result = await storageService.uploadCategoryImage(activeBranchId, slug, file);
      await menuService.updateCategoryImage(activeBranchId, category, result.url);
    } catch (err) {
      console.error('Error uploading category image:', err);
      notify?.('Error al subir imagen de categoría', 'error');
    }
    setUploading(false);
  };

  const handleRemoveImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar la imagen de esta categoría?')) return;
    try {
      await menuService.updateCategoryImage(activeBranchId, category, null);
    } catch (err) {
      console.error('Error removing category image:', err);
    }
  };

  return (
    <div className={`bg-cm-surface rounded-xl border border-cm-border shadow-sm transition-all border-l-4 ${accentClass}`}>
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 p-4 bg-cm-bg/50 hover:bg-cm-bg transition-colors cursor-pointer ${
          isOpen ? 'border-b border-cm-border rounded-t-xl' : 'rounded-xl'
        }`}
      >
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-cm-accent shrink-0" />
        </motion.div>

        {/* Thumbnail Selector for Category Image */}
        <div onClick={(e) => e.stopPropagation()} className="relative group/catimg shrink-0">
          <div
            onClick={uploading ? undefined : handleImageClick}
            className="w-10 h-10 rounded-lg bg-cm-border flex items-center justify-center cursor-pointer overflow-hidden border border-cm-border shrink-0 hover:border-cm-accent transition-all relative"
            title="Subir foto de categoría"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 text-cm-accent animate-spin" />
            ) : currentImage ? (
              <img src={currentImage} alt={category} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-4 h-4 text-cm-muted" />
            )}
            {!uploading && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/catimg:opacity-100 flex items-center justify-center text-white text-[8px] font-black tracking-wider transition-all uppercase">
                {currentImage ? 'Cambiar' : 'Subir'}
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

          {currentImage && !uploading && (
            <button
              onClick={handleRemoveImage}
              className="absolute -top-1.5 -right-1.5 bg-cm-error text-cm-primary rounded-full p-0.5 hover:bg-cm-error/80 transition-colors shadow-sm opacity-0 group-hover/catimg:opacity-100 z-10"
              title="Eliminar imagen"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 min-w-0 flex-1">
          <InlineEdit
            value={category}
            onSave={(newName: string) => { if (newName.trim() && newName.trim() !== category) renameCategory(category, newName.trim()); }}
            className="font-black text-cm-text uppercase tracking-widest text-sm"
          />
        </div>

        <span className="ml-auto text-xs font-bold text-cm-muted shrink-0">{items.length} ítems</span>
      </div>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-cm-border">
              {items.length > 0 ? (
                items.map((item, index) => (
                  <div
                    key={item.id}
                    className={index % 2 === 0 ? 'bg-cm-surface' : 'bg-cm-bg/30'}
                  >
                    <MenuItemRow
                      item={item}
                      toggleAvailability={toggleAvailability}
                      updateField={updateField}
                      deleteProduct={deleteProduct}
                      duplicateProduct={duplicateProduct}
                      onConfigureWizard={onConfigureWizard}
                      onCreateCampaign={onCreateCampaign}
                      notify={notify}
                      onMoveItem={onMoveItem}
                      onReorder={onReorder}
                      index={index}
                      total={items.length}
                    />
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center py-8 text-center border-b border-cm-border">
                  <Soup className="w-10 h-10 text-cm-muted mb-2" />
                  <p className="text-sm font-semibold text-cm-text-secondary">Aún no hay platos en esta categoría</p>
                  <p className="text-xs text-cm-muted mt-1">Añade tu primer plato usando el botón de abajo.</p>
                </div>
              )}

              <button
                onClick={() => createProduct(category)}
                className="w-full flex items-center justify-center gap-2 p-4 text-sm font-bold text-cm-muted hover:text-cm-accent hover:bg-cm-accent/5 transition-colors border-t-2 border-dashed border-cm-border rounded-b-xl"
              >
                <Plus className="w-4 h-4" /> Añadir plato a {category}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
