import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS_ES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

export default function DateSelector({ selectedDate, onSelectDate }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const calendarRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    };
    if (showCalendar) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showCalendar]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const isToday = (date) => today.toDateString() === date.toDateString();
  const isSelected = (date) => formatDateStr(date) === selectedDate;

  const getNextDays = (count) => {
    const days = [];
    for (let i = 0; i < count; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const quickDays = getNextDays(14);

  const calendarDays = () => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const days = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }
    return days;
  };

  const canGoPrev = calMonth.getMonth() !== today.getMonth() || calMonth.getFullYear() !== today.getFullYear();
  const maxCal = new Date(today.getFullYear(), today.getMonth() + 3, 1);
  const canGoNext = calMonth < maxCal;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-cm-accent" />
        <span className="text-xs font-bold text-cm-text uppercase tracking-widest">Fecha de Entrega</span>
        {selectedDate && !isToday(new Date(selectedDate + 'T12:00:00')) && (
          <span className="text-[0.6rem] font-bold bg-cm-accent/10 text-cm-accent px-2 py-0.5 rounded-full">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
        {quickDays.map((date) => {
          const dateStr = formatDateStr(date);
          const selected = isSelected(date);
          const todayMark = isToday(date);
          const dayName = todayMark ? 'HOY' : date.toLocaleDateString('es-PE', { weekday: 'short' }).toUpperCase();

          return (
            <motion.button
              key={dateStr}
              whileTap={{ scale: 0.95 }}
              onClick={() => { onSelectDate(dateStr); setShowCalendar(false); }}
              style={{ scrollSnapAlign: 'start' }}
              className={`flex flex-col items-center justify-center min-w-[60px] h-16 rounded-xl border-2 transition-all cursor-pointer flex-shrink-0 ${
                selected
                  ? 'border-cm-accent bg-cm-accent text-white shadow-cm-md'
                  : todayMark
                    ? 'border-cm-accent/30 bg-cm-accent/5 text-cm-accent'
                    : 'border-white/10 bg-black/20 text-cm-muted hover:border-white/30'
              }`}
            >
              <span className="text-[0.5rem] font-bold tracking-wider mb-0.5">{dayName}</span>
              <span className={`text-sm font-black ${selected ? 'text-white' : todayMark ? 'text-cm-accent' : 'text-white/80'}`}>
                {date.getDate()}
              </span>
            </motion.button>
          );
        })}

        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className={`flex flex-col items-center justify-center min-w-[60px] h-16 rounded-xl border-2 border-dashed transition-all cursor-pointer flex-shrink-0 ${
            showCalendar ? 'border-cm-accent bg-cm-accent/10 text-cm-accent' : 'border-white/20 text-cm-muted hover:border-white/40 hover:text-cm-muted'
          }`}
        >
          <CalendarDays className="w-4 h-4 mb-0.5" />
          <span className="text-[0.5rem] font-bold">OTRO</span>
        </button>
      </div>

      <div className="relative" ref={calendarRef}>
        <AnimatePresence>
          {showCalendar && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-2 left-0 z-50 bg-white rounded-xl shadow-2xl border border-cm-border p-4 w-[300px]"
            >
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => { if (canGoPrev) setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1)); }} disabled={!canGoPrev} className={`p-1 rounded-lg ${canGoPrev ? 'text-cm-text hover:bg-cm-bg' : 'text-cm-muted cursor-not-allowed'}`}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black text-cm-text uppercase tracking-wider">
                  {MONTHS_ES[calMonth.getMonth()]} {calMonth.getFullYear()}
                </span>
                <button onClick={() => { if (canGoNext) setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1)); }} disabled={!canGoNext} className={`p-1 rounded-lg ${canGoNext ? 'text-cm-text hover:bg-cm-bg' : 'text-cm-muted cursor-not-allowed'}`}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {DAYS_ES.map(d => (
                  <div key={d} className="text-center text-[0.5rem] font-black text-cm-muted uppercase tracking-wider py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays().map((date, idx) => {
                  if (!date) return <div key={`e-${idx}`} className="aspect-square" />;
                  const past = date < today;
                  const selected = isSelected(date);
                  const todayMark = isToday(date);
                  return (
                    <button key={formatDateStr(date)}
                      disabled={past}
                      onClick={() => { onSelectDate(formatDateStr(date)); setShowCalendar(false); }}
                      className={`aspect-square rounded-lg text-xs font-bold transition-all ${
                        selected ? 'bg-cm-accent text-white' :
                        past ? 'text-cm-muted cursor-not-allowed' :
                        todayMark ? 'bg-cm-accent/10 text-cm-accent border border-cm-accent/30' :
                        'text-cm-muted hover:bg-cm-bg'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
