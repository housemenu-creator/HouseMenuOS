import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import MenuCategoryBlock from './MenuCategoryBlock';
import { PromptModal } from '../ConfirmModal';

export default function MenuBuilder({ products, toggleAvailability, updateField, createProduct, deleteProduct, duplicateProduct, createCategory, renameCategory, onConfigureWizard }) {
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    const groups = {};
    Object.entries(filteredProducts).forEach(([id, p]) => {
      const cat = p.category || 'Sin Categoría';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ id, ...p });
    });
    Object.values(groups).forEach(arr => arr.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    }));
    return groups;
  }, [filteredProducts]);

  const totalProducts = Object.keys(products).length;
  const filteredCount = Object.keys(filteredProducts).length;
  const hasFilter = searchQuery.trim().length > 0;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, categoría o descripción..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-cm-border bg-white text-sm font-bold text-cm-text focus:border-cm-accent focus:outline-none transition-colors placeholder:text-cm-muted"
            />
          </div>
          {hasFilter && (
            <span className="text-xs font-bold text-cm-muted whitespace-nowrap">
              {filteredCount} de {totalProducts}
            </span>
          )}
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm font-bold text-cm-muted">
              {hasFilter ? 'No hay productos que coincidan con tu búsqueda' : 'No hay productos en el menú'}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <MenuCategoryBlock
              key={category}
              category={category}
              items={items}
              toggleAvailability={toggleAvailability}
              updateField={updateField}
              createProduct={createProduct}
              deleteProduct={deleteProduct}
              duplicateProduct={duplicateProduct}
              onConfigureWizard={onConfigureWizard}
              renameCategory={renameCategory}
            />
          ))
        )}

        <button
          onClick={() => setShowCategoryModal(true)}
          className="w-full py-4 border-2 border-dashed border-cm-border rounded-xl text-cm-muted font-bold hover:text-cm-accent hover:border-cm-accent transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Nueva Categoría de Menú
        </button>
      </div>

      <PromptModal
        open={showCategoryModal}
        title="Nueva Categoría"
        label="Ingresa el nombre de la nueva categoría (ej. POSTRES)"
        placeholder="Ej. BEBIDAS, ENTRADAS, POSTRES..."
        onConfirm={(val) => { if (val.trim()) createCategory(val.trim()); setShowCategoryModal(false); }}
        onCancel={() => setShowCategoryModal(false)}
      />
    </>
  );
}
