/**
 * Notification Service
 * Handles sending notifications to users via external webhooks (Make/n8n).
 */

export type NotificationType = 'payment_approved' | 'payment_rejected' | 'raffle_winner' | 'welcome';

interface NotificationData {
    userId?: string;
    email?: string;
    phone?: string;
    ticketNumber?: number | string;
    raffleTitle?: string;
    [key: string]: unknown;
}

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || 'https://hook.eu1.make.com/PLACEHOLDER';

export const sendNotification = async (type: NotificationType, data: NotificationData) => {
    console.log(`[🔔 Notification Service] Triggering '${type}' for ${data.email || 'user'}`);
    console.log(`[Target] ${WEBHOOK_URL}`);

    try {
        // In a real scenario, uncomment this:
        /*
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type,
                timestamp: new Date().toISOString(),
                ...data
            })
        });
        
        if (!response.ok) throw new Error('Webhook failed');
        */

        // Simulation success
        console.log(`[✅ Notification Service] Successfully sent payload:`, data);
        return true;
    } catch (error) {
        console.error(`[❌ Notification Service] Failed to send notification:`, error);
        return false;
    }
};
