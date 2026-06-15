export default function Footer() {
    return (
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '4rem 0', marginTop: '2rem' }}>
            <div className="container text-center">
                <p className="text-secondary mb-4">
                    &copy; 2026 Solayni. El primer sistema de sorteos con IA y Blockchain del Perú.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', opacity: 0.6 }}>
                    <a href="#">Términos</a>
                    <a href="#">Privacidad</a>
                    <a href="#">Soporte</a>
                </div>
            </div>
        </footer>
    );
}
