import { Link } from 'react-router-dom';
import Button from '../ui/Button';

interface RaffleCardProps {
    id?: string;
    image: string;
    title: string;
    price: string;
    totalTickets: number;
    soldTickets: number;
    drawDate: string;
    urgent?: boolean;
}

export default function RaffleCard({
    id = '1',
    image,
    title,
    price,
    totalTickets,
    soldTickets,
    drawDate,
    urgent = false
}: RaffleCardProps) {
    const percentage = Math.round((soldTickets / totalTickets) * 100);

    return (
        <Link to={`/sorteos/${id}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', height: '200px', marginBottom: '1.5rem', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {urgent && (
                        <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--color-danger)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            ¡Últimos Tickets!
                        </div>
                    )}
                </div>
                <h3 style={{ fontSize: '1.25rem' }}>{title}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                    <span className="text-gold" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                        {price} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>/ ticket</span>
                    </span>
                    <span className="text-secondary" style={{ fontSize: '0.9rem' }}>Juega el: {drawDate}</span>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                        <span>Vendidos: {soldTickets}/{totalTickets}</span>
                        <span>{percentage}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: urgent ? 'var(--color-danger)' : 'var(--accent-cyan)' }}></div>
                    </div>
                </div>

                <Button style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}>
                    Comprar Ticket
                </Button>
            </div>
        </Link>
    );
}
