export type ContentType = 'question' | 'challenge' | 'shared' | 'presence' | 'wildcard';

export type SafetyTag = 'physical' | 'intimate' | 'emotional' | 'silly' | 'none' | 'deep-emotional';

export interface GameCard {
    id: string;
    text: string;
    type: ContentType;
    mode: 'couple' | 'group' | 'both';
    duration?: number; // seconds
    tags: SafetyTag[];
}

export const LEVEL_1_CONTENT: GameCard[] = [
    // --- Preguntas de Conexión ---
    { id: 'Q1', text: '¿Qué te hizo decir “sí” a jugar hoy?', type: 'question', mode: 'both', tags: ['emotional'] },
    { id: 'Q2', text: '¿Cómo te sientes ahora mismo, en una palabra?', type: 'question', mode: 'both', tags: ['emotional'] },
    { id: 'Q3', text: '¿Qué tipo de juegos sueles disfrutar más?', type: 'question', mode: 'both', tags: ['none'] },
    { id: 'Q4', text: '¿Qué te ayuda a sentirte cómodo en grupo?', type: 'question', mode: 'both', tags: ['emotional'] },
    { id: 'Q5', text: '¿Prefieres hablar, escuchar o hacer retos?', type: 'question', mode: 'both', tags: ['none'] },
    { id: 'Q6', text: '¿Qué hace que una experiencia sea agradable para ti?', type: 'question', mode: 'both', tags: ['emotional'] },
    { id: 'Q7', text: '¿Qué esperas de este juego hoy?', type: 'question', mode: 'both', tags: ['none'] },
    { id: 'Q8', text: '¿Qué valoras más cuando compartes tiempo con otros?', type: 'question', mode: 'both', tags: ['emotional'] },

    // --- Retos Suaves Individuales ---
    { id: 'R1', text: 'Respira profundo 3 veces y sonríe al grupo.', type: 'challenge', mode: 'both', duration: 15, tags: ['physical'] },
    { id: 'R2', text: 'Di algo que te agrade del momento actual.', type: 'challenge', mode: 'both', tags: ['emotional'] },
    { id: 'R3', text: 'Elige una palabra que describa cómo quieres que sea el juego.', type: 'challenge', mode: 'both', tags: ['none'] },
    { id: 'R4', text: 'Agradece a alguien del grupo por estar aquí.', type: 'challenge', mode: 'group', tags: ['emotional'] },
    { id: 'R5', text: 'Mira a tu pareja a los ojos durante 10 segundos.', type: 'challenge', mode: 'couple', duration: 10, tags: ['intimate', 'physical'] },
    { id: 'R6', text: 'Estira brazos y cuello durante 15 segundos.', type: 'challenge', mode: 'both', duration: 15, tags: ['physical'] },

    // --- Retos Compartidos ---
    { id: 'RC1', text: 'Todos digan “listos” al mismo tiempo.', type: 'shared', mode: 'group', tags: ['silly'] },
    { id: 'RC2', text: 'Elijan juntos una palabra para esta sesión.', type: 'shared', mode: 'both', tags: ['none'] },
    { id: 'RC3', text: 'Ríanse juntos durante 5 segundos (aunque sea forzado 😄).', type: 'shared', mode: 'both', duration: 5, tags: ['silly', 'physical'] },
    { id: 'RC4', text: 'Cada uno diga una cosa que le guste de jugar en compañía.', type: 'shared', mode: 'group', tags: ['emotional'] },
    { id: 'RC5', text: 'Juntos decidan si quieren continuar o pausar.', type: 'shared', mode: 'both', tags: ['none'] },

    // --- Micro-Acciones de Presencia ---
    { id: 'MP1', text: 'Apoya ambos pies en el suelo y nota tu postura.', type: 'presence', mode: 'both', duration: 5, tags: ['physical'] },
    { id: 'MP2', text: 'Observa el ambiente por 5 segundos en silencio.', type: 'presence', mode: 'both', duration: 5, tags: ['none'] },
    { id: 'MP3', text: 'Cierra los ojos 3 segundos y vuelve a abrirlos.', type: 'presence', mode: 'both', duration: 3, tags: ['physical'] },
    { id: 'MP4', text: 'Ajusta tu respiración al ritmo del grupo.', type: 'presence', mode: 'both', duration: 10, tags: ['physical', 'intimate'] },
];

export const GAME_MASTER_PHRASES = [
    "Recuerda: todo es opcional.",
    "No hay respuestas correctas.",
    "El ritmo lo ponen ustedes.",
    "Si algo no se siente bien, se cambia.",
    "Este nivel es solo para conectar."
];
