import { useState } from 'react';
import { Settings as SettingsIcon, Gift, Ticket, Coins, Check, AlertTriangle, User, Bell, Shield, Moon, Volume2 } from 'lucide-react';

const RAFFLE_REWARDS = [
  { 
    id: 'r1', name: 'Ticket Sorteo Semanal', 
    description: 'Participa en el sorteo automático del viernes por 1 premio sorpresa.',
    costPts: 200, icon: '🎟️', stock: 15, category: 'sorteo' 
  },
  { 
    id: 'r2', name: 'Bono de Almuerzo Gratis', 
    description: 'Canjeable en House Menu por cualquier combo del día.',
    costPts: 350, icon: '🍔', stock: 8, category: 'beneficio' 
  },
  { 
    id: 'r3', name: 'Día Libre Adicional', 
    description: 'Un día libre extra remunerado. Válido por 30 días.',
    costPts: 1500, icon: '🏖️', stock: 2, category: 'premium' 
  },
  { 
    id: 'r4', name: 'Ticket Doble Sorteo', 
    description: '2 entradas al sorteo semanal. Duplica tus chances.',
    costPts: 350, icon: '🎰', stock: 10, category: 'sorteo' 
  },
  { 
    id: 'r5', name: 'Boost XP 26play (x2)', 
    description: 'Multiplica x2 los puntos ganados en retos 26play por 24h.',
    costPts: 500, icon: '⚡', stock: 20, category: 'gaming' 
  },
  { 
    id: 'r6', name: 'Camiseta Ayni Edición Limitada', 
    description: 'Merch exclusivo del equipo. Diseño Temporada S3.',
    costPts: 2000, icon: '👕', stock: 3, category: 'premium' 
  },
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState('canjear');
  const [userPts, setUserPts] = useState(1450);
  const [redeemHistory, setRedeemHistory] = useState([]);
  const [confirmingId, setConfirmingId] = useState(null);

  // Notification preferences
  const [notifPedidos, setNotifPedidos] = useState(true);
  const [notifSorteos, setNotifSorteos] = useState(true);
  const [notifRanking, setNotifRanking] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);

  const handleRedeem = (reward) => {
    if (userPts < reward.costPts) return;
    if (reward.stock <= 0) return;

    setUserPts(prev => prev - reward.costPts);
    setRedeemHistory(prev => [{
      id: `RD-${Math.floor(1000 + Math.random() * 9000)}`,
      rewardName: reward.name,
      icon: reward.icon,
      costPts: reward.costPts,
      timestamp: 'Ahora mismo'
    }, ...prev]);
    setConfirmingId(null);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease]">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-sm font-pixel text-worker-accent mb-3 uppercase tracking-widest">
            Panel de Control
          </h2>
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <SettingsIcon className="w-9 h-9 text-worker-primary" />
            Ajustes & <span className="text-worker-primary">Canjes</span>
          </h1>
        </div>
        {/* Balance */}
        <div className="flex items-center gap-3 p-4 border border-[var(--cm-border)] bg-[rgba(124,58,237,0.08)]" style={{ borderRadius: '0px' }}>
          <Coins className="w-6 h-6 text-yellow-400" />
          <div>
            <span className="block text-[10px] text-worker-muted uppercase font-bold tracking-widest">Tu Balance KPI</span>
            <span className="text-2xl font-bold font-mono text-yellow-400">{userPts.toLocaleString()} pts</span>
          </div>
        </div>
      </header>

      {/* Section Toggle */}
      <nav className="flex gap-2">
        {[
          { key: 'canjear', label: 'Canjear Puntos', icon: <Gift className="w-3.5 h-3.5" /> },
          { key: 'historial', label: 'Historial', icon: <Ticket className="w-3.5 h-3.5" /> },
          { key: 'preferencias', label: 'Preferencias', icon: <User className="w-3.5 h-3.5" /> },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold uppercase tracking-wide transition-all border ${
              activeSection === s.key 
                ? 'bg-[rgba(124,58,237,0.2)] text-worker-primary border-[rgba(124,58,237,0.4)]' 
                : 'bg-transparent text-worker-muted border-[var(--cm-border)] hover:text-worker-text'
            }`}
            style={{ borderRadius: '0px' }}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </nav>

      {/* Section: Canjear Puntos */}
      {activeSection === 'canjear' && (
        <div className="space-y-6">
          <p className="text-sm text-worker-muted">
            Acumula puntos KPI completando pedidos, tareas de limpieza y manteniendo tu racha. Canjéalos aquí por tickets de sorteo, beneficios y merch exclusivo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {RAFFLE_REWARDS.map(reward => {
              const canAfford = userPts >= reward.costPts;
              const outOfStock = reward.stock <= 0;
              const isConfirming = confirmingId === reward.id;

              return (
                <div 
                  key={reward.id}
                  className="worker-card p-5 flex flex-col justify-between relative overflow-hidden"
                  style={{ borderRadius: '0px' }}
                >
                  {/* Category Tag */}
                  <div className="absolute top-0 right-0">
                    <span className={`text-[8px] font-bold uppercase px-2 py-0.5 ${
                      reward.category === 'premium' ? 'bg-yellow-400/20 text-yellow-400' :
                      reward.category === 'gaming' ? 'bg-orange-400/20 text-orange-400' :
                      reward.category === 'sorteo' ? 'bg-purple-400/20 text-purple-400' :
                      'bg-emerald-400/20 text-emerald-400'
                    }`}>
                      {reward.category}
                    </span>
                  </div>

                  <div>
                    <div className="text-3xl mb-3">{reward.icon}</div>
                    <h3 className="font-bold text-base mb-1">{reward.name}</h3>
                    <p className="text-xs text-worker-muted leading-relaxed">{reward.description}</p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[var(--cm-border)]">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-mono font-bold text-yellow-400 text-sm">{reward.costPts} pts</span>
                      <span className={`text-[10px] font-bold uppercase ${reward.stock <= 3 ? 'text-red-400' : 'text-worker-muted'}`}>
                        {reward.stock} disponibles
                      </span>
                    </div>

                    {isConfirming ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRedeem(reward)}
                          className="flex-1 py-2 text-xs font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-1"
                          style={{ borderRadius: '0px' }}
                        >
                          <Check className="w-3.5 h-3.5" /> Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="px-3 py-2 text-xs font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                          style={{ borderRadius: '0px' }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => canAfford && !outOfStock && setConfirmingId(reward.id)}
                        disabled={!canAfford || outOfStock}
                        className={`w-full py-2 text-xs font-bold uppercase tracking-wide border transition-all flex items-center justify-center gap-1.5 ${
                          !canAfford || outOfStock
                            ? 'bg-transparent text-worker-muted border-[var(--cm-border)] opacity-40 cursor-not-allowed'
                            : 'bg-[rgba(124,58,237,0.15)] text-worker-primary border-[rgba(124,58,237,0.3)] hover:bg-[rgba(124,58,237,0.25)]'
                        }`}
                        style={{ borderRadius: '0px' }}
                      >
                        {outOfStock ? (
                          <><AlertTriangle className="w-3.5 h-3.5" /> Agotado</>
                        ) : !canAfford ? (
                          <>Puntos Insuficientes</>
                        ) : (
                          <><Gift className="w-3.5 h-3.5" /> Canjear</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section: Historial */}
      {activeSection === 'historial' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Ticket className="w-5 h-5 text-worker-primary" /> Historial de Canjes
          </h3>

          {redeemHistory.length === 0 ? (
            <div 
              className="worker-card p-12 text-center"
              style={{ borderRadius: '0px' }}
            >
              <Gift className="w-12 h-12 text-worker-muted mx-auto mb-3 opacity-40" />
              <p className="text-worker-muted font-bold text-sm">Aún no has canjeado ningún premio</p>
              <p className="text-worker-muted text-xs mt-1">Tus canjes aparecerán aquí</p>
            </div>
          ) : (
            <div 
              className="worker-card divide-y divide-[var(--cm-border)]"
              style={{ borderRadius: '0px' }}
            >
              {redeemHistory.map(entry => (
                <div key={entry.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{entry.icon}</span>
                    <div>
                      <span className="font-bold text-sm">{entry.rewardName}</span>
                      <span className="block text-[10px] text-worker-muted font-bold uppercase">{entry.timestamp} — {entry.id}</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-red-400 text-sm">-{entry.costPts} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section: Preferencias */}
      {activeSection === 'preferencias' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Perfil */}
          <div className="worker-card p-6 space-y-5" style={{ borderRadius: '0px' }}>
            <h3 className="text-lg font-bold flex items-center gap-2 pb-2 border-b border-[var(--cm-border)]">
              <User className="w-5 h-5 text-worker-primary" /> Perfil de Operador
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-worker-muted tracking-widest mb-1">Nombre de Usuario</label>
                <input 
                  type="text" 
                  defaultValue="Ayni_Master" 
                  className="w-full p-2.5 bg-[rgba(0,0,0,0.3)] border border-[var(--cm-border)] text-sm font-bold text-worker-text outline-none focus:border-worker-primary transition-colors"
                  style={{ borderRadius: '0px' }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-worker-muted tracking-widest mb-1">Correo</label>
                <input 
                  type="email" 
                  defaultValue="ayni@housepotal.os" 
                  className="w-full p-2.5 bg-[rgba(0,0,0,0.3)] border border-[var(--cm-border)] text-sm font-bold text-worker-text outline-none focus:border-worker-primary transition-colors"
                  style={{ borderRadius: '0px' }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-worker-muted tracking-widest mb-1">Rol Asignado</label>
                <div className="p-2.5 bg-[rgba(0,0,0,0.3)] border border-[var(--cm-border)] text-sm font-bold text-worker-accent">
                  Operador Multi-Área (Cocina + Limpieza)
                </div>
              </div>
              <button 
                className="w-full py-2 text-xs font-bold uppercase bg-[rgba(124,58,237,0.15)] text-worker-primary border border-[rgba(124,58,237,0.3)] hover:bg-[rgba(124,58,237,0.25)] transition-colors"
                style={{ borderRadius: '0px' }}
              >
                Guardar Cambios
              </button>
            </div>
          </div>

          {/* Notificaciones y UI */}
          <div className="space-y-6">
            <div className="worker-card p-6 space-y-4" style={{ borderRadius: '0px' }}>
              <h3 className="text-lg font-bold flex items-center gap-2 pb-2 border-b border-[var(--cm-border)]">
                <Bell className="w-5 h-5 text-worker-accent" /> Notificaciones
              </h3>
              {[
                { label: 'Pedidos Nuevos', desc: 'Recibe alertas cuando entran pedidos de House Menu', value: notifPedidos, toggle: setNotifPedidos },
                { label: 'Sorteos y Premios', desc: 'Notificaciones de sorteos y resultados', value: notifSorteos, toggle: setNotifSorteos },
                { label: 'Cambios de Ranking', desc: 'Aviso cuando cambie tu posición en el ranking', value: notifRanking, toggle: setNotifRanking },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2">
                  <div>
                    <span className="font-bold text-sm">{item.label}</span>
                    <span className="block text-[10px] text-worker-muted">{item.desc}</span>
                  </div>
                  <button
                    onClick={() => item.toggle(!item.value)}
                    className={`w-12 h-6 border-2 relative transition-colors ${
                      item.value 
                        ? 'bg-worker-primary border-worker-primary' 
                        : 'bg-transparent border-[var(--cm-border)]'
                    }`}
                    style={{ borderRadius: '0px' }}
                  >
                    <div 
                      className={`w-4 h-4 bg-white absolute top-0.5 transition-all ${
                        item.value ? 'left-6' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div className="worker-card p-6 space-y-4" style={{ borderRadius: '0px' }}>
              <h3 className="text-lg font-bold flex items-center gap-2 pb-2 border-b border-[var(--cm-border)]">
                <Shield className="w-5 h-5 text-emerald-400" /> Interfaz
              </h3>
              {[
                { label: 'Modo Oscuro', desc: 'Interfaz optimizada para trabajo nocturno', icon: <Moon className="w-4 h-4" />, value: darkMode, toggle: setDarkMode },
                { label: 'Efectos de Sonido', desc: 'Sonidos al completar tareas y recibir pedidos', icon: <Volume2 className="w-4 h-4" />, value: soundEffects, toggle: setSoundEffects },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-worker-muted">{item.icon}</span>
                    <div>
                      <span className="font-bold text-sm">{item.label}</span>
                      <span className="block text-[10px] text-worker-muted">{item.desc}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => item.toggle(!item.value)}
                    className={`w-12 h-6 border-2 relative transition-colors ${
                      item.value 
                        ? 'bg-emerald-500 border-emerald-500' 
                        : 'bg-transparent border-[var(--cm-border)]'
                    }`}
                    style={{ borderRadius: '0px' }}
                  >
                    <div 
                      className={`w-4 h-4 bg-white absolute top-0.5 transition-all ${
                        item.value ? 'left-6' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

