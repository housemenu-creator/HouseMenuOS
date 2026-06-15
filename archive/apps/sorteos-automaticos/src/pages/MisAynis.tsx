import { Gift, TrendingUp, Award, Clock } from 'lucide-react';
import { useAynis, LEVELS } from '../context/AynisContext';
import Badge from '../components/ui/Badge';

export default function MisAynis() {
    const { balance, level, transactions } = useAynis();

    const progressToNextLevel = () => {
        const currentIndex = LEVELS.findIndex(l => l.name === level.name);
        if (currentIndex === LEVELS.length - 1) return 100; // Ya está en el nivel máximo

        const nextLevel = LEVELS[currentIndex + 1];
        const progress = ((balance - level.minAynis) / (nextLevel.minAynis - level.minAynis)) * 100;
        return Math.min(progress, 100);
    };

    const aynisNeededForNextLevel = () => {
        const currentIndex = LEVELS.findIndex(l => l.name === level.name);
        if (currentIndex === LEVELS.length - 1) return 0;

        const nextLevel = LEVELS[currentIndex + 1];
        return nextLevel.minAynis - balance;
    };

    return (
        <>
            {/* Hero */}
            <section className="section" style={{ paddingTop: '4rem', paddingBottom: '2rem', background: 'var(--bg-secondary)' }}>
                <div className="container">
                    <Badge className="mb-4">💰 Sistema de Recompensas</Badge>
                    <h1 style={{ marginBottom: '1rem' }}>Mis Aynis</h1>
                    <p className="text-secondary" style={{ fontSize: '1.1rem', maxWidth: '600px' }}>
                        Acumula Aynis y desbloquea beneficios exclusivos en cada compra.
                    </p>
                </div>
            </section>

            {/* Balance Card */}
            <section className="section" style={{ paddingTop: '2rem' }}>
                <div className="container">
                    <div className="grid grid-2" style={{ gap: '2rem', marginBottom: '3rem' }}>
                        {/* Main Balance */}
                        <div className="card" style={{
                            padding: '3rem',
                            background: `linear-gradient(135deg, ${level.color}20 0%, var(--bg-secondary) 100%)`,
                            border: `2px solid ${level.color}40`
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    background: `${level.color}30`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Gift size={32} style={{ color: level.color }} />
                                </div>
                                <div>
                                    <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Balance Total</p>
                                    <h2 style={{ marginBottom: 0, fontSize: '2.5rem' }}>{balance.toLocaleString()} <span style={{ fontSize: '1.5rem', color: level.color }}>Aynis</span></h2>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
                                <Award size={24} style={{ color: level.color }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 'bold' }}>Nivel {level.name}</span>
                                        <span className="text-secondary" style={{ fontSize: '0.9rem' }}>
                                            {level.name === 'Diamante' ? 'Nivel Máximo' : `${aynisNeededForNextLevel()} Aynis para siguiente nivel`}
                                        </span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${progressToNextLevel()}%`,
                                            height: '100%',
                                            background: level.color,
                                            transition: 'width 0.3s ease'
                                        }}></div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '1.5rem' }}>
                                <TrendingUp size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                                Bonus actual: <strong style={{ color: level.color }}>{level.bonus}%</strong> en cada compra
                            </p>
                        </div>

                        {/* Quick Stats */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h4 style={{ marginBottom: '0.5rem' }}>Equivalente en Soles</h4>
                                <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>
                                    S/ {(balance * 0.1).toFixed(2)}
                                </p>
                                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>1 Ayni = S/ 0.10</p>
                            </div>

                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h4 style={{ marginBottom: '0.5rem' }}>Aynis Ganados este Mes</h4>
                                <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                                    {transactions.filter(t => t.type === 'earn').reduce((sum, t) => sum + t.amount, 0)}
                                </p>
                            </div>

                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h4 style={{ marginBottom: '0.5rem' }}>Próximo Hito</h4>
                                <p style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                    {level.name === 'Diamante' ? '¡Ya lo alcanzaste!' : `Nivel ${LEVELS[LEVELS.findIndex(l => l.name === level.name) + 1].name}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Levels Grid */}
                    <div style={{ marginBottom: '3rem' }}>
                        <h3 style={{ marginBottom: '2rem' }}>Niveles de Recompensa</h3>
                        <div className="grid grid-4">
                            {LEVELS.map((lvl) => (
                                <div
                                    key={lvl.name}
                                    className="card"
                                    style={{
                                        padding: '1.5rem',
                                        border: lvl.name === level.name ? `2px solid ${lvl.color}` : '1px solid rgba(255,255,255,0.05)',
                                        opacity: lvl.name === level.name ? 1 : 0.6
                                    }}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: `${lvl.color}30`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '1rem'
                                    }}>
                                        <Award size={24} style={{ color: lvl.color }} />
                                    </div>
                                    <h4 style={{ marginBottom: '0.5rem' }}>{lvl.name}</h4>
                                    <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                                        {lvl.maxAynis === Infinity ? `${lvl.minAynis.toLocaleString()}+ Aynis` : `${lvl.minAynis.toLocaleString()} - ${lvl.maxAynis.toLocaleString()} Aynis`}
                                    </p>
                                    <div style={{
                                        padding: '0.5rem 1rem',
                                        background: `${lvl.color}20`,
                                        borderRadius: '0.5rem',
                                        textAlign: 'center'
                                    }}>
                                        <span style={{ color: lvl.color, fontWeight: 'bold' }}>+{lvl.bonus}%</span>
                                        <span className="text-secondary" style={{ fontSize: '0.85rem' }}> bonus</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div>
                        <h3 style={{ marginBottom: '2rem' }}>Historial de Transacciones</h3>
                        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.9rem' }}>
                                            Descripción
                                        </th>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.9rem' }}>
                                            Tipo
                                        </th>
                                        <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.9rem' }}>
                                            Cantidad
                                        </th>
                                        <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.9rem' }}>
                                            Fecha
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((transaction) => (
                                        <tr key={transaction.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1rem' }}>{transaction.description}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span className={transaction.type === 'earn' ? 'badge' : ''} style={{
                                                    background: transaction.type === 'earn' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                    color: transaction.type === 'earn' ? 'var(--color-success)' : 'var(--color-danger)',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {transaction.type === 'earn' ? 'Ganado' : 'Gastado'}
                                                </span>
                                            </td>
                                            <td style={{
                                                padding: '1rem',
                                                textAlign: 'right',
                                                fontWeight: 'bold',
                                                color: transaction.type === 'earn' ? 'var(--color-success)' : 'var(--color-danger)'
                                            }}>
                                                {transaction.type === 'earn' ? '+' : '-'}{transaction.amount} Aynis
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <Clock size={14} className="text-secondary" />
                                                    <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
                                                        {transaction.date.toLocaleDateString('es-PE')}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
