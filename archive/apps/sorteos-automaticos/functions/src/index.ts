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

// Trigger: Cuando se crea un nuevo ticket (actualiza contadores del sorteo)
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

// Trigger: Cuando el estado de un pago cambia a 'aprobado' (crea el ticket automáticamente)
export const onPaymentApproved = functions.firestore
    .document('payments/{paymentId}')
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data();
        const afterData = change.after.data();
        
        // Solo procesar cuando el estado cambie a 'aprobado'
        if (beforeData.status === 'aprobado' || afterData.status !== 'aprobado') {
            return null;
        }

        // Evitar procesamiento duplicado si ya se creó ticket para este pago
        // (aunque idealmente esto no debería pasar con el trigger de onUpdate)
        if (afterData.ticketCreated === true) {
            return null;
        }

        const { userId, raffleId, amount, voucherUrl, operationNumber } = afterData;
        
        if (!userId || !raffleId) {
            console.error("Missing required fields in payment:", afterData);
            return null;
        }

        try {
            // Verificar que el sorteo exista y esté activo
            const raffleDoc = await db.collection('raffles').doc(raffleId).get();
            if (!raffleDoc.exists) {
                console.error("Raffle not found:", raffleId);
                return null;
            }

            const raffleData = raffleDoc.data();
            if (raffleData?.status !== 'active') {
                console.error("Raffle is not active:", raffleId);
                return null;
            }

            // Generar número de ticket (mismo algoritmo que en Admin.tsx)
            const ticketNumber = Math.floor(1000 + Math.random() * 9000);
            
            // Fecha actual para la compra
            const purchaseDate = new Date().toISOString();
            
            // Crear documento de ticket
            const ticketRef = await db.collection('tickets').add({
                raffleId,
                raffleTitle: raffleData.title || 'Sorteo sin título',
                userId,
                paymentId: context.params.paymentId, // Referencia al pago original
                number: ticketNumber,
                purchaseDate,
                status: 'confirmado', // Ticket confirmado inmediatamente
                // txHash se puede añadir posteriormente si se integra con blockchain
                txHash: `0x${Array(64).fill('0').join('')}` // Hash vacío como placeholder
            });

            // Marcar el pago como teniendo ticket creado (para evitar duplicados)
            await change.after.ref.update({
                ticketCreated: true,
                ticketId: ticketRef.id
            });

            console.log(`Automatically created ticket ${ticketRef.id} for approved payment ${context.params.paymentId}`);
            
            return null;
        } catch (error) {
            console.error("Error creating ticket for approved payment: ", error);
            return null;
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