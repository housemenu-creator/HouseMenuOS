import { ROLE_REGISTRY } from '../lib/roleRegistry';
import { useAuth } from '../context/AuthContext';
import LoginScreen from './LoginScreen';

export default function AuthGuard({ children, allowedRoles, roleConfig }) {
  const { isAuthenticated, isLoading, error, login, loginWithGoogle, clearError, user, firebaseReady } = useAuth();

  if (isLoading && !isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 cm-bg flex items-center justify-center">
        <div className="w-full max-w-sm h-64 rounded-2xl animate-pulse bg-cm-border" aria-hidden="true" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const role = allowedRoles?.[0] || 'admin';
    const config = roleConfig || ROLE_REGISTRY[role]?.loginScreen || ROLE_REGISTRY.admin.loginScreen;

    return (
      <div className="fixed inset-0 z-50">
        <LoginScreen
          title={config.title}
          subtitle={config.subtitle}
          icon={config.icon}
          onLogin={login}
          onGoogleLogin={loginWithGoogle}
          isLoading={isLoading}
          error={error}
          onClearError={clearError}
          firebaseReady={firebaseReady}
        />
      </div>
    );
  }

  if (allowedRoles && user.role !== 'admin' && !allowedRoles.includes(user.role)) {
    return (
      <div className="fixed inset-0 z-50 cm-bg flex items-center justify-center p-4">
        <div className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border p-8 max-w-sm w-full text-center bg-white">
          <h1 className="text-2xl text-cm-accent">Acceso denegado</h1>
          <p className="text-sm text-cm-muted mt-2">
            Tu rol actual ({user.role}) no tiene permiso para esta sección.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
