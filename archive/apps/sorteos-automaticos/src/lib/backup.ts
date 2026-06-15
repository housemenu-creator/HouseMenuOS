/**
 * Backup Service
 * Exports Firestore data for backup purposes
 */

import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

export interface BackupData {
    timestamp: string;
    collections: {
        users: Record<string, unknown>[];
        raffles: Record<string, unknown>[];
        tickets: Record<string, unknown>[];
        payments: Record<string, unknown>[];
    };
}

/**
 * Generate full backup of critical collections
 */
export const generateBackup = async (): Promise<BackupData> => {
    const backup: BackupData = {
        timestamp: new Date().toISOString(),
        collections: {
            users: [],
            raffles: [],
            tickets: [],
            payments: []
        }
    };

    // Backup Users (without sensitive data)
    const usersSnap = await getDocs(collection(db, 'users'));
    backup.collections.users = usersSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        // Remove sensitive fields
        password: undefined
    }));

    // Backup Raffles
    const rafflesSnap = await getDocs(collection(db, 'raffles'));
    backup.collections.raffles = rafflesSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
    }));

    // Backup Tickets
    const ticketsSnap = await getDocs(collection(db, 'tickets'));
    backup.collections.tickets = ticketsSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
    }));

    // Backup Payments
    const paymentsSnap = await getDocs(collection(db, 'payments'));
    backup.collections.payments = paymentsSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
    }));

    console.log(`[📦 Backup] Generated backup with:
        - ${backup.collections.users.length} users
        - ${backup.collections.raffles.length} raffles
        - ${backup.collections.tickets.length} tickets
        - ${backup.collections.payments.length} payments
    `);

    return backup;
};

/**
 * Download backup as JSON file
 */
export const downloadBackup = async () => {
    const backup = await generateBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `solayni_backup_${backup.timestamp.split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return backup;
};

/**
 * Get backup stats without downloading
 */
export const getBackupStats = async () => {
    const usersSnap = await getDocs(collection(db, 'users'));
    const rafflesSnap = await getDocs(collection(db, 'raffles'));
    const ticketsSnap = await getDocs(collection(db, 'tickets'));
    const paymentsSnap = await getDocs(collection(db, 'payments'));

    return {
        users: usersSnap.size,
        raffles: rafflesSnap.size,
        tickets: ticketsSnap.size,
        payments: paymentsSnap.size,
        lastCheck: new Date().toISOString()
    };
};
