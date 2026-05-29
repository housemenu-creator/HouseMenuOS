import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useState } from 'react';

export default function Verify() {
    const [uploading, setUploading] = useState(false);
    const [verified, setVerified] = useState<boolean | null>(null);

    const handleFileUpload = () => {
        setUploading(true);
        // Simulación de verificación por IA
        setTimeout(() => {
            setUploading(false);
            setVerified(true);
        }, 2000);
    };

    return (
        <>
            {/* Hero */}
            <section className="section text-center" style={{ paddingTop: '4rem', paddingBottom: '2rem' }}>
                <div className="container" style={{ maxWidth: '800px' }}>
                    <Badge className="mb-4">🤖 Verificación con IA</Badge>
                    <h1 style={{ marginBottom: '1rem' }}>Verifica tu Pago al Instante</h1>
                    <p className="text-secondary" style={{ fontSize: '1.1rem' }}>
                        Nuestra Inteligencia Artificial lee tu voucher de Yape o Plin y valida tu ticket en segundos.
                        Sin esperas, sin errores humanos.
                    </p>
                </div>
            </section>

            {/* Upload Section */}
            <section className="section">
                <div className="container" style={{ maxWidth: '600px' }}>
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        {!verified && !uploading && (
                            <>
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    margin: '0 auto 2rem',
                                    borderRadius: '50%',
                                    background: 'rgba(34, 211, 238, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Upload size={48} className="text-cyan" />
                                </div>
                                <h3 style={{ marginBottom: '1rem' }}>Sube tu Captura de Pantalla</h3>
                                <p className="text-secondary" style={{ marginBottom: '2rem' }}>
                                    Arrastra y suelta la imagen de tu voucher de Yape/Plin aquí, o haz clic para seleccionar.
                                </p>
                                <Button onClick={handleFileUpload}>
                                    Seleccionar Archivo
                                </Button>
                                <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '1rem' }}>
                                    Formatos aceptados: JPG, PNG, HEIC
                                </p>
                            </>
                        )}

                        {uploading && (
                            <div>
                                <Loader size={64} className="text-cyan" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 2rem' }} />
                                <h3>Analizando tu voucher...</h3>
                                <p className="text-secondary">Nuestra IA está leyendo los datos del pago.</p>
                            </div>
                        )}

                        {verified === true && (
                            <>
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    margin: '0 auto 2rem',
                                    borderRadius: '50%',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <CheckCircle size={48} className="text-success" />
                                </div>
                                <h3 style={{ marginBottom: '1rem', color: 'var(--cm-success)' }}>¡Pago Verificado!</h3>
                                <div style={{ background: 'var(--cm-bg)', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '2rem', textAlign: 'left' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <span className="text-secondary">Monto:</span>
                                        <span className="text-gold" style={{ fontWeight: 'bold' }}>S/ 25.00</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <span className="text-secondary">Sorteo:</span>
                                        <span>MacBook Pro M3</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span className="text-secondary">Tu Ticket:</span>
                                        <span className="text-cyan" style={{ fontWeight: 'bold' }}>#00065</span>
                                    </div>
                                </div>
                                <Button>Ver Mi Ticket</Button>
                            </>
                        )}

                        {verified === false && (
                            <>
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    margin: '0 auto 2rem',
                                    borderRadius: '50%',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <AlertCircle size={48} className="text-danger" />
                                </div>
                                <h3 style={{ marginBottom: '1rem', color: 'var(--cm-error)' }}>No pudimos verificar el pago</h3>
                                <p className="text-secondary" style={{ marginBottom: '2rem' }}>
                                    Por favor verifica que la captura sea clara y contenga todos los datos del voucher.
                                </p>
                                <Button onClick={() => setVerified(null)}>Intentar de nuevo</Button>
                            </>
                        )}
                    </div>

                    {/* Info Cards */}
                    <div className="grid grid-2" style={{ marginTop: '3rem', gap: '1.5rem' }}>
                        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem' }}>
                            <h4 style={{ marginBottom: '0.5rem' }}>🔒 100% Seguro</h4>
                            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
                                Tu imagen se procesa localmente y se elimina después de la verificación.
                            </p>
                        </div>
                        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem' }}>
                            <h4 style={{ marginBottom: '0.5rem' }}>⚡ Instantáneo</h4>
                            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
                                La IA procesa tu voucher en menos de 3 segundos.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </>
    );
}

