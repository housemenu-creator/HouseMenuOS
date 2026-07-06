import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { verifyPin, createSession, deleteSession, ensureFirebaseUser, switchWorkspaceSession, subscribeUserWorkspaces } from '../lib/authService';
import { signInWithGoogle, signOut as fbSignOut, onAuthChange } from '../lib/firebaseAuth';
import { hasPermission as checkPermission } from '../lib/permissions';
import { getSessionId } from '@house/db';

/** @typedef {{ id: string; email: string; name: string; role: string }} SessionUser */
/** @typedef {{ user: SessionUser | null; session: Record<string, unknown> | null; isAuthenticated: boolean; isLoading: boolean; firebaseReady: boolean; error: unknown; pendingWorkspaces: any[] | null; workspaces: any[]; login: (email: string, pin: string) => Promise<any>; loginWithGoogle: () => Promise<any>; selectWorkspace: (tenantId: string) => Promise<any>; switchWorkspace: (tenantId: string) => Promise<any>; cancelWorkspaceSelection: () => void; logout: () => Promise<void>; can: (perm: string) => boolean; hasBranchAccess: (branchId: string) => boolean; clearError: () => void }} AuthContextValue */

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
  const [pendingWorkspaces, setPendingWorkspaces] = useState(null);
  const [pendingAuthData, setPendingAuthData] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const googleLoginInProgress = React.useRef(false);
  const userInitiatedLogout = React.useRef(false);

  const isAuthenticated = !!session;

  useEffect(() => {
    // Ensure a stable session ID exists for customer carts/orders
    // that survive staff login/logout in the same browser
    getSessionId();

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setFirebaseReady(true);
      if (firebaseUser) {
        console.log('AuthContext.onAuthChange', { uid: firebaseUser.uid, email: firebaseUser.email, isAnonymous: firebaseUser.isAnonymous });
        // Anonymous users (customer flow) don't need RTDB access
        if (firebaseUser.isAnonymous) return;

        const existingSession = loadSession();
        if (existingSession && existingSession.firebaseUid === firebaseUser.uid) {
          return;
        }
        // Si hay un loginWithGoogle en curso, ese se encarga de ensureFirebaseUser
        if (googleLoginInProgress.current) return;

        try {
          const result = await ensureFirebaseUser(firebaseUser);
          if (result.success) {
            if (result.requiresSelection) {
              setPendingWorkspaces(result.workspaces);
              setPendingAuthData({ type: 'google', firebaseUser });
            } else {
              const sessionData = await createSession({
                ...result.user,
                firebaseUid: firebaseUser.uid,
              });
              setSession({ ...sessionData, firebaseUid: firebaseUser.uid });
              saveSession({ ...sessionData, firebaseUid: firebaseUser.uid });
            }
          } else {
            // Not a staff user — might be a customer. Silently ignore instead of signing them out.
            console.log('AuthContext: user not in staff DB (likely a customer — ignoring)', { email: firebaseUser.email, firebaseUid: firebaseUser.uid });
            setSession(null);
            clearSession();
            // Don't call fbSignOut() — customers need their auth session to persist
            setError(null);
          }
        } catch (err) {
          console.warn('AuthContext: ensureFirebaseUser threw in onAuthChange', err);
          // Don't sign out — might be a customer or transient error
          setSession(null);
          clearSession();
        }
      } else {
        // Only clear session on explicit logout, not on transient null
        // from popup auth (COOP/COEP flicker) or token refresh
        if (userInitiatedLogout.current) {
          userInitiatedLogout.current = false;
          const saved = loadSession();
          if (saved && saved.firebaseUid) {
            console.log('AuthContext.onAuthChange: user null (explicit logout), clearing saved session', { savedUid: saved.firebaseUid });
            setSession(null);
            clearSession();
          }
        } else {
          const saved = loadSession();
          if (saved && saved.firebaseUid) {
            console.log('AuthContext.onAuthChange: user null (transient), preserving session', { savedUid: saved.firebaseUid });
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time subscription to user's workspaces/memberships when authenticated
  useEffect(() => {
    if (!session) {
      setWorkspaces([]);
      return;
    }
    const uid = session.firebaseUid || session.userId;
    const unsubscribe = subscribeUserWorkspaces(uid, (list) => {
      setWorkspaces(list);
    });
    return () => unsubscribe();
  }, [session]);

  const login = useCallback(async (email, pin) => {
    setIsLoading(true);
    setError(null);
    clearError();
    try {
      const result = await verifyPin(email, pin);
      if (result.success) {
        if (result.requiresSelection) {
          setPendingWorkspaces(result.workspaces);
          setPendingAuthData({ type: 'pin', email, pin, uid: result.uid });
          return { success: true, requiresSelection: true, workspaces: result.workspaces };
        } else {
          const sessionData = await createSession(result.user);
          setSession(sessionData);
          saveSession(sessionData);
          setError(null);
          return { success: true };
        }
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

  const ensureFirebaseUserWithRetry = async (firebaseUser, maxRetries = 2) => {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await ensureFirebaseUser(firebaseUser);
      } catch (e) {
        const isAuthDenied = (e.code === 'PERMISSION_DENIED' || e.code === 'permission-denied' || e.code === 'permission_denied' || (e.message && e.message.includes('Permission denied')));
        if (i < maxRetries && isAuthDenied) {
          console.warn(`ensureFirebaseUser retry ${i + 1}/${maxRetries} — RTDB auth token propagation delay (code: ${e.code})`);
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
        throw e;
      }
    }
  };

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
      // signInWithRedirect redirects the page — onAuthStateChanged will handle it
      if (result.redirected) {
        setIsLoading(false);
        googleLoginInProgress.current = false;
        return { success: true };
      }
      const ensureResult = await ensureFirebaseUserWithRetry(result.firebaseUser);
      if (!ensureResult.success) {
        await fbSignOut();
        setError(ensureResult.error || 'Error al configurar usuario');
        return { success: false };
      }
      if (ensureResult.requiresSelection) {
        setPendingWorkspaces(ensureResult.workspaces);
        setPendingAuthData({ type: 'google', firebaseUser: result.firebaseUser });
        return { success: true, requiresSelection: true, workspaces: ensureResult.workspaces };
      } else {
        const sessionData = await createSession({
          ...ensureResult.user,
          firebaseUid: result.firebaseUser.uid,
        });
        setSession({ ...sessionData, firebaseUid: result.firebaseUser.uid });
        saveSession({ ...sessionData, firebaseUid: result.firebaseUser.uid });
        return { success: true };
      }
    } catch (err) {
      console.error('AuthContext.loginWithGoogle error:', err);
      await fbSignOut();
      setError(err.code ? 'Error de autenticación.' : (err.message || 'Error al iniciar sesión con Google'));
      return { success: false };
    } finally {
      setIsLoading(false);
      googleLoginInProgress.current = false;
    }
  }, []);

  const selectWorkspace = useCallback(async (tenantId) => {
    if (!pendingAuthData) return { success: false, error: 'No hay autenticación pendiente' };
    setIsLoading(true);
    setError(null);
    try {
      if (pendingAuthData.type === 'pin') {
        const result = await verifyPin(pendingAuthData.email, pendingAuthData.pin, tenantId);
        if (result.success && !result.requiresSelection) {
          const sessionData = await createSession(result.user);
          setSession(sessionData);
          saveSession(sessionData);
          setPendingWorkspaces(null);
          setPendingAuthData(null);
          return { success: true };
        }
        setError(result.error || 'Error al seleccionar el espacio de trabajo');
        return { success: false };
      } else if (pendingAuthData.type === 'google') {
        const ensureResult = await ensureFirebaseUser(pendingAuthData.firebaseUser, tenantId);
        if (ensureResult.success && !ensureResult.requiresSelection) {
          const sessionData = await createSession({
            ...ensureResult.user,
            firebaseUid: pendingAuthData.firebaseUser.uid,
          });
          setSession({ ...sessionData, firebaseUid: pendingAuthData.firebaseUser.uid });
          saveSession({ ...sessionData, firebaseUid: pendingAuthData.firebaseUser.uid });
          setPendingWorkspaces(null);
          setPendingAuthData(null);
          return { success: true };
        }
        setError(ensureResult.error || 'Error al seleccionar el espacio de trabajo');
        return { success: false };
      }
      return { success: false, error: 'Método de autenticación no reconocido' };
    } catch (err) {
      console.error('AuthContext.selectWorkspace error:', err);
      setError('Error al seleccionar el espacio de trabajo');
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, [pendingAuthData]);

  const switchWorkspace = useCallback(async (tenantId) => {
    if (!session) return { success: false, error: 'No hay sesión activa' };
    setIsLoading(true);
    setError(null);
    try {
      const result = await switchWorkspaceSession(session, tenantId);
      if (result.success) {
        setSession(result.session);
        saveSession(result.session);
        // Recarga completa para forzar la inicialización limpia de todos los stores y providers
        window.location.href = '/admin';
        return { success: true };
      }
      setError(result.error || 'Error al cambiar de espacio de trabajo');
      return { success: false };
    } catch (err) {
      console.error('AuthContext.switchWorkspace error:', err);
      setError('Error al cambiar de espacio de trabajo');
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const cancelWorkspaceSelection = useCallback(() => {
    setPendingWorkspaces(null);
    setPendingAuthData(null);
    setError(null);
    fbSignOut().catch(console.error);
  }, []);

  const logout = useCallback(async () => {
    userInitiatedLogout.current = true;
    if (session?.token) {
      await deleteSession(session.token);
    }
    await fbSignOut();
    setSession(null);
    setError(null);
    clearSession();
    setPendingWorkspaces(null);
    setPendingAuthData(null);
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
      pendingWorkspaces,
      workspaces,
      login,
      loginWithGoogle,
      selectWorkspace,
      switchWorkspace,
      cancelWorkspaceSelection,
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
