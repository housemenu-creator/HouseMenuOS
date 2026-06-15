import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import MenuBuilder from '../components/menu-builder/MenuBuilder';
import WizardConfigModal from '../components/menu-builder/WizardConfigModal';
import { menuService } from '../../lib/menuService';
import { dailyMenuService } from '../../lib/dailyMenuService';

export default function MenuTab({ activeBranchId, catalog, dailyMenus, onUpdateField }) {
  const [selectedDailyDate, setSelectedDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyMenuForm, setDailyMenuForm] = useState({ name: '', description: '', basePrice: '' });
  const [showDailyMenuModal, setShowDailyMenuModal] = useState(false);
  const [wizardProduct, setWizardProduct] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const notify = (message, type = 'success') => setToast({ message, type });

  const todayMenu = dailyMenus[selectedDailyDate];
  const products = Object.entries(catalog.products || {}).map(([id, p]) => ({ id, ...p }));

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
      notify('Error al guardar: ' + (err.message || 'Error inesperado'), 'error');
    }
    setSaving(false);
  };

  const toggleProductInDailyMenu = async (productId) => {
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
    if (!window.confirm('Eliminar el menú del día seleccionado?')) return;
    try {
      await dailyMenuService.removeDailyMenu(activeBranchId, selectedDailyDate);
      notify('Menú del día eliminado');
    } catch (err) {
      notify('Error al eliminar menú del día', 'error');
    }
  };

  const toggleAvailability = async (productId) => {
    const product = catalog.products[productId];
    if (!product) return;
    try {
      await menuService.updateProductAvailability(activeBranchId, productId, !product.available);
    } catch (err) {
      notify('Error al cambiar disponibilidad', 'error');
    }
  };

  const createProduct = async (category) => {
    try {
      await menuService.createProduct(activeBranchId, category);
    } catch (err) {
      notify('Error al crear producto', 'error');
    }
  };

  const deleteProduct = async (productId) => {
    try {
      await menuService.deleteProduct(activeBranchId, productId);
    } catch (err) {
      notify('Error al eliminar producto', 'error');
    }
  };

  const duplicateProduct = async (productId) => {
    try {
      await menuService.duplicateProduct(activeBranchId, productId);
    } catch (err) {
      notify('Error al duplicar producto', 'error');
    }
  };

  const createCategory = async (name) => {
    try {
      await menuService.createCategory(activeBranchId, name);
    } catch (err) {
      notify('Error al crear categoría', 'error');
    }
  };

  const renameCategory = async (oldName, newName) => {
    try {
      await menuService.renameCategory(activeBranchId, oldName, newName);
    } catch (err) {
      notify('Error al renombrar categoría', 'error');
    }
  };

  const handleConfigureWizard = (productId) => {
    const product = catalog.products[productId];
    if (!product) return;
    setWizardProduct({ ...product, id: productId });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-cm-text">Constructor de Menu</h2>
        <p className="text-xs text-cm-text-secondary font-medium">{Object.keys(catalog.products || {}).length} productos</p>
      </div>

      {activeBranchId ? (
        <>
          <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-cm-text">Menu del Dia</h3>
              <div className="flex items-center gap-2">
                <input type="date" value={selectedDailyDate} onChange={e => setSelectedDailyDate(e.target.value)} className="px-3 py-1.5 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                {todayMenu && (
                  <button onClick={removeDailyMenu} className="p-1.5 text-cm-error hover:text-cm-error/80 hover:bg-cm-error/10 rounded-lg transition-colors" title="Eliminar menu">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => { setDailyMenuForm({ name: todayMenu?.name || '', description: todayMenu?.description || '', basePrice: todayMenu?.basePrice || '' }); setShowDailyMenuModal(true); }}
                  className="px-3 py-1.5 bg-cm-accent text-cm-primary text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
                  {todayMenu ? 'Editar' : 'Crear menu'}
                </button>
              </div>
            </div>

            {todayMenu ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-semibold text-cm-text">{todayMenu.name}</span>
                  {todayMenu.description && <span className="text-cm-text-secondary">— {todayMenu.description}</span>}
                  <span className="text-xs font-semibold bg-cm-accent/10 text-cm-accent px-2 py-0.5 rounded-full">S/ {Number(todayMenu.basePrice || 0).toFixed(2)}</span>
                </div>
                <div className="border-t border-cm-border pt-3">
                  <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-2">Productos incluidos</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {products.filter(p => (todayMenu.productIds || []).includes(p.id)).map(p => (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-cm-bg-alt rounded-lg text-sm">
                        <span className="font-semibold text-cm-text">{p.name}</span>
                        <button onClick={() => toggleProductInDailyMenu(p.id)} className="text-cm-text-tertiary hover:text-cm-error transition-colors ml-2">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-cm-text-secondary py-2">No hay menu configurado para este dia. Crea uno para sugerirlo a los clientes.</p>
            )}
          </div>

          <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-5">
            <h3 className="text-sm font-semibold text-cm-text mb-4">Productos disponibles</h3>
            <p className="text-xs text-cm-text-secondary mb-3">Haz clic para incluir/excluir productos del menu del dia.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {products.map(p => {
                const inMenu = (todayMenu?.productIds || []).includes(p.id);
                return (
                  <button key={p.id} onClick={() => toggleProductInDailyMenu(p.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-colors text-left ${inMenu ? 'bg-cm-success/10 text-cm-success border border-cm-success/30' : 'bg-cm-bg-alt text-cm-text-secondary border border-transparent hover:border-cm-border'}`}>
                    <span>{p.name}</span>
                    {inMenu && <CheckCircle2 className="w-4 h-4 text-cm-success shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>

          <MenuBuilder
            products={catalog.products || {}}
            toggleAvailability={toggleAvailability}
            updateField={onUpdateField}
            createProduct={createProduct}
            deleteProduct={deleteProduct}
            duplicateProduct={duplicateProduct}
            createCategory={createCategory}
            renameCategory={renameCategory}
            onConfigureWizard={handleConfigureWizard}
            activeBranchId={activeBranchId}
            categoriesConfig={catalog.categories || {}}
            notify={notify}
          />
        </>
      ) : (
        <p className="text-sm text-cm-text-secondary text-center py-8">Selecciona una sucursal para gestionar el menu</p>
      )}

      <WizardConfigModal
        open={!!wizardProduct}
        product={wizardProduct}
        onSave={(id, steps) => onUpdateField(id, 'steps', steps)}
        onClose={() => setWizardProduct(null)}
      />

      <AnimatePresence>
        {showDailyMenuModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDailyMenuModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-cm-text mb-4">{todayMenu ? 'Editar menu del dia' : 'Crear menu del dia'}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Nombre del menu</label>
                  <input type="text" value={dailyMenuForm.name} onChange={e => setDailyMenuForm({ ...dailyMenuForm, name: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder="Ej. Menu Ejecutivo" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Descripcion</label>
                  <textarea value={dailyMenuForm.description} onChange={e => setDailyMenuForm({ ...dailyMenuForm, description: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm text-cm-text focus:outline-none focus:border-cm-accent transition-colors" rows={2} placeholder="Descripcion del menu..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Precio base</label>
                  <input type="number" step="0.01" value={dailyMenuForm.basePrice} onChange={e => setDailyMenuForm({ ...dailyMenuForm, basePrice: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder="0.00" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowDailyMenuModal(false)} className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
                  <button onClick={handleSaveDailyMenu} disabled={saving} className="flex-1 py-2 bg-cm-accent text-cm-primary text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando</> : 'Guardar'}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
