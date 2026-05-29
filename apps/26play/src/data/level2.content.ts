import { GameCard } from './level1.content';

export const LEVEL_2_CONTENT: GameCard[] = [
    // --- Preguntas de Confianza (Más personales, valores, historia) ---
    { id: 'L2-Q1', text: '¿Cuál es un pequeño miedo que no sueles contar?', type: 'question', mode: 'both', tags: ['emotional'] },
    { id: 'L2-Q2', text: '¿Qué cualidad admiras más en las personas que te rodean?', type: 'question', mode: 'both', tags: ['emotional'] },
    { id: 'L2-Q3', text: '¿Cuándo fue la última vez que te sentiste realmente valiente?', type: 'question', mode: 'both', tags: ['emotional'] },
    { id: 'L2-Q4', text: '¿Qué es lo que más te cuesta pedir a los demás?', type: 'question', mode: 'both', tags: ['emotional'] },
    { id: 'L2-Q5', text: 'Si pudieras recibir un consejo de tu "yo" del futuro, ¿qué te diría?', type: 'question', mode: 'both', tags: ['none'] },
    { id: 'L2-Q6', text: '¿Qué comportamiento te hace perder la confianza en alguien al instante?', type: 'question', mode: 'both', tags: ['emotional'] },

    // --- Retos de Cooperación (Coordinación y atención) ---
    { id: 'L2-C1', text: 'Mírense a los ojos e intenten parpadear al mismo tiempo 3 veces.', type: 'challenge', mode: 'both', duration: 20, tags: ['physical', 'silly'] },
    { id: 'L2-C2', text: 'Sincronicen su respiración sin tocarse durante 30 segundos.', type: 'challenge', mode: 'both', duration: 30, tags: ['intimate', 'physical'] },
    { id: 'L2-C3', text: 'Uno cuenta una historia breve (1 min) y el otro debe resumirla en una frase.', type: 'challenge', mode: 'both', tags: ['none'] },
    { id: 'L2-C4', text: 'Creen un saludo de manos secreto ahora mismo.', type: 'challenge', mode: 'both', duration: 30, tags: ['physical', 'silly'] },

    // --- Acciones de Cuidado (Trust Building) ---
    { id: 'L2-A1', text: 'Pide permiso para dar un masaje de 1 minuto en los hombros a quien tengas a la derecha.', type: 'challenge', mode: 'group', duration: 60, tags: ['physical'] },
    { id: 'L2-A2', text: 'Dale un cumplido honesto a la persona frente a ti sobre su personalidad.', type: 'challenge', mode: 'both', tags: ['emotional'] },
    { id: 'L2-A3', text: 'Pregunta a tu pareja/grupo: "¿Cómo puedo hacerte sentir más cómodo hoy?"', type: 'challenge', mode: 'both', tags: ['emotional'] }
];
