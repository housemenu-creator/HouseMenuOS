export interface Player {
    uid: string;
    username: string;
    level: number;
    xp: number;
    offchain_gold: number; // Moneda inflacionaria in-game controlada por sinks
    onchain_nexus: number; // Token cripto limitado
    createdAt: Date | string;
}

export interface Equipment {
    id: string;
    name: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    durability: number; // El sink constante de mantenimiento (0-100%)
    maxDurability: number;
    basePower: number;
}

export interface LedgerTransaction {
    id: string;
    playerId: string;
    type: 'drop' | 'sink_repair' | 'tax' | 'upgrade' | 'p2p_trade';
    currency: 'gold' | 'nexus';
    amount: number;
    timestamp: Date | string;
    description: string;
}
