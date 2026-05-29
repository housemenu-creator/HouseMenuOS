import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MapPin, Phone, Clock3, Edit3, Trash2, Copy, Loader2, AlertTriangle, X, Hash } from 'lucide-react';
import { ref, update } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { branchService } from '../../lib/branchService';
import { useBranch } from '../../context/BranchContext';

export default function SucursalesTab({ branches }) {
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '', schedule: '', lat: '', lng: '' });

  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneSource, setCloneSource] = useState('');
  const [cloneTarget, setCloneTarget] = useState('');
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneResult, setCloneResult] = useState(null);
  const { activeBranchId } = useBranch();

  const [tablesConfig, setTablesConfig] = useState([]);

  const addTable = () => {
    const nextNum = tablesConfig.length > 0 ? Math.max(...tablesConfig) + 1 : 1;
    setTablesConfig([...tablesConfig, nextNum]);
  };

  const removeTable = (num) => {
    setTablesConfig(tablesConfig.filter(n => n !== num));
  };

  const openBranchForm = (branch = null) => {
    if (branch) {
      setEditingBranch(branch);
      setBranchForm({
        name: branch.name || '',
        address: branch.address || '',
        phone: branch.phone || '',
        schedule: branch.schedule || '',
        lat: branch.coordinates?.lat != null ? String(branch.coordinates.lat) : '',
        lng: branch.coordinates?.lng != null ? String(branch.coordinates.lng) : '',
        tableCount: branch.tableCount != null ? String(branch.tableCount) : '0',
        deliveryEnabled: branch.deliveryEnabled ?? false,
        deliveryFee: branch.deliveryFee != null ? String(branch.deliveryFee) : '5',
        freeThreshold: branch.freeThreshold != null ? String(branch.freeThreshold) : '0',
        packagingItems: branch.packagingItems || [],
      });
      setTablesConfig(branch.tables || Array.from({ length: parseInt(branch.tableCount) || 0 }, (_, i) => i + 1));
    } else {
      setEditingBranch(null);
      setBranchForm({ name: '', address: '', phone: '', schedule: '', lat: '', lng: '', tableCount: '0', deliveryEnabled: false, deliveryFee: '5', freeThreshold: '0', packagingItems: [] });
      setTablesConfig([]);
    }
    setShowBranchModal(true);
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: branchForm.name,
      address: branchForm.address,
      phone: branchForm.phone,
      schedule: branchForm.schedule,
      coordinates: { lat: branchForm.lat ? parseFloat(branchForm.lat) : null, lng: branchForm.lng ? parseFloat(branchForm.lng) : null },
      tableCount: parseInt(branchForm.tableCount) || 0,
      deliveryEnabled: branchForm.deliveryEnabled,
      deliveryFee: parseFloat(branchForm.deliveryFee) || 0,
      freeThreshold: parseFloat(branchForm.freeThreshold) || 0,
      packagingItems: branchForm.packagingItems || [],
    };
    try {
      const result = editingBranch
        ? await branchService.updateBranch(editingBranch.id, data)
        : await branchService.createBranch(data);
      if (result.success && editingBranch) {
        await update(ref(db, `branches/${editingBranch.id}`), { tables: tablesConfig });
      } else if (result.success) {
        const branchId = result.id;
        await update(ref(db, `branches/${branchId}`), { tables: tablesConfig });
      }
      if (result.success) {
        setShowBranchModal(false);
      } else {
        alert('Error al guardar la sucursal');
      }
    } catch (err) {
      alert('Error al guardar la sucursal: ' + (err.message || 'Error inesperado'));
    }
  };

  const deleteBranch = async (id, name) => {
    if (!window.confirm(`Estas seguro de que deseas eliminar la sucursal "${name}"? Esta accion no se puede deshacer.`)) return;
    try {
      const result = await branchService.deleteBranch(id);
      if (!result.success) alert('Error al eliminar la sucursal');
    } catch (err) {
      alert('Error al eliminar la sucursal: ' + (err.message || 'Error inesperado'));
    }
  };

  const handleCloneCatalog = async () => {
    if (!cloneSource || !cloneTarget) return;
    setCloneLoading(true);
    setCloneResult(null);
    try {
      const result = await branchService.cloneMenu(cloneSource, cloneTarget);
      setCloneResult(result);
    } catch (err) {
      setCloneResult({ success: false, error: err.message });
    }
    setCloneLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-cm-text">Sucursales</h2>
        <button onClick={() => openBranchForm()} className="flex items-center gap-2 px-4 py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
          <Plus className="w-4 h-4" /> Nueva sucursal
        </button>
      </div>

      <div className="grid gap-4">
        {branches.map(b => (
          <div key={b.id} className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-cm-text">{b.name}</h3>
                  {b.id === activeBranchId && <span className="text-[0.55rem] font-semibold bg-cm-accent/10 text-cm-accent px-1.5 py-0.5 rounded uppercase tracking-wider">Activa</span>}
                </div>
                {b.address && <p className="text-sm text-cm-text-secondary mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" />{b.address}</p>}
                {b.phone && <p className="text-sm text-cm-text-secondary mt-0.5 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0" />{b.phone}</p>}
                {b.schedule && <p className="text-sm text-cm-text-secondary mt-0.5 flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5 shrink-0" />{b.schedule}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setCloneSource(b.id); setCloneTarget(''); setCloneResult(null); setShowCloneModal(true); }} className="p-2 text-cm-text-tertiary hover:text-cm-info hover:bg-cm-info/10 rounded-lg transition-colors" title="Clonar catalogo desde esta sucursal">
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={() => openBranchForm(b)} className="p-2 text-cm-text-tertiary hover:text-cm-accent hover:bg-cm-accent/10 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => deleteBranch(b.id, b.name)} className="p-2 text-cm-text-tertiary hover:text-cm-error hover:bg-cm-error/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Clone Catalog Modal */}
      <AnimatePresence>
        {showCloneModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCloneModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-cm-text mb-2">Clonar catalogo</h3>
              <p className="text-xs text-cm-text-secondary mb-4">Copia los productos de una sucursal a otra. Los productos del destino seran <strong>reemplazados</strong>.</p>

              {cloneResult && (
                <div className={`p-3 rounded-lg text-sm font-semibold mb-4 ${cloneResult.success ? 'bg-cm-success/10 text-cm-success' : 'bg-cm-error/10 text-cm-error'}`}>
                  {cloneResult.success ? `Catalogo clonado (${cloneResult.itemCount} productos)` : `Error: ${cloneResult.error}`}
                  <button onClick={() => setCloneResult(null)} className="ml-2 text-xs underline">Cerrar</button>
                </div>
              )}

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Origen</label>
                  <select value={cloneSource} onChange={e => setCloneSource(e.target.value)} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent">
                    <option value="">Seleccionar</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Destino</label>
                  <select value={cloneTarget} onChange={e => setCloneTarget(e.target.value)} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent">
                    <option value="">Seleccionar</option>
                    {branches.filter(b => b.id !== cloneSource).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowCloneModal(false)} className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
                <button onClick={handleCloneCatalog} disabled={!cloneSource || !cloneTarget || cloneLoading}
                  className="flex-1 py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {cloneLoading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Clonando...</> : <><Copy className="w-4 h-4 inline mr-1" /> Clonar</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBranchModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowBranchModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-cm-text mb-4">{editingBranch ? 'Editar sucursal' : 'Nueva sucursal'}</h3>
              <form onSubmit={handleBranchSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Nombre</label>
                  <input type="text" required value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Direccion</label>
                  <input type="text" value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Telefono</label>
                    <input type="text" value={branchForm.phone} onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Horario</label>
                    <input type="text" value={branchForm.schedule} onChange={e => setBranchForm({ ...branchForm, schedule: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Latitud</label>
                    <input type="text" value={branchForm.lat} onChange={e => setBranchForm({ ...branchForm, lat: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Longitud</label>
                    <input type="text" value={branchForm.lng} onChange={e => setBranchForm({ ...branchForm, lng: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Cant. Mesas</label>
                    <input type="number" min="0" value={branchForm.tableCount} onChange={e => setBranchForm({ ...branchForm, tableCount: e.target.value })}
                      className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Delivery habilitado</label>
                    <button type="button" onClick={() => setBranchForm({ ...branchForm, deliveryEnabled: !branchForm.deliveryEnabled })}
                      className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors border ${branchForm.deliveryEnabled ? 'bg-cm-success/10 border-cm-success text-cm-success' : 'bg-cm-bg-alt border-cm-border text-cm-text-tertiary'}`}>
                      {branchForm.deliveryEnabled ? 'SÍ' : 'NO'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Costo delivery (S/)</label>
                    <input type="number" step="0.5" min="0" value={branchForm.deliveryFee} onChange={e => setBranchForm({ ...branchForm, deliveryFee: e.target.value })}
                      className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Delivery gratis desde (S/)</label>
                    <input type="number" step="5" min="0" value={branchForm.freeThreshold} onChange={e => setBranchForm({ ...branchForm, freeThreshold: e.target.value })}
                      className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder="0 = sin mín" />
                  </div>
                </div>
                <div className="border-t border-cm-border pt-4">
                  <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-3">Descartables</p>
                  <div className="space-y-2">
                    {branchForm.packagingItems?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-cm-bg-alt rounded-lg p-2 border border-cm-border">
                        <span className="text-lg shrink-0">{item.icon || '📦'}</span>
                        <input value={item.name || ''} onChange={e => {
                          const next = [...branchForm.packagingItems];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setBranchForm({ ...branchForm, packagingItems: next });
                        }} placeholder="Nombre" className="flex-1 px-2 py-1 rounded-lg border border-cm-border bg-cm-surface text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-semibold text-cm-text-tertiary">S/</span>
                          <input type="number" step="0.5" min="0" value={item.price ?? 0} onChange={e => {
                            const next = [...branchForm.packagingItems];
                            next[idx] = { ...next[idx], price: parseFloat(e.target.value) || 0 };
                            setBranchForm({ ...branchForm, packagingItems: next });
                          }} className="w-16 px-2 py-1 rounded-lg border border-cm-border bg-cm-surface text-xs font-semibold text-cm-accent text-right focus:outline-none focus:border-cm-accent" />
                        </div>
                        <input value={item.icon || ''} onChange={e => {
                          const next = [...branchForm.packagingItems];
                          next[idx] = { ...next[idx], icon: e.target.value };
                          setBranchForm({ ...branchForm, packagingItems: next });
                        }} placeholder="🍾" className="w-10 text-center px-1 py-1 rounded-lg border border-cm-border bg-cm-surface text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
                        <button onClick={() => setBranchForm({ ...branchForm, packagingItems: branchForm.packagingItems.filter((_, i) => i !== idx) })}
                          className="p-1 text-cm-text-tertiary hover:text-cm-error hover:bg-cm-error/10 rounded-lg transition-colors shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => setBranchForm({ ...branchForm, packagingItems: [...(branchForm.packagingItems || []), { id: 'item_' + Date.now(), name: '', icon: '📦', price: 0 }] })}
                      className="w-full py-2 border-2 border-dashed border-cm-border rounded-lg text-xs font-semibold text-cm-text-tertiary hover:text-cm-accent hover:border-cm-accent transition-colors flex items-center justify-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Agregar descartable
                    </button>
                  </div>
                </div>
                <div className="border-t border-cm-border pt-4">
                  <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-3">Mesas</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tablesConfig.sort((a, b) => a - b).map(num => (
                      <div key={num} className="flex items-center gap-1 bg-cm-accent/10 border border-cm-accent/30 rounded-lg px-2.5 py-1.5">
                        <Hash className="w-3 h-3 text-cm-accent" />
                        <span className="text-xs font-bold text-cm-text">{num}</span>
                        <button onClick={() => removeTable(num)} className="p-0.5 text-cm-text-tertiary hover:text-cm-error rounded">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addTable}
                    className="text-xs font-bold text-cm-accent hover:text-cm-accent-hover flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Agregar mesa
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowBranchModal(false)} className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">{editingBranch ? 'Guardar cambios' : 'Crear sucursal'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
