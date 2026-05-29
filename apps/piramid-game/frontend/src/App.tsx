import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Hammer, Coins, Scroll, Trophy, Sparkles, Heart, Flame } from 'lucide-react';
import { NexusSidebar } from '@house/ui';

// Interfaces locales alineadas con la base de datos y tipos
interface PlayerStats {
  username: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  offchainGold: number;
  onchainNexus: number;
}

interface Equipment {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  durability: number;
  maxDurability: number;
  basePower: number;
}

interface LedgerEntry {
  id: string;
  type: 'drop' | 'sink_repair' | 'tax' | 'upgrade' | 'p2p_trade' | 'faucet';
  currency: 'gold' | 'nexus';
  amount: number;
  timestamp: string;
  description: string;
}

interface Monster {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  xpReward: number;
  goldReward: number;
  image: string;
}

const MONSTERS_POOL: Monster[] = [
  { name: 'Puma del Titicaca', hp: 120, maxHp: 120, attack: 12, xpReward: 35, goldReward: 50, image: '🐱' },
  { name: 'Cóndor de los Andes', hp: 150, maxHp: 150, attack: 18, xpReward: 50, goldReward: 75, image: '🦅' },
  { name: 'Víbora Amaru Ancestral', hp: 200, maxHp: 200, attack: 22, xpReward: 80, goldReward: 120, image: '🐍' },
  { name: 'Guardián Litomorfo Chavín', hp: 350, maxHp: 350, attack: 30, xpReward: 150, goldReward: 250, image: '🗿' },
];

export function App() {
  const [activeTab, setActiveTab] = useState<'aventura' | 'forja' | 'competencia' | 'libro'>('aventura');
  const [combatLogs, setCombatLogs] = useState<string[]>(['¡Has ingresado a las Ruinas Sagradas de Eternal Nexus! Explora o combate monstruos para generar valor.']);
  
  // State principal del jugador
  const [stats, setStats] = useState<PlayerStats>({
    username: 'Chaski_Digital',
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    offchainGold: 300,
    onchainNexus: 10,
  });

  // Equipamiento con su sistema de durabilidad (sinks)
  const [weapon, setWeapon] = useState<Equipment>({
    id: 'w1',
    name: 'Espada Tumi Ceremonial',
    rarity: 'epic',
    durability: 100,
    maxDurability: 100,
    basePower: 35,
  });

  const [shield, setShield] = useState<Equipment>({
    id: 's1',
    name: 'Escudo Solar de Inti',
    rarity: 'legendary',
    durability: 100,
    maxDurability: 100,
    basePower: 45,
  });

  // Monstruo activo en combate
  const [activeMonster, setActiveMonster] = useState<Monster | null>(null);
  const [monsterHp, setMonsterHp] = useState<number>(0);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [isForging, setIsForging] = useState<boolean>(false);
  const [forgeProgress, setForgeProgress] = useState<number>(0);

  // Registro del Libro Contable (Ledger)
  const [ledger, setLedger] = useState<LedgerEntry[]>([
    {
      id: 'tx-0',
      type: 'faucet',
      currency: 'gold',
      amount: 300,
      timestamp: new Date().toLocaleTimeString(),
      description: 'Suministro inicial del Faucet de bienvenida'
    },
    {
      id: 'tx-1',
      type: 'faucet',
      currency: 'nexus',
      amount: 10,
      timestamp: new Date().toLocaleTimeString(),
      description: 'Distribución Génesis de $NEXUS'
    }
  ]);

  const addLog = (msg: string) => {
    setCombatLogs(prev => [msg, ...prev.slice(0, 15)]);
  };

  const addLedgerEntry = (type: LedgerEntry['type'], currency: LedgerEntry['currency'], amount: number, description: string) => {
    const newEntry: LedgerEntry = {
      id: `tx-${Date.now()}`,
      type,
      currency,
      amount,
      timestamp: new Date().toLocaleTimeString(),
      description
    };
    setLedger(prev => [newEntry, ...prev]);
  };

  // Acción de explorar ruinas
  const explorarRuinas = () => {
    if (weapon.durability <= 0) {
      addLog('⚠️ Tu espada ceremonial está rota. ¡Repárala en la Forja antes de explorar!');
      return;
    }
    
    // 60% probabilidad de encontrar monstruo, 40% de encontrar oro directo
    if (Math.random() < 0.6) {
      const monster = MONSTERS_POOL[Math.floor(Math.random() * MONSTERS_POOL.length)];
      setActiveMonster(monster);
      setMonsterHp(monster.maxHp);
      setPlayerHp(100);
      addLog(`⚔️ ¡Ha aparecido un ${monster.name} (${monster.image}) salvaje! HP: ${monster.maxHp}. ¡Prepárate para combatir!`);
    } else {
      const goldFound = Math.floor(Math.random() * 40) + 15;
      setStats(prev => ({ ...prev, offchainGold: prev.offchainGold + goldFound }));
      addLog(`✨ Has explorado el templo antiguo y encontraste un cofre de piedra con +${goldFound} Oro Off-chain.`);
      addLedgerEntry('drop', 'gold', goldFound, 'Recompensa por exploración de ruinas');
      
      // Desgaste de durabilidad por explorar
      wearWeapon(2);
    }
  };

  const wearWeapon = (amount: number) => {
    setWeapon(prev => {
      const nextDur = Math.max(0, prev.durability - amount);
      if (nextDur === 0) {
        addLog('🚨 ¡Tu arma se ha roto completamente! Su poder se reduce un 50%.');
      }
      return { ...prev, durability: nextDur };
    });
  };

  // Simulación de ataque
  const realizarAtaque = () => {
    if (!activeMonster) return;
    if (weapon.durability <= 0) {
      addLog('⚠️ Combates con un arma rota. Tu daño se reduce significativamente.');
    }

    const weaponMultiplier = weapon.durability <= 0 ? 0.5 : 1;
    const baseDmg = Math.floor(Math.random() * 20) + weapon.basePower;
    const finalDmg = Math.floor(baseDmg * weaponMultiplier);
    
    const newMonsterHp = Math.max(0, monsterHp - finalDmg);
    setMonsterHp(newMonsterHp);
    addLog(`⚔️ Has atacado al ${activeMonster.name} infligiendo ${finalDmg} de daño.`);

    // Desgaste por cada ataque
    wearWeapon(5);

    if (newMonsterHp <= 0) {
      // Monstruo derrotado
      const xpReward = activeMonster.xpReward;
      const goldReward = activeMonster.goldReward;
      
      // Ganancia de estadísticas y nivel
      setStats(prev => {
        let newXp = prev.xp + xpReward;
        let newLevel = prev.level;
        let newXpReq = prev.xpToNextLevel;
        if (newXp >= prev.xpToNextLevel) {
          newLevel += 1;
          newXp = newXp - prev.xpToNextLevel;
          newXpReq = Math.floor(prev.xpToNextLevel * 1.5);
          addLog(`🎉 ¡FELICIDADES! Subiste al Nivel ${newLevel}. Tu capacidad máxima de combate aumenta.`);
        }
        return {
          ...prev,
          level: newLevel,
          xp: newXp,
          xpToNextLevel: newXpReq,
          offchainGold: prev.offchainGold + goldReward,
        };
      });

      addLog(`💀 ¡Has derrotado al ${activeMonster.name}! Recompensa: +${goldReward} Oro, +${xpReward} XP.`);
      addLedgerEntry('drop', 'gold', goldReward, `Derrotaste a ${activeMonster.name}`);
      setActiveMonster(null);
    } else {
      // Turno de respuesta del monstruo
      const monsterDmg = Math.max(2, Math.floor(Math.random() * activeMonster.attack) - Math.floor(shield.basePower / 10));
      const newPlayerHp = Math.max(0, playerHp - monsterDmg);
      setPlayerHp(newPlayerHp);
      addLog(`💥 El ${activeMonster.name} te ataca de vuelta y te causa ${monsterDmg} de daño.`);

      // Desgaste del escudo
      setShield(prev => ({ ...prev, durability: Math.max(0, prev.durability - 3) }));

      if (newPlayerHp <= 0) {
        // Muerte del jugador (Castigo del Sink de Muerte: x10 desgaste de durabilidad)
        addLog('💀 ¡Has caído derrotado! Castigo de muerte aplicado: Tu durabilidad sufre un desgaste extremo (x10).');
        setWeapon(prev => ({ ...prev, durability: Math.max(0, prev.durability - 25) }));
        setShield(prev => ({ ...prev, durability: Math.max(0, prev.durability - 25) }));
        setActiveMonster(null);
      }
    }
  };

  // Reparaciones de durabilidad (El gran Gold Sink - 35% del farmeo promedio)
  const repararEquipamiento = () => {
    const goldCost = 75; // Costo fijo por mantenimiento completo del equipamiento
    if (stats.offchainGold < goldCost) {
      addLog('❌ Oro insuficiente para costear la reparación de la Forja.');
      return;
    }

    setStats(prev => ({ ...prev, offchainGold: prev.offchainGold - goldCost }));
    setWeapon(prev => ({ ...prev, durability: prev.maxDurability }));
    setShield(prev => ({ ...prev, durability: prev.maxDurability }));
    addLog(`🔨 Reparación exitosa. La Forja restauró tu equipamiento al 100%. Costo: -${goldCost} Oro.`);
    addLedgerEntry('sink_repair', 'gold', -goldCost, 'Mantenimiento y forja de durabilidad');
  };

  // Forjar una Reliquia NFT de valor real (Quema 1000 de Oro y 3 de $NEXUS)
  const forjarReliquiaNFT = () => {
    const goldCost = 1000;
    const nexusCost = 3;

    if (stats.offchainGold < goldCost || stats.onchainNexus < nexusCost) {
      addLog('❌ Recursos insuficientes. Forjar una Reliquia requiere 1000 Oro y 3 $NEXUS.');
      return;
    }

    setIsForging(true);
    setForgeProgress(0);
    
    // Quema inmediata de recursos
    setStats(prev => ({
      ...prev,
      offchainGold: prev.offchainGold - goldCost,
      onchainNexus: prev.onchainNexus - nexusCost
    }));

    addLedgerEntry('upgrade', 'gold', -goldCost, 'Destrucción de Oro por Forja NFT');
    addLedgerEntry('upgrade', 'nexus', -nexusCost, 'Quema deflacionaria de $NEXUS (30% quemado, 70% piscina)');
  };

  useEffect(() => {
    if (!isForging) return;
    const interval = setInterval(() => {
      setForgeProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsForging(false);
          addLog('🔥 ¡ÉXITO! Has forjado una "Reliquia Sagrada de Pachamama (NFT)". Registrada inmutablemente en la blockchain.');
          return 100;
        }
        return prev + 10;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isForging]);

  // Torneo Semanal Competitivo (Faucet de $NEXUS)
  const simularTorneoSemanal = () => {
    if (stats.level < 3) {
      addLog('🔒 Requiere Nivel 3. El Faucet de $NEXUS está restringido solo para guerreros competitivos.');
      return;
    }

    const prize = Math.floor(Math.random() * 5) + 3;
    setStats(prev => ({ ...prev, onchainNexus: prev.onchainNexus + prize }));
    addLog(`🏆 ¡Felicidades! Competiste en el PvP Semanal y alcanzaste el top. Recompensa: +${prize} tokens $NEXUS.`);
    addLedgerEntry('faucet', 'nexus', prize, 'Premio de Competitividad Semanal PvP');
  };

  return (
    <div className="flex min-h-screen text-[#1c1b1b] bg-[#fcf9f8] font-sans">
      {/* Sidebar de la suite House Portal */}
      <NexusSidebar activeApp="26play" />

      {/* Canvas Principal */}
      <main className="flex-grow pl-20 lg:pl-64 p-6 md:p-12 transition-all">
        {/* Header Específico del Juego con Estética Neo-Brutalista Monumental */}
        <header className="mb-10 border-b-4 border-[#1c1b1b] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#735c00] text-white px-2 py-1 text-xs font-bold uppercase border-2 border-[#1c1b1b]">RPG HÍBRIDO</span>
              <span className="bg-[#a93818] text-white px-2 py-1 text-xs font-bold uppercase border-2 border-[#1c1b1b]">ESTABLE</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase font-mono">ETERNAL NEXUS</h1>
            <p className="text-sm font-bold text-gray-600 uppercase tracking-widest mt-1">Realms of Value & Dual Currency System</p>
          </div>
          
          {/* Faucet y Estado de Billetera Dual */}
          <div className="flex gap-4">
            <div className="bg-white p-3 border-2 border-[#1c1b1b] shadow-[4px_4px_0px_0px_#1c1b1b] flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-400 border-2 border-[#1c1b1b] flex items-center justify-center font-bold">🪙</div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase">Oro Off-Chain</div>
                <div className="text-lg font-bold font-mono">{stats.offchainGold}</div>
              </div>
            </div>

            <div className="bg-[#366287]/10 p-3 border-2 border-[#1c1b1b] shadow-[4px_4px_0px_0px_#1c1b1b] flex items-center gap-3">
              <div className="w-10 h-10 bg-[#366287] text-white border-2 border-[#1c1b1b] flex items-center justify-center font-bold">💎</div>
              <div>
                <div className="text-[10px] font-bold text-[#366287] uppercase">$NEXUS On-Chain</div>
                <div className="text-lg font-bold font-mono text-[#366287]">{stats.onchainNexus}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Panel de Personaje Rápido */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border-2 border-[#1c1b1b] p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-xs uppercase text-gray-500">HÉROE</span>
              <span className="font-bold text-xs bg-amber-200 px-2 py-0.5 border border-[#1c1b1b]">NIVEL {stats.level}</span>
            </div>
            <div className="text-xl font-bold uppercase">{stats.username}</div>
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-bold mb-1">
                <span>EXPERIENCIA</span>
                <span>{stats.xp} / {stats.xpToNextLevel} XP</span>
              </div>
              <div className="w-full bg-[#fcf9f8] border-2 border-[#1c1b1b] h-4">
                <div 
                  className="bg-[#735c00] h-full transition-all duration-300"
                  style={{ width: `${(stats.xp / stats.xpToNextLevel) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-[#1c1b1b] p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-xs uppercase text-gray-500">ARMA ACTIVA</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 uppercase border border-[#1c1b1b] ${
                weapon.rarity === 'epic' ? 'bg-purple-200 text-purple-800' : 'bg-yellow-200 text-yellow-800'
              }`}>
                {weapon.rarity}
              </span>
            </div>
            <div className="font-bold">{weapon.name}</div>
            <div className="mt-2 text-xs font-semibold text-gray-600">Poder Base: +{weapon.basePower} dps</div>
            <div className="mt-2">
              <div className="flex justify-between text-[10px] font-bold mb-1">
                <span>DURABILIDAD (SINK)</span>
                <span className={weapon.durability <= 20 ? 'text-[#a93818]' : ''}>{weapon.durability}%</span>
              </div>
              <div className="w-full bg-[#fcf9f8] border-2 border-[#1c1b1b] h-3">
                <div 
                  className={`h-full transition-all duration-300 ${weapon.durability <= 20 ? 'bg-[#a93818]' : 'bg-[#366287]'}`}
                  style={{ width: `${weapon.durability}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-[#1c1b1b] p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-xs uppercase text-gray-500">DEFENSA</span>
              <span className="text-[10px] font-bold px-2 py-0.5 uppercase bg-yellow-200 text-yellow-800 border border-[#1c1b1b]">
                {shield.rarity}
              </span>
            </div>
            <div className="font-bold">{shield.name}</div>
            <div className="mt-2 text-xs font-semibold text-gray-600">Bloqueo: +{shield.basePower} def</div>
            <div className="mt-2">
              <div className="flex justify-between text-[10px] font-bold mb-1">
                <span>DURABILIDAD (SINK)</span>
                <span>{shield.durability}%</span>
              </div>
              <div className="w-full bg-[#fcf9f8] border-2 border-[#1c1b1b] h-3">
                <div 
                  className="bg-[#366287] h-full transition-all duration-300"
                  style={{ width: `${shield.durability}%` }}
                />
              </div>
            </div>
          </div>

          {/* Estado de Salud */}
          <div className="bg-white border-2 border-[#1c1b1b] p-4 flex flex-col justify-between">
            <div className="font-bold text-xs uppercase text-gray-500 mb-2">PUNTOS DE SALUD</div>
            <div className="flex items-center gap-3">
              <Heart className="w-8 h-8 text-[#a93818] fill-[#a93818]" />
              <div>
                <span className="text-3xl font-bold font-mono">{playerHp}</span>
                <span className="text-gray-400 font-bold text-sm"> / 100 HP</span>
              </div>
            </div>
            <div className="w-full bg-[#fcf9f8] border-2 border-[#1c1b1b] h-3 mt-4">
              <div 
                className="bg-[#a93818] h-full transition-all duration-300"
                style={{ width: `${playerHp}%` }}
              />
            </div>
          </div>
        </section>

        {/* Navegación por pestañas */}
        <nav className="flex flex-wrap border-b-4 border-[#1c1b1b] mb-8">
          {(['aventura', 'forja', 'competencia', 'libro'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold text-sm uppercase border-t-2 border-x-2 border-[#1c1b1b] -mb-1 transition-all mr-2 ${
                activeTab === tab 
                  ? 'bg-white border-b-4 border-b-white translate-y-0.5' 
                  : 'bg-[#fcf9f8]/40 text-gray-500 border-b-2 border-b-[#1c1b1b] hover:bg-white/50'
              }`}
            >
              {tab === 'aventura' && <div className="flex items-center gap-2"><Swords className="w-4 h-4" /> Aventura & Combate</div>}
              {tab === 'forja' && <div className="flex items-center gap-2"><Hammer className="w-4 h-4" /> La Forja (Sinks)</div>}
              {tab === 'competencia' && <div className="flex items-center gap-2"><Trophy className="w-4 h-4" /> Competitivo</div>}
              {tab === 'libro' && <div className="flex items-center gap-2"><Scroll className="w-4 h-4" /> Libro Contable</div>}
            </button>
          ))}
        </nav>

        {/* Contenido Dinámico de las Pestañas */}
        <section className="bg-white border-4 border-[#1c1b1b] p-6 md:p-8 min-h-[400px] shadow-[8px_8px_0px_0px_#1c1b1b]">
          <AnimatePresence mode="wait">
            
            {/* TETA 1: Aventuras y Combates */}
            {activeTab === 'aventura' && (
              <motion.div 
                key="aventura-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-8"
              >
                {/* Zona de Acción */}
                <div className="md:col-span-7 flex flex-col justify-between min-h-[350px]">
                  <div>
                    <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2">
                      <Swords className="w-6 h-6 text-[#a93818]" /> Explorar la Cordillera de los Andes
                    </h2>
                    <p className="text-sm font-semibold text-gray-500 uppercase mb-6">
                      Explora ruinas antiguas para obtener Oro Off-chain. Ten cuidado, puedes cruzarte con peligrosas criaturas que desgastarán tu equipamiento.
                    </p>

                    {activeMonster ? (
                      <div className="bg-[#a93818]/5 border-4 border-[#a93818] p-6 flex flex-col md:flex-row items-center gap-6 mb-6">
                        <div className="text-6xl p-4 bg-white border-2 border-[#1c1b1b]">{activeMonster.image}</div>
                        <div className="flex-grow w-full">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xl font-bold uppercase">{activeMonster.name}</h3>
                            <span className="bg-[#a93818] text-white px-2 py-0.5 text-xs font-bold border border-[#1c1b1b]">ENEMIGO</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span>VIDA DEL MONSTRUO</span>
                            <span>{monsterHp} / {activeMonster.maxHp} HP</span>
                          </div>
                          <div className="w-full bg-white border-2 border-[#1c1b1b] h-4">
                            <div 
                              className="bg-[#a93818] h-full transition-all duration-300"
                              style={{ width: `${(monsterHp / activeMonster.maxHp) * 100}%` }}
                            />
                          </div>
                          <div className="flex gap-4 mt-3 text-xs font-bold text-gray-600">
                            <span>Ataque: ~{activeMonster.attack} dmg</span>
                            <span>XP: +{activeMonster.xpReward}</span>
                            <span>Oro: +{activeMonster.goldReward}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-4 border-dashed border-[#1c1b1b] p-8 text-center bg-[#fcf9f8] flex flex-col items-center justify-center min-h-[180px]">
                        <Sparkles className="w-10 h-10 text-[#735c00] mb-3" />
                        <h4 className="font-bold uppercase text-lg">Zona de Aventura Despejada</h4>
                        <p className="text-xs font-semibold text-gray-400 mt-1 uppercase">Da clic abajo para iniciar la exploración</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 mt-6">
                    {!activeMonster ? (
                      <button 
                        onClick={explorarRuinas}
                        className="btn-primary bg-[#735c00] text-white border-2 border-[#1c1b1b] px-8 py-4 font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_#1c1b1b] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                      >
                        🥾 Explorar Ruinas Ancestrales
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={realizarAtaque}
                          className="bg-[#a93818] text-white border-2 border-[#1c1b1b] px-8 py-4 font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_#1c1b1b] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2"
                        >
                          <Swords className="w-5 h-5" /> Atacar Ferozmente
                        </button>
                        <button 
                          onClick={() => {
                            setActiveMonster(null);
                            addLog('🏃 Has huido del combate con éxito para proteger tu durabilidad.');
                          }}
                          className="bg-white border-2 border-[#1c1b1b] px-6 py-4 font-bold uppercase text-gray-600 hover:bg-gray-50 transition-all"
                        >
                          Huir a la base
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Registro de Bitácora */}
                <div className="md:col-span-5 border-l-4 border-[#1c1b1b] pl-6 flex flex-col">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-gray-400 mb-3">BITÁCORA DE ACCIONES</h3>
                  <div className="bg-[#fcf9f8] border-2 border-[#1c1b1b] p-4 flex-grow overflow-y-auto max-h-[300px] font-mono text-xs flex flex-col gap-2">
                    {combatLogs.map((log, index) => (
                      <div key={index} className="border-b border-gray-200 pb-1 font-semibold">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: La Forja (Sinks y Crafting) */}
            {activeTab === 'forja' && (
              <motion.div 
                key="forja-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                {/* Gold Sink: Reparación de Equipamiento */}
                <div className="border-2 border-[#1c1b1b] p-6 flex flex-col justify-between bg-[#fcf9f8]">
                  <div>
                    <h3 className="text-xl font-bold uppercase mb-4 flex items-center gap-2 border-b-2 border-[#1c1b1b] pb-2">
                      <Hammer className="w-5 h-5" /> Estación de Afilado e Integridad
                    </h3>
                    <p className="text-xs font-semibold text-gray-500 uppercase leading-relaxed mb-6">
                      El desgaste constante de tus armas y defensas reduce drásticamente tu daño. Mantén tus reliquias al 100% pagando la tasa fija de reparación (el gran sumidero del 35% del farmeo base).
                    </p>
                    
                    <div className="flex gap-4 mb-4">
                      <div className="bg-white p-3 border border-[#1c1b1b] flex-grow">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Tasa Reparación</div>
                        <div className="text-lg font-bold font-mono text-[#a93818]">75 Oro</div>
                      </div>
                      <div className="bg-white p-3 border border-[#1c1b1b] flex-grow">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Durabilidad Actual</div>
                        <div className="text-lg font-bold font-mono">{weapon.durability}%</div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={repararEquipamiento}
                    className="w-full bg-[#735c00] text-white border-2 border-[#1c1b1b] py-3 font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_#1c1b1b] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                  >
                    🛠️ Costear Reparación Completa
                  </button>
                </div>

                {/* Nexus Forge: Forjar NFT Legendarios */}
                <div className="border-2 border-[#1c1b1b] p-6 flex flex-col justify-between bg-[#fcf9f8]">
                  <div>
                    <h3 className="text-xl font-bold uppercase mb-4 flex items-center gap-2 border-b-2 border-[#1c1b1b] pb-2">
                      <Flame className="w-5 h-5 text-[#a93818]" /> Forja Divina de Reliquias NFT
                    </h3>
                    <p className="text-xs font-semibold text-gray-500 uppercase leading-relaxed mb-6">
                      Convierte tus riquezas in-game en activos inmutables del ecosistema. Forjar una reliquia consume 1000 Oro y 3 $NEXUS (los cuales sufren un Burn deflacionario del 30% instantáneo).
                    </p>
                    
                    <div className="flex gap-4 mb-4">
                      <div className="bg-white p-3 border border-[#1c1b1b] flex-grow">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Costo Oro (Quema)</div>
                        <div className="text-md font-bold font-mono text-[#a93818]">1,000 Oro</div>
                      </div>
                      <div className="bg-white p-3 border border-[#1c1b1b] flex-grow">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Costo $NEXUS (Burn)</div>
                        <div className="text-md font-bold font-mono text-[#a93818]">3 $NEXUS</div>
                      </div>
                    </div>
                  </div>

                  {isForging ? (
                    <div className="w-full bg-white border-2 border-[#1c1b1b] p-4 text-center">
                      <div className="text-xs font-bold uppercase mb-2">FORJANDO NFT INMUTABLE...</div>
                      <div className="w-full bg-[#fcf9f8] border border-[#1c1b1b] h-4">
                        <div className="bg-[#a93818] h-full transition-all" style={{ width: `${forgeProgress}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={forjarReliquiaNFT}
                      className="w-full bg-[#a93818] text-white border-2 border-[#1c1b1b] py-3 font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_#1c1b1b] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                      🔥 Forjar Reliquia Inmutable (NFT)
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 3: Competitividad Semanal */}
            {activeTab === 'competencia' && (
              <motion.div 
                key="competencia-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col md:flex-row gap-8"
              >
                <div className="flex-1 border-2 border-[#1c1b1b] p-6 bg-[#fcf9f8] flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold uppercase mb-4 flex items-center gap-2 border-b-2 border-[#1c1b1b] pb-2">
                      <Trophy className="w-5 h-5 text-[#735c00]" /> Liga de Competitividad Semanal
                    </h3>
                    <p className="text-xs font-semibold text-gray-500 uppercase leading-relaxed mb-6">
                      El token de valor secundario $NEXUS cuenta con una escasez agresiva. No se dropea cazando monstruos del mapa. Se inyecta exclusivamente vía torneos PvP a los guerreros de Nivel Alto.
                    </p>
                    <div className="p-4 bg-yellow-100 border border-[#1c1b1b] font-bold text-xs uppercase mb-6 text-yellow-800">
                      ⚠️ Requisito del Faucet: Nivel Héroe 3 o superior para acceder.
                    </div>
                  </div>

                  <button 
                    onClick={simularTorneoSemanal}
                    disabled={stats.level < 3}
                    className={`w-full py-4 border-2 border-[#1c1b1b] font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_#1c1b1b] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 ${
                      stats.level < 3 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none translate-y-0.5' 
                        : 'bg-[#735c00] text-white'
                    }`}
                  >
                    🏆 Simular Combate de Torneo Semanal
                  </button>
                </div>

                <div className="flex-1 border-2 border-[#1c1b1b] p-6 bg-[#fcf9f8] flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold uppercase mb-4 flex items-center gap-2 border-b-2 border-[#1c1b1b] pb-2">
                      ⚔️ Tabla de Posiciones PvP
                    </h3>
                    <div className="space-y-2 mt-4">
                      {[
                        { rank: 1, name: 'Illapa_Stitch', lvl: 14, score: '4,890 pts', active: false },
                        { rank: 2, name: 'Kuntur_AI', lvl: 12, score: '4,210 pts', active: false },
                        { rank: 3, name: 'Ayni_Master', lvl: 9, score: '3,100 pts', active: false },
                        { rank: 12, name: `${stats.username} (Tú)`, lvl: stats.level, score: `${stats.xp * 10} pts`, active: true },
                      ].map(row => (
                        <div 
                          key={row.rank} 
                          className={`p-3 border flex justify-between items-center text-xs font-bold uppercase ${
                            row.active ? 'bg-amber-100 border-[#1c1b1b] border-2' : 'bg-white border-gray-200'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <span className="text-gray-400">#{row.rank}</span>
                            <span>{row.name}</span>
                          </span>
                          <span className="flex gap-4 text-gray-500">
                            <span>LVL {row.lvl}</span>
                            <span className="text-[#1c1b1b]">{row.score}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: Libro Contable Inmutable (Ledger) */}
            {activeTab === 'libro' && (
              <motion.div 
                key="libro-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex justify-between items-center border-b-2 border-[#1c1b1b] pb-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold uppercase">Libro Contable de Eternal Nexus</h2>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">Registros inmutables de transacciones duales off-chain & on-chain</p>
                  </div>
                  <Coins className="w-8 h-8 text-[#735c00]" />
                </div>

                <div className="overflow-x-auto border-2 border-[#1c1b1b]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#fcf9f8] border-b-2 border-[#1c1b1b] font-mono text-[10px] font-bold uppercase text-gray-600">
                        <th className="p-3 border-r border-[#1c1b1b]">TIMESTAMP</th>
                        <th className="p-3 border-r border-[#1c1b1b]">ACCIÓN</th>
                        <th className="p-3 border-r border-[#1c1b1b]">TIPO</th>
                        <th className="p-3 border-r border-[#1c1b1b]">MONEDA</th>
                        <th className="p-3">MONTO</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs font-semibold divide-y divide-gray-200">
                      {ledger.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50 bg-white">
                          <td className="p-3 border-r border-gray-200">{tx.timestamp}</td>
                          <td className="p-3 border-r border-gray-200 uppercase">{tx.description}</td>
                          <td className="p-3 border-r border-gray-200">
                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase border ${
                              tx.type === 'faucet' ? 'bg-green-100 text-green-800 border-green-300' :
                              tx.type === 'drop' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                              tx.type === 'sink_repair' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                              'bg-red-100 text-red-800 border-red-300'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="p-3 border-r border-gray-200 uppercase font-bold text-gray-500">
                            {tx.currency}
                          </td>
                          <td className={`p-3 font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}


