import { useState } from 'react';
import { LogIn, Loader2, AlertCircle, Mail } from 'lucide-react';

export default function LoginScreen({
  title,
  subtitle,
  icon: Icon,
  onLogin,
  onGoogleLogin,
  isLoading,
  error,
  onClearError,
  firebaseReady,
}) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onClearError) onClearError();
    onLogin(email, pin);
  };

  return (
    <div className="min-h-screen bg-cm-bg flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border p-8 max-w-sm w-full text-center space-y-6 bg-white"
      >
        {Icon && (
          <div className="w-16 h-16 rounded-2xl bg-cm-accent/10 flex items-center justify-center mx-auto">
            <Icon className="w-8 h-8 text-cm-accent" />
          </div>
        )}

        <div>
          <h1 className="text-2xl text-cm-accent">{title}</h1>
          {subtitle && (
            <p className="text-sm text-cm-muted mt-2">{subtitle}</p>
          )}
        </div>

        {onGoogleLogin && firebaseReady && (
          <>
            <button
              type="button"
              onClick={onGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-cm-border rounded-xl font-bold text-sm text-cm-text hover:bg-cm-bg transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isLoading ? 'CONECTANDO...' : 'INGRESAR CON GOOGLE'}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-cm-border" />
              <span className="text-xs font-bold text-cm-muted uppercase tracking-widest">o</span>
              <div className="flex-1 h-px bg-cm-border" />
            </div>
          </>
        )}

        <div className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-muted pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-cm-bg border-2 border-cm-border rounded-lg pl-10 pr-3 py-3 text-sm text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
              placeholder="correo@ejemplo.com"
              autoFocus
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full bg-cm-bg border-2 border-cm-border rounded-lg p-3 text-center text-xl text-cm-text tracking-[0.5em] focus:outline-none focus:border-cm-accent transition-colors"
            placeholder="••••"
            maxLength={6}
            disabled={isLoading}
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="flex items-center justify-center gap-2 text-red-600 text-sm font-bold bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !email || !pin}
          className="btn-culinary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LogIn className="w-5 h-5" />
          )}
          {isLoading ? 'VERIFICANDO...' : 'INGRESAR'}
        </button>
      </form>
    </div>
  );
}
