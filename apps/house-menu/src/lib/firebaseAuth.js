import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@house/db';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
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
    if (err.code === 'auth/popup-closed-by-user') {
      return { success: false, error: 'Inicio de sesión cancelado' };
    }
    if (err.code === 'auth/unauthorized-domain') {
      return { success: false, error: 'Dominio no autorizado. Contacta al administrador.' };
    }
    return { success: false, error: 'Error al iniciar sesión con Google' };
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
