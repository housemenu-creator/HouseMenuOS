import { Search, Filter, ChevronRight, Loader2 } from 'lucide-react';
import RaffleCard from '../components/shared/RaffleCard';
import Button from '../components/ui/Button';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Raffle {
    id: string;
    image: string;
    title: string;
    price: string;
    totalTickets: number;
    soldTickets: number;
    drawDate: string;
    urgent?: boolean;
}

const mockRaffles: Raffle[] = [
    {
        id: "1",
        image: "https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?auto=format&fit=crop&q=80&w=600",
        title: "MacBook Pro M3",
        price: "S/ 25.00",
        totalTickets: 100,
        soldTickets: 65,
        drawDate: "18 de Enero"
    },
    {
        id: "2",
        image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=600",
        title: "Moto Yamaha R3",
        price: "S/ 50.00",
        totalTickets: 500,
        soldTickets: 120,
        drawDate: "30 de Enero"
    },
    {
        id: "3",
        image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=600",
        title: "Paquete Efectivo S/ 5,000",
        price: "S/ 10.00",
        totalTickets: 200,
        soldTickets: 190,
        drawDate: "Mañana!",
        urgent: true
    }
];

export default function Sorteos() {
    const [searchQuery, setSearchQuery] = useState('');
    const [raffles, setRaffles] = useState<Raffle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRaffles = async () => {
            try {
                const q = query(collection(db, 'raffles'), orderBy('title'));
                const querySnapshot = await getDocs(q);
                const fetchedRaffles: Raffle[] = [];
                querySnapshot.forEach((doc) => {
                    fetchedRaffles.push({ id: doc.id, ...doc.data() } as Raffle);
                });

                if (fetchedRaffles.length > 0) {
                    setRaffles(fetchedRaffles);
                } else {
                    setRaffles(mockRaffles);
                }
            } catch (error) {
                console.error("Error fetching raffles: ", error);
                setRaffles(mockRaffles);
            } finally {
                setLoading(false);
            }
        };

        fetchRaffles();
    }, []);

    return (
        <>
            {/* Hero Section */}
            <section className="section" style={{ paddingTop: '4rem', paddingBottom: '2rem', background: 'var(--bg-secondary)' }}>
                <div className="container">
                    <h1 style={{ marginBottom: '1rem' }}>Todos los Sorteos</h1>
                    <p className="text-secondary" style={{ fontSize: '1.1rem', maxWidth: '600px' }}>
                        Explora todos los sorteos activos. Cada ticket que compras es verificado por IA y asegurado por Blockchain.
                    </p>
                </div>
            </section>

            {/* Filters & Search */}
            <section className="section" style={{ paddingTop: '2rem' }}>
                <div className="container">
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1', minWidth: '300px', position: 'relative' }}>
                            <Search
                                size={20}
                                style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
                            />
                            <input
                                type="text"
                                placeholder="Buscar sorteos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 3rem',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '9999px',
                                    color: 'var(--text-primary)',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                        <Button variant="outline">
                            <Filter size={18} /> Filtros
                        </Button>
                    </div>

                    {/* Raffle Grid */}
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                            <Loader2 size={40} className="animate-spin text-cyan" />
                        </div>
                    ) : (
                        <div className="grid grid-3">
                            {raffles
                                .filter(raffle =>
                                    raffle.title.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map(raffle => (
                                    <RaffleCard key={raffle.id} {...raffle} />
                                ))}
                        </div>
                    )}

                    {/* No Results Message */}
                    {!loading && raffles.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                            <p className="text-secondary" style={{ fontSize: '1.1rem' }}>
                                No encontramos sorteos que coincidan con "{searchQuery}"
                            </p>
                        </div>
                    )}

                    {/* Load More */}
                    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                        <Button variant="outline">
                            Cargar más sorteos <ChevronRight size={18} />
                        </Button>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="section" style={{ background: 'var(--bg-secondary)', textAlign: 'center' }}>
                <div className="container" style={{ maxWidth: '700px' }}>
                    <h2>¿No encuentras lo que buscas?</h2>
                    <p className="text-secondary" style={{ marginTop: '1rem', marginBottom: '2rem' }}>
                        Suscríbete a nuestras notificaciones y entérate cuando lancemos nuevos sorteos premium.
                    </p>
                    <Button>Suscribirme ahora</Button>
                </div>
            </section>
        </>
    );
}
