import { Wallet, Mail, Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const { user, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    return (
        <section className="section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>
            <div className="container" style={{ maxWidth: '500px' }}>
                <div className="card" style={{ padding: '3rem' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                        {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                    </h2>
                    <p className="text-secondary text-center" style={{ marginBottom: '2rem' }}>
                        {isLogin ? 'Accede a tus tickets y sorteos' : 'Únete a la nueva era de sorteos justos'}
                    </p>

                    {/* Google Login */}
                    <Button
                        variant="primary"
                        onClick={loginWithGoogle}
                        style={{ width: '100%', justifyContent: 'center', marginBottom: '1rem', padding: '1rem' }}
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '20px', marginRight: '10px' }} />
                        Entrar con Google
                    </Button>

                    <Button
                        variant="outline"
                        style={{ width: '100%', justifyContent: 'center', marginBottom: '1rem', padding: '1rem' }}
                    >
                        <Wallet size={20} /> Conectar con Wallet
                    </Button>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        margin: '1.5rem 0',
                        color: 'var(--cm-text-secondary)',
                        fontSize: '0.9rem'
                    }}>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                        <span>o con email</span>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                    </div>

                    {/* Email Form */}
                    <form onSubmit={(e) => e.preventDefault()}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                Email
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail
                                    size={18}
                                    style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--cm-text-secondary)' }}
                                />
                                <input
                                    type="email"
                                    placeholder="tu@email.com"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem 0.75rem 3rem',
                                        background: 'var(--cm-surface)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '0.5rem',
                                        color: 'var(--cm-text)',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                Contraseña
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock
                                    size={18}
                                    style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--cm-text-secondary)' }}
                                />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem 0.75rem 3rem',
                                        background: 'var(--cm-surface)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '0.5rem',
                                        color: 'var(--cm-text)',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                        </div>

                        {isLogin && (
                            <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                                <a href="#" className="text-cyan" style={{ fontSize: '0.9rem' }}>
                                    ¿Olvidaste tu contraseña?
                                </a>
                            </div>
                        )}

                        <Button style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}>
                            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                        </Button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
                        <span className="text-secondary">
                            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                        </span>{' '}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-cyan"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
                        </button>
                    </div>
                </div>

                <p className="text-secondary text-center" style={{ marginTop: '2rem', fontSize: '0.85rem' }}>
                    Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad
                </p>
            </div>
        </section>
    );
}

