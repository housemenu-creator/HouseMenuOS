import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ImageIcon, MoreVertical, Sparkles, Settings2, Copy, Trash2,
  Loader2, Eye, EyeOff, Smartphone, Globe, Truck, Hash, X,
  ChevronUp, ChevronDown, Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import { PromptModal, ConfirmModal } from '../ConfirmModal';
import { storageService } from '../../../lib/storageService';
import { useBranch } from '../../../context/BranchContext';
import { useDragReorder } from '../../hooks/useDragReorder';
import type { MenuProduct } from '../../types';

interface MenuItemRowProps {
  item: MenuProduct & { id: string };
  toggleAvailability: (productId: string) => void;
  updateField: (productId: string, field: string, value: unknown) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  duplicateProduct: (productId: string) => Promise<void>;
  onConfigureWizard: (productId: string) => void;
  onCreateCampaign?: (product: MenuProduct & { id: string }) => void;
  notify?: (message: string, type?: 'success' | 'error') => void;
  onMoveItem?: (productId: string, direction: 'up' | 'down') => void;
  onReorder?: (sourceId: string, targetId: string) => void;
  index: number;
  total: number;
}

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  carta: Eye,
  kiosko: Smartphone,
  landing: Globe,
  delivery: Truck,
};

const CHANNEL_LABELS: Record<string, string> = {
  carta: 'Carta QR',
  kiosko: 'Kiosko',
  landing: 'Landing',
  delivery: 'Delivery',
};

export default function MenuItemRow({
  item,
  toggleAvailability,
  updateField,
  deleteProduct,
  duplicateProduct,
  onConfigureWizard,
  onCreateCampaign,
  notify,
  onMoveItem,
  onReorder,
  index,
  total,
}: MenuItemRowProps) {
  const { activeBranchId } = useBranch();
  const isAvailable = item.available !== false;
  const isWizard = item.isWizard === true;
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const channels = item.channels || { carta: true, kiosko: true, landing: false, delivery: true };
  const tags = item.tags || [];
  const isDraft = item.status === 'draft';
  const hasTrackStock = item.trackStock === true;
  const stockValue = item.stock ?? 0;
  const [isDragOver, setIsDragOver] = useState(false);

  const handleReorder = useCallback((sourceId: string, targetId: string) => {
    onReorder?.(sourceId, targetId);
  }, [onReorder]);

  const { onDragStart, onDragOver, onDrop, onDragEnd } = useDragReorder(handleReorder);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    onDragOver(e);
    setIsDragOver(true);
  }, [onDragOver]);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    setIsDragOver(false);
    onDrop(item.id)(e);
  }, [onDrop, item.id]);

  const handleDragEnd = useCallback(() => {
    setIsDragOver(false);
    onDragEnd();
  }, [onDragEnd]);

  const toggleChannel = (ch: string) => {
    updateField(item.id, `channels/${ch}`, !channels[ch]);
  };

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    updateField(item.id, 'tags', [...tags, t]);
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    updateField(item.id, 'tags', tags.filter(x => x !== t));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
  };

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

  const confirmImageUrl = (url: string | null) => {
    if (url !== null) {
      updateField(item.id, 'image', url);
    }
    setShowImagePrompt(false);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Reserved for future channel panel expansion
  void [showChannels, setShowChannels] as never;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      draggable={true}
      onDragStart={onDragStart(item.id)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className={`group relative p-3 transition-colors cursor-grab active:cursor-grabbing ${
        isDragOver
          ? 'bg-cm-accent/10 ring-2 ring-cm-accent/40 rounded-lg'
          : 'hover:bg-cm-accent/5'
      } ${!isAvailable ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Move buttons — always visible as small buttons */}
        <div className="flex flex-col gap-0.5 pt-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onMoveItem?.(item.id, 'up'); }}
            disabled={index === 0}
            className="p-1 text-cm-muted hover:text-cm-accent hover:bg-cm-accent/10 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            title="Mover arriba"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onMoveItem?.(item.id, 'down'); }}
            disabled={index === total - 1}
            className="p-1 text-cm-muted hover:text-cm-accent hover:bg-cm-accent/10 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            title="Mover abajo"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Thumbnail — larger rounded-lg with upload overlay */}
        <div className="relative shrink-0">
          <div
            onClick={uploading ? undefined : handleImageClick}
            className="w-12 h-12 rounded-lg bg-cm-border flex items-center justify-center cursor-pointer overflow-hidden border border-cm-border hover:border-cm-accent transition-all relative group/thumb"
            title="Haga clic para subir foto local"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 text-cm-accent animate-spin" />
            ) : item.image ? (
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-5 h-5 text-cm-muted" />
            )}
            {/* Upload overlay — always visible on hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-all">
              <Upload className="w-4 h-4" />
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Name row */}
          <div className="flex items-center gap-2">
            {isDraft && (
              <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                Borrador
              </span>
            )}
            <InlineEdit
              value={item.name}
              onSave={(val: string) => updateField(item.id, 'name', val)}
              className="font-bold text-sm text-cm-text truncate block"
            />
          </div>

          {/* Description — truncated single line */}
          <div className="text-xs text-cm-text-secondary truncate max-w-[200px]">
            <InlineEdit
              value={item.description || 'Añadir descripción...'}
              onSave={(val: string) => updateField(item.id, 'description', val)}
              className="w-full truncate block"
            />
          </div>

          {/* Tags + Channel indicators in one row */}
          <div className="flex items-center gap-2 flex-wrap">
            {tags.length > 0 && tags.slice(0, 2).map(t => (
              <span key={t} className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-cm-accent/10 text-cm-accent uppercase tracking-wider">
                {t}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="text-[8px] font-bold text-cm-muted">+{tags.length - 2}</span>
            )}
            <div className="flex items-center gap-1">
              {Object.entries(CHANNEL_ICONS).map(([ch, Icon]) => (
                <span
                  key={ch}
                  className={`inline-flex items-center text-[8px] font-bold uppercase tracking-wider ${
                    channels[ch] !== false ? 'text-cm-accent' : 'text-cm-text-tertiary'
                  }`}
                  title={`${CHANNEL_LABELS[ch]}: ${channels[ch] !== false ? 'Visible' : 'Oculto'}`}
                >
                  <Icon className="w-3 h-3" />
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Price + Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end gap-1">
            {/* Price */}
            <div className="flex items-center gap-0.5">
              <span className="text-cm-muted text-xs font-bold">S/</span>
              <InlineEdit
                value={Number(item.base_price || 0).toFixed(2)}
                type="number"
                onSave={(val: string) => updateField(item.id, 'base_price', parseFloat(val))}
                className="font-black text-cm-accent text-base leading-none w-16 text-right tabular-nums"
              />
            </div>

            {/* Stock badge */}
            {hasTrackStock && (
              <div className="flex items-center gap-1 bg-cm-accent/10 text-cm-accent px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase whitespace-nowrap">
                <PackageIconInline />
                <span>{stockValue}</span>
              </div>
            )}
          </div>

          {/* Availability toggle — pill button */}
          <button
            onClick={() => toggleAvailability(item.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all border shrink-0 ${
              isAvailable
                ? 'bg-cm-success/10 text-cm-success border-cm-success/30 hover:bg-cm-success/20'
                : 'bg-cm-bg text-cm-muted border-cm-border hover:bg-cm-border/50'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-cm-success' : 'bg-cm-text/30'}`} />
            {isAvailable ? 'Activo' : 'Agotado'}
          </button>

          {/* Context menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 text-cm-muted hover:text-cm-text hover:bg-cm-border rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-52 bg-cm-surface rounded-xl border-2 border-cm-border py-1.5 z-50 shadow-cm-md animate-[fadeIn_0.1s_ease]">
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

                  <button onClick={() => { duplicateProduct(item.id); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-cm-text hover:bg-cm-accent/5 hover:text-cm-accent flex items-center gap-2 transition-colors">
                    <Copy className="w-4 h-4 text-cm-muted" />
                    Duplicar Plato
                  </button>

                  {onCreateCampaign && (
                    <button onClick={() => { onCreateCampaign(item); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-cm-text hover:bg-cm-accent/5 hover:text-cm-success flex items-center gap-2 transition-colors">
                      <Sparkles className="w-4 h-4 text-cm-warning" />
                      ✨ Crear Campaña
                    </button>
                  )}

                  <div className="h-px bg-cm-border my-1.5" />

                  {/* Stock toggle inside menu */}
                  {hasTrackStock ? (
                    <div className="px-4 py-2 space-y-1.5" onClick={e => e.stopPropagation()}>
                      <p className="text-[9px] font-black text-cm-text-secondary uppercase tracking-wider">Stock</p>
                      <div className="flex items-center gap-2">
                        <InlineEdit
                          value={Number(stockValue).toString()}
                          type="number"
                          onSave={(val: string) => updateField(item.id, 'stock', Math.max(0, parseInt(val, 10) || 0))}
                          className="font-bold text-sm text-cm-text w-12 text-center"
                        />
                        <button
                          onClick={() => updateField(item.id, 'trackStock', false)}
                          className="text-[9px] font-bold text-cm-error hover:text-cm-error/80 transition-colors uppercase px-1.5 py-0.5 rounded hover:bg-cm-error/10"
                        >
                          Ilimitado
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { updateField(item.id, 'trackStock', true); updateField(item.id, 'stock', 10); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-cm-text hover:bg-cm-accent/5 hover:text-cm-accent flex items-center gap-2 transition-colors">
                      <PackageIconInline className="w-4 h-4 text-cm-muted" />
                      Controlar Stock
                    </button>
                  )}

                  {/* Status toggle */}
                  <button onClick={() => { updateField(item.id, 'status', isDraft ? 'published' : 'draft'); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-cm-text hover:bg-cm-accent/5 hover:text-cm-accent flex items-center gap-2 transition-colors">
                    {isDraft ? <Eye className="w-4 h-4 text-cm-success" /> : <EyeOff className="w-4 h-4 text-amber-500" />}
                    {isDraft ? 'Publicar' : 'Pasar a borrador'}
                  </button>

                  <div className="h-px bg-cm-border my-1.5" />

                  {/* Channel toggles */}
                  <div className="px-4 py-2 space-y-1">
                    <p className="text-[9px] font-black text-cm-text-secondary uppercase tracking-wider mb-1.5">Visibilidad</p>
                    {Object.entries(CHANNEL_LABELS).map(([ch, label]) => {
                      const Icon = CHANNEL_ICONS[ch];
                      const active = channels[ch] !== false;
                      return (
                        <button key={ch} onClick={() => { toggleChannel(ch); }}
                          className={`w-full text-left px-2 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors ${
                            active ? 'text-cm-accent bg-cm-accent/5' : 'text-cm-text-tertiary hover:text-cm-text'
                          }`}>
                          <Icon className="w-3.5 h-3.5" />
                          <span className="flex-1">{label}</span>
                          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            active ? 'bg-cm-accent border-cm-accent' : 'border-cm-border'
                          }`}>
                            {active && <span className="w-2 h-2 rounded-sm bg-cm-surface" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-px bg-cm-border my-1.5" />

                  {/* Tags input */}
                  <div className="px-4 py-2" onClick={e => e.stopPropagation()}>
                    <p className="text-[9px] font-black text-cm-text-secondary uppercase tracking-wider mb-1.5">Etiquetas</p>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {tags.map(t => (
                          <span key={t} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-cm-accent/10 text-cm-accent uppercase tracking-wider">
                            {t}
                            <button onClick={() => handleRemoveTag(t)} className="hover:text-cm-error transition-colors">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1">
                      <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown}
                        placeholder="Ej. vegano, sin-gluten..."
                        className="flex-1 px-2 py-1 border border-cm-border rounded text-[10px] font-semibold text-cm-text focus:outline-none focus:border-cm-accent"
                      />
                      <button onClick={handleAddTag} disabled={!tagInput.trim()}
                        className="px-2 py-1 bg-cm-accent text-white text-[10px] font-bold rounded hover:bg-cm-accent-hover disabled:opacity-50 transition-colors">
                        <Hash className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

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
    </motion.div>
  );
}

// ── Inline Package icon helper (avoids import naming conflict) ──

function PackageIconInline({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}
