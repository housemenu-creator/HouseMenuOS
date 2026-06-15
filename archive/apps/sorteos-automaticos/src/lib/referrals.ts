/**
 * Referral System
 * Tracks user referrals and rewards
 */

import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

export interface ReferralData {
    code: string; // Unique referral code (e.g., "USER123")
    referrerId: string;
    referredUsers: string[]; // Array of referred user IDs
    totalRewards: number; // Aynis earned from referrals
    createdAt: Date;
}

/**
 * Generate unique referral code for user
 */
export const generateReferralCode = (userId: string): string => {
    const shortId = userId.substring(0, 8).toUpperCase();
    return `REF${shortId}`;
};

/**
 * Create referral record for new user
 */
export const createReferralRecord = async (userId: string, email: string) => {
    const code = generateReferralCode(userId);

    await setDoc(doc(db, 'referrals', userId), {
        code,
        referrerId: userId,
        referredUsers: [],
        totalRewards: 0,
        createdAt: serverTimestamp(),
        userEmail: email
    });

    return code;
};

/**
 * Track referral when new user signs up with code
 */
export const trackReferral = async (newUserId: string, referralCode: string) => {
    try {
        // Find referrer by code
        const referralsSnapshot = await getDoc(doc(db, 'referrals', referralCode));

        if (!referralsSnapshot.exists()) {
            console.warn('Invalid referral code');
            return false;
        }

        const referrerData = referralsSnapshot.data();
        const referrerId = referrerData.referrerId;

        // Update referrer's record
        await updateDoc(doc(db, 'referrals', referrerId), {
            referredUsers: [...referrerData.referredUsers, newUserId],
            totalRewards: increment(100) // 100 Aynis per referral
        });

        // Update referrer's Aynis balance
        await updateDoc(doc(db, 'users', referrerId), {
            aynis: increment(100)
        });

        console.log(`✅ Referral tracked: ${newUserId} referred by ${referrerId}`);
        return true;
    } catch (error) {
        console.error('Error tracking referral:', error);
        return false;
    }
};

/**
 * Get user's referral stats
 */
export const getReferralStats = async (userId: string) => {
    const refDoc = await getDoc(doc(db, 'referrals', userId));

    if (!refDoc.exists()) {
        return null;
    }

    return refDoc.data() as ReferralData;
};
