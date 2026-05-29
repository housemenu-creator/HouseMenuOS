import { Ticket, User, ShieldCheck, Gift, LogOut, LayoutGrid } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Button from '../ui/Button';
import { useAynis } from '../../context/AynisContext';
import { useAuth } from '../../context/AuthContext';
import NotificationCenter from './NotificationCenter';

export default function Navbar() {
    const location = useLocation();
    const { balance, level } = useAynis();
    const { user, logout } = useAuth();

    return (
        <nav style={{ padding: '1.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '1.5rem', textDecoration: 'none' }}>
                    <Ticket className="text-cyan" />
                    <span style={{ letterSpacing: '-0.5px' }}>Solayni</span>
                </Link>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <Link
                        to="/sorteos"
                        className={location.pathname === '/sorteos' ? 'text-cyan' : 'text-secondary'}
                        style={{ transition: 'color 0.2s' }}
                    >
                        Sorteos
                    </Link>
                    {user && (
                        <Link
                            to="/mis-tickets"
                            className={location.pathname === '/mis-tickets' ? 'text-cyan' : 'text-secondary'}
                            style={{ transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <LayoutGrid size={18} /> Mis Tickets
                        </Link>
                    )}
                    <Link
                        to="/verificar"
                        className={location.pathname === '/verificar' ? 'text-cyan' : 'text-secondary'}
                        style={{ transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <ShieldCheck size={18} /> Verificar
                    </Link>

                    {/* Aynis Balance */}
                    <Link
                        to="/mis-aynis"
                        className={location.pathname === '/mis-aynis' ? 'text-cyan' : 'text-secondary'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.5rem 1rem',
                            background: `${level.color}20`,
                            borderRadius: '9999px',
                            border: `1px solid ${level.color}40`,
                            transition: 'all 0.2s'
                        }}
                    >
                        <Gift size={18} style={{ color: level.color }} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{level.name}</span>
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{balance.toLocaleString()} Aynis</span>
                        </div>
                    </Link>

                    {/* Admin link - only visible to admin */}
                    {user?.email === (import.meta.env.VITE_ADMIN_EMAIL || 'admin@solayni.com') && (
                        <Link
                            to="/admin"
                            className={location.pathname === '/admin' ? 'text-cyan' : 'text-secondary'}
                            style={{ transition: 'color 0.2s' }}
                        >
                            Admin
                        </Link>
                    )}

                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <img
                                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                                    alt={user.displayName || 'User'}
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--accent-cyan)' }}
                                />
                                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{user.displayName?.split(' ')[0]}</span>
                            </div>
                            <NotificationCenter />
                            <Link to="/perfil" className="text-secondary" style={{ marginRight: '0.5rem', display: 'flex', alignItems: 'center' }} title="Mi Perfil">
                                <User size={18} />
                            </Link>
                            <button
                                onClick={logout}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                title="Cerrar Sesión"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    ) : (
                        <Link to="/auth">
                            <Button variant="outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                                <User size={18} /> Entrar
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}
