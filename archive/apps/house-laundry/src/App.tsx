import React, { useState, useEffect } from 'react';
import { Shirt, Plus, Droplet, Coins } from 'lucide-react';
import { NexusSidebar } from '@house/ui';

import { laundryService, Ticket, Supply, LedgerEntry } from './services/laundryService';
import TicketPipeline from './components/TicketPipeline';
import LoadRegister from './components/LoadRegister';
import LedgerBook from './components/LedgerBook';

export function App() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'registro' | 'insumos'>('tickets');

  // Firebase Realtime DB states
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to Firebase RTDB nodes
  useEffect(() => {
    let unsubTickets: () => void;
    let unsubSupplies: () => void;
    let unsubLedger: () => void;

    try {
      unsubTickets = laundryService.subscribeToTickets((data) => {
        setTickets(data);
      });

      unsubSupplies = laundryService.subscribeToSupplies((data) => {
        setSupplies(data);
      });

      unsubLedger = laundryService.subscribeToLedger((data) => {
        setLedger(data);
        setLoading(false);
      });
    } catch (error) {
      console.error('Firebase Subscription Error:', error);
      setLoading(false);
    }

    return () => {
      if (unsubTickets) unsubTickets();
      if (unsubSupplies) unsubSupplies();
      if (unsubLedger) unsubLedger();
    };
  }, []);

  // Update handlers
  const handleRegisterLoad = async (
    ticket: Ticket,
    gastoEntry: LedgerEntry,
    updatedSupplies: Supply[],
    currentTickets: Ticket[],
    currentLedger: LedgerEntry[]
  ) => {
    try {
      await laundryService.registerLoad(ticket, gastoEntry, updatedSupplies, currentTickets, currentLedger);
      setActiveTab('tickets');
    } catch (err) {
      console.error('Error registering load:', err);
    }
  };

  const handleAdvanceStatus = async (ticketId: string, currentStatus: Ticket['status']) => {
    const statusOrder: Ticket['status'][] = ['Pendiente', 'Lavado', 'Secado', 'Planchado', 'Listo', 'Entregado'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex === statusOrder.length - 1) return;
    const nextStatus = statusOrder[currentIndex + 1];

    let incomeEntry: LedgerEntry | null = null;
    const ticket = tickets.find(t => t.id === ticketId);

    if (nextStatus === 'Entregado' && ticket) {
      incomeEntry = {
        id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
        ticketId,
        owner: ticket.owner,
        type: 'Ingreso',
        amount: ticket.cost,
        description: `Cobro Ticket ${ticketId} - ${ticket.owner}`,
        timestamp: 'Ahora mismo'
      };
    }

    try {
      await laundryService.advanceTicketStatus(ticketId, nextStatus, incomeEntry, tickets, ledger);
    } catch (err) {
      console.error('Error advancing status:', err);
    }
  };

  const handleModSupplyQty = async (id: string, newQty: number, currentSupplies: Supply[]) => {
    try {
      await laundryService.updateSupplyQty(id, newQty, currentSupplies);
    } catch (err) {
      console.error('Error updating supply:', err);
    }
  };

  // Financial aggregates
  const totalIngresos = ledger.filter(l => l.type === 'Ingreso').reduce((acc, curr) => acc + curr.amount, 0);
  const totalGastos = ledger.filter(l => l.type === 'Gasto').reduce((acc, curr) => acc + curr.amount, 0);
  const balanceNeto = Math.round((totalIngresos - totalGastos) * 10) / 10;

  // Operational aggregates
  const kilosLavadosHoy = tickets
    .filter(t => t.status !== 'Pendiente')
    .reduce((acc, curr) => acc + curr.weight, 0);

  const ticketsActivos = tickets.filter(t => t.status !== 'Entregado').length;

  if (loading) {
    return (
      <div className="flex min-h-screen text-[#1c1b1b] bg-[#fcf9f8] font-sans items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-[#a93818] border-t-transparent mx-auto"></div>
          <p className="text-xs font-bold uppercase tracking-widest font-mono">Conectando con Ayni DB...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen text-[#1c1b1b] bg-[#fcf9f8] font-sans">
      {/* Sidebar unificada */}
      <NexusSidebar activeApp="laundry" />

      {/* Canvas Principal */}
      <main className="flex-grow pl-20 lg:pl-64 p-6 md:p-12 transition-all">
        {/* Encabezado Neo-Brutalist */}
        <header className="mb-10 border-b-4 border-[#1c1b1b] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#366287] text-white px-2 py-1 text-xs font-bold uppercase border-2 border-[#1c1b1b]">Operaciones</span>
              <span className="bg-[#a93818] text-white px-2 py-1 text-xs font-bold uppercase border-2 border-[#1c1b1b]">Lavandería</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase font-mono">Control de Lavandería</h1>
            <p className="text-sm font-bold text-gray-600 uppercase tracking-widest mt-1">Pipeline de Prendas, Bitácora e Insumos Operativos</p>
          </div>

          {/* Estadísticas rápidas */}
          <div className="flex flex-wrap gap-4">
            <div className="bg-white p-3 border-2 border-[#1c1b1b] shadow-[4px_4px_0px_0px_#1c1b1b] flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 border-2 border-[#1c1b1b] flex items-center justify-center font-bold">👕</div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase">Activos en Cola</div>
                <div className="text-lg font-bold font-mono">{ticketsActivos} u.</div>
              </div>
            </div>

            <div className="bg-white p-3 border-2 border-[#1c1b1b] shadow-[4px_4px_0px_0px_#1c1b1b] flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 border-2 border-[#1c1b1b] flex items-center justify-center font-bold">⚖️</div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase">Kilos Lavados</div>
                <div className="text-lg font-bold font-mono">{Math.round(kilosLavadosHoy * 10) / 10} kg</div>
              </div>
            </div>

            <div className={`p-3 border-2 border-[#1c1b1b] shadow-[4px_4px_0px_0px_#1c1b1b] flex items-center gap-3 ${balanceNeto >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="w-10 h-10 bg-yellow-100 border-2 border-[#1c1b1b] flex items-center justify-center font-bold">💰</div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase">Caja Ayni</div>
                <div className="text-lg font-bold font-mono">${balanceNeto}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Pestañas de Navegación */}
        <nav className="flex flex-wrap border-b-4 border-[#1c1b1b] mb-8">
          {(['tickets', 'registro', 'insumos'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold text-sm uppercase border-t-2 border-x-2 border-[#1c1b1b] -mb-1 transition-all mr-2 rounded-none ${
                activeTab === tab 
                  ? 'bg-white border-b-4 border-b-white translate-y-0.5' 
                  : 'bg-[#fcf9f8]/40 text-gray-500 border-b-2 border-b-[#1c1b1b] hover:bg-white/50'
              }`}
            >
              {tab === 'tickets' && <div className="flex items-center gap-2"><Shirt className="w-4 h-4" /> Pipeline de Tickets</div>}
              {tab === 'registro' && <div className="flex items-center gap-2"><Plus className="w-4 h-4" /> Registrar Carga</div>}
              {tab === 'insumos' && <div className="flex items-center gap-2"><Droplet className="w-4 h-4" /> Insumos & Bitácora</div>}
            </button>
          ))}
        </nav>

        {/* Caja de Contenido */}
        <section className="bg-white border-4 border-[#1c1b1b] p-6 md:p-8 min-h-[450px] shadow-[8px_8px_0px_0px_#1c1b1b]">
          {activeTab === 'tickets' && (
            <TicketPipeline tickets={tickets} onAdvanceStatus={handleAdvanceStatus} />
          )}

          {activeTab === 'registro' && (
            <LoadRegister 
              supplies={supplies} 
              tickets={tickets} 
              ledger={ledger} 
              onRegisterLoad={handleRegisterLoad} 
            />
          )}

          {activeTab === 'insumos' && (
            <LedgerBook supplies={supplies} ledger={ledger} onModSupplyQty={handleModSupplyQty} />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
