import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Phone, Eye, EyeOff, Loader2, Chrome, ArrowRight, CheckCircle } from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';

const MODE_LOGIN = 'login';
const MODE_REGISTER = 'register';

export default function CustomerAuthModal({ open, onClose, initialMode = MODE_LOGIN }) {
  const { loginWithEmail, loginWithGoogle, registerWithEmail, isLoading, error, clearError, isAuthenticated } = useCustomerAuth();
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState(null);

  const displayError = localError || error;

  const resetForm = useCallback(() => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setLocalError(null);
    clearError();
  }, [clearError]);

  const switchMode = useCallback((newMode) => {
    setMode(newMode);
    resetForm();
  }, [resetForm]);

  const validate = useCallback(() => {
    if (!email.trim()) { setLocalError('Ingresá tu email'); return false; }
    if (!/\S+@\S+\.\S+/.test(email)) { setLocalError('Email no válido'); return false; }
    if (password.length < 6) { setLocalError('La contraseña debe tener al menos 6 caracteres'); return false; }
    if (mode === MODE_REGISTER && !name.trim()) { setLocalError('Ingresá tu nombre'); return false; }
    return true;
  }, [email, password, mode, name]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    if (!validate()) return;

    if (mode === MODE_LOGIN) {
      const result = await loginWithEmail(email.trim(), password);
      if (result.success) onClose();
    } else {
      const result = await registerWithEmail({ name: name.trim(), email: email.trim(), password, phone: phone.trim() });
      if (result.success) onClose();
    }
  }, [mode, email, password, name, phone, validate, loginWithEmail, registerWithEmail, onClose, clearError]);

  const handleGoogle = useCallback(async () => {
    setLocalError(null);
    clearError();
    const result = await loginWithGoogle();
    if (result.success) onClose();
  }, [loginWithGoogle, onClose, clearError]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-cm-surface border border-cm-border rounded-3xl shadow-cm-xl overflow-hidden"
          >
            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-cm-bg/50 text-cm-text-secondary hover:text-cm-text transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8 pt-12">
              {/* Logo / Title */}
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-gradient-to-br from-cm-accent to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-cm-md">
                  <User className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-black text-cm-text tracking-tight">
                  {mode === MODE_LOGIN ? 'Bienvenido de vuelta' : 'Crear cuenta'}
                </h2>
                <p className="text-sm text-cm-muted mt-1">
                  {mode === MODE_LOGIN
                    ? 'Iniciá sesión para ver tus puntos y pedidos'
                    : 'Registrate para acumular puntos y beneficios'}
                </p>
              </div>

              {/* Error */}
              {displayError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-medium text-red-400 text-center"
                >
                  {displayError}
                </motion.div>
              )}

              {/* Google Button */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-cm-border rounded-xl text-sm font-bold text-cm-text transition-all disabled:opacity-50 mb-4"
              >
                <Chrome className="w-5 h-5" />
                Continuar con Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-cm-border/50" />
                <span className="text-xs font-semibold text-cm-text-secondary">o con email</span>
                <div className="flex-1 h-px bg-cm-border/50" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === MODE_REGISTER && (
                  <div>
                    <label className="block text-xs font-bold text-cm-text-secondary mb-1.5 uppercase tracking-wider">
                      Nombre
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-secondary" />
                      <input
                        type="text"
                        placeholder="Ej. Juan Pérez"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-cm-bg border border-cm-border rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-cm-text placeholder:text-cm-text-secondary/50 focus:outline-none focus:border-cm-accent transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-cm-text-secondary mb-1.5 uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-secondary" />
                    <input
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-cm-bg border border-cm-border rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-cm-text placeholder:text-cm-text-secondary/50 focus:outline-none focus:border-cm-accent transition-colors"
                    />
                  </div>
                </div>

                {mode === MODE_REGISTER && (
                  <div>
                    <label className="block text-xs font-bold text-cm-text-secondary mb-1.5 uppercase tracking-wider">
                      Teléfono <span className="text-cm-text-secondary/50">(opcional)</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-secondary" />
                      <input
                        type="tel"
                        placeholder="999 888 777"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-cm-bg border border-cm-border rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-cm-text placeholder:text-cm-text-secondary/50 focus:outline-none focus:border-cm-accent transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-cm-text-secondary mb-1.5 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-secondary" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-cm-bg border border-cm-border rounded-xl pl-10 pr-11 py-3 text-sm font-medium text-cm-text placeholder:text-cm-text-secondary/50 focus:outline-none focus:border-cm-accent transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cm-text-secondary hover:text-cm-text transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cm-accent hover:bg-cm-accent/90 text-white font-black text-sm rounded-xl transition-all disabled:opacity-50 shadow-cm-md"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : mode === MODE_LOGIN ? (
                    <>Iniciar Sesión <ArrowRight className="w-4 h-4" /></>
                  ) : (
                    <>Crear Cuenta <CheckCircle className="w-4 h-4" /></>
                  )}
                </button>
              </form>

              {/* Switch mode */}
              <div className="mt-6 text-center">
                <p className="text-xs text-cm-text-secondary">
                  {mode === MODE_LOGIN ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}
                  {' '}
                  <button
                    onClick={() => switchMode(mode === MODE_LOGIN ? MODE_REGISTER : MODE_LOGIN)}
                    className="text-cm-accent font-bold hover:underline"
                  >
                    {mode === MODE_LOGIN ? 'Registrate' : 'Iniciá sesión'}
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
