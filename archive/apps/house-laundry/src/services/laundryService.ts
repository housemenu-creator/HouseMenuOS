import { ref, onValue, set } from 'firebase/database';
import { realtimeDB as db } from '@house/db';

export interface Ticket {
  id: string;
  owner: string;
  pieces: number;
  weight: number;
  sensitivity: 'Delicada' | 'Algodón' | 'Lana/Invierno' | 'Sintético';
  category: 'Regular' | 'Expreso' | 'En Seco';
  colors: 'Blancas' | 'Oscuras' | 'Mixto';
  status: 'Pendiente' | 'Lavado' | 'Secado' | 'Planchado' | 'Listo' | 'Entregado';
  cost: number;
  timestamp: string;
}

export interface Supply {
  id: string;
  name: string;
  qty: number;
  unit: string;
  costPerUnit: number;
  minQty: number;
}

export interface LedgerEntry {
  id: string;
  ticketId: string;
  owner: string;
  type: 'Ingreso' | 'Gasto';
  amount: number;
  description: string;
  timestamp: string;
}

const LAUNDRY_TICKETS_PATH = 'laundry/tickets';
const LAUNDRY_SUPPLIES_PATH = 'laundry/supplies';
const LAUNDRY_LEDGER_PATH = 'laundry/ledger';

// Initial Mock Data
const INITIAL_SUPPLIES: Supply[] = [
  { id: 'l1', name: 'Detergente Concentrado Ayni', qty: 10, unit: 'L', costPerUnit: 4.5, minQty: 3 },
  { id: 'l2', name: 'Suavizante Textil Flores Andinas', qty: 8, unit: 'L', costPerUnit: 3.2, minQty: 2 },
  { id: 'l3', name: 'Quita Manchas Activo', qty: 2.5, unit: 'L', costPerUnit: 6.0, minQty: 1.5 },
  { id: 'l4', name: 'Bolsas Protectoras de Prendas', qty: 150, unit: 'uds', costPerUnit: 0.15, minQty: 50 },
  { id: 'l5', name: 'Ganchos de Madera / Metal', qty: 80, unit: 'uds', costPerUnit: 0.40, minQty: 30 }
];

const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'TK-101',
    owner: 'Chaski_Digital',
    pieces: 12,
    weight: 4.5,
    sensitivity: 'Algodón',
    category: 'Regular',
    colors: 'Mixto',
    status: 'Secado',
    cost: 18.5,
    timestamp: 'Hoy, 09:30 AM'
  },
  {
    id: 'TK-102',
    owner: 'Illapa_Stitch',
    pieces: 5,
    weight: 1.8,
    sensitivity: 'Delicada',
    category: 'En Seco',
    colors: 'Blancas',
    status: 'Lavado',
    cost: 25.0,
    timestamp: 'Hoy, 10:15 AM'
  },
  {
    id: 'TK-103',
    owner: 'Kuntur_AI',
    pieces: 18,
    weight: 7.2,
    sensitivity: 'Lana/Invierno',
    category: 'Expreso',
    colors: 'Oscuras',
    status: 'Listo',
    cost: 32.4,
    timestamp: 'Ayer, 04:45 PM'
  },
  {
    id: 'TK-104',
    owner: 'Ayni_Master',
    pieces: 8,
    weight: 3.0,
    sensitivity: 'Sintético',
    category: 'Regular',
    colors: 'Mixto',
    status: 'Entregado',
    cost: 12.0,
    timestamp: 'Ayer, 11:20 AM'
  }
];

const INITIAL_LEDGER: LedgerEntry[] = [
  { id: 'TX-01', ticketId: 'TK-104', owner: 'Ayni_Master', type: 'Ingreso', amount: 12.0, description: 'Servicio Lavado Regular Entregado', timestamp: 'Ayer, 03:30 PM' },
  { id: 'TX-02', ticketId: 'TK-104', owner: 'Sistema', type: 'Gasto', amount: 1.5, description: 'Consumo Detergente + Suavizante TK-104', timestamp: 'Ayer, 11:30 AM' },
  { id: 'TX-03', ticketId: 'TK-103', owner: 'Sistema', type: 'Gasto', amount: 3.6, description: 'Consumo Insumos TK-103 (Carga Pesada)', timestamp: 'Ayer, 05:00 PM' }
];

export const laundryService = {
  /**
   * Suscribe en tiempo real a los tickets en cola.
   */
  subscribeToTickets(callback: (tickets: Ticket[]) => void) {
    const ticketsRef = ref(db, LAUNDRY_TICKETS_PATH);
    return onValue(ticketsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        set(ticketsRef, INITIAL_TICKETS);
        callback(INITIAL_TICKETS);
        return;
      }
      callback(data);
    });
  },

  /**
   * Suscribe en tiempo real a los insumos químicos de lavado.
   */
  subscribeToSupplies(callback: (supplies: Supply[]) => void) {
    const suppliesRef = ref(db, LAUNDRY_SUPPLIES_PATH);
    return onValue(suppliesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        set(suppliesRef, INITIAL_SUPPLIES);
        callback(INITIAL_SUPPLIES);
        return;
      }
      callback(data);
    });
  },

  /**
   * Suscribe en tiempo real a la bitácora financiera.
   */
  subscribeToLedger(callback: (ledger: LedgerEntry[]) => void) {
    const ledgerRef = ref(db, LAUNDRY_LEDGER_PATH);
    return onValue(ledgerRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        set(ledgerRef, INITIAL_LEDGER);
        callback(INITIAL_LEDGER);
        return;
      }
      callback(data);
    });
  },

  /**
   * Registra una nueva carga, restando stock proporcional e ingresando gasto estimado.
   */
  async registerLoad(
    ticket: Ticket,
    gastoEntry: LedgerEntry,
    updatedSupplies: Supply[],
    currentTickets: Ticket[],
    currentLedger: LedgerEntry[]
  ): Promise<void> {
    // 1. Agregar el ticket al inicio
    const ticketsRef = ref(db, LAUNDRY_TICKETS_PATH);
    await set(ticketsRef, [ticket, ...currentTickets]);

    // 2. Descontar insumos
    const suppliesRef = ref(db, LAUNDRY_SUPPLIES_PATH);
    await set(suppliesRef, updatedSupplies);

    // 3. Registrar gasto en ledger
    const ledgerRef = ref(db, LAUNDRY_LEDGER_PATH);
    await set(ledgerRef, [gastoEntry, ...currentLedger]);
  },

  /**
   * Avanza el estado de un ticket y registra ingresos si se entrega con éxito.
   */
  async advanceTicketStatus(
    ticketId: string,
    nextStatus: Ticket['status'],
    incomeEntry: LedgerEntry | null,
    currentTickets: Ticket[],
    currentLedger: LedgerEntry[]
  ): Promise<void> {
    // 1. Actualizar el ticket en el listado
    const updatedTickets = currentTickets.map(t => 
      t.id === ticketId ? { ...t, status: nextStatus } : t
    );
    const ticketsRef = ref(db, LAUNDRY_TICKETS_PATH);
    await set(ticketsRef, updatedTickets);

    // 2. Si hay ingreso, registrar en ledger
    if (incomeEntry) {
      const ledgerRef = ref(db, LAUNDRY_LEDGER_PATH);
      await set(ledgerRef, [incomeEntry, ...currentLedger]);
    }
  },

  /**
   * Modifica manualmente el stock de un insumo de lavado.
   */
  async updateSupplyQty(supplyId: string, newQty: number, currentSupplies: Supply[]): Promise<void> {
    const suppliesRef = ref(db, LAUNDRY_SUPPLIES_PATH);
    const updated = currentSupplies.map(s => s.id === supplyId ? { ...s, qty: Math.max(0, newQty) } : s);
    await set(suppliesRef, updated);
  }
};
