import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Loader2, AlertTriangle } from 'lucide-react';
import { branchService } from '../../lib/branchService';

export default function MultibranchTab({ branches, activeBranchId }) {
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneResult, setCloneResult] = useState(null);
  const [cloneSource, setCloneSource] = useState('');
  const [cloneTarget, setCloneTarget] = useState('');
  const [showCloneConfirm, setShowCloneConfirm] = useState(false);

  const otherBranches = branches.filter(b => b.id !== activeBranchId);

  const handleCloneCatalog = async () => {
    if (!cloneSource || !cloneTarget) return;
    if (cloneSource === cloneTarget) {
      setCloneResult({ success: false, error: 'La sucursal de origen y destino deben ser diferentes.' });
      return;
    }
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
        <h2 className="text-lg font-bold text-cm-text">Multi-sucursal</h2>
        <p className="text-xs text-cm-text-secondary font-medium">{branches.length} sucursales</p>
      </div>

      <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-6">
        <h3 className="text-sm font-semibold text-cm-text mb-2">Clonar catalogo</h3>
        <p className="text-xs text-cm-text-secondary mb-4">Copia el catalogo de productos de una sucursal a otra.</p>

        {cloneResult && (
          <div className={`p-3 rounded-lg text-sm font-semibold mb-4 ${cloneResult.success ? 'bg-cm-success/10 text-cm-success' : 'bg-cm-error/10 text-cm-error'}`}>
            {cloneResult.success ? `Catalogo clonado exitosamente (${cloneResult.itemCount} productos)` : `Error: ${cloneResult.error}`}
            <button onClick={() => setCloneResult(null)} className="ml-2 text-xs underline">Cerrar</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Origen</label>
            <select value={cloneSource} onChange={e => setCloneSource(e.target.value)} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors">
              <option value="">Seleccionar origen</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Destino</label>
            <select value={cloneTarget} onChange={e => setCloneTarget(e.target.value)} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors">
              <option value="">Seleccionar destino</option>
              {otherBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <button onClick={() => setShowCloneConfirm(true)} disabled={!cloneSource || !cloneTarget || cloneSource === cloneTarget || cloneLoading}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${!cloneSource || !cloneTarget || cloneSource === cloneTarget || cloneLoading ? 'bg-cm-text/10 text-cm-text-tertiary cursor-not-allowed' : 'bg-cm-accent text-white hover:bg-cm-accent-hover'}`}>
          {cloneLoading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Clonando...</> : <><Copy className="w-4 h-4 inline mr-1" /> Clonar catalogo</>}
        </button>
      </div>

      <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-5">
        <h3 className="text-sm font-semibold text-cm-text mb-4">Sucursales disponibles</h3>
        <div className="space-y-3">
          {branches.map(b => (
            <div key={b.id} className="flex items-center justify-between py-2 border-b border-cm-border last:border-0">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${b.id === activeBranchId ? 'bg-cm-success' : 'bg-cm-text-tertiary'}`} />
                <span className="text-sm font-semibold text-cm-text">{b.name}</span>
                {b.id === activeBranchId && <span className="text-[0.55rem] font-semibold bg-cm-accent/10 text-cm-accent px-1.5 py-0.5 rounded uppercase tracking-wider">Actual</span>}
              </div>
              <span className="text-xs text-cm-text-secondary font-mono">{b.id}</span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showCloneConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCloneConfirm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 text-cm-error mb-4">
                <AlertTriangle className="w-8 h-8" />
                <h3 className="text-lg font-bold">Confirmar clonacion</h3>
              </div>
              <p className="text-sm text-cm-text-secondary mb-4">
                Esto <strong>SOBREESCRIBIRA</strong> completamente el catalogo de productos de <strong>{branches.find(b => b.id === cloneTarget)?.name}</strong> con los datos de <strong>{branches.find(b => b.id === cloneSource)?.name}</strong>.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowCloneConfirm(false)} className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
                <button onClick={() => { setShowCloneConfirm(false); handleCloneCatalog(); }} className="flex-1 py-2 bg-cm-error text-white text-sm font-semibold rounded-lg hover:bg-cm-error/80 transition-colors">Si, clonar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
