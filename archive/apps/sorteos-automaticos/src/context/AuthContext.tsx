import { createContext, useContext, useEffect, useState, startTransition, type ReactNode } from 'react';
import {
    onAuthStateChanged,
    type User,
    signOut,
    signInWithPopup,
    GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            // Force loading to false if using dummy keys to prevent eternal white screen
            if (import.meta.env.VITE_FIREBASE_API_KEY === 'your_firebase_api_key') {
                console.warn("Using dummy Firebase keys, bypassing auth loading.");
                startTransition(() => setLoading(false));
                return () => {};
            }

            const unsubscribe = onAuthStateChanged(auth, (user) => {
                setUser(user);
                setLoading(false);
            });
            return unsubscribe;
        } catch {
            console.error("Firebase auth unavailable, skipping auth state observer.");
            startTransition(() => setLoading(false));
        }
    }, []);

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error logging in with Google:", error);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
