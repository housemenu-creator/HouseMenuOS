/**
 * ReservaView — Reserva de mesas premium para clientes.
 */
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import {
  Calendar, Clock, Users, User, Phone, Mail, MessageSquare,
  CheckCircle, ArrowLeft, Loader2, AlertTriangle, MapPin, ChevronRight,
  ChevronLeft, Sparkles, UtensilsCrossed,
} from 'lucide-react';
import { useBranch } from '../context/BranchContext';
import { reservationService, DEFAULT_SETTINGS } from '../lib/reservationService';

// ── Constants ──
const TODAY = new Date().toISOString().split('T')[0];

// ── Helpers ──
const formatDateLong = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-PE', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
};

const toDateInput = (d) => d.toISOString().split('T')[0];

function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

// ═══════════════════════════════════════════════════════════
// Calendar — calendar grid nav, 30-day view
// ═══════════════════════════════════════════════════════════
function CalendarView({ selected, onChange, minDate, maxDate, occupancyMap }) {
  const days = useMemo(() => {
    const arr = [];
    const d = new Date(minDate);
    for (let i = 0; i < 31; i++) {
      arr.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, [minDate]);

  // Build month sections
  const months = useMemo(() => {
    const map = [];
    let currentMonth = null;
    for (const day of days) {
      const monthKey = day.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
      if (monthKey !== currentMonth) {
        currentMonth = monthKey;
        map.push({ label: monthKey, days: [day] });
      } else {
        map[map.length - 1].days.push(day);
      }
    }
    return map;
  }, [days]);

  const today = new Date();

  return (
    <div className="space-y-6">
      {months.map((month) => (
        <div key={month.label}>
          <h3 className="text-sm font-bold text-cm-text/60 uppercase tracking-wider mb-3">
            {month.label}
          </h3>
          <div className="grid grid-cols-7 gap-1.5">
            {['Lu','Ma','Mi','Ju','Vi','Sá','Do'].map((d) => (
              <div key={d} className="text-[10px] font-bold text-cm-muted/30 text-center uppercase tracking-wider pb-1">
                {d}
              </div>
            ))}
            {/* Empty cells for first day offset */}
            {Array.from({ length: month.days[0].getDay() === 0 ? 6 : month.days[0].getDay() - 1 }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {month.days.map((d) => {
              const dateStr = toDateInput(d);
              const isPast = dateStr <= TODAY;
              const isSelected = dateStr === selected;
              const isFull = occupancyMap?.[dateStr]?.full;
              const occupancy = occupancyMap?.[dateStr]?.pct || 0;
              const disabled = isPast || isFull;

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(dateStr)}
                  className={`relative flex flex-col items-center py-2 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-cm-accent border-cm-accent text-white shadow-lg shadow-cm-accent/20'
                      : disabled
                        ? 'bg-cm-surface/30 border-transparent text-cm-muted/20 cursor-not-allowed'
                        : 'bg-cm-surface border-cm-border/30 text-cm-text hover:border-cm-accent/40 hover:shadow-sm'
                  }`}
                >
                  <span className="text-lg font-black tabular-nums">{d.getDate()}</span>
                  {/* Occupancy bar */}
                  {!isSelected && !disabled && occupancy > 0 && (
                    <div className="absolute bottom-1 left-2 right-2 h-0.5 rounded-full bg-cm-muted/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          occupancy > 80 ? 'bg-cm-danger' : occupancy > 50 ? 'bg-cm-warning' : 'bg-cm-accent'
                        }`}
                        style={{ width: `${occupancy}%` }}
                      />
                    </div>
                  )}
                  {isFull && !isSelected && (
                    <span className="text-[8px] font-bold text-cm-danger mt-0.5">lleno</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TimeSlotGrid — heatmap slots
// ═══════════════════════════════════════════════════════════
function TimeSlotGrid({ slots, selected, onChange, date, occupancyBySlot, maxPerSlot }) {
  const getSlotState = (slot) => {
    const occ = occupancyBySlot?.[slot] || 0;
    const pct = maxPerSlot > 0 ? (occ / maxPerSlot) * 100 : 0;
    if (occ >= maxPerSlot) return { full: true, pct: 100, level: 'full' };
    if (pct > 60) return { full: false, pct, level: 'busy' };
    if (pct > 25) return { full: false, pct, level: 'medium' };
    return { full: false, pct: 0, level: 'free' };
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      {slots.map((slot) => {
        const state = getSlotState(slot);
        const disabled = !date || state.full;
        const isActive = selected === slot;

        return (
          <button
            key={slot}
            type="button"
            disabled={disabled}
            onClick={() => onChange(slot)}
            className={`relative py-3 px-1 rounded-xl text-sm font-bold border transition-all overflow-hidden ${
              isActive
                ? 'bg-cm-accent border-cm-accent text-white shadow-md shadow-cm-accent/20'
                : disabled
                  ? 'bg-cm-muted/5 border-cm-border/20 text-cm-muted/30 cursor-not-allowed'
                  : 'bg-cm-surface border-cm-border/30 text-cm-text-secondary hover:border-cm-accent/40 hover:shadow-sm'
            }`}
          >
            {/* Occupancy bg bar */}
            {!disabled && state.pct > 0 && (
              <div
                className={`absolute bottom-0 left-0 h-0.5 transition-all ${
                  state.level === 'busy' ? 'bg-cm-warning' : 'bg-cm-accent/40'
                }`}
                style={{ width: `${state.pct}%` }}
              />
            )}
            <span className="relative z-10">{slot}</span>
            {state.full && <span className="block text-[9px] font-medium opacity-50 relative z-10">lleno</span>}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════
export default function ReservaView() {
  const navigate = useNavigate();
  const { branches, activeBranchId, activeBranch, setActiveBranchId } = useBranch();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [step, setStep] = useState(1);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [reservationsByDate, setReservationsByDate] = useState({});
  const [showBranchPicker, setShowBranchPicker] = useState(!activeBranch);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);

  // Scroll to top on step change
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  useEffect(() => {
    if (!activeBranchId) return;
    const unsubSettings = reservationService.subscribeSettings(activeBranchId, setSettings);
    const unsubReserv = reservationService.subscribe(activeBranchId, (list) => {
      const grouped = {};
      list.forEach(r => {
        if (r.status === 'cancelled') return;
        if (!grouped[r.date]) grouped[r.date] = { count: 0, bySlot: {} };
        grouped[r.date].count += r.partySize;
        if (!grouped[r.date].bySlot[r.time]) grouped[r.date].bySlot[r.time] = 0;
        grouped[r.date].bySlot[r.time] += r.partySize;
      });
      setReservationsByDate(grouped);
    });
    return () => { unsubSettings(); unsubReserv(); };
  }, [activeBranchId]);

  // Build availability map for calendar
  const occupancyByDate = useMemo(() => {
    const map = {};
    for (const [d, data] of Object.entries(reservationsByDate)) {
      const slotCounts = Object.values(data.bySlot);
      const maxSlot = Math.max(...slotCounts, 0);
      map[d] = {
        pct: Math.min((maxSlot / (settings.maxReservationsPerSlot || 3)) * 100, 100),
        full: slotCounts.every(c => c >= (settings.maxReservationsPerSlot || 3)),
      };
    }
    return map;
  }, [reservationsByDate, settings.maxReservationsPerSlot]);

  const minDate = toDateInput(new Date(Date.now() + 86400000)); // tomorrow
  const maxDate = toDateInput(new Date(Date.now() + 86400000 * 31)); // 31 days
  const timeSlots = settings?.timeSlots || DEFAULT_SETTINGS.timeSlots;
  const maxParty = settings?.maxPartySize || 12;
  const maxPerSlot = settings?.maxReservationsPerSlot || 3;

  const occupancyBySlot = date ? reservationsByDate[date]?.bySlot || {} : {};

  const canProceedStep1 = date && time && partySize >= 1 && partySize <= maxParty;
  const canProceedStep2 = customerName.trim().length >= 2;

  const handleSubmit = async () => {
    if (!canProceedStep2) return;
    setSubmitting(true);
    setSubmitError('');
    const result = await reservationService.create({
      branchId: activeBranchId,
      date, time, partySize,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      notes: notes.trim(),
    });
    setSubmitting(false);
    if (result.success) {
      setResult(result.id);
      setStep(3);
    } else {
      setSubmitError(result.error || 'Error al crear la reserva. Intentá de nuevo.');
    }
  };

  const switchBranch = (id) => {
    setActiveBranchId(id);
    setBranchPickerOpen(false);
    setShowBranchPicker(false);
  };

  const resetForm = () => {
    setStep(1); setDate(''); setTime(''); setPartySize(2);
    setCustomerName(''); setCustomerPhone(''); setCustomerEmail(''); setNotes('');
    setResult(null); setSubmitError('');
  };

  // ── Branch picker screen ──
  if (showBranchPicker || !activeBranch) {
    return (
      <div className="min-h-screen bg-cm-bg flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md w-full space-y-8">
          <div className="w-20 h-20 rounded-2xl bg-cm-accent/10 flex items-center justify-center border border-cm-accent/20 mx-auto">
            <Sparkles className="w-10 h-10 text-cm-accent" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-cm-text tracking-tight">Reservá tu Mesa</h1>
            <p className="text-cm-muted text-base">Elegí la sucursal donde querés venir</p>
          </div>
          <div className="flex flex-col gap-3">
            {branches.map(b => (
              <motion.button key={b.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => switchBranch(b.id)}
                className="flex items-center gap-4 px-6 py-5 bg-cm-surface/80 backdrop-blur-sm border-2 border-cm-border/30 hover:border-cm-accent/50 rounded-2xl text-left transition-all hover:shadow-lg"
              >
                <div className="w-12 h-12 rounded-xl bg-cm-accent/10 flex items-center justify-center border border-cm-accent/20">
                  <MapPin className="w-6 h-6 text-cm-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-cm-text">{b.name}</p>
                  <p className="text-sm text-cm-muted">{b.address || 'Ver ubicación'}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-cm-muted" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (!settings?.enabled) {
    return (
      <div className="min-h-screen bg-cm-bg flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm space-y-6">
          <div className="w-16 h-16 rounded-full bg-cm-muted/5 flex items-center justify-center border-2 border-cm-muted/10 mx-auto">
            <Calendar className="w-8 h-8 text-cm-muted/40" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-black text-cm-text">Reservas no disponibles</p>
            <p className="text-sm text-cm-muted">Esta sucursal no tiene reservas habilitadas por el momento.</p>
          </div>
          <button onClick={() => navigate(ROUTES.CARTA)}
            className="px-8 py-3 bg-cm-accent text-white text-sm font-bold rounded-2xl hover:brightness-110 transition-all shadow-lg shadow-cm-accent/20">
            Ver Menú
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cm-bg">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-cm-bg/85 backdrop-blur-xl border-b border-cm-border/10 px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step < 3 && (
              <button onClick={() => step === 2 ? setStep(1) : navigate(-1)}
                className="p-2 -ml-2 text-cm-muted hover:text-cm-text rounded-xl transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-lg font-black text-cm-text tracking-tight">Reservar</h1>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`w-2 h-2 rounded-full transition-all ${
                s === step ? 'bg-cm-accent w-6' : s < step ? 'bg-cm-accent/30' : 'bg-cm-muted/20'
              }`} />
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pb-12">
        {/* ── Branch context tag ── */}
        {activeBranch && (
          <div className="flex items-center gap-2 pt-4 pb-2 text-xs text-cm-muted">
            <MapPin className="w-3 h-3" />
            <span className="font-medium">{activeBranch.name}</span>
            <button onClick={() => setShowBranchPicker(true)} className="ml-1 text-cm-accent underline underline-offset-2 hover:opacity-80">
              cambiar
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ══════ STEP 1: Date · Time · Guests ══════ */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 pt-2">
              {/* Hero */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-cm-accent/5 to-transparent rounded-2xl border border-cm-accent/10">
                <div className="w-14 h-14 rounded-2xl bg-cm-accent/10 flex items-center justify-center border border-cm-accent/20 shrink-0">
                  <UtensilsCrossed className="w-7 h-7 text-cm-accent" />
                </div>
                <div>
                  <h2 className="text-base font-black text-cm-text">¿Cuándo venís?</h2>
                  <p className="text-xs text-cm-muted">Seleccioná fecha, horario y cuántos son</p>
                </div>
              </div>

              {/* Date */}
              <section>
                <label className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-cm-muted uppercase mb-3">
                  <Calendar className="w-3 h-3" /> Fecha
                  {date && <span className="ml-2 text-cm-accent normal-case tracking-normal">— {formatDateShort(date)}</span>}
                </label>
                <CalendarView
                  selected={date}
                  onChange={(d) => { setDate(d); setTime(''); }}
                  minDate={minDate}
                  maxDate={maxDate}
                  occupancyMap={occupancyByDate}
                />
              </section>

              {/* Time */}
              <section>
                <label className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-cm-muted uppercase mb-3">
                  <Clock className="w-3 h-3" /> Horario
                  {!date && <span className="ml-2 text-cm-muted/40 normal-case tracking-normal font-normal">(elegí una fecha primero)</span>}
                </label>
                <TimeSlotGrid
                  slots={timeSlots}
                  selected={time}
                  onChange={setTime}
                  date={date}
                  occupancyBySlot={occupancyBySlot}
                  maxPerSlot={maxPerSlot}
                />
              </section>

              {/* Party size */}
              <section>
                <label className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-cm-muted uppercase mb-3">
                  <Users className="w-3 h-3" /> Personas
                </label>
                <div className="flex items-center gap-4 bg-cm-surface/80 backdrop-blur-sm border-2 border-cm-border/20 rounded-2xl px-5 py-4">
                  <button type="button" onClick={() => setPartySize(Math.max(1, partySize - 1))}
                    className="w-12 h-12 rounded-xl bg-cm-bg-alt border border-cm-border/20 text-cm-text font-black text-lg hover:bg-cm-accent hover:text-white hover:border-cm-accent transition-all active:scale-90">
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-black text-cm-text tabular-nums">{partySize}</span>
                    <p className="text-[10px] text-cm-muted font-medium">{partySize === 1 ? 'persona' : 'personas'}</p>
                  </div>
                  <button type="button" onClick={() => setPartySize(Math.min(maxParty, partySize + 1))}
                    className="w-12 h-12 rounded-xl bg-cm-bg-alt border border-cm-border/20 text-cm-text font-black text-lg hover:bg-cm-accent hover:text-white hover:border-cm-accent transition-all active:scale-90">
                    +
                  </button>
                </div>
                <p className="text-[10px] text-cm-muted/50 mt-1.5 text-center">Máximo {maxParty} personas por reserva</p>
              </section>

              <button onClick={() => setStep(2)} disabled={!canProceedStep1}
                className="w-full py-4 bg-cm-accent text-white font-black text-sm rounded-2xl hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-cm-accent/20 flex items-center justify-center gap-2 active:scale-[0.98]">
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ══════ STEP 2: Contact info ══════ */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pt-2">
              {/* Summary card */}
              <div className="bg-gradient-to-br from-cm-accent/[0.05] to-transparent border border-cm-accent/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-cm-accent" />
                    <div>
                      <p className="text-sm font-bold text-cm-text">{formatDateLong(date)}</p>
                      <p className="text-xs text-cm-muted">{time} · {partySize} {partySize === 1 ? 'persona' : 'personas'}</p>
                    </div>
                  </div>
                  <button onClick={() => setStep(1)} className="text-[11px] font-bold text-cm-accent hover:underline underline-offset-2 shrink-0">
                    Editar
                  </button>
                </div>
                {isWeekend(date) && (
                  <div className="flex items-center gap-2 text-[11px] text-cm-warning bg-cm-warning/5 px-3 py-2 rounded-xl border border-cm-warning/10">
                    <Sparkles className="w-3 h-3" />
                    Fin de semana — te recomendamos llegar un poco antes
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-muted pointer-events-none" />
                  <input type="text" placeholder="Tu Nombre *" maxLength={100} value={customerName} onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-cm-surface border-2 border-cm-border/20 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-cm-text placeholder:text-cm-muted/40 focus:outline-none focus:border-cm-accent transition-colors" />
                </div>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-muted pointer-events-none" />
                    <input type="tel" placeholder="Teléfono" maxLength={15} value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full bg-cm-surface border-2 border-cm-border/20 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-cm-text placeholder:text-cm-muted/40 focus:outline-none focus:border-cm-accent/40 transition-colors" />
                  </div>
                  <div className="relative flex-1">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-muted pointer-events-none" />
                    <input type="email" placeholder="Email" maxLength={120} value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                      className="w-full bg-cm-surface border-2 border-cm-border/20 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-cm-text placeholder:text-cm-muted/40 focus:outline-none focus:border-cm-accent/40 transition-colors" />
                  </div>
                </div>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-cm-muted pointer-events-none" />
                  <textarea placeholder="¿Alguna ocasión especial, alergias, o preferencia?" maxLength={300} rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                    className="w-full bg-cm-surface border-2 border-cm-border/20 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-cm-text placeholder:text-cm-muted/40 focus:outline-none focus:border-cm-accent/40 transition-colors resize-none" />
                </div>
              </div>

              {submitError && (
                <div className="flex items-start gap-2 p-4 bg-cm-danger/5 border border-cm-danger/15 rounded-2xl text-sm text-cm-danger font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <button onClick={handleSubmit} disabled={!canProceedStep2 || submitting}
                className="w-full py-4 bg-cm-accent text-white font-black text-sm rounded-2xl hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-cm-accent/20 flex items-center justify-center gap-2 active:scale-[0.98]">
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Reservando...</>
                ) : (
                  'Confirmar Reserva'
                )}
              </button>

              <p className="text-[11px] text-cm-muted/50 text-center">
                Al reservar aceptás que te contactemos si hay algún cambio
              </p>
            </motion.div>
          )}

          {/* ══════ STEP 3: Success ══════ */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 150, damping: 15 }}
              className="text-center py-12 space-y-6">
              {/* Animated check */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
                className="relative mx-auto w-fit"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cm-success/20 to-cm-success/5 flex items-center justify-center border-4 border-cm-success/20 mx-auto">
                  <CheckCircle className="w-12 h-12 text-cm-success" />
                </div>
                {/* Decorative dots */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 2] }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-cm-accent/20"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 2] }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-cm-warning/20"
                />
              </motion.div>

              <div className="space-y-1">
                <h2 className="text-2xl font-black text-cm-text">Reserva Confirmada</h2>
                <p className="text-sm text-cm-muted">Te esperamos en {activeBranch?.name}</p>
              </div>

              {/* Detail card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-cm-surface/80 backdrop-blur-sm border-2 border-cm-border/20 rounded-2xl p-6 text-left space-y-3"
              >
                <div className="flex items-center gap-3 pb-3 border-b border-cm-border/10">
                  <Calendar className="w-5 h-5 text-cm-accent" />
                  <span className="font-bold text-cm-text">{formatDateLong(date)}</span>
                </div>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  <div>
                    <p className="text-[10px] font-bold text-cm-muted uppercase tracking-wider">Hora</p>
                    <p className="text-lg font-black text-cm-text tabular-nums">{time}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-cm-muted uppercase tracking-wider">Personas</p>
                    <p className="text-lg font-black text-cm-text tabular-nums">{partySize}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-cm-muted uppercase tracking-wider">Nombre</p>
                    <p className="text-lg font-black text-cm-text">{customerName}</p>
                  </div>
                </div>
              </motion.div>

              <p className="text-xs text-cm-muted">
                Si necesitás modificar o cancelar, llamanos o escribinos.
                ¡Gracias por elegirnos!
              </p>

              <div className="flex flex-col gap-3 pt-2">
                <button onClick={() => navigate(ROUTES.CARTA)}
                  className="w-full py-4 bg-cm-accent text-white font-black text-sm rounded-2xl hover:brightness-110 transition-all shadow-lg shadow-cm-accent/20 active:scale-[0.98]">
                  Ver Menú
                </button>
                <button onClick={resetForm}
                  className="w-full py-3.5 border-2 border-cm-border/20 text-cm-text font-bold text-sm rounded-2xl hover:bg-cm-bg-alt transition-colors active:scale-[0.98]">
                  Nueva Reserva
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}