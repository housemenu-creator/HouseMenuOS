import React from 'react';
import { Package, AlertTriangle, Plus, Minus } from 'lucide-react';
import { Supply } from '../services/cleaningService';

interface InventoryManagerProps {
  supplies: Supply[];
  onModSupplyQty: (id: string, newQty: number, currentSupplies: Supply[]) => void;
}

export default function InventoryManager({ supplies, onModSupplyQty }: InventoryManagerProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2 pb-2 border-b-2 border-[#1c1b1b]">
        <Package className="w-6 h-6 text-[#735c00]" /> Inventario de Productos y Materiales
      </h2>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest leading-relaxed mb-6">
        Monitorea el inventario crítico de limpieza. Modifica el stock según uso y recibe notificaciones inmediatas si la existencia de un insumo es inferior al stock mínimo recomendado.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {supplies.map(item => {
          const isLowStock = item.qty <= item.minQty;
          
          return (
            <div 
              key={item.id}
              className={`p-5 border-2 border-[#1c1b1b] flex justify-between items-center rounded-none transition-all ${
                isLowStock 
                  ? 'bg-[#a93818]/5 border-[#a93818] shadow-[4px_4px_0px_0px_#a93818]' 
                  : 'bg-white shadow-[4px_4px_0px_0px_#1c1b1b]'
              }`}
            >
              <div className="space-y-1">
                <div className="font-bold text-sm uppercase flex items-center gap-2">
                  {item.name}
                  {isLowStock && (
                    <span className="bg-[#a93818] text-white text-[8px] font-bold px-1.5 py-0.5 uppercase flex items-center gap-0.5 border border-[#1c1b1b] rounded-none shrink-0">
                      <AlertTriangle className="w-2.5 h-2.5" /> STOCK BAJO
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 uppercase font-mono">
                  Stock mínimo recomendado: {item.minQty} {item.unit}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold font-mono bg-[#fcf9f8] px-3 py-1 border border-[#1c1b1b] text-center min-w-[70px] rounded-none">
                  {item.qty}
                </span>
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => onModSupplyQty(item.id, item.qty + 1, supplies)}
                    className="bg-white border border-[#1c1b1b] p-1.5 hover:bg-gray-100 active:translate-y-0.5 transition-all rounded-none"
                    aria-label="Aumentar stock"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => onModSupplyQty(item.id, item.qty - 1, supplies)}
                    className="bg-white border border-[#1c1b1b] p-1.5 hover:bg-gray-100 active:translate-y-0.5 transition-all rounded-none"
                    aria-label="Disminuir stock"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
