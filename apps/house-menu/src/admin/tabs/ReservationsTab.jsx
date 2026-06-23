import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, User as UserIcon, Phone, Users, Mail, CheckCircle2, XCircle,
  Loader2, Search, AlertCircle, MessageSquare
} from 'lucide-react';
import { useBranch } from '../../context/BranchContext';
import {
  subscribeReservations,
  updateReservationStatus
} from '../../lib/reservationService';
import { useToast } from '../../components/ToastContext';

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    class: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    dot: 'bg-amber-500'
  },
  confirmed: {
    label: 'Confirmada',
    class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    dot: 'bg-emerald-500'
  },
  cancelled: {
    label: 'Cancelada',
    class: 'bg-red-500/10 text-red-500 border-red-500/20',
    dot: 'bg-red-500'
  },
  completed: {
    label: 'Completada',
    class: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    dot: 'bg-blue-500'
  }
};

function ReservationCard({ reservation, id, onConfirm, onCancel }) {
  const status = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.pending;
  const date = reservation.date ? new Date(reservation.date + 'T' + (reservation.time || '12:00')) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-cm-surface rounded-xl border border-cm-border space-y-3"
    >
      {/* Header: status + date */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.class}`}>
            {status.label}
          </span>
          {date && (
            <span className="text-[11px] text-cm-text-tertiary font-mono">
              {date.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        {reservation.createdAt && (
          <span className="text-[10px] text-cm-text-tertiary">
            {new Date(reservation.createdAt).toLocaleString('es-PE')}
          </span>
        )}
      </div>

      {/* Time & guests */}
      <div className="flex items-center gap-4 text-xs text-cm-text">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cm-accent" />
          <span className="font-bold">{reservation.time || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-cm-accent" />
          <span className="font-bold">{reservation.guests || reservation.personas || 1} pers.</span>
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-cm-text">
          <UserIcon className="w-3 h-3 text-cm-text-tertiary" />
          <span className="font-semibold">{reservation.name || 'Sin nombre'}</span>
        </div>
        {reservation.phone && (
          <div className="flex items-center gap-1.5 text-xs text-cm-text-secondary">
            <Phone className="w-3 h-3" />
            <a href={`tel:${reservation.phone}`} className="hover:text-cm-accent transition-colors">
              {reservation.phone}
            </a>
          </div>
        )}
        {reservation.email && (
          <div className="flex items-center gap-1.5 text-xs text-cm-text-secondary">
            <Mail className="w-3 h-3" />
            <span>{reservation.email}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {reservation.notes && (
        <div className="flex items-start gap-1.5 text-xs text-cm-text-secondary bg-cm-bg-alt p-2 rounded-lg">
          <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{reservation.notes}</span>
        </div>
      )}

      {/* Actions */}
      {reservation.status === 'pending' && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onConfirm(id)}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg text-xs font-bold transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmar
          </button>
          <button
            onClick={() => onCancel(id)}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg text-xs font-bold transition-all"
          >
            <XCircle className="w-3.5 h-3.5" />
            Cancelar
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function ReservationsTab() {
  const { activeBranchId } = useBranch();
  const { showToast } = useToast();
  const [reservations, setReservations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // Subscribe to reservations for active branch
  useEffect(() => {
    if (!activeBranchId) {
      setReservations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeReservations(activeBranchId, (data) => {
      setReservations(data || {});
      setLoading(false);
    });

    return () => unsub();
  }, [activeBranchId]);

  const handleConfirm = async (id) => {
    try {
      await updateReservationStatus(activeBranchId, id, 'confirmed');
      showToast('Reserva confirmada', 'success');
    } catch (err) {
      showToast('Error al confirmar reserva: ' + err.message, 'error');
    }
  };

  const handleCancel = async (id) => {
    try {
      await updateReservationStatus(activeBranchId, id, 'cancelled');
      showToast('Reserva cancelada', 'success');
    } catch (err) {
      showToast('Error al cancelar reserva: ' + err.message, 'error');
    }
  };

  // Transform object to array and filter/sort
  const list = reservations
    ? Object.entries(reservations)
        .filter(([_, r]) => r.name && typeof r.name === 'string') // skip malformed
        .map(([id, r]) => ({ id, ...r }))
        .filter(r => filter === 'all' || r.status === filter)
        .filter(r =>
          !search ||
          r.name?.toLowerCase().includes(search.toLowerCase()) ||
          r.phone?.includes(search)
        )
        .sort((a, b) => {
          // Sort by date descending, then time descending
          const dateA = a.date || '';
          const dateB = b.date || '';
          if (dateA !== dateB) return dateB.localeCompare(dateA);
          return (b.time || '').localeCompare(a.time || '');
        })
    : [];

  if (!activeBranchId) {
    return (
      <div className="text-center py-16 text-cm-text-tertiary">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">Selecciona una sucursal para ver las reservas</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-cm-text">Reservas</h2>
          <p className="text-xs text-cm-text-secondary mt-0.5">
            {list.length} reserva{list.length !== 1 ? 's' : ''}
            {filter !== 'all' ? ` (${filter})` : ''}
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'pending', label: 'Pendientes' },
            { key: 'confirmed', label: 'Confirmadas' },
            { key: 'completed', label: 'Completadas' },
            { key: 'cancelled', label: 'Canceladas' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                filter === f.key
                  ? 'bg-cm-accent text-white'
                  : 'bg-cm-surface border border-cm-border text-cm-text-secondary hover:border-cm-accent/30'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="w-full pl-9 pr-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text placeholder:text-cm-text-tertiary focus:outline-none focus:border-cm-accent transition-colors"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && list.length === 0 && (
        <div className="text-center py-16 text-cm-text-tertiary">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold">
            {search || filter !== 'all'
              ? 'No se encontraron reservas con ese filtro'
              : 'No hay reservas registradas'}
          </p>
          {!search && filter === 'all' && (
            <p className="text-xs mt-1">Los clientes pueden reservar desde la página pública /reserva</p>
          )}
        </div>
      )}

      {/* Reservation grid */}
      {!loading && list.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(r => (
            <ReservationCard
              key={r.id}
              reservation={r}
              id={r.id}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
