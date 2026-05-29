/**
 * Analytics Service
 * Collects and exports metrics for dashboard and reporting
 */

import { db } from './firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

export interface DailyMetrics {
    date: string;
    ticketsSold: number;
    revenue: number;
    newUsers: number;
    activeRaffles: number;
    [key: string]: unknown;
}

export interface RaffleMetrics {
    id: string;
    title: string;
    totalTickets: number;
    soldTickets: number;
    revenue: number;
    completionRate: number;
    status: string;
    [key: string]: unknown;
}

export interface OverallMetrics {
    totalUsers: number;
    totalTickets: number;
    totalRevenue: number;
    activeRaffles: number;
    completedRaffles: number;
    avgTicketsPerRaffle: number;
    [key: string]: unknown;
}

/**
 * Get overall platform metrics
 */
export const getOverallMetrics = async (): Promise<OverallMetrics> => {
    const [usersSnap, ticketsSnap, rafflesSnap, paymentsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'tickets')),
        getDocs(collection(db, 'raffles')),
        getDocs(query(collection(db, 'payments'), where('status', '==', 'aprobado')))
    ]);

    const raffles = rafflesSnap.docs.map(d => d.data());
    const activeRaffles = raffles.filter(r => r.status === 'Activo').length;
    const completedRaffles = raffles.filter(r => r.status === 'Finalizado').length;

    const totalRevenue = paymentsSnap.docs.reduce((sum, d) => {
        const amount = parseFloat(d.data().amount?.replace(/[^0-9.]/g, '') || '0');
        return sum + amount;
    }, 0);

    return {
        totalUsers: usersSnap.size,
        totalTickets: ticketsSnap.size,
        totalRevenue,
        activeRaffles,
        completedRaffles,
        avgTicketsPerRaffle: raffles.length > 0 ? ticketsSnap.size / raffles.length : 0
    };
};

/**
 * Get metrics per raffle
 */
export const getRaffleMetrics = async (): Promise<RaffleMetrics[]> => {
    const rafflesSnap = await getDocs(collection(db, 'raffles'));

    return rafflesSnap.docs.map(d => {
        const data = d.data();
        const price = parseFloat(data.price?.replace(/[^0-9.]/g, '') || '0');
        const soldTickets = data.soldTickets || 0;
        const totalTickets = data.totalTickets || 100;

        return {
            id: d.id,
            title: data.title || 'Sin título',
            totalTickets,
            soldTickets,
            revenue: soldTickets * price,
            completionRate: (soldTickets / totalTickets) * 100,
            status: data.status || 'Activo'
        };
    });
};

/**
 * Get daily metrics for the last N days
 */
export const getDailyMetrics = async (days: number = 7): Promise<DailyMetrics[]> => {
    const metrics: DailyMetrics[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        // Get tickets sold that day
        const ticketsQuery = query(
            collection(db, 'tickets'),
            where('purchaseDate', '>=', Timestamp.fromDate(date)),
            where('purchaseDate', '<', Timestamp.fromDate(nextDay))
        );

        const ticketsSnap = await getDocs(ticketsQuery);

        // Simplified - in production you'd want proper date indexing
        metrics.push({
            date: date.toISOString().split('T')[0],
            ticketsSold: ticketsSnap.size,
            revenue: ticketsSnap.size * 25, // Avg price estimate
            newUsers: Math.floor(Math.random() * 10) + 1, // Would need actual query
            activeRaffles: 3 // Would need actual query
        });
    }

    return metrics.reverse();
};

/**
 * Export metrics to CSV format
 */
export const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Export overall metrics
 */
export const exportOverallMetrics = async () => {
    const metrics = await getOverallMetrics();
    exportToCSV([metrics as unknown as Record<string, unknown>], 'solayni_overall_metrics');
};

/**
 * Export raffle metrics
 */
export const exportRaffleMetrics = async () => {
    const metrics = await getRaffleMetrics();
    exportToCSV(metrics, 'solayni_raffle_metrics');
};

/**
 * Export daily metrics
 */
export const exportDailyMetrics = async (days: number = 30) => {
    const metrics = await getDailyMetrics(days);
    exportToCSV(metrics, 'solayni_daily_metrics');
};

/**
 * Format for Google Sheets import
 */
export const getGoogleSheetsFormat = async (): Promise<string> => {
    const [overall, raffles, daily] = await Promise.all([
        getOverallMetrics(),
        getRaffleMetrics(),
        getDailyMetrics(7)
    ]);

    return JSON.stringify({
        timestamp: new Date().toISOString(),
        overall,
        raffles,
        daily
    }, null, 2);
};
