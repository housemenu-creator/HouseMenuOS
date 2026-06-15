import React, { useState } from 'react';
import { Search, ArrowRight, CheckCircle, Check, Shirt } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket } from '../services/laundryService';

interface TicketPipelineProps {
  tickets: Ticket[];
  onAdvanceStatus: (ticketId: string, currentStatus: Ticket['status']) => void;
}

export default function TicketPipeline({ tickets, onAdvanceStatus }: TicketPipelineProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTickets = tickets.filter(t => 
    t.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Buscador y Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pb-4 border-b border-[#1c1b1b]">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" />
          </span>
          <input
            type="text"
            placeholder="Buscar ticket u owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 p-2 border-2 border-[#1c1b1b] text-sm font-semibold outline-none rounded-none focus:bg-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500 uppercase">
          <span>Estados:</span>
          <span className="bg-gray-100 border border-gray-300 px-2 py-0.5">Pendiente</span>
          <span className="bg-blue-100 border border-blue-300 text-blue-800 px-2 py-0.5">Lavado/Secado</span>
          <span className="bg-amber-100 border border-amber-300 text-amber-800 px-2 py-0.5">Planchado</span>
          <span className="bg-emerald-100 border border-emerald-300 text-emerald-800 px-2 py-0.5">Listo</span>
        </div>
      </div>

      {/* Grid de Tickets */}
      {filteredTickets.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-[#1c1b1b] bg-gray-50 rounded-none">
          <p className="text-sm font-bold text-gray-500 uppercase">No se encontraron tickets en el pipeline</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredTickets.map(ticket => {
              const isDelivered = ticket.status === 'Entregado';
              const isReady = ticket.status === 'Listo';

              // Colores por estado
              let statusBg = 'bg-gray-100 text-gray-800 border-gray-300';
              if (ticket.status === 'Lavado') statusBg = 'bg-sky-100 text-sky-800 border-sky-300';
              if (ticket.status === 'Secado') statusBg = 'bg-blue-100 text-blue-800 border-blue-300';
              if (ticket.status === 'Planchado') statusBg = 'bg-amber-100 text-amber-800 border-amber-300';
              if (ticket.status === 'Listo') statusBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              if (ticket.status === 'Entregado') statusBg = 'bg-gray-200 text-gray-500 border-gray-200 line-through';

              return (
                <motion.div 
                  key={ticket.id} 
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className={`border-2 border-[#1c1b1b] p-5 bg-white relative flex flex-col justify-between rounded-none ${
                    isDelivered ? 'opacity-60 bg-gray-50' : 'shadow-[4px_4px_0px_0px_#1c1b1b]'
                  }`}
                >
                  {/* Cabecera Ticket */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base bg-yellow-100 border border-[#1c1b1b] px-1.5 py-0.5 rounded-none">{ticket.id}</span>
                        <span className="text-xs text-gray-500 font-bold uppercase">{ticket.timestamp}</span>
                      </div>
                      <h3 className="text-lg font-bold uppercase mt-1">🧑‍🌾 {ticket.owner}</h3>
                    </div>
                    
                    <div className={`px-3 py-1 text-xs font-bold uppercase border rounded-none ${statusBg}`}>
                      {ticket.status}
                    </div>
                  </div>

                  {/* Detalle Técnico */}
                  <div className="grid grid-cols-3 gap-2 border-t-2 border-b-2 border-dashed border-[#1c1b1b] py-3 my-3 bg-[#fcf9f8] rounded-none">
                    <div className="text-center border-r border-[#1c1b1b]">
                      <span className="block text-[9px] font-bold text-gray-400 uppercase">Prendas</span>
                      <span className="font-bold text-sm">{ticket.pieces} uds</span>
                    </div>
                    <div className="text-center border-r border-[#1c1b1b]">
                      <span className="block text-[9px] font-bold text-gray-400 uppercase">Peso</span>
                      <span className="font-bold text-sm font-mono">{ticket.weight} kg</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[9px] font-bold text-gray-400 uppercase">Costo</span>
                      <span className="font-bold text-sm font-mono text-[#a93818]">${ticket.cost}</span>
                    </div>
                  </div>

                  {/* Atributos Especiales */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-[#1c1b1b] uppercase rounded-none">🧼 {ticket.sensitivity}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-[#1c1b1b] uppercase rounded-none">⚡ {ticket.category}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-[#1c1b1b] uppercase rounded-none">🎨 {ticket.colors}</span>
                  </div>

                  {/* Acciones del Pipeline */}
                  {!isDelivered && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Siguiente etapa:</span>
                      <button
                        onClick={() => onAdvanceStatus(ticket.id, ticket.status)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase border-2 border-[#1c1b1b] text-white transition-all shadow-[2px_2px_0px_0px_#1c1b1b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none rounded-none ${
                          isReady ? 'bg-[#059669] hover:bg-[#047857]' : 'bg-[#366287] hover:bg-[#2b4e6c]'
                        }`}
                      >
                        {isReady ? (
                          <>Entregar Carga <CheckCircle className="w-3.5 h-3.5" /></>
                        ) : (
                          <>Avanzar Status <ArrowRight className="w-3.5 h-3.5" /></>
                        )}
                      </button>
                    </div>
                  )}
                  {isDelivered && (
                    <div className="mt-4 pt-2 border-t border-gray-100 text-center">
                      <span className="text-xs font-bold text-[#059669] uppercase flex items-center justify-center gap-1">
                        <Check className="w-4 h-4" /> Entregado con éxito y cobrado
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
