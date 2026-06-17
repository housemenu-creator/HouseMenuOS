import React, { memo } from 'react';
import { TriangleAlert, Bell, Clock } from 'lucide-react';
import { PRIORITY, PRIORITY_CONFIG } from '../kdsTypes';

const iconMap = {
  [PRIORITY.RUSH]: Bell,
  [PRIORITY.NORMAL]: Clock,
  [PRIORITY.LOW]: TriangleAlert,
};

function PriorityBadge({ priority = PRIORITY.NORMAL, className = '' }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[PRIORITY.NORMAL];
  const Icon = iconMap[priority] || Clock;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-bold uppercase tracking-widest border ${config.bg} ${config.color} ${config.border} ${config.pulse ? 'animate-pulse' : ''} ${className}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default memo(PriorityBadge);
