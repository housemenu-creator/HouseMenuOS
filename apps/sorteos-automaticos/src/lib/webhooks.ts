/**
 * Webhook Handlers for n8n Integration
 * These endpoints can be called by n8n workflows to trigger actions in Firestore
 */

import { db } from './firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

// Types for webhook payloads
export interface WebhookPayload {
    action: 'notify_winner' | 'add_aynis' | 'send_reminder' | 'backup_request' | 'social_mission';
    userId?: string;
    email?: string;
    raffleId?: string;
    amount?: number;
    message?: string;
    code?: string;
}

/**
 * Process incoming webhook from n8n
 */
export const processWebhook = async (payload: WebhookPayload): Promise<{ success: boolean; message: string }> => {
    console.log('[🔗 Webhook] Processing:', payload.action);

    try {
        switch (payload.action) {
            case 'notify_winner':
                return await handleWinnerNotification(payload);

            case 'add_aynis':
                return await handleAddAynis(payload);

            case 'send_reminder':
                return await handleSendReminder(payload);

            case 'social_mission':
                return await handleSocialMission(payload);

            default:
                return { success: false, message: 'Unknown action' };
        }
    } catch (error) {
        console.error('[❌ Webhook Error]', error);
        return { success: false, message: String(error) };
    }
};

/**
 * Handle winner notification webhook
 */
const handleWinnerNotification = async (payload: WebhookPayload) => {
    if (!payload.userId || !payload.raffleId) {
        return { success: false, message: 'Missing userId or raffleId' };
    }

    await addDoc(collection(db, 'notifications'), {
        type: 'winner',
        userId: payload.userId,
        raffleId: payload.raffleId,
        message: payload.message || '¡Felicidades! Has ganado un sorteo.',
        read: false,
        createdAt: serverTimestamp()
    });

    return { success: true, message: 'Winner notification created' };
};

/**
 * Handle adding Aynis to user account
 */
const handleAddAynis = async (payload: WebhookPayload) => {
    if (!payload.userId || !payload.amount) {
        return { success: false, message: 'Missing userId or amount' };
    }

    const userRef = doc(db, 'users', payload.userId);
    await updateDoc(userRef, {
        aynis: (payload.amount || 0)
    });

    // Log the transaction
    await addDoc(collection(db, 'aynis_transactions'), {
        userId: payload.userId,
        amount: payload.amount,
        type: 'webhook_credit',
        source: 'n8n',
        createdAt: serverTimestamp()
    });

    return { success: true, message: `Added ${payload.amount} Aynis to user` };
};

/**
 * Handle sending reminder notifications
 */
const handleSendReminder = async (payload: WebhookPayload) => {
    if (!payload.raffleId) {
        return { success: false, message: 'Missing raffleId' };
    }

    // Create reminder notification for all users who have pending payments for this raffle
    const paymentsQuery = query(
        collection(db, 'payments'),
        where('raffleId', '==', payload.raffleId),
        where('status', '==', 'pendiente')
    );

    const snapshot = await getDocs(paymentsQuery);
    let count = 0;

    for (const docSnap of snapshot.docs) {
        const payment = docSnap.data();
        await addDoc(collection(db, 'notifications'), {
            type: 'reminder',
            userId: payment.userId,
            message: payload.message || '¡No te olvides de completar tu pago!',
            read: false,
            createdAt: serverTimestamp()
        });
        count++;
    }

    return { success: true, message: `Sent ${count} reminders` };
};

/**
 * Handle social mission completion (from Instagram/TikTok bot)
 */
const handleSocialMission = async (payload: WebhookPayload) => {
    if (!payload.email || !payload.code) {
        return { success: false, message: 'Missing email or code' };
    }

    // Find user by email
    const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', payload.email)
    );

    const snapshot = await getDocs(usersQuery);

    if (snapshot.empty) {
        // User doesn't exist yet - store code for later redemption
        await addDoc(collection(db, 'pending_rewards'), {
            email: payload.email,
            code: payload.code,
            amount: payload.amount || 100,
            createdAt: serverTimestamp(),
            redeemed: false
        });
        return { success: true, message: 'Reward queued for new user' };
    }

    // User exists - add Aynis directly
    const userDoc = snapshot.docs[0];
    await updateDoc(doc(db, 'users', userDoc.id), {
        aynis: (userDoc.data().aynis || 0) + (payload.amount || 100)
    });

    return { success: true, message: 'Aynis added to existing user' };
};

/**
 * Validate webhook secret (for security)
 */
export const validateWebhookSecret = (secret: string): boolean => {
    const expectedSecret = import.meta.env.VITE_WEBHOOK_SECRET || 'solayni_webhook_2026';
    return secret === expectedSecret;
};
