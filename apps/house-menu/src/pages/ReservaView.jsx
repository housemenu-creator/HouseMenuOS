/**
 * ReservaView — Formulario público de reservas.
 * El cliente selecciona fecha, hora, cantidad de personas y deja sus datos.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import { Calendar, Clock, Users, User, Phone, Mail, MessageSquare, CheckCircle, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { useBranch } from '../context/BranchContext';
import { reservationService, DEFAULT_SETTINGS } from '../lib/reservationService';

const MIN_DATE = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};
const MAX_DATE = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
};
const TODAY = new Date().toISOString().split('T')[0];

function DotDatePicker({ selected, onChange, minDate, maxDate }) {
  // Generate dots for the next 14 days
  const days = [];
  const start = new Date(minDate);
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {days.map(d => {
        const dateStr = d.toISOString().split('T')[0];
        const isActive = dateStr === selected;
        const dayName = d.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '').toUpperCase();
        const dayNum = d.getDate();
        const month = d.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
        const isPast = dateStr <= TODAY;
        return (
          <button key={dateStr} type="button" disabled={isPast}
            onClick={() => onChange(dateStr)}
            className={`flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl border transition-all min-w-[68px] ${
              isActive
                ? 'bg-cm-accent border-cm-accent text-white'
                : isPast
                  ? 'bg-cm-surface/30 border-cm-border/30 text-cm-text-tertiary cursor-not-allowed'
                  : 'bg-cm-surface border-cm-border text-cm-text-secondary hover:border-cm-accent hover:text-cm-accent'
            }`}>
            <span className="text-[0.55rem] font-bold uppercase tracking-wider">{dayName}</span>
            <span className="text-lg font-black">{dayNum}</span>
            <span className="text-[0.5rem] font-semibold uppercase">{month}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function ReservaView() {
  const navigate = useNavigate();
  const { activeBranchId, activeBranch } = useBranch();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [step, setStep] = useState(1); // 1: date/time/guests, 2: contact, 3: confirm
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

  useEffect(() => {
    if (!activeBranchId) return;
    const unsubSettings = reservationService.subscribeSettings(activeBranchId, setSettings);
    const unsubReserv = reservationService.subscribe(activeBranchId, (list) => {
      // Group by date for availability checking
      const grouped = {};
      list.forEach(r => {
        if (r.status === 'cancelled') return;
        if (!grouped[r.date]) grouped[r.date] = {};
        if (!grouped[r.date][r.time]) grouped[r.date][r.time] = 0;
        grouped[r.date][r.time] += r.partySize;
      });
      setReservationsByDate(grouped);
    });
    return () => { unsubSettings(); unsubReserv(); };
  }, [activeBranchId]);

  const minDate = MIN_DATE();
  const maxDate = MAX_DATE();
  const timeSlots = settings?.timeSlots || DEFAULT_SETTINGS.timeSlots;
  const maxParty = settings?.maxPartySize || 12;
  const maxPerSlot = settings?.maxReservationsPerSlot || 3;

  const getSlotOccupancy = (slot) => {
    if (!date || !reservationsByDate[date]) return 0;
    return reservationsByDate[date][slot] || 0;
  };

  const isSlotFull = (slot) => getSlotOccupancy(slot) >= maxPerSlot;

  const canProceedStep1 = date && time && partySize >= 1 && partySize <= maxParty;
  const canProceedStep2 = customerName.trim().length >= 2;

  const handleSubmit = async () => {
    if (!canProceedStep2) return;
    setSubmitting(true);
    setSubmitError('');

    const result = await reservationService.create({
      branchId: activeBranchId,
      date,
      time,
      partySize,
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

  // If no branch selected
  if (!activeBranch) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center">
        <div className="text-center space-y-3 p-8">
          <AlertTriangle className="w-12 h-12 text-cm-warning mx-auto" />
          <p className="text-sm font-bold text-cm-text">Seleccioná una sucursal para reservar</p>
        </div>
      </div>
    );
  }

  if (!settings?.enabled) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center">
        <div className="text-center space-y-3 p-8 max-w-sm">
          <Calendar className="w-12 h-12 text-cm-text-tertiary mx-auto" />
          <p className="text-sm font-bold text-cm-text">Reservas no disponibles</p>
          <p className="text-xs text-cm-text-secondary">Esta sucursal no tiene reservas habilitadas por el momento.</p>
          <button onClick={() => navigate(ROUTES.CARTA)} className="mt-4 px-6 py-2.5 bg-cm-accent text-white text-sm font-bold rounded-xl hover:bg-cm-accent-hover transition-colors">
            Ver Menú
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cm-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-cm-bg/85 backdrop-blur-md border-b border-cm-border px-5 py-4 flex items-center gap-3">
        {step < 3 && (
          <button onClick={() => step === 2 ? setStep(1) : navigate(-1)} className="p-2 -ml-2 text-cm-text-secondary hover:text-cm-text rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg font-black text-cm-text tracking-tight">Reservá tu Mesa</h1>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Date selector */}
            <section>
              <label className="text-[10px] font-bold tracking-widest text-cm-text-secondary uppercase flex items-center gap-1.5 mb-3">
                <Calendar className="w-3.5 h-3.5" /> Fecha
              </label>
              <DotDatePicker selected={date} onChange={setDate} minDate={minDate} maxDate={maxDate} />
            </section>

            {/* Time slots */}
            <section>
              <label className="text-[10px] font-bold tracking-widest text-cm-text-secondary uppercase flex items-center gap-1.5 mb-3">
                <Clock className="w-3.5 h-3.5" /> Horario
              </label>
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map(slot => {
                  const full = isSlotFull(slot);
                  const isActive = time === slot;
                  return (
                    <button key={slot} type="button" disabled={!date || full}
                      onClick={() => setTime(slot)}
                      className={`py-2.5 px-1 rounded-xl text-xs font-bold border transition-all ${
                        isActive
                          ? 'bg-cm-accent border-cm-accent text-white'
                          : full || !date
                            ? 'bg-cm-surface/30 border-cm-border/30 text-cm-text-tertiary cursor-not-allowed'
                            : 'bg-cm-surface border-cm-border text-cm-text-secondary hover:border-cm-accent hover:text-cm-accent'
                      }`}>
                      {slot}
                      {full && <span className="block text-[0.45rem] font-medium opacity-60">lleno</span>}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Party size */}
            <section>
              <label className="text-[10px] font-bold tracking-widest text-cm-text-secondary uppercase flex items-center gap-1.5 mb-3">
                <Users className="w-3.5 h-3.5" /> Cantidad de Personas
              </label>
              <div className="flex items-center gap-4 bg-cm-surface border border-cm-border rounded-xl px-4 py-3">
                <button type="button" onClick={() => setPartySize(Math.max(1, partySize - 1))}
                  className="w-10 h-10 rounded-xl bg-cm-bg-alt border border-cm-border text-cm-text font-bold text-lg hover:bg-cm-accent hover:text-white hover:border-cm-accent transition-all">
                  −
                </button>
                <span className="flex-1 text-center text-2xl font-black text-cm-text tabular-nums">{partySize}</span>
                <button type="button" onClick={() => setPartySize(Math.min(maxParty, partySize + 1))}
                  className="w-10 h-10 rounded-xl bg-cm-bg-alt border border-cm-border text-cm-text font-bold text-lg hover:bg-cm-accent hover:text-white hover:border-cm-accent transition-all">
                  +
                </button>
              </div>
              <p className="text-[0.55rem] text-cm-text-tertiary mt-1.5 text-center">Máximo {maxParty} personas</p>
            </section>

            <button onClick={() => setStep(2)} disabled={!canProceedStep1}
              className="w-full py-3.5 bg-cm-accent text-white font-black text-sm rounded-xl hover:bg-cm-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Continuar
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="bg-cm-surface border border-cm-border rounded-xl p-4 flex items-center gap-4 text-sm">
              <Calendar className="w-5 h-5 text-cm-accent" />
              <div>
                <p className="font-bold text-cm-text">{new Date(date + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <p className="text-xs text-cm-text-secondary">{time} · {partySize} persona{partySize !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
                <input type="text" placeholder="Tu Nombre *" maxLength={100} value={customerName} onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-cm-surface border border-cm-border rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-cm-text placeholder:text-cm-text-tertiary focus:outline-none focus:border-cm-accent" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
                <input type="tel" placeholder="Teléfono (opcional)" maxLength={15} value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full bg-cm-surface border border-cm-border rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-cm-text placeholder:text-cm-text-tertiary focus:outline-none focus:border-cm-accent" />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
                <input type="email" placeholder="Email (opcional)" maxLength={120} value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                  className="w-full bg-cm-surface border border-cm-border rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-cm-text placeholder:text-cm-text-tertiary focus:outline-none focus:border-cm-accent" />
              </div>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
                <textarea placeholder="Notas (alergias, ocasión especial, etc.)" maxLength={300} rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full bg-cm-surface border border-cm-border rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-cm-text placeholder:text-cm-text-tertiary focus:outline-none focus:border-cm-accent resize-none" />
              </div>
            </div>

            {submitError && (
              <div className="flex items-start gap-2 p-3 bg-cm-error/10 border border-cm-error/30 rounded-xl text-sm text-cm-error font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <button onClick={handleSubmit} disabled={!canProceedStep2 || submitting}
              className="w-full py-3.5 bg-cm-accent text-white font-black text-sm rounded-xl hover:bg-cm-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Reservando...</> : 'Confirmar Reserva'}
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-cm-success/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-cm-success" />
            </div>
            <h2 className="text-xl font-black text-cm-text">Reserva Confirmada</h2>
            <div className="bg-cm-surface border border-cm-border rounded-xl p-5 text-left space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between text-sm"><span className="text-cm-text-secondary">Fecha</span><span className="font-bold text-cm-text">{new Date(date + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
              <div className="flex justify-between text-sm"><span className="text-cm-text-secondary">Hora</span><span className="font-bold text-cm-text">{time}</span></div>
              <div className="flex justify-between text-sm"><span className="text-cm-text-secondary">Personas</span><span className="font-bold text-cm-text">{partySize}</span></div>
              <div className="flex justify-between text-sm"><span className="text-cm-text-secondary">Nombre</span><span className="font-bold text-cm-text">{customerName}</span></div>
            </div>
            <p className="text-xs text-cm-text-secondary">Te enviaremos una confirmación pronto. Si tenés algún cambio, llamános.</p>
            <div className="flex gap-3 justify-center pt-4">
              <button onClick={() => navigate(ROUTES.CARTA)} className="px-6 py-2.5 bg-cm-accent text-white text-sm font-bold rounded-xl hover:bg-cm-accent-hover transition-colors">
                Ver Menú
              </button>
              <button onClick={() => { setStep(1); setDate(''); setTime(''); setPartySize(2); setCustomerName(''); setCustomerPhone(''); setCustomerEmail(''); setNotes(''); setResult(null); }}
                className="px-6 py-2.5 border border-cm-border text-cm-text text-sm font-bold rounded-xl hover:bg-cm-bg-alt transition-colors">
                Nueva Reserva
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
