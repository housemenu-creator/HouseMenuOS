import { useState, useRef } from 'react';
import { ImageIcon, MoreVertical, Sparkles, Settings2, Copy, Trash2, Loader2 } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import { PromptModal, ConfirmModal } from '../ConfirmModal';
import { storageService } from '../../../lib/storageService';
import { useBranch } from '../../../context/BranchContext';

export default function MenuItemRow({ item, toggleAvailability, updateField, deleteProduct, duplicateProduct, onConfigureWizard, notify }) {
  const { activeBranchId } = useBranch();
  const isAvailable = item.available !== false;
  const isWizard = item.isWizard === true;
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDelete = () => {
    setShowDeleteConfirm(true);
    setMenuOpen(false);
  };

  const confirmDelete = () => {
    deleteProduct(item.id);
    setShowDeleteConfirm(false);
  };

  const handleUrlImageEdit = () => {
    setShowImagePrompt(true);
    setMenuOpen(false);
  };

  const confirmImageUrl = (url) => {
    if (url !== null) {
      updateField(item.id, 'image', url);
    }
    setShowImagePrompt(false);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeBranchId) return;
    setUploading(true);
    try {
      const result = await storageService.uploadProductImage(activeBranchId, item.id, file);
      updateField(item.id, 'image', result.url);
    } catch (err) {
      console.error('Error uploading image:', err);
      notify?.('Error al subir imagen', 'error');
    }
    setUploading(false);
  };

  return (
    <>
      <div className="flex items-center gap-4 p-4 hover:bg-cm-accent/5 transition-colors group relative">
        <div className={`flex flex-1 items-center gap-4 min-w-0 ${!isAvailable ? 'opacity-50 grayscale-[50%]' : ''}`}>
          <div className="w-4 h-6 flex flex-col justify-center gap-0.5 cursor-grab opacity-0 group-hover:opacity-30">
            <div className="w-1 h-1 bg-cm-text rounded-full" />
            <div className="w-1 h-1 bg-cm-text rounded-full" />
            <div className="w-1 h-1 bg-cm-text rounded-full" />
          </div>

          <div
            onClick={uploading ? undefined : handleImageClick}
            className="w-12 h-12 rounded-lg bg-cm-border flex items-center justify-center cursor-pointer overflow-hidden border border-cm-border shrink-0 hover:border-cm-accent transition-all relative group/thumb"
            title="Haga clic para subir foto local"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 text-cm-accent animate-spin" />
            ) : item.image ? (
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-5 h-5 text-cm-muted" />
            )}
            {!uploading && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white text-[10px] font-black tracking-widest transition-all uppercase">
                Subir
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

          <div className="flex-1 min-w-0">
            <InlineEdit
              value={item.name}
              onSave={(val) => updateField(item.id, 'name', val)}
              className="font-bold text-sm text-cm-text block w-full truncate"
            />
            <div className="mt-0.5 text-xs text-cm-muted">
              <InlineEdit
                value={item.description || "Añadir descripción..."}
                onSave={(val) => updateField(item.id, 'description', val)}
                className="w-full truncate block"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 mr-2">
            <span className="text-cm-muted text-sm font-bold">S/</span>
            <InlineEdit
              value={Number(item.base_price || 0).toFixed(2)}
              type="number"
              onSave={(val) => updateField(item.id, 'base_price', parseFloat(val))}
              className="font-black text-cm-accent text-sm w-16 text-right"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 border-r border-cm-border pr-4 mr-2 select-none">
            {item.trackStock ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-white bg-cm-accent px-1.5 py-0.5 rounded uppercase tracking-wider">STOCK</span>
                <InlineEdit
                  value={Number(item.stock || 0).toString()}
                  type="number"
                  onSave={(val) => updateField(item.id, 'stock', Math.max(0, parseInt(val, 10) || 0))}
                  className="font-bold text-sm text-cm-text w-10 text-center"
                />
                <button
                  onClick={() => updateField(item.id, 'trackStock', false)}
                  className="text-[9px] font-bold text-cm-error hover:text-cm-error/80 transition-colors uppercase px-1 py-0.5 rounded hover:bg-cm-error/10"
                  title="Desactivar control de stock (stock ilimitado)"
                >
                  Ilimitado
                </button>
              </div>
            ) : (
              <button onClick={() => { updateField(item.id, 'trackStock', true); updateField(item.id, 'stock', 10); }}
                className="text-[10px] font-bold text-cm-muted hover:text-cm-accent bg-cm-border hover:bg-cm-accent/10 px-2 py-1 rounded border border-cm-border transition-colors uppercase tracking-wider"
                title="Activar control de stock para este plato">Controlar Stock</button>
            )}
          </div>

          <button onClick={() => toggleAvailability(item.id, isAvailable)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all border ${
              isAvailable
                ? 'bg-cm-success/10 text-cm-success border-cm-success/30 hover:bg-cm-success/20'
                : 'bg-cm-bg text-cm-muted border-cm-border hover:bg-cm-border'
            }`}
          >
            {isAvailable ? <span className="w-1.5 h-1.5 rounded-full bg-cm-success animate-pulse" /> : <span className="w-1.5 h-1.5 rounded-full bg-cm-text/30" />}
            {isAvailable ? 'Activo' : 'Agotado'}
          </button>

          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 text-cm-muted hover:text-cm-text hover:bg-cm-border rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border-2 border-cm-border py-1.5 z-50 shadow-cm-md animate-[fadeIn_0.1s_ease]">
                  <button onClick={() => { updateField(item.id, 'isWizard', !isWizard); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-cm-text hover:bg-cm-accent/5 hover:text-cm-accent flex items-center gap-2 transition-colors">
                    <Sparkles className="w-4 h-4 text-cm-info" />
                    {isWizard ? 'Quitar modo Combo' : 'Convertir a Combo'}
                  </button>

                  {isWizard && (
                    <button onClick={() => { onConfigureWizard(item.id); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-cm-info hover:bg-cm-info/10 flex items-center gap-2 transition-colors">
                      <Settings2 className="w-4 h-4 text-cm-info" />
                      Configurar Pasos
                    </button>
                  )}

                  <div className="h-px bg-cm-border my-1.5" />

                  <button onClick={handleUrlImageEdit}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-cm-text hover:bg-cm-accent/5 hover:text-cm-accent flex items-center gap-2 transition-colors">
                    <ImageIcon className="w-4 h-4 text-cm-muted" />
                    Ingresar URL de Imagen
                  </button>

                  <button onClick={() => { duplicateProduct(item); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-cm-text hover:bg-cm-accent/5 hover:text-cm-accent flex items-center gap-2 transition-colors">
                    <Copy className="w-4 h-4 text-cm-muted" />
                    Duplicar Plato
                  </button>

                  <div className="h-px bg-cm-border my-1.5" />

                  <button onClick={handleDelete}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-cm-error hover:bg-cm-error/10 flex items-center gap-2 transition-colors">
                    <Trash2 className="w-4 h-4 text-cm-error" />
                    Eliminar permanentemente
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <PromptModal
        open={showImagePrompt}
        title="URL de Imagen"
        label="Ingresa la URL de la nueva imagen"
        initialValue={item.image || ''}
        placeholder="https://ejemplo.com/imagen.jpg"
        onConfirm={confirmImageUrl}
        onCancel={() => setShowImagePrompt(false)}
      />

      <ConfirmModal
        open={showDeleteConfirm}
        title="Eliminar Plato"
        message={`¿Estás seguro de que deseas eliminar permanentemente "${item.name}"?`}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        danger={true}
      />
    </>
  );
}
