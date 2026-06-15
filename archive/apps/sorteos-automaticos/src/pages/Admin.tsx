import { BarChart3, Plus, Users, Ticket, DollarSign, TrendingUp, CheckCircle, XCircle, ExternalLink, Loader2, Pencil, Trash2, Trophy, Sparkles, Download, Database, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import Button from '../components/ui/Button';
import { useState, useEffect, startTransition } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

// Admin email - change this to your email!
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@solayni.com';

interface AdminRaffle {
    id: string;
    title: string;
    description?: string;
    price: string;
    totalTickets: number;
    soldTickets: number;
    drawDate: string;
    image: string;
    status: string;
    winnerTicketNumber?: string;
    [key: string]: unknown;
}

interface Payment {
    id: string;
    raffleId: string;
    raffleTitle: string;
    userId: string;
    userEmail?: string;
    amount: string;
    operationNumber?: string;
    voucherUrl?: string;
    status: string;
    [key: string]: unknown;
}

export default function Admin() {
    const { user, loading: authLoading } = useAuth();
    const isAdmin = user?.email === ADMIN_EMAIL;

    const [loading, setLoading] = useState(true);
    const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [raffles, setRaffles] = useState<AdminRaffle[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        totalTickets: '',
        drawDate: '',
        image: null as File | null
    });

    const stats = [
        { label: 'Tickets Vendidos Hoy', value: '247', icon: <Ticket className="text-cyan" />, change: '+12%' },
        { label: 'Ingresos del Mes', value: 'S/ 15,430', icon: <DollarSign className="text-gold" />, change: '+8%' },
        { label: 'Usuarios Activos', value: '1,293', icon: <Users className="text-purple" />, change: '+24%' },
        { label: 'Sorteos Activos', value: '6', icon: <BarChart3 className="text-cyan" />, change: '0%' },
    ];

    const fetchRaffles = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'raffles'));
            const rafflesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AdminRaffle));
            setRaffles(rafflesData);
        } catch (error) {
            console.error("Error fetching raffles:", error);
        }
    };

    const fetchPendingPayments = async () => {
        try {
            const q = query(collection(db, 'payments'), where('status', '==', 'pendiente'));
            const querySnapshot = await getDocs(q);
            const payments = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Payment));
            setPendingPayments(payments);
        } catch (error) {
            console.error("Error fetching payments:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        startTransition(() => {
            fetchPendingPayments();
            fetchRaffles();
        });
    }, []);

    const handleSaveRaffle = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);

        try {
            let imageUrl = "https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9"; // Default

            // If editing and no new image, keep old image
            if (editingId && !formData.image) {
                const currentRaffle = raffles.find(r => r.id === editingId);
                if (currentRaffle) imageUrl = currentRaffle.image;
            }

            // 1. Upload Image if present
            if (formData.image) {
                try {
                    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                    const { storage } = await import('../lib/firebase');
                    const storageRef = ref(storage, `raffles/${Date.now()}_${formData.image.name}`);
                    const snapshot = await uploadBytes(storageRef, formData.image);
                    imageUrl = await getDownloadURL(snapshot.ref);
                } catch (imageError) {
                    console.error("Image upload failed (likely CORS), using default image:", imageError);
                    // Fallback to default image is already set in imageUrl variable
                }
            }

            // 2. Save (Create or Update)
            if (editingId) {
                await updateDoc(doc(db, 'raffles', editingId), {
                    title: formData.title,
                    description: formData.description,
                    price: `S/ ${formData.price}`,
                    totalTickets: Number(formData.totalTickets),
                    drawDate: formData.drawDate,
                    image: imageUrl,
                });
                alert('¡Sorteo actualizado exitosamente!');
            } else {
                await addDoc(collection(db, 'raffles'), {
                    title: formData.title,
                    description: formData.description,
                    price: `S/ ${formData.price}`,
                    totalTickets: Number(formData.totalTickets),
                    soldTickets: 0,
                    drawDate: formData.drawDate,
                    image: imageUrl,
                    status: 'Activo',
                    createdAt: serverTimestamp(),
                    features: ['Sorteo verificado', 'Entrega gratuita', 'Garantía incluida'],
                    rules: ['Regla 1: Ticket intransferible', 'Regla 2: Sorteo automático']
                });
                alert('¡Sorteo creado exitosamente!');
            }

            setShowCreateModal(false);
            setEditingId(null);
            setFormData({
                title: '',
                description: '',
                price: '',
                totalTickets: '',
                drawDate: '',
                image: null
            });
            fetchRaffles();
        } catch (error) {
            console.error("Error saving raffle:", error);
            alert("Error al guardar el sorteo");
        } finally {
            setCreating(false);
        }
    };

    const handleEdit = (raffle: AdminRaffle) => {
        setEditingId(raffle.id);
        setFormData({
            title: raffle.title,
            description: raffle.description || '',
            price: raffle.price.replace('S/ ', ''),
            totalTickets: raffle.totalTickets.toString(),
            drawDate: raffle.drawDate,
            image: null
        });
        setShowCreateModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este sorteo? Esta acción no se puede deshacer.')) return;
        try {
            await deleteDoc(doc(db, 'raffles', id));
            fetchRaffles();
        } catch (error) {
            console.error("Error deleting raffle:", error);
            alert("Error al eliminar");
        }
    };

    const handleExecuteRaffle = async (raffle: AdminRaffle) => {
        if (!confirm(`¿Estás seguro de finalizar el sorteo "${raffle.title}" y elegir un ganador?`)) return;

        setProcessingId(raffle.id);
        try {
            // 1. Get all tickets for this raffle
            const ticketsQuery = query(collection(db, 'tickets'), where('raffleId', '==', raffle.id));
            const snapshot = await getDocs(ticketsQuery);

            if (snapshot.empty) {
                alert('No hay tickets vendidos para este sorteo. No se puede elegir ganador.');
                return;
            }

            const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 2. Pick a random winner
            const randomIndex = Math.floor(Math.random() * tickets.length); // eslint-disable-line react-hooks/purity
            const winningTicket = tickets[randomIndex] as { id: string; userId: string; number: string };

            // 3. Update Raffle with Winner
            await updateDoc(doc(db, 'raffles', raffle.id), {
                status: 'Finalizado',
                winnerTicketId: winningTicket.id,
                winnerUserId: winningTicket.userId,
                winnerTicketNumber: winningTicket.number,
                completedAt: serverTimestamp()
            });

            // 4. Send Notification
            const { sendNotification } = await import('../lib/notifications');
            await sendNotification('raffle_winner', {
                userId: winningTicket.userId,
                ticketNumber: winningTicket.number,
                raffleTitle: raffle.title
            });

            alert(`¡Sorteo finalizado!\nGanador Ticket #${winningTicket.number}\nUsuario ID: ${winningTicket.userId}`);
            fetchRaffles();
        } catch (error) {
            console.error("Error executing raffle:", error);
            alert("Error al ejecutar el sorteo");
        } finally {
            setProcessingId(null);
        }
    };

    const openCreateModal = () => {
        setEditingId(null);
        setFormData({
            title: '',
            description: '',
            price: '',
            totalTickets: '',
            drawDate: '',
            image: null
        });
        setShowCreateModal(true);
    };

    const handleApprove = async (payment: Payment) => {
        setProcessingId(payment.id);
        try {
            const { runTransaction } = await import('firebase/firestore');

            await runTransaction(db, async (transaction) => {
                // 1. Read Raffle to check stock (Concurrency Safe)
                const raffleRef = doc(db, 'raffles', payment.raffleId);
                const raffleDoc = await transaction.get(raffleRef);

                if (!raffleDoc.exists()) {
                    throw "El sorteo no existe.";
                }

                const raffleData = raffleDoc.data();
                if (raffleData.soldTickets >= raffleData.totalTickets) {
                    throw "¡Sorteo Agotado! No se puede aprobar más tickets.";
                }

                // 2. Prepare Ticket Data
                const ticketNumber = Math.floor(1000 + Math.random() * 9000);
                const ticketRef = doc(collection(db, 'tickets')); // Auto-ID

                // 3. Writes (Must come after all reads)

                // Increment sold tickets
                transaction.update(raffleRef, {
                    soldTickets: raffleData.soldTickets + 1
                });

                // Update payment status
                const paymentRef = doc(db, 'payments', payment.id);
                transaction.update(paymentRef, {
                    status: 'aprobado',
                    processedAt: serverTimestamp()
                });

                // Create Ticket
                transaction.set(ticketRef, {
                    raffleId: payment.raffleId,
                    raffleTitle: payment.raffleTitle,
                    userId: payment.userId,
                    paymentId: payment.id,
                    number: ticketNumber,
                    purchaseDate: serverTimestamp(),
                    status: 'confirmado',
                    txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
                });

                // Store data for notification outside checking
                return {
                    ticketNumber,
                    email: payment.userEmail,
                    userId: payment.userId,
                    raffleTitle: payment.raffleTitle
                };
            }).then(async (data) => {
                if (!data) return; // Should not happen

                // 4. Send Notification (Side effect outside transaction)
                const { sendNotification } = await import('../lib/notifications');
                await sendNotification('payment_approved', {
                    email: data.email,
                    userId: data.userId,
                    raffleTitle: data.raffleTitle,
                    ticketNumber: data.ticketNumber
                });

                alert(`¡Pago aprobado! Ticket #${data.ticketNumber} generado de forma segura.`);
                fetchPendingPayments();
                fetchRaffles(); // Refresh stats
            });

        } catch (error) {
            console.error("Error approving payment:", error);
            alert(typeof error === 'string' ? error : "Error al aprobar el pago (posiblemente stock agotado).");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (paymentId: string): Promise<void> => {
        if (!confirm('¿Estás seguro de rechazar este pago?')) return;

        setProcessingId(paymentId);
        try {
            await updateDoc(doc(db, 'payments', paymentId), {
                status: 'rechazado',
                processedAt: serverTimestamp()
            });
            fetchPendingPayments();
        } catch (error) {
            console.error("Error rejecting payment:", error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleVerifyAI = async (payment: Payment) => {
        setProcessingId(payment.id);
        try {
            const { verifyVoucher } = await import('../lib/verifyVoucher');
            // Use placeholder image if voucherUrl is missing (for dev)
            const result = await verifyVoucher(payment.voucherUrl || 'placeholder', payment.amount);

            if (result.isValid) {
                const confirmed = confirm(
                    `🤖 IA Verificación Exitosa (Confianza: ${(result.confidence * 100).toFixed(0)}%)\n\n` +
                    `Datos Extraídos:\n` +
                    `- Monto: ${result.extractedData?.amount}\n` +
                    `- Operación: ${result.extractedData?.operationNumber}\n\n` +
                    `¿Deseas APROBAR este pago inmediatamente?`
                );

                if (confirmed) {
                    await handleApprove(payment);
                }
            } else {
                alert(`⚠️ La IA no pudo verificar el voucher.\nError: ${result.error}`);
            }
        } catch (error) {
            console.error("AI Error:", error);
            alert("Error en servicio de IA");
        } finally {
            setProcessingId(null);
        }
    };

    // Debug function removed

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 className="animate-spin text-cyan" size={48} />
            </div>
        );
    }

    // Access Denied for non-admins
    if (!isAdmin) {
        return (
            <section className="section" style={{ paddingTop: '6rem', textAlign: 'center' }}>
                <div className="container" style={{ maxWidth: '500px' }}>
                    <ShieldAlert size={80} className="text-danger" style={{ margin: '0 auto 2rem', opacity: 0.8 }} />
                    <h1 style={{ marginBottom: '1rem' }}>Acceso Denegado</h1>
                    <p className="text-secondary" style={{ marginBottom: '2rem' }}>
                        No tienes permisos para acceder al panel de administración.
                        {user ? ` (${user.email})` : ' Inicia sesión con una cuenta autorizada.'}
                    </p>
                    <Button onClick={() => window.location.href = '/'}>
                        Volver al Inicio
                    </Button>
                </div>
            </section>
        );
    }

    return (
        <>
            {/* Header */}
            <section className="section" style={{ paddingTop: '4rem', paddingBottom: '2rem', background: 'var(--cm-surface)' }}>
                <div className="container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 style={{ marginBottom: '0.5rem' }}>Panel de Administración</h1>
                            <p className="text-secondary">Gestiona tus sorteos y monitorea el rendimiento</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                                variant="outline"
                                onClick={async () => {
                                    const { downloadBackup } = await import('../lib/backup');
                                    await downloadBackup();
                                    alert('✅ Backup descargado exitosamente');
                                }}
                                title="Descargar Backup"
                            >
                                <Download size={20} />
                            </Button>
                            <Button
                                variant="outline"
                                onClick={async () => {
                                    const { getBackupStats } = await import('../lib/backup');
                                    const stats = await getBackupStats();
                                    alert(`📊 Estado de la Base de Datos:\n\n- Usuarios: ${stats.users}\n- Sorteos: ${stats.raffles}\n- Tickets: ${stats.tickets}\n- Pagos: ${stats.payments}\n\nÚltima revisión: ${stats.lastCheck}`);
                                }}
                                title="Ver Estadísticas DB"
                            >
                                <Database size={20} />
                            </Button>
                            <Button
                                variant="outline"
                                onClick={async () => {
                                    const { exportRaffleMetrics, exportOverallMetrics } = await import('../lib/analytics');
                                    await exportOverallMetrics();
                                    await exportRaffleMetrics();
                                    alert('✅ Métricas exportadas a CSV');
                                }}
                                title="Exportar Métricas"
                            >
                                <FileSpreadsheet size={20} />
                            </Button>
                            <Button onClick={openCreateModal}>
                                <Plus size={20} /> Crear Nuevo Sorteo
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Grid */}
            <section className="section" style={{ paddingTop: '2rem' }}>
                <div className="container">
                    <div className="grid grid-4" style={{ marginBottom: '3rem' }}>
                        {stats.map((stat, index) => (
                            <div key={index} className="card" style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '0.5rem',
                                        background: 'rgba(34, 211, 238, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {stat.icon}
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        color: stat.change.startsWith('+') ? 'var(--cm-success)' : 'var(--cm-text-secondary)',
                                        fontSize: '0.85rem'
                                    }}>
                                        <TrendingUp size={14} />
                                        {stat.change}
                                    </div>
                                </div>
                                <h3 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{stat.value}</h3>
                                <p className="text-secondary" style={{ fontSize: '0.9rem' }}>{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Pending Payments Section */}
                    <div className="card" style={{ padding: '2rem', marginBottom: '3rem', border: '1px solid var(--cm-info)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    background: 'rgba(251, 191, 36, 0.1)',
                                    padding: '0.5rem',
                                    borderRadius: '50%',
                                    color: 'var(--cm-accent)'
                                }}>
                                    <DollarSign size={20} />
                                </div>
                                <h3 style={{ margin: 0 }}>Verificación de Pagos</h3>
                            </div>
                            <span className="badge" style={{ background: 'var(--cm-bg)' }}>
                                {pendingPayments.length} pendientes
                            </span>
                        </div>

                        {loading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                <Loader2 className="animate-spin text-cyan" />
                            </div>
                        ) : pendingPayments.length === 0 ? (
                            <p className="text-secondary text-center" style={{ padding: '2rem' }}>No hay pagos pendientes de revisión.</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                            <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--cm-text-secondary)' }}>Usuario</th>
                                            <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--cm-text-secondary)' }}>Sorteo</th>
                                            <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--cm-text-secondary)' }}>Monto/Op</th>
                                            <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--cm-text-secondary)' }}>Voucher</th>
                                            <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--cm-text-secondary)' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingPayments.map((payment) => (
                                            <tr key={payment.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: '500' }}>{payment.userEmail}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--cm-text-secondary)' }}>ID: ...{payment.userId.slice(-5)}</div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>{payment.raffleTitle}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ color: 'var(--cm-success)', fontWeight: 'bold' }}>{payment.amount}</div>
                                                    <div style={{ fontSize: '0.85rem' }}>Op: {payment.operationNumber}</div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <a
                                                        href={payment.voucherUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--cm-info)' }}
                                                    >
                                                        <ExternalLink size={16} /> Ver Imagen
                                                    </a>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                        <Button
                                                            variant="outline"
                                                            style={{ padding: '0.5rem', borderColor: 'var(--cm-accent)', color: 'var(--cm-accent)' }}
                                                            onClick={() => handleVerifyAI(payment)}
                                                            disabled={processingId === payment.id}
                                                            title="Verificar con IA"
                                                        >
                                                            {processingId === payment.id ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                                        </Button>
                                                        <Button
                                                            variant="primary"
                                                            style={{ padding: '0.5rem', background: 'var(--cm-success)', border: 'none' }}
                                                            onClick={() => handleApprove(payment)}
                                                            disabled={processingId === payment.id}
                                                        >
                                                            {processingId === payment.id ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            style={{ padding: '0.5rem', borderColor: 'var(--cm-error)', color: 'var(--cm-error)' }}
                                                            onClick={() => handleReject(payment.id)}
                                                            disabled={processingId === payment.id}
                                                        >
                                                            <XCircle size={18} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Real Raffles Table */}
                    <div className="card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3>Mis Sorteos</h3>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--cm-text-secondary)' }}>Sorteo</th>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--cm-text-secondary)' }}>Progreso</th>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--cm-text-secondary)' }}>Estado</th>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--cm-text-secondary)' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {raffles.map((raffle, index) => {
                                        const progress = Math.round((raffle.soldTickets / raffle.totalTickets) * 100) || 0;
                                        return (
                                            <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '1rem', fontWeight: '500' }}>{raffle.title}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--cm-info)' }}></div>
                                                        </div>
                                                        <span className="text-secondary" style={{ fontSize: '0.85rem', minWidth: '80px' }}>
                                                            {raffle.soldTickets}/{raffle.totalTickets}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span className="badge" style={{
                                                        background: raffle.status === 'Activo' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(124, 58, 237, 0.1)',
                                                        color: raffle.status === 'Activo' ? 'var(--cm-success)' : 'var(--cm-accent)',
                                                        border: raffle.status === 'Finalizado' ? '1px solid var(--cm-accent)' : 'none'
                                                    }}>
                                                        {raffle.status}
                                                    </span>
                                                    {raffle.status === 'Finalizado' && (
                                                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--cm-accent)' }}>
                                                            🏆 Ticket #{raffle.winnerTicketNumber}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        {raffle.status === 'Activo' && (
                                                            <Button
                                                                variant="primary"
                                                                style={{ fontSize: '0.85rem', padding: '0.5rem', background: 'var(--cm-accent)', border: 'none', color: 'black' }}
                                                                onClick={() => handleExecuteRaffle(raffle)}
                                                                disabled={processingId === raffle.id}
                                                                title="Ejecutar Sorteo"
                                                            >
                                                                {processingId === raffle.id ? <Loader2 className="animate-spin" size={16} /> : <Trophy size={16} />}
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="outline"
                                                            style={{ fontSize: '0.85rem', padding: '0.5rem', color: 'var(--cm-text)', borderColor: 'rgba(255,255,255,0.2)' }}
                                                            onClick={() => handleEdit(raffle)}
                                                        >
                                                            <Pencil size={16} />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            style={{ fontSize: '0.85rem', padding: '0.5rem', color: 'var(--cm-error)', borderColor: 'var(--cm-error)' }}
                                                            onClick={() => handleDelete(raffle.id)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            {/* Create Raffle Modal */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(5px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '1rem'
                }}>
                    <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>{editingId ? 'Editar Sorteo' : 'Crear Nuevo Sorteo'}</h2>

                        <form onSubmit={handleSaveRaffle}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Título del Producto</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--cm-bg)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'white' }}
                                    placeholder="Ej: PlayStation 5"
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Descripción</label>
                                <textarea
                                    required
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--cm-bg)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'white', minHeight: '100px' }}
                                    placeholder="Detalles del producto..."
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Precio Ticket (S/)</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', background: 'var(--cm-bg)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'white' }}
                                        placeholder="10.00"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Total Tickets</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.totalTickets}
                                        onChange={e => setFormData({ ...formData, totalTickets: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', background: 'var(--cm-bg)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'white' }}
                                        placeholder="100"
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Fecha del Sorteo</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.drawDate}
                                    onChange={e => setFormData({ ...formData, drawDate: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--cm-bg)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'white' }}
                                />
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Imagen del Producto</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => setFormData({ ...formData, image: e.target.files ? e.target.files[0] : null })}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--cm-bg)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'white' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={creating}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={creating}
                                >
                                    {creating ? 'Guardando...' : (editingId ? 'Actualizar Sorteo' : 'Guardar Sorteo')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

