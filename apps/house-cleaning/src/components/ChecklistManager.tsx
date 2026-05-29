import React from 'react';
import { TrendingUp, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChores, Chore } from '../services/cleaningService';

interface ChecklistManagerProps {
  chores: AreaChores;
  activeArea: string;
  setActiveArea: (area: string) => void;
  onToggleChore: (area: string, id: string, completed: boolean, areaChores: Chore[]) => void;
}

export default function ChecklistManager({ chores, activeArea, setActiveArea, onToggleChore }: ChecklistManagerProps) {
  const currentAreaChores = chores[activeArea] || [];
  const completedCount = currentAreaChores.filter(c => c.completed).length;
  const progressPercent = currentAreaChores.length > 0 
    ? Math.round((completedCount / currentAreaChores.length) * 100) 
    : 0;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-[#1c1b1b] pb-4 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold uppercase">Tareas de Limpieza Diaria</h2>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">Completa tareas para acumular puntos KPI de eficiencia</p>
        </div>
        
        {/* Selector de Área */}
        <div className="flex flex-wrap gap-2">
          {Object.keys(chores).map(area => (
            <button
              key={area}
              onClick={() => setActiveArea(area)}
              className={`px-4 py-2 border-2 border-[#1c1b1b] font-bold text-xs uppercase rounded-none transition-all ${
                activeArea === area 
                  ? 'bg-[#059669] text-white shadow-[2px_2px_0px_0px_#1c1b1b]' 
                  : 'bg-white text-gray-600 hover:bg-gray-50 active:translate-y-0.5'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      {/* Barra de progreso unificada Neo-Brutalista */}
      <div className="mb-8 bg-[#fcf9f8] border-2 border-[#1c1b1b] p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-[#059669]" />
          <div>
            <h4 className="font-bold text-sm uppercase">Progreso del Área ({activeArea})</h4>
            <p className="text-xs text-gray-500 font-bold uppercase">{completedCount} de {currentAreaChores.length} tareas completadas</p>
          </div>
        </div>
        
        <div className="w-full md:w-96 flex items-center gap-3">
          <div className="flex-grow bg-white border-2 border-[#1c1b1b] h-5 rounded-none overflow-hidden">
            <motion.div 
              className="bg-[#059669] h-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          <span className="font-bold font-mono text-sm">{progressPercent}%</span>
        </div>
      </div>

      {/* Mensaje de completado total */}
      <AnimatePresence>
        {progressPercent === 100 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="mb-6 p-4 bg-emerald-100 border-2 border-emerald-400 flex items-center gap-3 text-emerald-800 font-bold text-xs uppercase rounded-none"
          >
            <CheckCircle className="w-6 h-6 shrink-0" />
            <span>¡EXCELENTE! Has completado el 100% de la limpieza en el área {activeArea}. KPI acumulado de +50 puntos de rendimiento.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listado de tareas del área activa */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {currentAreaChores.map(chore => (
            <motion.div 
              key={chore.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => onToggleChore(activeArea, chore.id, !chore.completed, currentAreaChores)}
              className={`p-4 border-2 border-[#1c1b1b] flex justify-between items-center cursor-pointer transition-all rounded-none ${
                chore.completed 
                  ? 'bg-emerald-50/40 border-gray-300 text-gray-400 line-through' 
                  : 'bg-white shadow-[2px_2px_0px_0px_#1c1b1b] hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-6 h-6 border-2 border-[#1c1b1b] flex items-center justify-center font-bold text-xs rounded-none transition-colors ${
                  chore.completed ? 'bg-[#059669] text-white border-emerald-600' : 'bg-white'
                }`}>
                  {chore.completed && '✓'}
                </div>
                <span className="font-bold text-sm uppercase">{chore.task}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 border border-[#1c1b1b] uppercase rounded-none transition-colors ${
                chore.completed ? 'bg-gray-100 border-gray-300 text-gray-400' : 'bg-emerald-100 text-emerald-800'
              }`}>
                +{chore.points} pts
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
