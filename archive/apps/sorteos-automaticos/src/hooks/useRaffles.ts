import { useState, useEffect, startTransition } from 'react';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Raffle } from '../data/types';

export const useRaffles = () => {
    const [raffles, setRaffles] = useState<Raffle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (import.meta.env.VITE_FIREBASE_API_KEY === 'your_firebase_api_key') {
            startTransition(() => {
                setRaffles([{
                    id: "mock1", 
                    title: "MacBook Pro M3", 
                    imageUrl: "https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?auto=format&fit=crop&q=80&w=800", 
                    pricePerTicket: 25, 
                    totalTickets: 100, 
                    soldTickets: 65, 
                    drawDate: "18 de Enero, 2026", 
                    status: "active"
                }]);
                setLoading(false);
            });
            return () => {};
        }

        const q = query(
            collection(db, 'raffles'),
            where('status', '==', 'active'),
            limit(6)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            try {
                const fetchedRaffles: Raffle[] = snapshot.docs.map(doc => {
                    const data = doc.data();
                    let drawDateFormatted = data.drawDate;
                    
                    if (drawDateFormatted && typeof drawDateFormatted.toDate === 'function') {
                        drawDateFormatted = drawDateFormatted.toDate().toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
                    }

                    return {
                        id: doc.id,
                        ...data,
                        drawDate: drawDateFormatted as string
                    } as Raffle;
                });
                startTransition(() => setRaffles(fetchedRaffles));
            } catch (error) {
                console.error('Error processing raffles:', error);
            } finally {
                startTransition(() => setLoading(false));
            }
        }, (error) => {
            console.error('Error fetching raffles snapshot:', error);
            startTransition(() => setLoading(false));
        });

        return () => unsubscribe();
    }, []);

    return { raffles, loading };
};
