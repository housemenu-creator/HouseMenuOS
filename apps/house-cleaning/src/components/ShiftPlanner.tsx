import React, { useState } from 'react';
import { Calendar, Plus, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shift } from '../services/cleaningService';

interface ShiftPlannerProps {
  shifts: Shift[];
  onSaveShifts: (shifts: Shift[]) => void;
}

export default function ShiftPlanner({ shifts, onSaveShifts }: ShiftPlannerProps) {
  const [newCleaner, setNewCleaner] = useState('');
  const [newArea, setNewArea] = useState('Cocina y Despensa');
  const [newDay, setNewDay] = useState('Lunes');
  const [newTime, setNewTime] = useState('08:00 - 10:00');

  const agregarTurno = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCleaner.trim()) return;

    const nuevo: Shift = {
      day: newDay,
      cleaner: newCleaner,
      area: newArea,
      time: newTime,
    };

    // Filtrar el anterior del mismo día e insertar el nuevo ordenando por día de la semana
    const filtered = shifts.filter(s => s.day !== newDay);
    const updated = [...filtered, nuevo].sort((a, b) => {
      const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      return days.indexOf(a.day) - days.indexOf(b.day);
    });

    onSaveShifts(updated);
    setNewCleaner('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Listado de Turnos */}
      <div className="lg:col-span-8">
        <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-[#735c00]" /> Programación de Turnos Semanales
        </h2>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {shifts.map((shift, idx) => (
              <motion.div 
                key={shift.day}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`p-4 border-2 border-[#1c1b1b] flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white ${
                  shift.cleaner === 'Descanso General' ? 'opacity-50 border-dashed bg-gray-50' : 'shadow-[2px_2px_0px_0px_#1c1b1b]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 border border-[#1c1b1b] flex items-center justify-center font-bold text-xs uppercase rounded-none">
                    {shift.day.slice(0, 3)}
                  </div>
                  <div>
                    <div className="font-bold text-sm uppercase">{shift.area}</div>
                    <div className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {shift.time}
                    </div>
                  </div>
                </div>
                <div className="bg-emerald-50 text-[#059669] border border-emerald-300 font-bold px-3 py-1 text-xs uppercase rounded-none">
                  🧑‍🌾 {shift.cleaner}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Registro Rápido de Turno */}
      <div className="lg:col-span-4 bg-[#fcf9f8] border-2 border-[#1c1b1b] p-6 shadow-none">
        <h3 className="text-lg font-bold uppercase mb-4 pb-2 border-b border-[#1c1b1b] flex items-center gap-2">
          <Plus className="w-5 h-5" /> Asignar Nuevo Turno
        </h3>
        <form onSubmit={agregarTurno} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Responsable</label>
            <input 
              type="text" 
              value={newCleaner}
              onChange={e => setNewCleaner(e.target.value)}
              placeholder="Nombre del personal"
              className="w-full p-2 border border-[#1c1b1b] font-semibold text-sm outline-none rounded-none focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">Día</label>
            <select 
              value={newDay}
              onChange={e => setNewDay(e.target.value)}
              className="w-full p-2 border border-[#1c1b1b] font-bold text-sm bg-white outline-none rounded-none"
            >
              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">Área Asignada</label>
            <select 
              value={newArea}
              onChange={e => setNewArea(e.target.value)}
              className="w-full p-2 border border-[#1c1b1b] font-bold text-sm bg-white outline-none rounded-none"
            >
              <option value="Cocina y Despensa">Cocina y Despensa</option>
              <option value="Baños Principales">Baños Principales</option>
              <option value="Comedor y Salón">Comedor y Salón</option>
              <option value="Patio y Parrilla">Patio y Parrilla</option>
              <option value="Habitaciones">Habitaciones</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">Hora Estimada</label>
            <input 
              type="text" 
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              placeholder="Ej. 09:00 - 11:30"
              className="w-full p-2 border border-[#1c1b1b] font-mono text-sm outline-none rounded-none focus:bg-white"
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-[#059669] text-white border-2 border-[#1c1b1b] py-2 text-xs font-bold uppercase tracking-wide shadow-[4px_4px_0px_0px_#1c1b1b] hover:bg-[#047857] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all rounded-none"
          >
            📝 Programar Turno
          </button>
        </form>
      </div>
    </div>
  );
}
