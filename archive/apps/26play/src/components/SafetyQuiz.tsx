import { motion } from 'framer-motion';
import { useGame } from '../GameContext';
import { SafetyTag } from '../data/level1.content';
import { Shield, Check, X } from 'lucide-react';

const SafetyQuiz = () => {
    const { filters, toggleFilter, setPhase } = useGame();

    const categories: { tag: SafetyTag, label: string, desc: string }[] = [
        { tag: 'physical', label: 'Contacto Físico', desc: 'Abrazos, masajes, cercanía' },
        { tag: 'intimate', label: 'Intimidad', desc: 'Miradas profundas, preguntas personales' },
        { tag: 'emotional', label: 'Profundidad Emocional', desc: 'Sentimientos, gratitud, vulnerabilidad' },
        { tag: 'silly', label: 'Tonterías / Humor', desc: 'Gestos graciosos, risas forzadas' },
    ];

    return (
        <div className="premium-container" style={{ textAlign: 'center', padding: '2rem' }}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Shield size={48} color="var(--cm-accent)" style={{ marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '2rem' }}>Modo Seguro</h2>
                <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
                    Marca lo que prefieres <strong>EVITAR</strong> hoy.
                    <br />
                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>(Lo que marques NO saldrá en el juego)</span>
                </p>

                <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                    {categories.map((cat) => {
                        const isBanned = filters.includes(cat.tag);
                        return (
                            <button
                                key={cat.tag}
                                onClick={() => toggleFilter(cat.tag)}
                                style={{
                                    background: isBanned ? 'rgba(255, 77, 77, 0.2)' : 'var(--cm-surface)',
                                    border: isBanned ? '1px solid var(--cm-error)' : '1px solid rgba(255,255,255,0.1)',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                    color: isBanned ? 'var(--cm-error)' : '#fff'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{cat.label}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{cat.desc}</div>
                                </div>
                                {isBanned ? <X size={20} /> : <Check size={20} style={{ opacity: 0.3 }} />}
                            </button>
                        )
                    })}
                </div>

                <button
                    className="btn-primary"
                    onClick={() => setPhase('PLAYING')}
                >
                    Confirmar y Jugar
                </button>
            </motion.div>
        </div>
    );
};

export default SafetyQuiz;

