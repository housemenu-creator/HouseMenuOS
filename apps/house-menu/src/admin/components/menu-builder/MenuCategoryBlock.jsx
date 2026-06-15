import { useState, useRef } from 'react';
import { ChevronDown, ChevronRight, Plus, ImageIcon, Loader2, X } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import MenuItemRow from './MenuItemRow';
import { storageService } from '../../../lib/storageService';
import { menuService } from '../../../lib/menuService';

function getCategorySlug(categoryName) {
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
  notify
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const slug = getCategorySlug(category);
  const currentImage = categoriesConfig[slug]?.image || '';

  const handleImageClick = (e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
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

  const handleRemoveImage = async (e) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar la imagen de esta categoría?')) return;
    try {
      await menuService.updateCategoryImage(activeBranchId, category, null);
    } catch (err) {
      console.error('Error removing category image:', err);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-cm-border shadow-sm transition-all animate-[fadeIn_0.3s_ease]">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 p-4 bg-cm-bg/50 hover:bg-cm-bg transition-colors border-b border-cm-border rounded-t-xl cursor-pointer ${!isOpen ? 'rounded-b-xl border-b-0' : ''}`}
      >
        {isOpen ? <ChevronDown className="w-5 h-5 text-cm-accent shrink-0" /> : <ChevronRight className="w-5 h-5 text-cm-muted shrink-0" />}

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

        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
          <InlineEdit
            value={category}
            onSave={(newName) => { if (newName.trim() && newName.trim() !== category) renameCategory(category, newName.trim()); }}
            className="font-black text-cm-text uppercase tracking-widest text-sm"
          />
        </div>

        <span className="ml-auto text-xs font-bold text-cm-muted shrink-0">{items.length} ítems</span>
      </div>

      {isOpen && (
        <div className="divide-y divide-cm-border">
          {items.map(item => (
            <MenuItemRow
              key={item.id}
              item={item}
              toggleAvailability={toggleAvailability}
              updateField={updateField}
              deleteProduct={deleteProduct}
              duplicateProduct={duplicateProduct}
              onConfigureWizard={onConfigureWizard}
              notify={notify}
            />
          ))}
          <button
            onClick={() => createProduct(category)}
            className="w-full flex items-center gap-2 p-3 text-sm font-bold text-cm-muted hover:text-cm-accent hover:bg-cm-accent/5 transition-colors border-t border-dashed border-cm-border rounded-b-xl"
          >
            <Plus className="w-4 h-4" /> Añadir plato a {category}
          </button>
        </div>
      )}
    </div>
  );
}
