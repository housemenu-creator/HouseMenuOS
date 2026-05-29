import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Ticket, LedgerEntry, Supply } from '../services/laundryService';

interface LoadRegisterProps {
  supplies: Supply[];
  tickets: Ticket[];
  ledger: LedgerEntry[];
  onRegisterLoad: (
    ticket: Ticket,
    gastoEntry: LedgerEntry,
    updatedSupplies: Supply[],
    currentTickets: Ticket[],
    currentLedger: LedgerEntry[]
  ) => void;
}

export default function LoadRegister({ supplies, tickets, ledger, onRegisterLoad }: LoadRegisterProps) {
  const [owner, setOwner] = useState('');
  const [pieces, setPieces] = useState<number>(5);
  const [weight, setWeight] = useState<number>(2.0);
  const [sensitivity, setSensitivity] = useState<'Delicada' | 'Algodón' | 'Lana/Invierno' | 'Sintético'>('Algodón');
  const [category, setCategory] = useState<'Regular' | 'Expreso' | 'En Seco'>('Regular');
  const [colors, setColors] = useState<'Blancas' | 'Oscuras' | 'Mixto'>('Mixto');

  // Calcular tarifa estimada
  let baseRate = 4.0; // por kg
  if (category === 'En Seco') baseRate = 8.0;
  if (category === 'Expreso') baseRate = 6.0;

  let sensitivityMult = 1.0;
  if (sensitivity === 'Delicada') sensitivityMult = 1.3;
  if (sensitivity === 'Lana/Invierno') sensitivityMult = 1.2;

  const calculatedCost = Math.round((weight * baseRate * sensitivityMult) * 10) / 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner.trim()) return;

    const newTicketId = `TK-${Math.floor(100 + Math.random() * 900)}`;

    const nuevoTicket: Ticket = {
      id: newTicketId,
      owner,
      pieces,
      weight,
      sensitivity,
      category,
      colors,
      status: 'Pendiente',
      cost: calculatedCost,
      timestamp: 'Ahora mismo'
    };

    // Calcular gasto e insumos estimados
    const detCost = Math.round((weight * 0.4) * 10) / 10;
    const nuevoGasto: LedgerEntry = {
      id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
      ticketId: newTicketId,
      owner: 'Sistema',
      type: 'Gasto',
      amount: detCost,
      description: `Consumo Insumos estimado para ${newTicketId}`,
      timestamp: 'Ahora mismo'
    };

    // Descontar químicos del stock local
    const updatedSupplies = supplies.map(sup => {
      if (sup.id === 'l1') { // Detergente
        return { ...sup, qty: Math.max(0, Math.round((sup.qty - weight * 0.05) * 10) / 10) };
      }
      if (sup.id === 'l2') { // Suavizante
        return { ...sup, qty: Math.max(0, Math.round((sup.qty - weight * 0.03) * 10) / 10) };
      }
      return sup;
    });

    onRegisterLoad(nuevoTicket, nuevoGasto, updatedSupplies, tickets, ledger);

    // Resetear formulario
    setOwner('');
    setPieces(5);
    setWeight(2.0);
    setSensitivity('Algodón');
    setCategory('Regular');
    setColors('Mixto');
  };

  return (
    <div className="max-w-2xl mx-auto bg-[#fcf9f8] border-2 border-[#1c1b1b] p-6 md:p-8 rounded-none">
      <h2 className="text-2xl font-bold uppercase mb-6 pb-2 border-b-2 border-[#1c1b1b] flex items-center gap-2">
        <Plus className="w-6 h-6 text-[#a93818]" /> Registrar Nueva Carga de Ropa
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Responsable / Dueño */}
        <div>
          <label className="block text-xs font-bold uppercase mb-2">Responsable / Dueño de las Prendas</label>
          <input
            type="text"
            required
            placeholder="Ej. Chaski_Digital o Kuntur_AI"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="w-full p-3 border-2 border-[#1c1b1b] text-sm font-semibold outline-none focus:bg-white rounded-none"
          />
        </div>

        {/* 2. Cantidad y Peso */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Cantidad de Prendas (Piezas estimadas)</label>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setPieces(p => Math.max(1, p - 1))}
                className="bg-white border-2 border-r-0 border-[#1c1b1b] px-3 py-2 font-bold hover:bg-gray-100 rounded-none transition-colors"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={pieces}
                onChange={(e) => setPieces(parseInt(e.target.value) || 1)}
                className="w-full p-2 border-2 border-[#1c1b1b] text-center font-bold text-sm outline-none rounded-none focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setPieces(p => p + 1)}
                className="bg-white border-2 border-l-0 border-[#1c1b1b] px-3 py-2 font-bold hover:bg-gray-100 rounded-none transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-2">Peso Estimado (Kilos)</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 font-bold text-xs uppercase text-gray-400">kg</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 1.0)}
                className="w-full p-2.5 pl-3 pr-10 border-2 border-[#1c1b1b] font-mono font-bold text-sm outline-none focus:bg-white rounded-none"
              />
            </div>
          </div>
        </div>

        {/* 3. Sensibilidad, Categoría y Tonos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Sensibilidad Tejido</label>
            <select
              value={sensitivity}
              onChange={(e) => setSensitivity(e.target.value as any)}
              className="w-full p-2.5 border-2 border-[#1c1b1b] font-bold text-xs bg-white outline-none rounded-none"
            >
              <option value="Algodón">Algodón / Regular</option>
              <option value="Delicada">Delicada / Seda</option>
              <option value="Lana/Invierno">Lana / Pesado</option>
              <option value="Sintético">Sintético / Deportivo</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-2">Tipo de Servicio</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full p-2.5 border-2 border-[#1c1b1b] font-bold text-xs bg-white outline-none rounded-none"
            >
              <option value="Regular">Regular (Standard)</option>
              <option value="Expreso">Expreso (Rápido)</option>
              <option value="En Seco">Limpieza en Seco</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-2">Separación de Tonos</label>
            <select
              value={colors}
              onChange={(e) => setColors(e.target.value as any)}
              className="w-full p-2.5 border-2 border-[#1c1b1b] font-bold text-xs bg-white outline-none rounded-none"
            >
              <option value="Mixto">Mixto (Colores)</option>
              <option value="Blancas">Blancas (Luz)</option>
              <option value="Oscuras">Oscuras (Negro)</option>
            </select>
          </div>
        </div>

        {/* Resumen Costo Estimado */}
        <div className="bg-yellow-50 border-2 border-dashed border-[#1c1b1b] p-4 flex justify-between items-center rounded-none">
          <div>
            <span className="block text-[10px] font-bold text-yellow-800 uppercase">Tarifa Estimada</span>
            <span className="text-xs font-semibold text-gray-500 uppercase">Calculado bajo demanda de insumos</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-mono text-[#a93818]">${calculatedCost}</span>
          </div>
        </div>

        {/* Registrar Button */}
        <button
          type="submit"
          className="w-full bg-[#a93818] text-white border-2 border-[#1c1b1b] py-3 text-sm font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_#1c1b1b] hover:bg-[#8f2d12] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all rounded-none"
        >
          📝 Ingresar al Pipeline & Emitir Ticket
        </button>

      </form>
    </div>
  );
}
