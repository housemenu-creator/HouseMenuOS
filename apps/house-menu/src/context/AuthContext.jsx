import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { verifyPin, createSession, deleteSession, ensureFirebaseUser } from '../lib/authService';
import { signInWithGoogle, signOut as fbSignOut, onAuthChange } from '../lib/firebaseAuth';
import { hasPermission as checkPermission } from '../lib/permissions';
import { getSessionId } from '@house/db';

/** @typedef {{ id: string; email: string; name: string; role: string }} SessionUser */
/** @typedef {{ user: SessionUser | null; session: Record<string, unknown> | null; isAuthenticated: boolean; isLoading: boolean; firebaseReady: boolean; error: unknown; login: (email: string, pin: string) => Promise<{success: boolean; error?: string}>; loginWithGoogle: () => Promise<{success: boolean; error?: string}>; logout: () => Promise<void>; can: (perm: string) => boolean; hasBranchAccess: (branchId: string) => boolean; clearError: () => void }} AuthContextValue */

const AuthContext = createContext(/** @type {AuthContextValue | null} */ (null));

const SESSION_KEY = 'house_session';

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("AuthContext.loadSession error:", e);
    return null;
  }
}

function saveSession(data) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("AuthContext.saveSession error:", e);
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.warn("AuthContext.clearSession error:", e);
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const googleLoginInProgress = React.useRef(false);

  const isAuthenticated = !!session;

  useEffect(() => {
    // Ensure a stable session ID exists for customer carts/orders
    // that survive staff login/logout in the same browser
    getSessionId();

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setFirebaseReady(true);
      if (firebaseUser) {
        // Anonymous users (customer flow) don't need RTDB access
        if (firebaseUser.isAnonymous) return;

        const existingSession = loadSession();
        if (existingSession && existingSession.firebaseUid === firebaseUser.uid) {
          return;
        }
        // Si hay un loginWithGoogle en curso, ese se encarga de ensureFirebaseUser
        if (googleLoginInProgress.current) return;

        const result = await ensureFirebaseUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });
        if (result.success) {
          const sessionData = await createSession({
            ...result.user,
            firebaseUid: firebaseUser.uid,
          });
          setSession({ ...sessionData, firebaseUid: firebaseUser.uid });
          saveSession({ ...sessionData, firebaseUid: firebaseUser.uid });
        }
      } else {
        const saved = loadSession();
        if (saved && saved.firebaseUid) {
          setSession(null);
          clearSession();
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email, pin) => {
    setIsLoading(true);
    setError(null);
    clearError();
    try {
      const result = await verifyPin(email, pin);
      if (result.success) {
        const sessionData = await createSession(result.user);
        setSession(sessionData);
        saveSession(sessionData);
        setError(null);
        return { success: true };
      }
      setError(result.error || 'Credenciales incorrectas');
      return { success: false };
    } catch (err) {
      console.error('AuthContext.login error:', err);
      setError('Error de conexión. Intenta de nuevo.');
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    googleLoginInProgress.current = true;
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        setError(result.error || 'Error al iniciar sesión con Google');
        return { success: false };
      }
      const ensureResult = await ensureFirebaseUser(result.firebaseUser);
      if (!ensureResult.success) {
        await fbSignOut();
        setError(ensureResult.error || 'Error al configurar usuario');
        return { success: false };
      }
      const sessionData = await createSession({
        ...ensureResult.user,
        firebaseUid: result.firebaseUser.uid,
      });
      setSession({ ...sessionData, firebaseUid: result.firebaseUser.uid });
      saveSession({ ...sessionData, firebaseUid: result.firebaseUser.uid });
      return { success: true };
    } catch (err) {
      console.error('AuthContext.loginWithGoogle error:', err);
      setError('Error al iniciar sesión con Google');
      return { success: false };
    } finally {
      setIsLoading(false);
      googleLoginInProgress.current = false;
    }
  }, []);

  const logout = useCallback(async () => {
    if (session?.token) {
      await deleteSession(session.token);
    }
    await fbSignOut();
    setSession(null);
    setError(null);
    clearSession();
  }, [session]);

  const can = useCallback((permission) => {
    if (!session?.permissions) return false;
    return checkPermission(session.permissions, permission);
  }, [session]);

  const hasBranchAccess = useCallback((branchId) => {
    if (!session?.branchIds) return false;
    return session.branchIds[branchId] || session.branchIds['*'];
  }, [session]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider value={{
      user: session ? {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
      } : null,
      session,
      isAuthenticated,
      isLoading,
      firebaseReady,
      error,
      login,
      loginWithGoogle,
      logout,
      can,
      hasBranchAccess,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
