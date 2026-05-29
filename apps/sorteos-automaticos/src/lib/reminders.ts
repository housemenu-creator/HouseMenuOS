/**
 * Reminders Service
 * Manages scheduled notifications and reminders
 */

import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface Reminder {
    id?: string;
    type: 'raffle_ending' | 'payment_pending' | 'winner_claim' | 'custom';
    userId?: string; // null = broadcast to all
    raffleId?: string;
    title: string;
    message: string;
    scheduledFor: Date;
    sent: boolean;
    createdAt?: Date;
}

export interface Notification {
    id: string;
    type: string;
    userId: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
}

/**
 * Create a scheduled reminder
 */
export const createReminder = async (reminder: Omit<Reminder, 'id' | 'sent' | 'createdAt'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'reminders'), {
        ...reminder,
        scheduledFor: Timestamp.fromDate(reminder.scheduledFor),
        sent: false,
        createdAt: serverTimestamp()
    });

    console.log(`[⏰ Reminder] Created: ${reminder.title}`);
    return docRef.id;
};

/**
 * Get pending reminders that should be sent now
 */
export const getPendingReminders = async (): Promise<Reminder[]> => {
    const now = new Date();
    const q = query(
        collection(db, 'reminders'),
        where('sent', '==', false),
        where('scheduledFor', '<=', Timestamp.fromDate(now))
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        scheduledFor: d.data().scheduledFor?.toDate(),
        createdAt: d.data().createdAt?.toDate()
    })) as Reminder[];
};

/**
 * Mark reminder as sent
 */
export const markReminderSent = async (reminderId: string) => {
    await updateDoc(doc(db, 'reminders', reminderId), {
        sent: true,
        sentAt: serverTimestamp()
    });
};

/**
 * Get user notifications
 */
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate()
    })) as Notification[];
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (notificationId: string) => {
    await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
    });
};

/**
 * Create notification for user
 */
export const createNotification = async (
    userId: string,
    title: string,
    message: string,
    type: string = 'general'
) => {
    await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp()
    });
};

/**
 * Create raffle ending reminder (24h before)
 */
export const createRaffleEndingReminder = async (raffleId: string, raffleTitle: string, drawDate: Date) => {
    const reminderDate = new Date(drawDate);
    reminderDate.setHours(reminderDate.getHours() - 24);

    await createReminder({
        type: 'raffle_ending',
        raffleId,
        title: '⏰ ¡Últimas horas!',
        message: `El sorteo "${raffleTitle}" termina mañana. ¡No te quedes sin participar!`,
        scheduledFor: reminderDate
    });
};

/**
 * Get unread notification count for user
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
};
