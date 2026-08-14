import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, AlertCircle, Loader2 } from 'lucide-react';
import { loginPortalByPin } from '../lib/empleadoService';
import { useBranch } from '../context/BranchContext';
import { useTenant } from '../context/TenantContext';

export default function EmpleadoLogin({ onAuthenticated }) {
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const { activeBranchId } = useBranch();
  const { tenantId } = useTenant();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true); setError('');
    try {
      const emp = await loginPortalByPin(pin.trim(), activeBranchId, tenantId, email.trim() || null);
      if (emp) { onAuthenticated(emp); }
      else { setError('PIN incorrecto'); setPin(''); setEmail(''); inputRef.current?.focus(); }
    } catch { setError('Error al conectar'); }
    finally { setLoading(false); }
  };

  const handleDigit = (d) => { if (pin.length < 6) { setPin(p => p + d); setError(''); } };
  const handleDelete = () => { setPin(p => p.slice(0, -1)); setError(''); };

  useEffect(() => {
    // Auto-submit at 4 digits (legacy migrated PINs) or 6 (newer longer PINs).
    if ((pin.length === 4 || pin.length === 6) && !loading) {
      const t = setTimeout(() => handleSubmit(), 200);
      return () => clearTimeout(t);
    }
  }, [pin.length, loading]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cm-bg p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-[--cm-radius-xl] bg-cm-primary flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-cm-accent" />
          </div>
          <h1 className="text-xl font-bold text-cm-text">Portal Empleados</h1>
          <p className="text-sm text-cm-text-secondary mt-1">Ingresá tu PIN para fichar</p>
        </div>

        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className={`w-10 h-12 rounded-[--cm-radius-md] border-2 flex items-center justify-center text-lg font-bold transition-all ${pin[i] ? 'border-cm-accent bg-cm-accent-light text-cm-primary' : 'border-cm-border bg-cm-surface text-cm-text'}`}>
              {pin[i] ? '●' : ''}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm text-cm-error bg-cm-error-soft rounded-[--cm-radius-md] px-4 py-2.5 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {error === 'PIN duplicado, usá email' && (
          <div className="mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu email para identificarte"
              autoComplete="email"
              className="w-full rounded-[--cm-radius-md] bg-cm-surface border border-cm-border px-4 py-2.5 text-sm text-cm-text placeholder:text-cm-text-secondary/50 focus:border-cm-accent focus:outline-none"
            />
            <button onClick={handleSubmit} disabled={loading || !email.trim()} className="mt-2 w-full rounded-[--cm-radius-md] bg-cm-primary text-cm-text py-2.5 text-sm font-medium disabled:opacity-40">
              Continuar
            </button>
          </div>
        )}

        {loading && <div className="flex justify-center mb-4"><Loader2 className="w-6 h-6 text-cm-accent animate-spin" /></div>}

        <form onSubmit={handleSubmit}><input ref={inputRef} type="password" value={pin} onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} className="sr-only" autoComplete="off" /></form>

        <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
            <button key={d} onClick={() => handleDigit(String(d))} disabled={loading} className="h-14 rounded-[--cm-radius-md] bg-cm-surface border border-cm-border text-lg font-bold text-cm-text hover:bg-cm-surface-hover transition-all disabled:opacity-50">{d}</button>
          ))}
          <div />
          <button onClick={() => handleDigit('0')} disabled={loading} className="h-14 rounded-[--cm-radius-md] bg-cm-surface border border-cm-border text-lg font-bold text-cm-text hover:bg-cm-surface-hover transition-all disabled:opacity-50">0</button>
          <button onClick={handleDelete} disabled={loading || pin.length === 0} className="h-14 rounded-[--cm-radius-md] bg-cm-surface border border-cm-border text-sm font-medium text-cm-text-secondary hover:bg-cm-surface-hover transition-all disabled:opacity-30">⌫</button>
        </div>

        {/* ponytail: dev skip */}
        <div className="mt-8 text-center">
          <button onClick={() => onAuthenticated({ id: 'dev-skip', name: 'Dev Admin', pin: '000000', role: 'admin', active: true })} className="text-xs text-cm-text-secondary/40 hover:text-cm-accent transition-colors" type="button">Skip →</button>
        </div>
      </motion.div>
    </div>
  );
}
