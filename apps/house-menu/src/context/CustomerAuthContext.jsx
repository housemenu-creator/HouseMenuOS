import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { ref, get, set, update, runTransaction } from 'firebase/database';
import { auth, realtimeDB as db } from '@house/db';
import { getPendingReferralCode, clearPendingReferralCode, generateReferralCode } from '../lib/customerService';
import { requestNotificationPermission, registerCustomerFCMToken } from '../lib/firebaseMessaging';

// ── Google provider for customer login (without login_hint, unlike staff) ──
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const CUSTOMERS_PATH = 'customers';

// ── Tier system ──
const TIERS = {
  bronze:  { minSpent: 0,    multiplier: 1,  label: 'Bronze', color: '#CD7F32', emoji: '🥉' },
  silver:  { minSpent: 500,  multiplier: 1.5, label: 'Silver', color: '#C0C0C0', emoji: '🥈' },
  gold:    { minSpent: 2000, multiplier: 2,  label: 'Gold',   color: '#FFD700', emoji: '🥇' },
  platinum:{ minSpent: 5000, multiplier: 3,  label: 'Platinum', color: '#E5E4E2', emoji: '💎' },
};

export function computeTier(totalSpent) {
  const spent = totalSpent || 0;
  if (spent >= 5000) return 'platinum';
  if (spent >= 2000) return 'gold';
  if (spent >= 500) return 'silver';
  return 'bronze';
}

export function getTierInfo(tier) {
  return TIERS[tier] || TIERS.bronze;
}

export function getNextTier(tier) {
  const keys = Object.keys(TIERS);
  const idx = keys.indexOf(tier);
  if (idx >= keys.length - 1) return null;
  return keys[idx + 1];
}

// ── Context ──

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAuthenticated = !!firebaseUser && !!customerProfile;
  const uid = firebaseUser?.uid || null;
  const tier = customerProfile ? computeTier(customerProfile.totalSpent || 0) : 'bronze';
  const points = customerProfile?.points || 0;
  const tierInfo = getTierInfo(tier);
  const nextTier = getNextTier(tier);
  const nextTierInfo = nextTier ? getTierInfo(nextTier) : null;
  const progressToNext = nextTierInfo
    ? Math.min(100, ((customerProfile?.totalSpent || 0) - tierInfo.minSpent) / (nextTierInfo.minSpent - tierInfo.minSpent) * 100)
    : 100;

  // ── Listen to Firebase Auth state (same auth instance as AuthContext) ──
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && !user.isAnonymous) {
        try {
          const snap = await get(ref(db, `${CUSTOMERS_PATH}/${user.uid}`));
          if (snap.exists()) {
            setCustomerProfile({ id: user.uid, ...snap.val() });
          } else if (user.providerData?.length > 0) {
            // Auto-create profile for Google/oauth first-time logins
            const provider = user.providerData[0];
            const pendingRefCode = getPendingReferralCode();
            const WELCOME_BONUS = 100;
            const newProfile = {
              name: user.displayName || provider?.displayName || '',
              email: user.email || provider?.email || '',
              phone: user.phoneNumber || provider?.phoneNumber || '',
              photoURL: user.photoURL || provider?.photoURL || '',
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
              lastOrderAt: null,
              orderCount: 0,
              totalSpent: 0,
              avgTicket: 0,
              referralCode: generateReferralCode(user.uid),
              referredBy: pendingRefCode || null,
              referralsCount: 0,
              referralBonusEarned: 0,
              points: WELCOME_BONUS,
              lifetimePoints: WELCOME_BONUS,
              redeemedPoints: 0,
              welcomeBonusAwarded: true,
              preferences: { push: true, email: true, promos: true },
            };
            await set(ref(db, `${CUSTOMERS_PATH}/${user.uid}`), newProfile);
            // Milestone de bienvenida
            await set(ref(db, `customers/${user.uid}/milestones/welcome`), {
              type: 'welcome_bonus',
              points: WELCOME_BONUS,
              timestamp: Date.now(),
            });
            if (pendingRefCode) {
              await set(ref(db, `referralCodes/${newProfile.referralCode}`), { uid: user.uid, createdAt: Date.now() });
              clearPendingReferralCode();
            }
            setCustomerProfile({ id: user.uid, ...newProfile });
          } else {
            setCustomerProfile(null);
          }
        } catch (err) {
          console.error('CustomerAuth: error loading profile', err);
          setCustomerProfile(null);
        }
      } else {
        setCustomerProfile(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── Register FCM token for push notifications ──
  useEffect(() => {
    if (!firebaseUser?.uid) return;
    let cancelled = false;
    async function initFCM() {
      const token = await requestNotificationPermission();
      if (token && !cancelled) {
        await registerCustomerFCMToken(firebaseUser.uid, token);
      }
    }
    initFCM();
    return () => { cancelled = true; };
  }, [firebaseUser?.uid]);

  // ── Register with email + password ──
  const registerWithEmail = useCallback(async ({ name, email, password, phone }) => {
    setError(null);
    setIsLoading(true);
    try {
      // Check for legacy customer with same email (push-key records) to merge
      const allSnap = await get(ref(db, CUSTOMERS_PATH));
      const all = allSnap.val();
      let legacyId = null;
      if (all) {
        for (const [id, c] of Object.entries(all)) {
          if (c.email && c.email.toLowerCase() === email.toLowerCase()) {
            legacyId = id;
            break;
          }
        }
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = cred.user;

      if (fbUser.displayName !== name) {
        await updateProfile(fbUser, { displayName: name });
      }

      // Merge legacy data if exists
      const pendingRefCode = getPendingReferralCode();
      const legacyData = legacyId ? all[legacyId] : null;
      const isNewCustomer = !legacyData;
      const WELCOME_BONUS = isNewCustomer ? 100 : 0;
      const referralCode = generateReferralCode(fbUser.uid);
      const profile = {
        name,
        email,
        phone: phone || legacyData?.phone || '',
        photoURL: '',
        createdAt: legacyData?.createdAt || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        lastOrderAt: legacyData?.lastOrderAt || null,
        orderCount: legacyData?.orderCount || 0,
        totalSpent: legacyData?.totalSpent || 0,
        avgTicket: legacyData?.totalSpent && legacyData?.orderCount
          ? legacyData.totalSpent / legacyData.orderCount : 0,
        referralCode,
        referredBy: pendingRefCode || null,
        referralsCount: legacyData?.referralsCount || 0,
        referralBonusEarned: legacyData?.referralBonusEarned || 0,
        points: (legacyData?.points || 0) + WELCOME_BONUS,
        lifetimePoints: (legacyData?.points || 0) + WELCOME_BONUS,
        redeemedPoints: 0,
        welcomeBonusAwarded: isNewCustomer,
        preferences: { push: true, email: true, promos: true },
        _migratedFrom: legacyId || null,
      };

      await set(ref(db, `${CUSTOMERS_PATH}/${fbUser.uid}`), profile);
      if (isNewCustomer) {
        await set(ref(db, `customers/${fbUser.uid}/milestones/welcome`), {
          type: 'welcome_bonus',
          points: WELCOME_BONUS,
          timestamp: Date.now(),
        });
      }
      if (pendingRefCode) {
        await set(ref(db, `referralCodes/${referralCode}`), { uid: fbUser.uid, createdAt: Date.now() });
        clearPendingReferralCode();
      }
      setCustomerProfile({ id: fbUser.uid, ...profile });
      return { success: true };
    } catch (err) {
      const msg = friendlyAuthError(err);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Login with email + password ──
  const loginWithEmail = useCallback(async (email, password) => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (err) {
      const msg = friendlyAuthError(err);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Login with Google ──
  const loginWithGoogle = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      return { success: true };
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setError(null);
        return { success: false, error: 'Inicio de sesión cancelado' };
      }
      const msg = friendlyAuthError(err);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Password reset ──
  const resetPassword = useCallback(async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (err) {
      return { success: false, error: friendlyAuthError(err) };
    }
  }, []);

  // ── Logout ──
  const logout = useCallback(async () => {
    await fbSignOut(auth);
    setCustomerProfile(null);
    setFirebaseUser(null);
    setError(null);
  }, []);

  // ── Update profile ──
  const updateProfileData = useCallback(async (data) => {
    if (!uid) return;
    const updates = { ...data };
    await update(ref(db, `${CUSTOMERS_PATH}/${uid}`), updates);
    setCustomerProfile((prev) => prev ? { id: uid, ...prev, ...data } : prev);
  }, [uid]);

  // ── Add points (transactional, called post-order) ──
  const addPoints = useCallback(async (pointsToAdd) => {
    if (!uid || !pointsToAdd) return;
    const pointsRef = ref(db, `${CUSTOMERS_PATH}/${uid}/points`);
    const lifetimeRef = ref(db, `${CUSTOMERS_PATH}/${uid}/lifetimePoints`);
    try {
      await runTransaction(pointsRef, (current) => (current || 0) + pointsToAdd);
      await runTransaction(lifetimeRef, (current) => (current || 0) + pointsToAdd);
      // Refresh profile
      const snap = await get(ref(db, `${CUSTOMERS_PATH}/${uid}`));
      if (snap.exists()) setCustomerProfile({ id: uid, ...snap.val() });
    } catch (e) {
      if (e.code === 'PERMISSION_DENIED') return;
      throw e;
    }
  }, [uid]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <CustomerAuthContext.Provider value={{
      firebaseUser,
      customerProfile,
      uid,
      isAuthenticated,
      isLoading,
      error,
      tier,
      points,
      tierInfo,
      nextTier,
      nextTierInfo,
      progressToNext,
      registerWithEmail,
      loginWithEmail,
      loginWithGoogle,
      resetPassword,
      logout,
      updateProfileData,
      addPoints,
      clearError,
    }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return ctx;
}

function friendlyAuthError(err) {
  switch (err.code) {
    case 'auth/email-already-in-use':
      return 'Este email ya está registrado. Iniciá sesión.';
    case 'auth/invalid-email':
      return 'El email no es válido.';
    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'Email o contraseña incorrectos.';
    case 'auth/wrong-password':
      return 'Contraseña incorrecta.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Esperá unos minutos y volvé a intentar.';
    case 'auth/network-request-failed':
      return 'Error de conexión. Verificá tu internet.';
    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado.';
    case 'auth/popup-blocked':
      return 'El pop-up fue bloqueado. Permití ventanas emergentes.';
    default:
      console.error('Auth error:', err.code, err.message);
      return err.message || 'Error de autenticación.';
  }
}
