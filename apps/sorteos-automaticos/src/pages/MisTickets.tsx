import { useNavigate } from 'react-router-dom';
import { Ticket, Calendar, ShieldCheck, QrCode, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useEffect, useState, startTransition } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Ticket {
    id: string;
    raffleTitle: string;
    raffleImage?: string;
    status: string;
    number: string;
    drawDate: string;
    purchaseDate: string;
    isWinner?: boolean;
    txHash?: string;
    [key: string]: unknown;
}

export default function MisTickets() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMyTickets = async () => {
        try {
            // Fetch confirmed tickets
            const q = query(
                collection(db, 'tickets'),
                where('userId', '==', user?.uid),
                // orderBy('purchaseDate', 'desc') // Requires index in Firestore, skipping for now
            );

            const querySnapshot = await getDocs(q);
            const myTickets = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                purchaseDate: doc.data().purchaseDate?.toDate().toLocaleDateString() || 'N/A',
                raffleTitle: doc.data().raffleTitle || '',
                status: 'confirmado',
                number: doc.data().number?.toString() || '',
                drawDate: doc.data().drawDate || ''
            } as Ticket));

            // Also fetch pending payments to show as "Pendiente"
            const qPending = query(collection(db, 'payments'), where('userId', '==', user?.uid), where('status', '==', 'pendiente'));
            const pendingSnapshot = await getDocs(qPending);
            const pendingTickets = pendingSnapshot.docs.map(doc => ({
                id: doc.id,
                raffleTitle: doc.data().raffleTitle,
                raffleImage: 'https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9', // Placeholder or fetch raffle image
                status: 'pendiente',
                number: '---',
                drawDate: 'Pendiente',
                purchaseDate: doc.data().timestamp?.toDate().toLocaleDateString() || 'Hoy'
            }));

            // Combine and sort roughly manually
            setTickets([...myTickets, ...pendingTickets]);
        } catch (error) {
            console.error("Error fetching tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            startTransition(() => {
                fetchMyTickets();
            });
        } else {
            startTransition(() => setLoading(false));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '6rem' }}>
                <Loader2 className="animate-spin text-cyan" size={48} />
            </div>
        );
    }

    return (
        <>
            <section className="section" style={{ paddingTop: '4rem', paddingBottom: '2rem', background: 'var(--cm-surface)' }}>
                <div className="container">
                    <Badge className="mb-4">🎫 Mis Participaciones</Badge>
                    <h1 style={{ marginBottom: '1rem' }}>Mis Tickets</h1>
                    <p className="text-secondary" style={{ fontSize: '1.1rem', maxWidth: '600px' }}>
                        Aquí puedes ver todos tus tickets activos y el estado de tus compras.
                    </p>
                </div>
            </section>

            <section className="section" style={{ paddingTop: '2rem' }}>
                <div className="container">
                    {tickets.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                            <Ticket size={48} className="text-secondary" style={{ margin: '0 auto 1.5rem', opacity: 0.5 }} />
                            <h3>Aún no tienes tickets</h3>
                            <p className="text-secondary" style={{ marginBottom: '2rem' }}>¡Participa en uno de nuestros sorteos activos para empezar a ganar!</p>
                            <Button onClick={() => navigate('/sorteos')}>Ver Sorteos</Button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {tickets.map((ticket) => (
                                <div key={ticket.id} className="card" style={{ display: 'flex', gap: '2rem', padding: '1.5rem', flexWrap: 'wrap', border: ticket.isWinner ? '2px solid var(--cm-accent)' : undefined, background: ticket.isWinner ? 'rgba(234, 179, 8, 0.05)' : undefined }}>
                                    {/* Raffle Info */}
                                    <div style={{ display: 'flex', gap: '1.5rem', flex: '1', minWidth: '300px' }}>
                                        <div style={{ width: '120px', height: '120px', borderRadius: '0.75rem', overflow: 'hidden', flexShrink: 0, background: '#222' }}>
                                            {/* Logic to show raffle image if available in ticket data, otherwise placeholder */}
                                            <img
                                                src={ticket.raffleImage || "https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?auto=format&fit=crop&q=80&w=600"}
                                                alt={ticket.raffleTitle}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <h3 style={{ marginBottom: '0.5rem' }}>
                                                    {ticket.raffleTitle}
                                                    {ticket.isWinner && <span style={{ marginLeft: '1rem', color: 'var(--cm-accent)', fontSize: '0.9rem' }}>🏆 ¡TICKET GANADOR!</span>}
                                                </h3>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    background: ticket.status === 'confirmado' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                                                    color: ticket.status === 'confirmado' ? 'var(--cm-success)' : 'var(--cm-accent)'
                                                }}>
                                                    {ticket.status === 'confirmado' ? 'CONFIRMADO' : 'PENDIENTE'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
                                                <div>
                                                    <p className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Ticket #</p>
                                                    <p style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--cm-info)' }}>{ticket.number}</p>
                                                </div>
                                                <div>
                                                    <p className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Fecha Compra</p>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Calendar size={14} className="text-secondary" />
                                                        <p style={{ fontWeight: '500', fontSize: '0.9rem' }}>{ticket.purchaseDate}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            {ticket.txHash && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--cm-text-secondary)', fontSize: '0.8rem' }}>
                                                    <ShieldCheck size={14} className="text-success" />
                                                    <span>Verificado: </span>
                                                    <span style={{ color: 'var(--cm-info)', fontFamily: 'monospace' }}>{ticket.txHash.substring(0, 10)}...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* QR / Actions */}
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '1rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '0.75rem',
                                        minWidth: '150px'
                                    }}>
                                        {ticket.status === 'confirmado' ? (
                                            <>
                                                <div style={{ background: 'white', padding: '8px', borderRadius: '4px', marginBottom: '0.75rem' }}>
                                                    <QRCodeSVG value={`https://solayni.com/verify/${ticket.id}`} size={80} />
                                                </div>
                                                <p style={{ fontSize: '0.7rem', color: 'var(--cm-text-secondary)', textAlign: 'center' }}>
                                                    <QrCode size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                    QR de Validación
                                                </p>
                                            </>
                                        ) : (
                                            <div style={{ textAlign: 'center' }}>
                                                <p className="text-secondary" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Esperando validación...</p>
                                                <Button variant="outline" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }} onClick={fetchMyTickets}>Actualizar</Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Info Section */}
            <section className="section" style={{ background: 'var(--cm-surface)' }}>
                <div className="container" style={{ maxWidth: '800px', textAlign: 'center' }}>
                    <h3>¿Cómo funcionan mis tickets?</h3>
                    <div className="grid grid-3" style={{ gap: '2rem', marginTop: '3rem' }}>
                        <div>
                            <div style={{ color: 'var(--cm-accent)', marginBottom: '1rem' }}><ShieldCheck size={32} style={{ margin: '0 auto' }} /></div>
                            <h4 style={{ marginBottom: '0.5rem' }}>Inmutable</h4>
                            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Cada ticket se registra seguro en la base de datos.</p>
                        </div>
                        <div>
                            <div style={{ color: 'var(--cm-info)', marginBottom: '1rem' }}><QrCode size={32} style={{ margin: '0 auto' }} /></div>
                            <h4 style={{ marginBottom: '0.5rem' }}>Verificable</h4>
                            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Usa tu código QR para ingresar a los eventos en vivo.</p>
                        </div>
                        <div>
                            <div style={{ color: 'var(--cm-success)', marginBottom: '1rem' }}><Ticket size={32} style={{ margin: '0 auto' }} /></div>
                            <h4 style={{ marginBottom: '0.5rem' }}>Fácil</h4>
                            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Recibe notificaciones automáticas si resultas ganador.</p>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

