/**
 * Anonymous Firebase Auth for public customer ordering.
 *
 * Signs in anonymously at app startup so CartDrawer can send
 * a verified ID token with each order request.
 *
 * Usage:
 *   import { initAnonymousAuth, getAnonymousToken } from '../lib/anonymousAuth';
 *   initAnonymousAuth(); // call once at app startup
 *   const token = await getAnonymousToken(); // before fetch
 */
import { signInAnonymously } from 'firebase/auth';
import { auth } from '@house/db';

/** @type {Promise<string | null> | null} */
let tokenPromise = null;
/** @type {number | null} */
let tokenExpiry = null;

const TOKEN_REFRESH_MS = 50 * 60 * 1000; // refresh every 50 min (tokens last 60 min)

/**
 * Init anonymous auth. Safe to call multiple times — only signs in once.
 * Logs a warning if anonymous auth is not enabled in Firebase Console.
 */
export function initAnonymousAuth() {
  if (tokenPromise) return tokenPromise;

  tokenPromise = signInAnonymously(auth)
    .then(async (cred) => {
      const token = await cred.user.getIdToken();
      tokenExpiry = Date.now() + TOKEN_REFRESH_MS;
      console.log('🔑 Anonymous auth: ✅');
      return token;
    })
    .catch((err) => {
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation') {
        console.warn(
          '🔑 Anonymous auth: no habilitado. Actívalo en Firebase Console → Authentication → Sign-in method → Anonymous.'
        );
      } else {
        console.warn('🔑 Anonymous auth falló:', err.message);
      }
      tokenPromise = null; // allow retry on next call
      return null;
    });

  return tokenPromise;
}

/**
 * Get a fresh anonymous ID token. Returns null if anonymous auth
 * is not available or not enabled.
 */
export async function getAnonymousToken() {
  // Init if not already
  if (!tokenPromise) initAnonymousAuth();

  const token = await tokenPromise;
  if (!token) return null;

  // Force refresh if close to expiry
  if (Date.now() > (tokenExpiry || 0)) {
    try {
      const fresh = await auth.currentUser?.getIdToken(true);
      if (fresh) {
        tokenExpiry = Date.now() + TOKEN_REFRESH_MS;
        return fresh;
      }
    } catch {
      // Refresh failed — re-init for next call
    }
    tokenPromise = null;
    tokenExpiry = null;
    return null;
  }

  return token;
}
