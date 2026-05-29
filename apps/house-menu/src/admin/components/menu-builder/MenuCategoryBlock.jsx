import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import MenuItemRow from './MenuItemRow';

export default function MenuCategoryBlock({ category, items, toggleAvailability, updateField, createProduct, deleteProduct, duplicateProduct, onConfigureWizard, renameCategory }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-cm-border shadow-sm transition-all animate-[fadeIn_0.3s_ease]">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 p-4 cm-bg/50 hover:cm-bg transition-colors border-b border-cm-border rounded-t-xl cursor-pointer ${!isOpen ? 'rounded-b-xl border-b-0' : ''}`}
      >
        {isOpen ? <ChevronDown className="w-5 h-5 text-cm-accent shrink-0" /> : <ChevronRight className="w-5 h-5 text-cm-muted shrink-0" />}

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
