import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLE_REGISTRY, getDefaultUsers } from '../lib/roleRegistry';
import { useAuth } from '../context/AuthContext';
import { staffDashboardRoute } from '../lib/routes';
import LoginScreen from '../components/LoginScreen';

/**
 * Standalone login page at /login.
 * Lets staff log in with PIN or Google.
 * Redirects to role dashboard after successful login.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, error, login, loginWithGoogle, clearError, firebaseReady } = useAuth();

  // Redirect to role dashboard when login succeeds
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(staffDashboardRoute(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

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
