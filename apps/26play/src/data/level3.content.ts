import { GameCard } from './level1.content';

export const LEVEL_3_CONTENT: GameCard[] = [
    // --- Nivel 3: Vulnerabilidad Emocional y Conexión Física ---
    { id: 'L3-E1', text: 'Comparte un secreto que nunca le has contado a nadie aquí presente.', type: 'question', mode: 'both', tags: ['deep-emotional'] },
    { id: 'L3-E2', text: 'Describe el momento exacto en el que te diste cuenta de que alguien te importaba de verdad y por qué fue difícil aceptarlo.', type: 'question', mode: 'both', tags: ['deep-emotional'] },
    { id: 'L3-C1', text: 'Mantengan contacto visual ininterrumpido y en silencio durante 2 minutos enteros.', type: 'challenge', mode: 'both', duration: 120, tags: ['intimate', 'physical'] },
    { id: 'L3-C2', text: 'Apóyense espalda con espalda, cierren los ojos y traten de sincronizar su respiración profunda durante 1 minuto.', type: 'challenge', mode: 'both', duration: 60, tags: ['intimate', 'physical'] },
    { id: 'L3-E3', text: '¿De qué te arrepientes profundamente en cómo trataste a alguien en tu pasado?', type: 'question', mode: 'both', tags: ['deep-emotional'] }
];
