import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, CheckCircle, AlertTriangle, X, Plus } from 'lucide-react';
import { storageService, validateVoucherFile } from '../../../lib/storageService';
import { extractVoucher } from '../../../lib/aiService';
import { fuzzyMatch, normalizeForMatch } from '../../../lib/voucherMatch';
import { recordDirectPurchase } from '../../../lib/logisticsService';
import { downscaleImage } from '../../../lib/imageUtils';

const fileToDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

const fmtCurrency = (n) => `S/ ${Number(n).toFixed(2)}`;

const extractionErrorMessage = (e) => {
  const msg = String(e?.message || e || '');
  const name = e?.name || '';
  if (msg.includes('VITE_GEMINI_API_KEY')) return 'IA no configurada. Ingresa cantidades manualmente.';
  if (name === 'TimeoutError' || name === 'AbortError' || /timeout|abort/i.test(msg)) return 'Tiempo agotado. Verifica tu conexión.';
  if (msg.includes('Gemini API error')) return 'Error al procesar la boleta. Intenta de nuevo.';
  return `OCR extraction failed: ${msg}`;
};

/**
 * Ingreso de boleta/factura directa (SIN orden de compra): subí la boleta del
 * súper, el OCR extrae las líneas, se matchean contra los insumos existentes y
 * al confirmar se registran los movimientos de stock. Las líneas sin match
 * NUNCA se crean solas: cada una requiere aprobación explícita del admin.
 */
export default function DirectVoucherModal({ branchId, userEmail, ingredients, ingredientsLoading = false, onClose, onDone }) {
  const [voucherFile, setVoucherFile] = useState(null); // data URL downscaled para OCR
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [voucherUrl, setVoucherUrl] = useState(null);
  const [voucherFileName, setVoucherFileName] = useState(null);
  const [voucherError, setVoucherError] = useState(null);

  const [extractionState, setExtractionState] = useState('idle'); // idle | extracting | done | error
  const [extractionError, setExtractionError] = useState(null);
  const [matched, setMatched] = useState([]);   // {ingredientId, name, quantity, unitCost, score}
  const [unmatched, setUnmatched] = useState([]); // {name, quantity, unitCost, unit}
  const [drafts, setDrafts] = useState({});       // por ingredientId: {qty, cost}
  const [approvals, setApprovals] = useState({}); // por idx de unmatched: {name, unit, qty, cost, create: bool}
  const touchedRef = useRef(new Set());
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState(null);

  const intakeId = useMemo(() => `dir-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, []);

  const ingredientsById = useMemo(() => Object.fromEntries((ingredients || []).map(i => [i.id, { name: i.name }])), [ingredients]);

  const resetAll = () => {
    setVoucherFile(null); setUploading(false); setUploadProgress(0);
    setVoucherUrl(null); setVoucherFileName(null); setVoucherError(null);
    setExtractionState('idle'); setExtractionError(null); setMatched([]); setUnmatched([]);
    setDrafts({}); setApprovals({}); setCommitError(null); touchedRef.current = new Set();
  };

  const handleSelect = (file) => {
    if (!file || uploading || committing) return;
    const validationError = validateVoucherFile(file);
    if (validationError) { setVoucherError(validationError); return; }
    setVoucherError(null);
    setUploading(true);
    setUploadProgress(0);
    storageService.uploadVoucher(branchId, `direct-${intakeId}`, file, setUploadProgress)
      .then(async (result) => {
        const dataUrl = await fileToDataURL(file);
        const processed = await downscaleImage(dataUrl, 2048);
        setVoucherFile(processed);
        setVoucherUrl(result.url);
        setVoucherFileName(file.name);
      })
      .catch(() => setVoucherError('No se pudo subir la boleta.'))
      .finally(() => setUploading(false));
  };

  const handleExtract = async () => {
    if (!voucherFile || extractionState === 'extracting' || committing || ingredientsLoading) return;
    setExtractionState('extracting');
    setExtractionError(null);
    setMatched([]);
    setUnmatched([]);
    setDrafts({});
    setApprovals({});
    try {
      const result = await extractVoucher(voucherFile, []);
      if (!result.items || result.items.length === 0) {
        setExtractionState('done');
        return;
      }
      const { matched: m, unmatched: u } = fuzzyMatch(result.items, ingredientsById);
      setMatched(m);
      // fuzzyMatch pierde la unidad en unmatched → la re-emparejamos con la línea original
      setUnmatched(u.map(um => ({
        ...um,
        unit: result.items.find(raw => normalizeForMatch(raw.name) === normalizeForMatch(um.name))?.unit || 'unidad',
      })));
      const d = {};
      for (const item of m) {
        if (!touchedRef.current.has(`${item.poIngredientId}:qty`)) d[`${item.poIngredientId}:qty`] = String(item.quantity);
        if (!touchedRef.current.has(`${item.poIngredientId}:cost`)) d[`${item.poIngredientId}:cost`] = String(item.unitCost);
      }
      // Merge sobre el estado previo: las ediciones del admin (touchedRef)
      // sobreviven al re-escan; solo se pisan los campos que no tocó.
      setDrafts(prev => ({ ...prev, ...d }));
      setExtractionState('done');
    } catch (e) {
      setExtractionError(extractionErrorMessage(e));
      setExtractionState('error');
      console.error('[direct-voucher] falló la extracción:', e);
    }
  };

  const setDraft = (key, value) => {
    touchedRef.current.add(key);
    setDrafts(prev => ({ ...prev, [key]: value }));
  };

  const setApproval = (idx, patch) => setApprovals(prev => ({ ...prev, [idx]: { ...prev[idx], ...patch } }));

  const approvedNewIngredients = unmatched
    .map((u, idx) => ({ u, idx, a: approvals[idx] }))
    .filter(({ a }) => a?.create)
    .map(({ u, a }) => ({
      name: (a.name ?? u.name).trim(),
      unit: a.unit ?? u.unit ?? 'unidad',
      qty: Math.max(1, Number(a.qty ?? u.quantity) || 1),
      cost: Number(a.cost ?? u.unitCost) || 0,
    }));

  const total = useMemo(() => {
    let sum = 0;
    for (const item of matched) {
      const qty = Number(drafts[`${item.poIngredientId}:qty`] ?? item.quantity) || 0;
      const cost = Number(drafts[`${item.poIngredientId}:cost`] ?? item.unitCost) || 0;
      sum += qty * cost;
    }
    for (const ni of approvedNewIngredients) sum += ni.qty * ni.cost;
    return sum;
  }, [matched, drafts, approvedNewIngredients]);

  // Líneas con cantidad > 0 efectiva: sin ellas el payload quedaría vacío
  const hasLines = matched.some(item =>
    (Number(drafts[`${item.poIngredientId}:qty`] ?? item.quantity) || 0) > 0
  ) || approvedNewIngredients.length > 0;

  const handleConfirm = async () => {
    if (!hasLines || committing) return;
    setCommitting(true);
    setCommitError(null);
    const payload = {
      intakeId,
      voucherUrl,
      voucherFileName,
      matched: matched.map(item => ({
        ingredientId: item.poIngredientId,
        qty: Number(drafts[`${item.poIngredientId}:qty`] ?? item.quantity) || 0,
        cost: Number(drafts[`${item.poIngredientId}:cost`] ?? item.unitCost) || 0,
      })).filter(l => l.qty > 0),
      newIngredients: approvedNewIngredients,
    };
    const result = await recordDirectPurchase(branchId, payload, userEmail);
    setCommitting(false);
    if (!result?.success) {
      setCommitError(result?.error || 'No se pudo registrar la compra');
      return;
    }
    onDone(result);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        role="dialog" aria-label="Ingresar boleta directa"
        onClick={() => { if (!uploading && !committing) { onClose(); resetAll(); } }}>
        <div className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-md mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-sm font-bold text-cm-text">Ingresar boleta directa</h3>
              <p className="text-xs text-cm-text-secondary">Compra sin orden: la boleta actualiza insumos y stock.</p>
            </div>
            <button onClick={() => { onClose(); resetAll(); }} aria-label="Cerrar" className="p-1 rounded-lg hover:bg-cm-bg-alt text-cm-text-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 space-y-2 mb-4">
            {/* Upload */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleSelect(e.dataTransfer.files?.[0]); }}
              className="relative flex flex-col items-center justify-center gap-1 border border-dashed border-cm-border rounded-lg px-3 py-3 text-center">
              <input
                type="file" accept="image/jpeg,image/png,image/webp"
                aria-label="Subir boleta"
                onChange={e => handleSelect(e.target.files?.[0])}
                disabled={uploading || committing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <Upload className="w-4 h-4 text-cm-text-secondary" />
              <span className="text-[0.6rem] text-cm-text-secondary">
                {uploading ? 'Subiendo...' : 'Subir boleta/factura (JPG/PNG/WebP, máx 5MB)'}
              </span>
              {uploading && (
                <>
                  <span className="text-[0.6rem] font-semibold text-cm-accent">{Math.round(uploadProgress)}%</span>
                  <div className="w-full h-1.5 bg-cm-bg-alt rounded-full overflow-hidden">
                    <div className="h-full bg-cm-accent rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </>
              )}
            </div>
            {voucherError && <p role="alert" className="text-[0.6rem] text-cm-error">{voucherError}</p>}

            {voucherUrl && (
              <div className="flex items-center gap-3 bg-cm-bg-alt rounded-lg px-3 py-2">
                <img src={voucherUrl} alt="Boleta" className="w-16 h-16 object-cover rounded-lg" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-cm-text truncate">{voucherFileName}</div>
                  <div className="text-[0.6rem] text-cm-text-secondary">Subido {new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            )}

            {/* Extract button */}
            {voucherUrl && (
              <button
                onClick={handleExtract}
                disabled={extractionState === 'extracting' || committing || ingredientsLoading}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {ingredientsLoading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando insumos...</>
                  : extractionState === 'extracting'
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analizando boleta...</>
                  : extractionState === 'done' ? 'Re-escanear'
                  : extractionState === 'error' ? 'Reintentar extracción'
                  : 'Analizar boleta'}
              </button>
            )}
            {extractionState === 'done' && (
              <p className="text-[0.6rem] font-semibold text-cm-success flex items-center gap-1 px-1">
                <CheckCircle className="w-3 h-3 shrink-0" /> Extracción completada · {matched.length} emparejado(s), {unmatched.length} sin coincidir
              </p>
            )}
            {extractionState === 'error' && (
              <p role="alert" className="text-[0.6rem] text-cm-error px-1">{extractionError}</p>
            )}

            {/* Matched lines — editable qty/cost prefilled */}
            {matched.map((item) => {
              const ing = (ingredients || []).find(i => i.id === item.poIngredientId);
              return (
                <div key={item.poIngredientId} className="flex items-center gap-2 bg-cm-bg-alt rounded-lg px-3 py-2 ring-1 ring-cm-success/50">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-cm-text truncate flex items-center gap-1.5">
                      {item.name}
                      <span className="inline-flex items-center gap-0.5 text-[0.55rem] font-bold text-cm-success bg-cm-success/10 px-1.5 py-0.5 rounded-full shrink-0">
                        <CheckCircle className="w-2.5 h-2.5" /> Emparejado
                      </span>
                    </div>
                    <div className="text-[0.6rem] text-cm-text-secondary">→ {ing?.name || item.name}</div>
                  </div>
                  <input
                    type="number" min="0" step="1"
                    value={drafts[`${item.poIngredientId}:qty`] ?? item.quantity}
                    aria-label={`Cantidad ${item.name}`}
                    onChange={e => setDraft(`${item.poIngredientId}:qty`, e.target.value)}
                    disabled={committing}
                    className="w-16 px-2 py-1 rounded border text-right text-xs font-medium bg-cm-surface border-cm-border text-cm-text focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30" />
                  <div className="flex items-center gap-0.5 shrink-0">
                    <span className="text-[0.6rem] text-cm-text-secondary">S/</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={drafts[`${item.poIngredientId}:cost`] ?? item.unitCost}
                      aria-label={`Costo ${item.name}`}
                      onChange={e => setDraft(`${item.poIngredientId}:cost`, e.target.value)}
                      disabled={committing}
                      className="w-16 px-1.5 py-1 rounded border text-right text-[0.6rem] font-medium bg-cm-surface border-cm-border text-cm-text focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30" />
                  </div>
                  <span className="text-[0.6rem] text-cm-text-secondary w-8 shrink-0">{ing?.unit || 'und'}</span>
                </div>
              );
            })}

            {/* Unmatched lines — per-line approval before creating (decision b) */}
            {unmatched.map((u, idx) => {
              const a = approvals[idx] || {};
              const create = !!a.create;
              return (
                <div key={idx} className={`rounded-lg px-3 py-2 space-y-2 ${create ? 'bg-cm-warning/5 border border-cm-warning/20' : 'bg-cm-bg-alt'}`}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setApproval(idx, { create: !create })}
                      disabled={committing}
                      aria-pressed={create}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[0.6rem] font-bold transition-colors ${
                        create ? 'bg-cm-warning text-white' : 'bg-cm-surface border border-cm-border text-cm-text-secondary hover:border-cm-warning/40'
                      }`}>
                      {create ? <CheckCircle className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      {create ? 'Crear insumo' : 'No existe'}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-cm-text truncate">{u.name}</div>
                      <div className="text-[0.6rem] text-cm-text-secondary">Boleta: {u.quantity} {u.unit} · {fmtCurrency(u.unitCost)}</div>
                    </div>
                  </div>
                  {create && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text" value={a.name ?? u.name}
                        aria-label={`Nombre insumo nuevo ${u.name}`}
                        onChange={e => setApproval(idx, { name: e.target.value })}
                        disabled={committing}
                        className="col-span-2 px-2 py-1 rounded border text-xs font-medium bg-cm-surface border-cm-border text-cm-text focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30" />
                      <select
                        value={a.unit ?? u.unit ?? 'unidad'}
                        aria-label={`Unidad ${u.name}`}
                        onChange={e => setApproval(idx, { unit: e.target.value })}
                        disabled={committing}
                        className="px-2 py-1 rounded border text-xs bg-cm-surface border-cm-border text-cm-text">
                        {['kg', 'g', 'unidad', 'und', 'litro', 'ml', 'docena'].map(un => <option key={un} value={un}>{un}</option>)}
                      </select>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" min="0" step="0.01"
                          value={a.cost ?? u.unitCost}
                          aria-label={`Costo ${u.name}`}
                          onChange={e => setApproval(idx, { cost: e.target.value })}
                          disabled={committing}
                          className="w-20 px-1.5 py-1 rounded border text-right text-[0.6rem] font-medium bg-cm-surface border-cm-border text-cm-text focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30" />
                        <input
                          type="number" min="1" step="1"
                          value={a.qty ?? u.quantity}
                          aria-label={`Cantidad ${u.name}`}
                          onChange={e => setApproval(idx, { qty: e.target.value })}
                          disabled={committing}
                          className="w-16 px-2 py-1 rounded border text-right text-xs font-medium bg-cm-surface border-cm-border text-cm-text focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {extractionState === 'done' && matched.length === 0 && unmatched.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertTriangle className="w-8 h-8 text-cm-warning mb-2" />
                <p className="text-xs text-cm-text-secondary">No se detectaron productos. Revisá la foto o ingresá los insumos manualmente.</p>
              </div>
            )}
          </div>

          {extractionState === 'done' && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-cm-text-secondary">Total</span>
              <span className="text-sm font-bold text-cm-text">{fmtCurrency(total)}</span>
            </div>
          )}

          {commitError && <p role="alert" className="text-[0.6rem] text-cm-error mb-2">{commitError}</p>}
          <div className="flex gap-2">
            <button onClick={() => { onClose(); resetAll(); }} disabled={uploading || committing}
              className="flex-1 py-2 border border-cm-border text-xs font-semibold text-cm-text rounded-lg hover:bg-cm-bg-alt transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!hasLines || committing || extractionState !== 'done'}
              className="flex-1 py-2 bg-cm-success text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
              {committing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Registrando...</> : 'Registrar compra'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
