import { createContext, useContext, useState, type ReactNode } from 'react';

interface AynisTransaction {
    id: string;
    type: 'earn' | 'spend';
    amount: number;
    description: string;
    date: Date;
}

interface UserLevel {
    name: 'Bronce' | 'Plata' | 'Oro' | 'Diamante';
    minAynis: number;
    maxAynis: number;
    bonus: number;
    color: string;
}

interface AynisContextType {
    balance: number;
    level: UserLevel;
    transactions: AynisTransaction[];
    earnAynis: (amount: number, description: string) => void;
    spendAynis: (amount: number, description: string) => boolean;
}

const LEVELS: UserLevel[] = [
    { name: 'Bronce', minAynis: 0, maxAynis: 999, bonus: 5, color: '#cd7f32' },
    { name: 'Plata', minAynis: 1000, maxAynis: 4999, bonus: 10, color: '#c0c0c0' },
    { name: 'Oro', minAynis: 5000, maxAynis: 9999, bonus: 15, color: '#ffd700' },
    { name: 'Diamante', minAynis: 10000, maxAynis: Infinity, bonus: 20, color: '#b9f2ff' },
];

const AynisContext = createContext<AynisContextType | undefined>(undefined);

export function AynisProvider({ children }: { children: ReactNode }) {
    const [balance, setBalance] = useState(100); // 100 Aynis de bienvenida
    const [transactions, setTransactions] = useState<AynisTransaction[]>([
        {
            id: '1',
            type: 'earn',
            amount: 100,
            description: 'Bono de bienvenida',
            date: new Date()
        }
    ]);

    const getCurrentLevel = (currentBalance: number): UserLevel => {
        return LEVELS.find(
            level => currentBalance >= level.minAynis && currentBalance <= level.maxAynis
        ) || LEVELS[0];
    };

    const level = getCurrentLevel(balance);

    const earnAynis = (amount: number, description: string) => {
        const newTransaction: AynisTransaction = {
            id: Date.now().toString(),
            type: 'earn',
            amount,
            description,
            date: new Date()
        };

        setBalance(prev => prev + amount);
        setTransactions(prev => [newTransaction, ...prev]);
    };

    const spendAynis = (amount: number, description: string): boolean => {
        if (balance < amount) return false;

        const newTransaction: AynisTransaction = {
            id: Date.now().toString(),
            type: 'spend',
            amount,
            description,
            date: new Date()
        };

        setBalance(prev => prev - amount);
        setTransactions(prev => [newTransaction, ...prev]);
        return true;
    };

    return (
        <AynisContext.Provider value={{ balance, level, transactions, earnAynis, spendAynis }}>
            {children}
        </AynisContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAynis() {
    const context = useContext(AynisContext);
    if (!context) {
        throw new Error('useAynis must be used within AynisProvider');
    }
    return context;
}

export { LEVELS };
export type { UserLevel, AynisTransaction };
