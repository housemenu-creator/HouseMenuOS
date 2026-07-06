import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase, goOffline, goOnline } from 'firebase/database';
import { auth, app } from '@house/db';

const googleProvider = new GoogleAuthProvider();
// Always suggest the superadmin account in the Google popup
googleProvider.setCustomParameters({
  login_hint: 'housepys.contacto@gmail.com',
  prompt: 'select_account',
});

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    // Force token refresh and reconnect RTDB to propagate auth token
    return {
      success: true,
      firebaseUser: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
    };
  } catch (err) {
    console.error('Google sign-in error:', err);
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      return { success: false, error: 'Inicio de sesión cancelado' };
    }
    if (err.code === 'auth/popup-blocked') {
      return { success: false, error: 'Pop-up bloqueado por el navegador. Permití ventanas emergentes para este sitio.' };
    }
    if (err.code === 'auth/unauthorized-domain') {
      return { success: false, error: 'Dominio no autorizado. Contacta al administrador.' };
    }
    return { success: false, error: err.message || 'Error al iniciar sesión con Google' };
  }
}

export async function signOut() {
  try {
    await fbSignOut(auth);
  } catch (err) {
    console.error('Firebase sign-out error:', err);
  }
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}
