import { useState, useEffect, startTransition } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { User, Phone, Save, Share2, Users as UsersIcon } from 'lucide-react';
import { generateReferralCode, getReferralStats, type ReferralData } from '../lib/referrals';

export default function Profile() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [referralData, setReferralData] = useState<ReferralData | null>(null);
    const [formData, setFormData] = useState({
        fullName: user?.displayName || '',
        dni: '',
        phone: '',
        bankAccount: ''
    });

    const fetchProfile = async () => {
        try {
            const docRef = doc(db, 'users', user!.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setFormData(prev => ({
                    ...prev,
                    dni: data.dni || '',
                    phone: data.phone || '',
                    bankAccount: data.bankAccount || ''
                }));
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            startTransition(() => setLoading(false));
        }
    };

    useEffect(() => {
        if (user) startTransition(() => { fetchProfile(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const fetchReferralData = async () => {
        try {
            const stats = await getReferralStats(user!.uid);
            if (!stats) {
                const code = generateReferralCode(user!.uid);
                setReferralData({
                    code,
                    referrerId: user!.uid,
                    referredUsers: [],
                    totalRewards: 0,
                    createdAt: new Date()
                });
            } else {
                setReferralData(stats);
            }
        } catch (error) {
            console.error('Error fetching referral data:', error);
        }
    };

    useEffect(() => {
        if (user) startTransition(() => { fetchReferralData(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await setDoc(doc(db, 'users', user!.uid), {
                dni: formData.dni,
                phone: formData.phone,
                bankAccount: formData.bankAccount,
                updatedAt: new Date()
            }, { merge: true });
            alert('¡Perfil actualizado correctamente!');
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Error al guardar perfil");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <section className="section" style={{ paddingTop: '6rem' }}>
            <div className="container" style={{ maxWidth: '600px' }}>
                <Badge className="mb-4">👤 Mi Perfil</Badge>
                <h2>Datos Personales</h2>
                <p className="text-secondary mb-4">Información necesaria para cobrar premios.</p>

                <div className="card" style={{ padding: '2rem' }}>
                    <form onSubmit={handleSave}>
                        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            <img
                                src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`}
                                alt="Profile"
                                style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--cm-info)' }}
                            />
                            <h3 style={{ marginTop: '1rem' }}>{user?.displayName}</h3>
                            <p className="text-secondary">{user?.email}</p>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--cm-text-secondary)' }}>
                                <User size={16} style={{ display: 'inline', marginRight: '5px' }} /> DNI / Cédula
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.dni}
                                onChange={e => setFormData({ ...formData, dni: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--cm-bg)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                placeholder="12345678"
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--cm-text-secondary)' }}>
                                <Phone size={16} style={{ display: 'inline', marginRight: '5px' }} /> Teléfono (Yape/Plin)
                            </label>
                            <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--cm-bg)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                placeholder="999 999 999"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={saving}
                            style={{ width: '100%', marginTop: '1rem' }}
                        >
                            {saving ? 'Guardando...' : <><Save size={18} style={{ marginRight: '8px' }} /> Guardar Cambios</>}
                        </Button>
                    </form>
                </div>

                {/* Social Missions Section */}
                <div className="card" style={{ padding: '2rem', marginTop: '2rem', border: '1px solid var(--cm-accent)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <h3 className="text-purple">Misiones Sociales</h3>
                        <p className="text-secondary">Canjea códigos de Instagram/TikTok para ganar Aynis extra.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Ingresa tu código secreto..."
                            id="secretCodeInput"
                            style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--cm-bg)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        />
                        <Button onClick={() => {
                            const input = document.getElementById('secretCodeInput') as HTMLInputElement;
                            if (input.value.toUpperCase() === 'SORTEO2026') {
                                alert('🎉 ¡Código Canjeado! Has ganado 500 Aynis.');
                                input.value = '';
                                // In real app: call backend to update balance
                            } else {
                                alert('❌ Código inválido o expirado.');
                            }
                        }}>
                            Canjear
                        </Button>
                    </div>
                </div>

                {/* Referral Program Section */}
                {referralData && (
                    <div className="card" style={{ padding: '2rem', marginTop: '2rem', border: '1px solid var(--cm-info)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <UsersIcon size={40} className="text-cyan" style={{ margin: '0 auto 1rem' }} />
                            <h3 className="text-cyan">Programa de Referidos</h3>
                            <p className="text-secondary">Invita amigos y gana 100 Aynis por cada uno que se una.</p>
                        </div>

                        <div style={{ background: 'var(--cm-bg)', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--cm-text-secondary)' }}>
                                Tu código de referido:
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    readOnly
                                    value={`${window.location.origin}/auth?ref=${referralData.code}`}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(34, 211, 238, 0.3)', color: 'var(--cm-info)', fontFamily: 'monospace', fontSize: '0.9rem' }}
                                />
                                <Button onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${referralData.code}`);
                                    alert('✅ Link copiado al portapapeles');
                                }}>
                                    <Share2 size={18} />
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-3" style={{ gap: '1rem', textAlign: 'center' }}>
                            <div>
                                <h4 className="text-cyan" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
                                    {referralData.referredUsers.length}
                                </h4>
                                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Amigos Invitados</p>
                            </div>
                            <div>
                                <h4 className="text-gold" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
                                    {referralData.totalRewards}
                                </h4>
                                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Aynis Ganados</p>
                            </div>
                            <div>
                                <h4 className="text-purple" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
                                    {referralData.referredUsers.length * 100}
                                </h4>
                                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Valor Total</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

