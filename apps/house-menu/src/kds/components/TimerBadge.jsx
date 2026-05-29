import React from 'react';
import { Clock } from 'lucide-react';

function formatElapsed(ms) {
  if (!ms || ms < 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;

  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m}m`;
  }
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function getTimerColor(ms) {
  if (!ms || ms < 0) return 'text-cm-muted/40';
  const min = ms / 60000;
  if (min > 15) return 'text-cm-error';
  if (min > 10) return 'text-cm-warning';
  return 'text-cm-muted/60';
}

export default function TimerBadge({ elapsedMs, className = '' }) {
  const formatted = formatElapsed(elapsedMs);
  const color = getTimerColor(elapsedMs);

  if (!formatted) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-[0.65rem] font-bold ${color} ${className}`}>
      <Clock className="w-3 h-3" />
      {formatted}
    </span>
  );
}
