import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Helper para sortear ganador y marcar sorteo como finalizado
async function drawWinner(raffleId: string) {
    const raffleRef = db.collection('raffles').doc(raffleId);
    
    return db.runTransaction(async (transaction) => {
        const raffleDoc = await transaction.get(raffleRef);
        if (!raffleDoc.exists) {
            console.log("Raffle does not exist:", raffleId);
            return;
        }

        const raffleData = raffleDoc.data();
        if (raffleData?.status === 'completed') {
            console.log("Raffle already completed:", raffleId);
            return;
        }

        // Obtener todos los tickets de este sorteo
        const ticketsSnapshot = await transaction.get(
            db.collection('tickets').where('raffleId', '==', raffleId)
        );

        if (ticketsSnapshot.empty) {
            console.log("No tickets found for raffle:", raffleId);
            // Si no hay tickets, solo lo marcamos como completado o cancelado
            transaction.update(raffleRef, { status: 'cancelled' });
            return;
        }

        const tickets = ticketsSnapshot.docs;
        const randomIndex = Math.floor(Math.random() * tickets.length);
        const winningTicketDoc = tickets[randomIndex];
        const winningData = winningTicketDoc.data();

        // Actualizar el sorteo
        transaction.update(raffleRef, {
            status: 'completed',
            winnerTicketId: winningTicketDoc.id,
            winnerUserId: winningData.userId,
            winnerTicketNumber: winningData.ticketNumber,
        });

        // Opcional: También podríamos marcar el ticket como ganador
        transaction.update(winningTicketDoc.ref, { isWinner: true });
        
        console.log(`PULLED WINNER FOR RAFFLE: ${raffleId}. Ticket ID: ${winningTicketDoc.id}`);
    });
}

// Trigger: Cuando se crea un nuevo ticket
export const onTicketPurchase = functions.firestore
    .document('tickets/{ticketId}')
    .onCreate(async (snap) => {
        const ticketData = snap.data();
        const raffleId = ticketData.raffleId;

        if (!raffleId) return;

        const raffleRef = db.collection('raffles').doc(raffleId);

        try {
            await db.runTransaction(async (transaction) => {
                const raffleDoc = await transaction.get(raffleRef);
                if (!raffleDoc.exists) return;

                const raffle = raffleDoc.data();
                if (raffle?.status !== 'active') return;

                const currentSold = (raffle?.soldTickets || 0) + 1;
                
                // Si llegamos a la cantidad necesaria de tickets vendidos
                if (currentSold >= raffle?.totalTickets) {
                    // Update current numbers to reflect limit without exceeding
                    transaction.update(raffleRef, { 
                        soldTickets: raffle.totalTickets 
                    });
                } else {
                    transaction.update(raffleRef, { 
                        soldTickets: currentSold 
                    });
                }
            });

            // Re-checamos si ya se llenó para ejecutar el sorteo
            const checkRaffle = await raffleRef.get();
            if (checkRaffle.exists) {
                const updatedRaffle = checkRaffle.data();
                if (updatedRaffle?.soldTickets >= updatedRaffle?.totalTickets && updatedRaffle?.status === 'active') {
                    await drawWinner(raffleId);
                }
            }
        } catch (error) {
            console.error("Transaction error on ticket purchase: ", error);
        }
    });

// ── House Menu: Stock Management ──────────────────────────────────────
export { processOrder, cancelOrder } from './stock';

// ── House Menu: Push Notifications ────────────────────────────────────
export { onOrderStatusChange } from './notifications';

// CRON: Check if any active raffles have expired their drawDate
export const checkRaffleDates = functions.pubsub.schedule('every 1 hours').onRun(async () => {
    const now = new Date().toISOString();
    
    // Find active raffles where drawDate has passed
    const rafflesSnapshot = await db.collection('raffles')
        .where('status', '==', 'active')
        .where('drawDate', '<=', now)
        .get();

    if (rafflesSnapshot.empty) {
        console.log("No expired active raffles found.");
        return null;
    }

    const promises = [];
    for (const doc of rafflesSnapshot.docs) {
        promises.push(drawWinner(doc.id));
    }

    await Promise.all(promises);
    console.log(`Executed date limits for ${promises.length} raffles.`);
    return null;
});
