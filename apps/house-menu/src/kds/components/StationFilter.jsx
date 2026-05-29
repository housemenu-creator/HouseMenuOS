import React from 'react';
import { LayoutGrid, Flame, Snowflake, Wheat, ClipboardCheck, Tally1 } from 'lucide-react';
import { KITCHEN_STATIONS, STATION_CONFIG } from '../kdsTypes';
import { cn } from '../../lib/utils';

const iconComponents = {
  LayoutGrid, Flame, Snowflake, Wheat, ClipboardCheck, Tally1,
};

export default function StationFilter({ activeStation, onStationChange, counts = {}, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {KITCHEN_STATIONS.map((key) => {
        const config = STATION_CONFIG[key];
        const IconComp = iconComponents[config.icon] || LayoutGrid;
        const isActive = activeStation === key;
        const count = counts[key] || 0;

        return (
          <button
            key={key}
            onClick={() => onStationChange(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
              isActive
                ? 'bg-cm-accent text-white shadow-cm-md'
                : 'bg-cm-muted/5 text-cm-muted/50 hover:bg-cm-muted/10 hover:text-cm-muted/70 border border-cm-border/10'
            )}
          >
            <IconComp className="w-3.5 h-3.5" />
            {config.label}
            {count > 0 && (
              <span className={cn(
                'ml-0.5 px-1.5 py-0.5 rounded-full text-[0.6rem]',
                isActive ? 'bg-white/20 text-white' : 'bg-cm-muted/10 text-cm-muted/50'
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
