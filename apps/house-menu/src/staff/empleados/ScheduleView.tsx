import { useState, useEffect } from 'react';
import { CalendarDays, AlertTriangle } from 'lucide-react';
import { getSchedule } from './employeeService';

const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DAY_LABELS: Record<string, string> = { lunes: 'Lun', martes: 'Mar', miércoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sábado: 'Sáb', domingo: 'Dom' };

function todayDayName(): string {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return days[new Date().getDay()];
}

interface ScheduleViewProps {
  uid: string;
}

export default function ScheduleView({ uid }: ScheduleViewProps) {
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'populated'>('loading');
  const [schedule, setSchedule] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!uid) { setState('error'); return; }

    getSchedule(uid)
      .then((data) => {
        if (data) {
          setSchedule(data);
          setState('populated');
        } else {
          setState('empty');
        }
      })
      .catch(() => setState('error'));
  }, [uid]);

  const today = todayDayName();

  // ── Loading ──
  if (state === 'loading') {
    return (
      <div className="space-y-3">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-16 bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Empty ──
  if (state === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center mb-4">
          <CalendarDays className="w-8 h-8 text-cm-accent" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Sin horario asignado</h2>
        <p className="text-sm text-cm-text-secondary mt-1 max-w-sm">Tu horario semanal aparece acá cuando el administrador lo cargue.</p>
      </div>
    );
  }

  // ── Error ──
  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-error-soft flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-cm-error" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Error al cargar</h2>
        <p className="text-sm text-cm-text-secondary mt-1">No se pudo obtener el horario.</p>
      </div>
    );
  }

  // ── Populated ──
  return (
    <div className="space-y-2">
      {DAYS.map((day) => {
        const dayData = schedule?.[day] as { active?: boolean; start?: string; end?: string } | undefined;
        const isActive = dayData?.active;
        const isToday = day === today;

        return (
          <div
            key={day}
            className={`bg-cm-surface border rounded-[--cm-radius-lg] p-4 flex items-center justify-between transition-colors ${
              isToday ? 'border-cm-accent ring-1 ring-cm-accent-light' : 'border-cm-border'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 text-center ${isToday ? 'text-cm-primary' : 'text-cm-text-secondary'}`}>
                <div className="text-xs font-semibold uppercase">{DAY_LABELS[day]}</div>
                {isToday && <div className="text-[0.55rem] font-bold text-cm-primary uppercase">Hoy</div>}
              </div>

              <div>
                {isActive ? (
                  <div className="text-sm font-semibold text-cm-text">
                    {dayData!.start} — {dayData!.end}
                  </div>
                ) : (
                  <div className="text-sm text-cm-text-tertiary">—</div>
                )}
              </div>
            </div>

            {isActive ? (
              <span className="cm-badge cm-badge--success">Activo</span>
            ) : (
              <span className="cm-badge cm-badge--neutral">Descanso</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
