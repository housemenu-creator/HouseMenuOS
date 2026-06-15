import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, Shield, Clock, Loader2, X, CheckCircle, Upload } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

interface RaffleDetail {
    id?: string;
    image: string;
    title: string;
    price: string;
    totalTickets: number;
    soldTickets: number;
    drawDate: string;
    description: string;
    status?: string;
    features?: string[];
    rules?: string[];
    winnerTicketNumber?: string;
    [key: string]: unknown;
}

const mockRaffle: RaffleDetail = {
    id: "mock",
    image: "https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?auto=format&fit=crop&q=80&w=800",
    title: "MacBook Pro M3",
    price: "S/ 25.00",
    totalTickets: 100,
    soldTickets: 65,
    drawDate: "18 de Enero, 2026",
    description: "La última MacBook Pro con chip M3, 16GB RAM y 512GB SSD. Incluye adaptador y caja original con garantía de 1 año.",
    features: [
        "Chip Apple M3 con CPU de 8 núcleos",
        "16GB de memoria unificada",
        "512GB de almacenamiento SSD",
        "Pantalla Liquid Retina XDR de 14 pulgadas",
        "Batería de hasta 17 horas"
    ],
    rules: [
        "Cada ticket comprado es único e identificable en la blockchain",
        "El sorteo se realiza automáticamente cuando se venden todos los tickets o llega la fecha límite",
        "El ganador es seleccionado por el Smart Contract de forma aleatoria y verificable",
        "El premio es entregado en Lima Metropolitana sin costo adicional"
    ]
};

export default function SorteoDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [raffle, setRaffle] = useState<RaffleDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [purchaseStep, setPurchaseStep] = useState(1); // 1: form, 2: success
    const [voucherFile, setVoucherFile] = useState<File | null>(null);
    const [operationNumber, setOperationNumber] = useState('');

    const handlePurchase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            navigate('/auth');
            return;
        }
        if (!raffle) return;

        if (!voucherFile) {
            alert("Por favor sube una foto de tu voucher.");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Subir imagen a Firebase Storage
            const storageRef = ref(storage, `vouchers/${user.uid}/${Date.now()}_${voucherFile.name}`);
            const snapshot = await uploadBytes(storageRef, voucherFile);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // 2. Registrar pago en Firestore con la URL de la imagen
            await addDoc(collection(db, 'payments'), {
                userId: user.uid,
                userEmail: user.email,
                raffleId: id,
                raffleTitle: raffle.title,
                amount: raffle.price,
                operationNumber: operationNumber,
                voucherUrl: downloadURL,
                status: 'pendiente',
                timestamp: serverTimestamp()
            });

            setPurchaseStep(2);
        } catch (error) {
            console.error("Error creating purchase:", error);
            alert("Hubo un error al procesar tu solicitud. Por favor intenta de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const fetchRaffle = async () => {
            if (!id) return;
            try {
                // Si el ID es numérico (mock), no intentamos fetch
                if (!isNaN(Number(id))) {
                    setRaffle(mockRaffle);
                    setLoading(false);
                    return;
                }

                const docRef = doc(db, 'raffles', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setRaffle({ id: docSnap.id, ...docSnap.data() } as RaffleDetail);
                } else {
                    setRaffle(mockRaffle);
                }
            } catch (error) {
                console.error("Error fetching raffle:", error);
                setRaffle(mockRaffle);
            } finally {
                setLoading(false);
            }
        };

        fetchRaffle();
    }, [id]);

    if (loading) {
        return (
            <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={40} className="animate-spin text-cyan" />
            </div>
        );
    }

    if (!raffle) return null;

    const percentage = Math.round((raffle.soldTickets / raffle.totalTickets) * 100);

    return (
        <>
            {/* Back Button */}
            <section className="section" style={{ paddingTop: '2rem', paddingBottom: '0' }}>
                <div className="container">
                    <button
                        onClick={() => navigate('/sorteos')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'none',
                            border: 'none',
                            color: 'var(--cm-text-secondary)',
                            cursor: 'pointer',
                            padding: '0.5rem 0',
                            marginBottom: '1rem'
                        }}
                        className="hover:text-cyan"
                    >
                        <ArrowLeft size={20} /> Volver a Sorteos
                    </button>
                </div>
            </section>

            {/* Hero Section */}
            <section className="section" style={{ paddingTop: '2rem' }}>
                <div className="container">
                    <div style={{ display: 'grid', gap: '3rem', gridTemplateColumns: '1fr', maxWidth: '1200px', margin: '0 auto' }}>
                        {/* Image */}
                        <div style={{ position: 'relative', borderRadius: '1rem', overflow: 'hidden', maxHeight: '500px' }}>
                            <img
                                src={raffle.image}
                                alt={raffle.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {percentage >= 90 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '1rem',
                                    right: '1rem',
                                    background: 'var(--cm-error)',
                                    color: 'white',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.5rem',
                                    fontWeight: 'bold'
                                }}>
                                    ¡Últimos Tickets!
                                </div>
                            )}
                        </div>

                        {/* Content Grid */}
                        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                            {/* Info Column */}
                            <div>
                                <Badge className="mb-4" style={{ 
                                    background: raffle.status === 'completed' ? 'rgba(239, 68, 68, 0.1)' : undefined,
                                    color: raffle.status === 'completed' ? 'var(--cm-error)' : undefined 
                                }}>
                                    {raffle.status === 'completed' ? 'Sorteo Finalizado' : 'Sorteo Activo'}
                                </Badge>
                                <h1 style={{ marginBottom: '1rem' }}>{raffle.title}</h1>
                                <p className="text-secondary" style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>
                                    {raffle.description}
                                </p>

                                {/* Stats */}
                                <div className="grid grid-2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
                                    <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                                        <Calendar className="text-gold" size={32} style={{ margin: '0 auto 0.5rem' }} />
                                        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Sorteo</p>
                                        <p style={{ fontWeight: 'bold' }}>{raffle.drawDate}</p>
                                    </div>
                                    <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                                        <Users className="text-cyan" size={32} style={{ margin: '0 auto 0.5rem' }} />
                                        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Participantes</p>
                                        <p style={{ fontWeight: 'bold' }}>{raffle.soldTickets} / {raffle.totalTickets}</p>
                                    </div>
                                </div>

                                {/* Features */}
                                <h3 style={{ marginBottom: '1rem' }}>Características</h3>
                                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem' }}>
                                    {raffle.features?.map((feature: string, index: number) => (
                                        <li key={index} style={{
                                            display: 'flex',
                                            gap: '0.75rem',
                                            marginBottom: '0.75rem',
                                            alignItems: 'flex-start'
                                        }}>
                                            <span className="text-cyan" style={{ marginTop: '0.25rem' }}>✓</span>
                                            <span className="text-secondary">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Purchase Column */}
                            <div>
                                <div className="card" style={{ padding: '2rem', position: 'sticky', top: '2rem' }}>
                                    <div style={{ marginBottom: '2rem' }}>
                                        <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                            Precio por Ticket
                                        </p>
                                        <h2 className="text-gold" style={{ marginBottom: '0' }}>{raffle.price}</h2>
                                    </div>

                                    {/* Progress Bar */}
                                    <div style={{ marginBottom: '2rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                                            <span className="text-secondary">Vendidos</span>
                                            <span className="text-cyan" style={{ fontWeight: 'bold' }}>{percentage}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${percentage}%`,
                                                height: '100%',
                                                background: percentage >= 90 ? 'var(--cm-error)' : 'var(--cm-info)',
                                                transition: 'width 0.3s ease'
                                            }}></div>
                                        </div>
                                        <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                            Quedan {raffle.totalTickets - raffle.soldTickets} tickets disponibles
                                        </p>
                                    </div>

                                    {raffle.status === 'completed' ? (
                                        <div style={{ padding: '1.5rem', background: 'rgba(220, 38, 38, 0.1)', borderRadius: '0.75rem', textAlign: 'center', marginBottom: '2rem', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
                                            <h3 style={{ marginBottom: '0.5rem', color: 'var(--cm-error)' }}>¡Sorteo Finalizado!</h3>
                                            {raffle.winnerTicketNumber && (
                                                <>
                                                    <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Ticket Ganador:</p>
                                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--cm-text)', letterSpacing: '2px' }}>
                                                        #{raffle.winnerTicketNumber}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <Button
                                                onClick={() => setShowModal(true)}
                                                style={{ width: '100%', justifyContent: 'center', padding: '1rem', marginBottom: '1rem' }}
                                            >
                                                Comprar Ticket
                                            </Button>

                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                                                <Shield className="text-success" size={18} />
                                                <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
                                                    Pago seguro con Yape/Plin
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    {/* Trust Indicators */}
                                    <div style={{ padding: '1.5rem', background: 'rgba(34, 211, 238, 0.05)', borderRadius: '0.75rem' }}>
                                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                                            <Clock className="text-cyan" size={20} />
                                            <div>
                                                <p style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                                    Sorteo Automático
                                                </p>
                                                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
                                                    El Smart Contract selecciona al ganador sin intervención humana
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Rules Section */}
            <section className="section" style={{ background: 'var(--cm-surface)' }}>
                <div className="container" style={{ maxWidth: '800px' }}>
                    <h2 style={{ marginBottom: '2rem' }}>Reglas del Sorteo</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {raffle.rules?.map((rule: string, index: number) => (
                            <div key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <span className="text-gold" style={{
                                    fontWeight: 'bold',
                                    fontSize: '1.25rem',
                                    minWidth: '2rem',
                                    textAlign: 'center'
                                }}>
                                    {index + 1}
                                </span>
                                <p className="text-secondary" style={{ fontSize: '1rem' }}>{rule}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Purchase Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2.5rem', position: 'relative' }}>
                        <button
                            onClick={() => setShowModal(false)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--cm-text-secondary)', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </button>

                        {purchaseStep === 1 ? (
                            <>
                                <h2 style={{ marginBottom: '1rem' }}>Confirmar Compra</h2>
                                <p className="text-secondary" style={{ marginBottom: '2rem' }}>
                                    Estás por adquirir un ticket para **{raffle.title}** por **{raffle.price}**.
                                </p>

                                <div style={{ background: 'var(--cm-surface)', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '2rem' }}>
                                    <p style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 'bold' }}>Paga con Yape o Plin al número:</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1.25rem', color: 'var(--cm-info)', fontWeight: 'bold' }}>987 654 321</span>
                                        <Badge>Solayni Oficial</Badge>
                                    </div>
                                </div>

                                <form onSubmit={handlePurchase}>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Número de Operación</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: 123456"
                                            value={operationNumber}
                                            onChange={(e) => setOperationNumber(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem 1rem',
                                                background: 'var(--cm-surface)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '0.5rem',
                                                color: 'var(--cm-text)'
                                            }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '2rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Foto del Voucher</label>
                                        <div style={{
                                            border: '2px dashed rgba(255,255,255,0.1)',
                                            borderRadius: '0.75rem',
                                            padding: '1.5rem',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: voucherFile ? 'rgba(34, 211, 238, 0.05)' : 'transparent',
                                            borderColor: voucherFile ? 'var(--cm-info)' : 'rgba(255,255,255,0.1)'
                                        }}
                                            onClick={() => document.getElementById('voucher-upload')?.click()}
                                        >
                                            <input
                                                type="file"
                                                id="voucher-upload"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setVoucherFile(e.target.files[0]);
                                                    }
                                                }}
                                            />
                                            {voucherFile ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--cm-info)' }}>
                                                    <CheckCircle size={20} />
                                                    <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{voucherFile.name}</span>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--cm-text-secondary)' }}>
                                                    <Upload size={24} />
                                                    <span style={{ fontSize: '0.9rem' }}>Toca para subir imagen</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        style={{ width: '100%', justifyContent: 'center' }}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="animate-spin" size={18} style={{ marginRight: '0.5rem' }} />
                                                Subiendo Voucher...
                                            </>
                                        ) : 'Confirmar Envío de Voucher'}
                                    </Button>
                                </form>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: 'var(--cm-success)', marginBottom: '1.5rem' }}>
                                    <CheckCircle size={64} style={{ margin: '0 auto' }} />
                                </div>
                                <h2 style={{ marginBottom: '1rem' }}>¡Solicitud Enviada!</h2>
                                <p className="text-secondary" style={{ marginBottom: '2rem' }}>
                                    Tu pago está siendo verificado por nuestra IA. Recibirás una notificación por WhatsApp en unos minutos con tu ticket.
                                </p>
                                <Button
                                    style={{ width: '100%', justifyContent: 'center' }}
                                    onClick={() => navigate('/mis-tickets')}
                                >
                                    Ver mis tickets
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}


