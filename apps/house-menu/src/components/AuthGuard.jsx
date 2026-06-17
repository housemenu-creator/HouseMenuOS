import { ShieldX } from 'lucide-react';
import { ROLE_REGISTRY, getDefaultUsers } from '../lib/roleRegistry';
import { useAuth } from '../context/AuthContext';
import LoginScreen from './LoginScreen';

function AccessDenied({ message }) {
  return (
    <div className="fixed inset-0 z-50 cm-bg flex items-center justify-center p-4">
      <div className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-cm-error/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-cm-error/30">
          <ShieldX className="w-8 h-8 text-cm-error" />
        </div>
        <h1 className="text-2xl font-bold text-cm-accent mb-2">Acceso denegado</h1>
        <p className="text-sm text-cm-muted">
          {message || 'No tienes permiso para acceder a esta sección.'}
        </p>
      </div>
    </div>
  );
}

export default function AuthGuard({ children, allowedRoles, roleConfig, requirePermission }) {
  const { isAuthenticated, isLoading, error, login, loginWithGoogle, clearError, user, firebaseReady, can } = useAuth();

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
          devUsers={getDefaultUsers()}
        />
      </div>
    );
  }

  // Permission guard — checks against user permissions (not role)
  if (requirePermission && !can(requirePermission)) {
    return <AccessDenied message="No tienes el permiso necesario para acceder a esta sección." />;
  }

  if (allowedRoles && user.role !== 'admin' && user.role !== 'superadmin' && !allowedRoles.includes(user.role)) {
    return (
      <AccessDenied message={`Tu rol actual (${user.role}) no tiene permiso para esta sección.`} />
    );
  }

  return children;
}
