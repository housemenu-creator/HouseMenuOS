import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { STATION_THRESHOLDS } from '../kdsTypes';

function formatElapsed(ms) {
  if (ms === undefined || ms === null || ms < 0) return '0:00';
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

function getTimerColor(ms, station = 'all') {
  if (ms === undefined || ms === null || ms < 0) return 'text-cm-muted/40';
  const thresholds = STATION_THRESHOLDS[station] || STATION_THRESHOLDS.all;
  if (ms >= thresholds.critical) return 'text-cm-error';
  if (ms >= thresholds.warning) return 'text-cm-warning';
  return 'text-cm-muted/60';
}

function getStartTimestamp(order) {
  if (!order) return null;
  return order.statusTimestamps?.[order.status] || order.createdAt;
}

export default function TimerBadge({ order, elapsedMs, className = '' }) {
  // Sin order y con elapsedMs inválido → no renderizar nada
  if (!order && (elapsedMs == null || elapsedMs <= 0)) return null;

  const startTs = order ? getStartTimestamp(order) : null;
  
  // Si tenemos el pedido, inicializamos el elapsed localmente
  const [localElapsed, setLocalElapsed] = useState(() => {
    if (startTs) {
      return Date.now() - new Date(startTs).getTime();
    }
    return elapsedMs || 0;
  });

  useEffect(() => {
    if (!startTs || order?.status === 'listo' || order?.status === 'entregado') {
      return;
    }

    // Actualizar inmediatamente al montar/cambiar de orden
    setLocalElapsed(Date.now() - new Date(startTs).getTime());

    const interval = setInterval(() => {
      setLocalElapsed(Date.now() - new Date(startTs).getTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTs, order?.status]);

  const activeElapsed = order ? localElapsed : elapsedMs;
  const formatted = formatElapsed(activeElapsed);
  const color = getTimerColor(activeElapsed, order?.station);

  return (
    <span className={`inline-flex items-center gap-1 text-[0.65rem] font-bold ${color} ${className}`}>
      <Clock className="w-3 h-3" />
      {formatted}
    </span>
  );
}
