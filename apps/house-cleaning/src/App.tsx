import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, CheckSquare, Package, Clock } from 'lucide-react';
import { NexusSidebar } from '@house/ui';

import { cleaningService, Shift, AreaChores, Supply } from './services/cleaningService';
import ShiftPlanner from './components/ShiftPlanner';
import ChecklistManager from './components/ChecklistManager';
import InventoryManager from './components/InventoryManager';

export function App() {
  const [activeTab, setActiveTab] = useState<'turnos' | 'checklist' | 'insumos'>('checklist');
  const [activeArea, setActiveArea] = useState<string>('Cocina');

  // Firebase Realtime DB states
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [chores, setChores] = useState<AreaChores>({});
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to Firebase RTDB nodes
  useEffect(() => {
    let unsubShifts: () => void;
    let unsubChores: () => void;
    let unsubSupplies: () => void;

    try {
      unsubShifts = cleaningService.subscribeToShifts((data) => {
        setShifts(data);
      });

      unsubChores = cleaningService.subscribeToChores((data) => {
        setChores(data);
      });

      unsubSupplies = cleaningService.subscribeToSupplies((data) => {
        setSupplies(data);
        setLoading(false);
      });
    } catch (error) {
      console.error('Firebase Subscription Error:', error);
      setLoading(false);
    }

    return () => {
      if (unsubShifts) unsubShifts();
      if (unsubChores) unsubChores();
      if (unsubSupplies) unsubSupplies();
    };
  }, []);

  // Update handlers
  const handleSaveShifts = async (updatedShifts: Shift[]) => {
    try {
      await cleaningService.saveShifts(updatedShifts);
    } catch (err) {
      console.error('Error saving shifts:', err);
    }
  };

  const handleToggleChore = async (area: string, id: string, completed: boolean, areaChores: any[]) => {
    try {
      await cleaningService.toggleChore(area, id, completed, areaChores);
    } catch (err) {
      console.error('Error toggling chore:', err);
    }
  };

  const handleModSupplyQty = async (id: string, newQty: number, currentSupplies: Supply[]) => {
    try {
      await cleaningService.updateSupplyQty(id, newQty, currentSupplies);
    } catch (err) {
      console.error('Error updating supply:', err);
    }
  };

  // Calculations for KPI points
  const totalChoresCount = Object.values(chores).flat().length;
  const completedChoresCount = Object.values(chores).flat().filter(c => c.completed).length;
  const totalKPIPoints = Object.values(chores)
    .flat()
    .filter(c => c.completed)
    .reduce((acc, curr) => acc + curr.points, 0);

  const generalEfficiency = totalChoresCount > 0 
    ? Math.round((completedChoresCount / totalChoresCount) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen text-[#1c1b1b] bg-[#fcf9f8] font-sans items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-[#735c00] border-t-transparent mx-auto"></div>
          <p className="text-xs font-bold uppercase tracking-widest font-mono">Conectando con Ayni DB...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen text-[#1c1b1b] bg-[#fcf9f8] font-sans">
      {/* Sidebar unificada */}
      <NexusSidebar activeApp="cleaning" />

      {/* Canvas */}
      <main className="flex-grow pl-20 lg:pl-64 p-6 md:p-12 transition-all">
        {/* Encabezado Neo-Brutalist */}
        <header className="mb-10 border-b-4 border-[#1c1b1b] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#059669] text-white px-2 py-1 text-xs font-bold uppercase border-2 border-[#1c1b1b]">Mantenimiento</span>
              <span className="bg-[#735c00] text-white px-2 py-1 text-xs font-bold uppercase border-2 border-[#1c1b1b]">Limpieza</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase font-mono">Control de Limpieza</h1>
            <p className="text-sm font-bold text-gray-600 uppercase tracking-widest mt-1">Planificador de Mantenimiento y Turnos Operativos</p>
          </div>

          {/* Estadísticas rápidas */}
          <div className="flex gap-4">
            <div className="bg-white p-3 border-2 border-[#1c1b1b] shadow-[4px_4px_0px_0px_#1c1b1b] flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-400 border-2 border-[#1c1b1b] flex items-center justify-center font-bold">🧹</div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase">Eficiencia General</div>
                <div className="text-lg font-bold font-mono">{generalEfficiency}%</div>
              </div>
            </div>

            <div className="bg-amber-100 p-3 border-2 border-[#1c1b1b] shadow-[4px_4px_0px_0px_#1c1b1b] flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-400 border-2 border-[#1c1b1b] flex items-center justify-center font-bold">✨</div>
              <div>
                <div className="text-[10px] font-bold text-amber-800 uppercase">Puntos KPI</div>
                <div className="text-lg font-bold font-mono text-amber-800">{totalKPIPoints} pts</div>
              </div>
            </div>
          </div>
        </header>

        {/* Pestañas de Navegación */}
        <nav className="flex flex-wrap border-b-4 border-[#1c1b1b] mb-8">
          {(['turnos', 'checklist', 'insumos'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold text-sm uppercase border-t-2 border-x-2 border-[#1c1b1b] -mb-1 transition-all mr-2 rounded-none ${
                activeTab === tab 
                  ? 'bg-white border-b-4 border-b-white translate-y-0.5' 
                  : 'bg-[#fcf9f8]/40 text-gray-500 border-b-2 border-b-[#1c1b1b] hover:bg-white/50'
              }`}
            >
              {tab === 'turnos' && <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Calendario de Turnos</div>}
              {tab === 'checklist' && <div className="flex items-center gap-2"><CheckSquare className="w-4 h-4" /> Checklist Diario</div>}
              {tab === 'insumos' && <div className="flex items-center gap-2"><Package className="w-4 h-4" /> Stock de Insumos</div>}
            </button>
          ))}
        </nav>

        {/* Caja de Contenido Tab */}
        <section className="bg-white border-4 border-[#1c1b1b] p-6 md:p-8 min-h-[400px] shadow-[8px_8px_0px_0px_#1c1b1b]">
          {activeTab === 'turnos' && (
            <ShiftPlanner shifts={shifts} onSaveShifts={handleSaveShifts} />
          )}

          {activeTab === 'checklist' && (
            <ChecklistManager 
              chores={chores} 
              activeArea={activeArea} 
              setActiveArea={setActiveArea} 
              onToggleChore={handleToggleChore} 
            />
          )}

          {activeTab === 'insumos' && (
            <InventoryManager supplies={supplies} onModSupplyQty={handleModSupplyQty} />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
