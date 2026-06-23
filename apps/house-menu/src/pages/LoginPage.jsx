import { ROLE_REGISTRY, getDefaultUsers } from '../lib/roleRegistry';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../components/LoginScreen';

/**
 * Standalone login page at /login.
 * Lets staff log in with PIN or Google without navigating to /admin.
 */
export default function LoginPage() {
  const { isAuthenticated, isLoading, error, login, loginWithGoogle, clearError, firebaseReady } = useAuth();

  // If already authenticated, the route redirect handles this — but
  // we keep the guard simple: show login or let AuthGuard handle redirects
  const config = ROLE_REGISTRY.admin.loginScreen;

  return (
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
  );
}
