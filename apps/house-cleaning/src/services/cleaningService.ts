import { ref, onValue, set, update } from 'firebase/database';
import { realtimeDB as db } from '@house/db';

export interface Chore {
  id: string;
  task: string;
  completed: boolean;
  points: number;
}

export interface AreaChores {
  [key: string]: Chore[];
}

export interface Shift {
  day: string;
  cleaner: string;
  area: string;
  time: string;
}

export interface Supply {
  id: string;
  name: string;
  qty: number;
  unit: string;
  minQty: number;
}

const CLEANING_SHIFTS_PATH = 'cleaning/shifts';
const CLEANING_CHORES_PATH = 'cleaning/chores';
const CLEANING_SUPPLIES_PATH = 'cleaning/supplies';

// Initial Mock Data
const INITIAL_SHIFTS: Shift[] = [
  { day: 'Lunes', cleaner: 'Chaski_Digital', area: 'Cocina y Despensa', time: '08:00 - 10:00' },
  { day: 'Martes', cleaner: 'Illapa_Stitch', area: 'Baños Principales', time: '14:00 - 15:30' },
  { day: 'Miércoles', cleaner: 'Kuntur_AI', area: 'Comedor y Salón', time: '09:00 - 11:00' },
  { day: 'Jueves', cleaner: 'Chaski_Digital', area: 'Patio y Parrilla', time: '16:00 - 17:30' },
  { day: 'Viernes', cleaner: 'Ayni_Master', area: 'Habitaciones', time: '10:00 - 12:00' },
  { day: 'Sábado', cleaner: 'Illapa_Stitch', area: 'Limpieza General Profunda', time: '08:00 - 13:00' },
  { day: 'Domingo', cleaner: 'Descanso General', area: 'Ninguna', time: '-' },
];

const INITIAL_CHORES: AreaChores = {
  Cocina: [
    { id: 'c1', task: 'Desinfectar encimeras y mesones', completed: false, points: 15 },
    { id: 'c2', task: 'Lavar y secar toda la vajilla pendiente', completed: true, points: 20 },
    { id: 'c3', task: 'Limpiar la campana extractora y hornilla', completed: false, points: 25 },
    { id: 'c4', task: 'Vaciar tachos de basura orgánica', completed: false, points: 10 },
    { id: 'c5', task: 'Trapear piso con desinfectante de limón', completed: false, points: 15 },
  ],
  Baños: [
    { id: 'b1', task: 'Lavar inodoros y desinfectar tapas', completed: false, points: 25 },
    { id: 'b2', task: 'Limpiar espejos y griferías de lavatorios', completed: false, points: 15 },
    { id: 'b3', task: 'Reponer jabón líquido y papel toalla', completed: true, points: 10 },
    { id: 'b4', task: 'Trapear el piso del área húmeda', completed: false, points: 15 },
  ],
  Salón: [
    { id: 's1', task: 'Sacudir polvo de mesas y repisas de madera', completed: true, points: 15 },
    { id: 's2', task: 'Aspirar alfombras y sofás principales', completed: false, points: 20 },
    { id: 's3', task: 'Limpiar pantallas y aparatos multimedia', completed: false, points: 15 },
    { id: 's4', task: 'Ordenar cojines y revistas', completed: true, points: 10 },
  ],
};

const INITIAL_SUPPLIES: Supply[] = [
  { id: 'i1', name: 'Detergente Líquido Industrial', qty: 5, unit: 'galones', minQty: 2 },
  { id: 'i2', name: 'Desinfectante de Pino Silvestre', qty: 1, unit: 'litro', minQty: 3 },
  { id: 'i3', name: 'Esponjas de Fibra Abrasiva', qty: 12, unit: 'unidades', minQty: 4 },
  { id: 'i4', name: 'Paños de Microfibra Multiuso', qty: 8, unit: 'unidades', minQty: 5 },
  { id: 'i5', name: 'Bolsas de Basura Heavy Duty', qty: 2, unit: 'rollos', minQty: 3 },
];

export const cleaningService = {
  /**
   * Suscribe en tiempo real a los turnos de limpieza.
   */
  subscribeToShifts(callback: (shifts: Shift[]) => void) {
    const shiftsRef = ref(db, CLEANING_SHIFTS_PATH);
    return onValue(shiftsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        // Inicializar con mock data si está vacío
        set(shiftsRef, INITIAL_SHIFTS);
        callback(INITIAL_SHIFTS);
        return;
      }
      callback(data);
    });
  },

  /**
   * Agrega o actualiza un turno.
   */
  async saveShifts(shifts: Shift[]): Promise<void> {
    const shiftsRef = ref(db, CLEANING_SHIFTS_PATH);
    await set(shiftsRef, shifts);
  },

  /**
   * Suscribe en tiempo real al checklist diario por áreas.
   */
  subscribeToChores(callback: (chores: AreaChores) => void) {
    const choresRef = ref(db, CLEANING_CHORES_PATH);
    return onValue(choresRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        // Inicializar con mock data si está vacío
        set(choresRef, INITIAL_CHORES);
        callback(INITIAL_CHORES);
        return;
      }
      callback(data);
    });
  },

  /**
   * Cambia el estado de completado de una tarea.
   */
  async toggleChore(area: string, choreId: string, completed: boolean, areaChores: Chore[]): Promise<void> {
    const choresRef = ref(db, `${CLEANING_CHORES_PATH}/${area}`);
    const updated = areaChores.map(c => c.id === choreId ? { ...c, completed } : c);
    await set(choresRef, updated);
  },

  /**
   * Suscribe en tiempo real al stock de insumos.
   */
  subscribeToSupplies(callback: (supplies: Supply[]) => void) {
    const suppliesRef = ref(db, CLEANING_SUPPLIES_PATH);
    return onValue(suppliesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        // Inicializar con mock data si está vacío
        set(suppliesRef, INITIAL_SUPPLIES);
        callback(INITIAL_SUPPLIES);
        return;
      }
      callback(data);
    });
  },

  /**
   * Modifica el stock de un insumo.
   */
  async updateSupplyQty(supplyId: string, newQty: number, currentSupplies: Supply[]): Promise<void> {
    const suppliesRef = ref(db, CLEANING_SUPPLIES_PATH);
    const updated = currentSupplies.map(s => s.id === supplyId ? { ...s, qty: Math.max(0, newQty) } : s);
    await set(suppliesRef, updated);
  }
};
