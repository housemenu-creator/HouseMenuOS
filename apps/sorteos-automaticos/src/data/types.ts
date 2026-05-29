export interface Raffle {
    id: string;
    title: string;
    imageUrl: string;
    pricePerTicket: number;
    totalTickets: number;
    soldTickets: number;
    drawDate: string;
    status: 'active' | 'completed' | 'cancelled';
    winnerTicketId?: string;
    winnerUserId?: string;
    winnerTicketNumber?: number;
}
