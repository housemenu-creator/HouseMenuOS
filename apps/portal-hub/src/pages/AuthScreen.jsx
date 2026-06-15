import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, AlertCircle, Loader2 } from 'lucide-react';
import { getEmployeeByPin } from '../lib/employeeService';
import { appStore } from '@house/store';

export default function AuthScreen({ onAuthenticated }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const branchId = appStore.getState().activeBranchId;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setError('');

    try {
      const employee = await getEmployeeByPin(pin.trim(), branchId);
      if (employee) {
        onAuthenticated(employee);
      } else {
        setError('PIN incorrecto. Probá de nuevo.');
        setPin('');
        inputRef.current?.focus();
      }
    } catch (err) {
      setError('Error al conectar. Verificá la conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigit = (d) => {
    if (pin.length < 6) {
      setPin(prev => prev + d);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (pin.length === 6 && !loading) {
      // Small delay so user sees the last digit
      const t = setTimeout(() => {
        document.getElementById('pin-form')?.requestSubmit();
      }, 200);
      return () => clearTimeout(t);
    }
  }, [pin.length, loading]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cm-bg p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-[--cm-radius-xl] bg-cm-primary flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-cm-accent" />
          </div>
          <h1 className="text-xl font-bold text-cm-text">Portal Empleados</h1>
          <p className="text-sm text-cm-text-secondary mt-1">Ingresá tu PIN para fichar</p>
        </div>

        {/* PIN display */}
        <form id="pin-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-3">
            {[0,1,2,3,4,5].map(i => (
              <div
                key={i}
                className={`w-10 h-12 rounded-[--cm-radius-md] border-2 flex items-center justify-center text-lg font-bold transition-all ${
                  pin[i]
                    ? 'border-cm-accent bg-cm-accent-light text-cm-primary'
                    : 'border-cm-border bg-cm-surface text-cm-text'
                }`}
              >
                {pin[i] ? '●' : ''}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-cm-error bg-cm-error-soft rounded-[--cm-radius-md] px-4 py-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 text-cm-accent animate-spin" />
            </div>
          )}

          {/* Hidden real input for form submission */}
          <input
            ref={inputRef}
            type="password"
            value={pin}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
              setPin(digits);
              setError('');
            }}
            className="sr-only"
            autoComplete="off"
          />
        </form>

        {/* Numpad */}
        <div className="mt-6">
          <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
            {[1,2,3,4,5,6,7,8,9].map(d => (
              <button
                key={d}
                onClick={() => handleDigit(String(d))}
                disabled={loading}
                className="h-14 rounded-[--cm-radius-md] bg-cm-surface border border-cm-border text-lg font-bold text-cm-text hover:bg-cm-surface-hover active:scale-95 transition-all disabled:opacity-50"
              >
                {d}
              </button>
            ))}
            <div />
            <button
              onClick={() => handleDigit('0')}
              disabled={loading}
              className="h-14 rounded-[--cm-radius-md] bg-cm-surface border border-cm-border text-lg font-bold text-cm-text hover:bg-cm-surface-hover active:scale-95 transition-all disabled:opacity-50"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              disabled={loading || pin.length === 0}
              className="h-14 rounded-[--cm-radius-md] bg-cm-surface border border-cm-border text-sm font-medium text-cm-text-secondary hover:bg-cm-surface-hover active:scale-95 transition-all disabled:opacity-30"
            >
              ⌫
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
