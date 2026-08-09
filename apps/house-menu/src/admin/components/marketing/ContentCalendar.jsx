import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, List, Instagram, Facebook, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function PlatformIcon({ platform }) {
  if (platform === 'instagram' || platform === 'both') return <Instagram className="w-3 h-3" />;
  if (platform === 'facebook') return <Facebook className="w-3 h-3" />;
  return null;
}

function StatusIcon({ status }) {
  if (status === 'published') return <CheckCircle2 className="w-3 h-3 text-cm-success" />;
  if (status === 'failed') return <XCircle className="w-3 h-3 text-cm-error" />;
  if (status === 'scheduled') return <Clock className="w-3 h-3 text-cm-accent" />;
  return <Clock className="w-3 h-3 text-cm-text-tertiary" />;
}

export default function ContentCalendar({ posts = [], onDateClick, onPostClick, loading }) {
  const [viewMode, setViewMode] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [year, month]);

  const postsByDate = useMemo(() => {
    const map = {};
    posts.forEach((post) => {
      const date = post.scheduledAt ? new Date(post.scheduledAt) : new Date(post.publishedAt || Date.now());
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(post);
    });
    return map;
  }, [posts]);

  const todayKey = `${new Date().getFullYear()}-${new Date().getMonth()}-${new Date().getDate()}`;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-cm-surface rounded-xl border border-cm-border">
        <CalendarDays className="w-10 h-10 text-cm-text-tertiary mb-3" />
        <p className="text-sm font-bold text-cm-text mb-1">Sin contenido programado</p>
        <p className="text-xs text-cm-text-tertiary">Programá publicaciones para ver el calendario.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-1.5 rounded-lg hover:bg-cm-bg text-cm-text-secondary transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-bold text-cm-text min-w-[180px] text-center">
            {MONTHS[month]} {year}
          </h3>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-1.5 rounded-lg hover:bg-cm-bg text-cm-text-secondary transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-1 bg-cm-bg rounded-lg p-0.5">
          <button onClick={() => setViewMode('calendar')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-cm-surface text-cm-accent shadow-sm' : 'text-cm-text-secondary'}`}>
            <CalendarDays className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-cm-surface text-cm-accent shadow-sm' : 'text-cm-text-secondary'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <>
          {/* Calendar grid */}
          <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-7">
              {DAYS.map((d) => (
                <div key={d} className="px-2 py-2 text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-tertiary text-center bg-cm-bg/50 border-b border-cm-border">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const key = day ? `${year}-${month}-${day}` : `empty-${i}`;
                const isToday = key === todayKey;
                const dayPosts = day ? postsByDate[key] || [] : [];
                return (
                  <div
                    key={key}
                    onClick={() => day && onDateClick?.(new Date(year, month, day))}
                    className={`min-h-[80px] p-1.5 border-b border-r border-cm-border transition-colors ${
                      day ? 'hover:bg-cm-accent/5 cursor-pointer' : 'bg-cm-bg/30'
                    } ${isToday ? 'bg-cm-accent/5' : ''}`}
                  >
                    {day && (
                      <>
                        <span className={`text-[0.55rem] font-bold ${isToday ? 'text-cm-accent' : 'text-cm-text-secondary'}`}>
                          {day}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {dayPosts.slice(0, 3).map((post) => (
                            <div
                              key={post.id}
                              onClick={(e) => { e.stopPropagation(); onPostClick?.(post); }}
                              className="flex items-center gap-1 px-1 py-0.5 rounded bg-cm-bg text-[0.45rem] font-semibold text-cm-text truncate hover:bg-cm-accent/10 transition-colors"
                            >
                              <PlatformIcon platform={post.platform} />
                              <span className="truncate">{post.caption?.substring(0, 20)}</span>
                            </div>
                          ))}
                          {dayPosts.length > 3 && (
                            <p className="text-[0.45rem] text-cm-text-tertiary pl-1">+{dayPosts.length - 3} más</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* List view */
        <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
          <div className="divide-y divide-cm-border">
            {posts.map((post) => (
              <div key={post.id} className="flex items-center gap-3 px-4 py-3 hover:bg-cm-accent/5 transition-colors cursor-pointer"
                onClick={() => onPostClick?.(post)}>
                <StatusIcon status={post.status} />
                <PlatformIcon platform={post.platform} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-cm-text truncate">{post.caption || 'Sin texto'}</p>
                  <p className="text-[0.55rem] text-cm-text-tertiary">
                    {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString('es-PE') : ''}
                  </p>
                </div>
                <span className={`text-[0.5rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  post.status === 'published' ? 'bg-cm-success/10 text-cm-success' :
                  post.status === 'failed' ? 'bg-cm-error/10 text-cm-error' :
                  post.status === 'scheduled' ? 'bg-cm-accent/10 text-cm-accent' :
                  'bg-cm-bg text-cm-text-tertiary'
                }`}>
                  {post.status === 'published' ? 'Publicado' : post.status === 'failed' ? 'Fallido' : post.status === 'scheduled' ? 'Programado' : 'Borrador'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
