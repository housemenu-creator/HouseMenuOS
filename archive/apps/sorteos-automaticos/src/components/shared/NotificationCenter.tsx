import { useState, useEffect, startTransition } from 'react';
import { Bell, X, Check, Clock, Gift, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserNotifications, markNotificationRead, getUnreadCount, type Notification } from '../../lib/reminders';

export default function NotificationCenter() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            getUnreadCount(user.uid).then(count => {
                startTransition(() => setUnreadCount(count));
            });
        }
    }, [user]);

    const fetchNotifications = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const notifs = await getUserNotifications(user.uid);
            setNotifications(notifs);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpen = () => {
        setIsOpen(true);
        fetchNotifications();
    };

    const handleMarkRead = async (id: string) => {
        await markNotificationRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'winner': return <Gift className="text-gold" size={20} />;
            case 'reminder': return <Clock className="text-cyan" size={20} />;
            case 'payment': return <Check className="text-success" size={20} />;
            default: return <AlertCircle className="text-purple" size={20} />;
        }
    };

    if (!user) return null;

    return (
        <>
            {/* Bell Icon */}
            <button
                onClick={handleOpen}
                style={{
                    position: 'relative',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '0.5rem'
                }}
            >
                <Bell size={22} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        background: 'var(--color-danger)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: '100%',
                    maxWidth: '400px',
                    height: '100vh',
                    background: 'var(--bg-secondary)',
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                    zIndex: 2000,
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.5rem',
                        borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <h3 style={{ margin: 0 }}>Notificaciones</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Notifications List */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                        {loading ? (
                            <p className="text-secondary text-center">Cargando...</p>
                        ) : notifications.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                <Bell size={48} className="text-secondary" style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                <p className="text-secondary">No tienes notificaciones</p>
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    style={{
                                        padding: '1rem',
                                        background: notif.read ? 'transparent' : 'rgba(34, 211, 238, 0.05)',
                                        borderRadius: '0.5rem',
                                        marginBottom: '0.5rem',
                                        border: notif.read ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(34, 211, 238, 0.2)',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => !notif.read && handleMarkRead(notif.id)}
                                >
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                        <div style={{ flexShrink: 0, marginTop: '2px' }}>
                                            {getIcon(notif.type)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>{notif.title}</h4>
                                            <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>{notif.message}</p>
                                            <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
                                                {notif.createdAt?.toLocaleDateString()}
                                            </span>
                                        </div>
                                        {!notif.read && (
                                            <div style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: 'var(--accent-cyan)',
                                                flexShrink: 0
                                            }} />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Overlay */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 1999
                    }}
                />
            )}
        </>
    );
}
