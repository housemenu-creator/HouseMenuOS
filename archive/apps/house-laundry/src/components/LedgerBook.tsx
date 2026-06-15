import React from 'react';
import { Droplet, AlertTriangle, Coins } from 'lucide-react';
import { Supply, LedgerEntry } from '../services/laundryService';

interface LedgerBookProps {
  supplies: Supply[];
  ledger: LedgerEntry[];
  onModSupplyQty: (id: string, newQty: number, currentSupplies: Supply[]) => void;
}

export default function LedgerBook({ supplies, ledger, onModSupplyQty }: LedgerBookProps) {
  // Cálculos financieros
  const totalIngresos = ledger.filter(l => l.type === 'Ingreso').reduce((acc, curr) => acc + curr.amount, 0);
  const totalGastos = ledger.filter(l => l.type === 'Gasto').reduce((acc, curr) => acc + curr.amount, 0);
  const balanceNeto = Math.round((totalIngresos - totalGastos) * 10) / 10;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* Inventario de Insumos */}
      <div className="lg:col-span-6 space-y-6">
        <h3 className="text-xl font-bold uppercase pb-2 border-b border-[#1c1b1b] flex items-center gap-2">
          <Droplet className="w-5 h-5 text-blue-500" /> Insumos Químicos & Empaques
        </h3>

        <div className="space-y-3">
          {supplies.map(sup => {
            const isLow = sup.qty <= sup.minQty;
            return (
              <div 
                key={sup.id}
                className={`p-4 border-2 border-[#1c1b1b] flex justify-between items-center rounded-none transition-all ${
                  isLow ? 'bg-red-50 border-red-500 shadow-[2px_2px_0px_0px_#ef4444]' : 'bg-white shadow-[2px_2px_0px_0px_#1c1b1b]'
                }`}
              >
                <div>
                  <div className="font-bold text-sm uppercase flex items-center gap-2">
                    {sup.name}
                    {isLow && (
                      <span className="bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 border border-[#1c1b1b] uppercase flex items-center gap-0.5 rounded-none shrink-0">
                        <AlertTriangle className="w-2.5 h-2.5" /> REABASTECER
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">
                    Mínimo: {sup.minQty} {sup.unit} | Costo unitario: ${sup.costPerUnit}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-base bg-gray-50 border border-[#1c1b1b] px-3 py-1 min-w-[60px] text-center rounded-none">
                    {sup.qty} {sup.unit}
                  </span>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => onModSupplyQty(sup.id, sup.qty + (sup.unit === 'uds' ? 10 : 0.5), supplies)}
                      className="bg-white border border-[#1c1b1b] p-1 text-xs hover:bg-gray-100 rounded-none transition-colors"
                      aria-label="Incrementar stock"
                    >
                      +
                    </button>
                    <button
                      onClick={() => onModSupplyQty(sup.id, sup.qty - (sup.unit === 'uds' ? 10 : 0.5), supplies)}
                      className="bg-white border border-[#1c1b1b] p-1 text-xs hover:bg-gray-100 rounded-none transition-colors"
                      aria-label="Decrementar stock"
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bitácora de Caja Ayni */}
      <div className="lg:col-span-6 space-y-6">
        <h3 className="text-xl font-bold uppercase pb-2 border-b border-[#1c1b1b] flex items-center gap-2">
          <Coins className="w-5 h-5 text-yellow-500" /> Bitácora Contable y Costos
        </h3>

        <div className="bg-[#fcf9f8] border-2 border-[#1c1b1b] p-4 flex justify-between items-center mb-4 rounded-none">
          <div>
            <span className="block text-[10px] font-bold text-gray-500 uppercase">Ingresos</span>
            <span className="font-mono font-bold text-emerald-600 text-lg">+${totalIngresos}</span>
          </div>
          <div className="border-r border-gray-300 h-10"></div>
          <div>
            <span className="block text-[10px] font-bold text-gray-500 uppercase">Gastos</span>
            <span className="font-mono font-bold text-red-600 text-lg">-${totalGastos}</span>
          </div>
          <div className="border-r border-gray-300 h-10"></div>
          <div>
            <span className="block text-[10px] font-bold text-gray-500 uppercase">Caja Neta</span>
            <span className={`font-mono font-bold text-lg ${balanceNeto >= 0 ? 'text-[#735c00]' : 'text-red-700'}`}>
              ${balanceNeto}
            </span>
          </div>
        </div>

        <div className="border-2 border-[#1c1b1b] bg-white divide-y-2 divide-[#1c1b1b] max-h-80 overflow-y-auto rounded-none">
          {ledger.map(entry => {
            const isIncome = entry.type === 'Ingreso';
            return (
              <div key={entry.id} className="p-3 flex justify-between items-center text-xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isIncome ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    <span className="font-bold uppercase text-gray-600">{entry.description}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 block">{entry.timestamp} | Ticket: {entry.ticketId}</span>
                </div>
                <span className={`font-mono font-bold text-sm ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isIncome ? `+$${entry.amount}` : `-$${entry.amount}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
