import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GameCard, LEVEL_1_CONTENT, SafetyTag } from './data/level1.content';
import { LEVEL_2_CONTENT } from './data/level2.content';

type GamePhase = 'LOBBY' | 'SETUP' | 'PLAYING' | 'PROPOSE_END' | 'SUMMARY';
type PlayerMode = 'COUPLE' | 'GROUP';
const MAX_CARDS_SESSION = 6;

interface GameState {
    phase: GamePhase;
    mode: PlayerMode;
    currentCard: GameCard | null;
    history: GameCard[];
    players: string[]; // Simplificado por ahora
    setPhase: (phase: GamePhase) => void;
    setMode: (mode: PlayerMode) => void;
    startGame: () => void;
    nextCard: () => void;
    resetGame: () => void;
    finishGame: () => void;
    cardsPlayed: number;
    filters: SafetyTag[];
    currentLevel: number;
    toggleFilter: (tag: SafetyTag) => void;
    unlockLevel2: () => void;
}

const GameContext = createContext<GameState | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [phase, setPhase] = useState<GamePhase>('LOBBY');
    const [mode, setMode] = useState<PlayerMode>('COUPLE');
    const [currentCard, setCurrentCard] = useState<GameCard | null>(null);
    const [history, setHistory] = useState<GameCard[]>([]);
    const [cardsPlayed, setCardsPlayed] = useState(0);
    const [players] = useState<string[]>([]);
    const [filters, setFilters] = useState<SafetyTag[]>([]);
    const [currentLevel, setCurrentLevel] = useState(1);

    // Simple shuffle for MVP
    const startGame = () => {
        setCardsPlayed(0);
        setCurrentLevel(1);
        setPhase('PLAYING');
        nextCard();
    };

    const unlockLevel2 = () => {
        setCurrentLevel(2);
        setPhase('PLAYING');
        // No reset of cardsPlayed needed? Or reset for new cycle?
        // Proposal: Let's reset cardsPlayed to give another 6 cards of Level 2
        setCardsPlayed(0);
        nextCard();
    }

    const toggleFilter = (tag: SafetyTag) => {
        setFilters(prev => prev.includes(tag)
            ? prev.filter(t => t !== tag)
            : [...prev, tag]
        );
    };

    const nextCard = () => {
        if (cardsPlayed >= MAX_CARDS_SESSION) {
            setPhase('PROPOSE_END');
            return;
        }
        // Select Content Pool based on Level
        let pool = currentLevel === 1 ? LEVEL_1_CONTENT : LEVEL_2_CONTENT;

        // Filter content by mode
        const availableContent = pool.filter(card => {
            if (card.mode === 'both') return true;
            if (mode === 'COUPLE' && card.mode === 'couple') return true;
            if (mode === 'GROUP' && card.mode === 'group') return true;
            return false;
        }).filter(card => {
            // Exclude cards that have ANY tag present in the filters array
            if (!card.tags) return true; // Safety check
            const hasBannedTag = card.tags.some(tag => filters.includes(tag));
            return !hasBannedTag;
        });

        // Random pick used for "MVP" (later: smart rotation)
        const randomCard = availableContent[Math.floor(Math.random() * availableContent.length)];
        setCurrentCard(randomCard);
        setHistory(prev => [...prev, randomCard]);
        setCardsPlayed(prev => prev + 1);
    };

    const finishGame = () => {
        setPhase('SUMMARY');
    };

    const resetGame = () => {
        setPhase('LOBBY');
        setHistory([]);
        setCardsPlayed(0);
        setCurrentLevel(1);
        setCurrentCard(null);
    }

    return (
        <GameContext.Provider value={{
            phase, setPhase, mode, setMode, currentCard, history, players, cardsPlayed, filters, currentLevel,
            startGame, nextCard, resetGame, finishGame, toggleFilter, unlockLevel2
        }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
};
