import { GameProvider, useGame } from './GameContext';
import { GameCard, GAME_MASTER_PHRASES } from './data/level1.content';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, User, RefreshCw, X, Unlock } from 'lucide-react';
import './index.css';

// --- Components ---

const Lobby = () => {
    const { setMode, setPhase } = useGame();

    return (
        <div className="premium-container" style={{ textAlign: 'center' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
            >
                <h1 style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>26Play</h1>
                <p style={{ fontSize: '1.2rem', marginBottom: '3rem', color: 'var(--cm-accent)' }}>
                    Experiencias Guiadas
                </p>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    <button className="btn-primary" onClick={() => { setMode('COUPLE'); setPhase('SETUP'); }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <User size={20} /> Pareja
                        </span>
                    </button>

                    <button className="btn-primary"
                        style={{ filter: 'grayscale(1)', opacity: 0.7 }}
                        onClick={() => { setMode('GROUP'); setPhase('SETUP'); }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <Users size={20} /> Grupo (Beta)
                        </span>
                    </button>
                </div>

                <p style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.5 }}>
                    Nivel 1: Conexión
                </p>
            </motion.div>
        </div>
    );
};

const GameCardDisplay = ({ card }: { card: GameCard }) => {
    return (
        <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="card"
            style={{
                minHeight: '300px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                border: '1px solid var(--cm-accent)',
                background: 'linear-gradient(180deg, var(--cm-surface) 0%, var(--cm-accent-surface) 100%)'
            }}
        >
            <span style={{
                textTransform: 'uppercase',
                fontSize: '0.8rem',
                letterSpacing: '2px',
                color: 'var(--cm-accent)',
                marginBottom: '1rem'
            }}>
                {card.type === 'question' ? 'Pregunta' :
                    card.type === 'challenge' ? 'Reto' :
                        card.type === 'presence' ? 'Presencia' : 'Compartido'}
            </span>

            <h2 style={{ fontSize: '1.8rem', lineHeight: '1.4', color: '#fff' }}>
                "{card.text}"
            </h2>

            {card.duration && (
                <div style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.7 }}>
                    ⏱ {card.duration} segundos
                </div>
            )}
        </motion.div>
    )
}

const GameScreen = () => {
    const { currentCard, nextCard, resetGame, currentLevel } = useGame();

    // Random phrase for "Game Master"
    const randomPhrase = GAME_MASTER_PHRASES[Math.floor(Math.random() * GAME_MASTER_PHRASES.length)];

    const levelTitle = currentLevel === 1 ? 'NIVEL 1: CONEXIÓN' : 'NIVEL 2: CONFIANZA';

    return (
        <div className="premium-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
                <button onClick={resetGame} style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.5 }}>
                    <X size={24} />
                </button>
                <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--cm-accent)', letterSpacing: '1px', display: 'block' }}>{levelTitle}</span>
                </div>
                <div style={{ width: 24 }}></div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AnimatePresence mode='wait'>
                    {currentCard && <GameCardDisplay card={currentCard} />}
                </AnimatePresence>
            </div>

            {/* Controls */}
            <div style={{ paddingBottom: '2rem' }}>
                <p style={{ textAlign: 'center', fontSize: '0.9rem', marginBottom: '1.5rem', fontStyle: 'italic', opacity: 0.6 }}>
                    {randomPhrase}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1rem' }}>
                    <button className="btn-primary"
                        style={{ background: 'var(--cm-surface)', border: '1px solid #333', color: '#aaa' }}
                        onClick={nextCard} // "Cambiar" functionally just skips for now
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button className="btn-primary" onClick={nextCard}>
                        Siguiente
                    </button>
                </div>
            </div>
        </div>
    );
};



const ProposalScreen = () => {
    const { nextCard, finishGame, unlockLevel2, currentLevel } = useGame();

    // If we just finished Level 1
    const isLevel1Complete = currentLevel === 1;

    return (
        <div className="premium-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>
                    {isLevel1Complete ? '¿Profundizar?' : 'Pausa Sugerida'}
                </h2>
                <p style={{ marginBottom: '3rem', fontSize: '1.2rem' }}>
                    {isLevel1Complete
                        ? 'Han completado el nivel de Conexión. ¿Desean pasar al siguiente nivel?'
                        : 'Han completado un ciclo de cartas.'}
                </p>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {isLevel1Complete ? (
                        <>
                            <button className="btn-primary" onClick={unlockLevel2} style={{ background: 'linear-gradient(135deg, var(--cm-accent) 0%, #000 100%)', border: '1px solid var(--cm-accent)' }}>
                                <Unlock size={16} style={{ color: 'var(--cm-accent)' }} /> Desbloquear Nivel 2
                            </button>
                            <button className="btn-primary" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }} onClick={nextCard}>
                                Seguir en Nivel 1
                            </button>
                        </>
                    ) : (
                        <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--cm-accent)' }} onClick={nextCard}>
                            Continuar Jugando
                        </button>
                    )}

                    <button className="btn-primary" onClick={finishGame} style={{ background: 'transparent', opacity: 0.7, marginTop: '1rem', border: 'none' }}>
                        Cerrar Sesión
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

const SummaryScreen = () => {
    const { resetGame } = useGame();
    return (
        <div className="premium-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '2rem', color: 'var(--cm-accent)' }}>Sesión Finalizada</h2>

                <div style={{ textAlign: 'left', background: 'var(--cm-surface)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
                    <p style={{ marginBottom: '1rem', color: '#fff' }}>¿Qué fue lo más agradable del momento?</p>
                    <p style={{ marginBottom: '0', color: '#fff' }}>¿Algo que prefieras evitar la próxima vez?</p>
                </div>

                <p style={{ fontStyle: 'italic', marginBottom: '3rem', opacity: 0.8 }}>
                    "La conexión empieza cuando hay cuidado."
                </p>

                <button className="btn-primary" onClick={resetGame}>
                    Volver al Inicio
                </button>
            </motion.div>
        </div>
    );
}

// --- Main App Wrapper ---

import SafetyQuiz from './components/SafetyQuiz';

function AppContent() {
    const { phase } = useGame();

    const getBackground = () => {
        // Subtle background change based on phase
        return 'radial-gradient(circle at center, var(--cm-accent-surface) 0%, var(--cm-bg) 80%)';
    }

    return (
        <div style={{ minHeight: '100vh', background: getBackground(), transition: 'background 1s ease' }}>
            {phase === 'LOBBY' && <Lobby />}
            {phase === 'SETUP' && <SafetyQuiz />}
            {phase === 'PLAYING' && <GameScreen />}
            {phase === 'PROPOSE_END' && <ProposalScreen />}
            {phase === 'SUMMARY' && <SummaryScreen />}
        </div>
    );
}

function App() {
    return (
        <GameProvider>
            <AppContent />
        </GameProvider>
    )
}

export default App

