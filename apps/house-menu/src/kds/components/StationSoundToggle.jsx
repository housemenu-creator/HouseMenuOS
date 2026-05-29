import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { STATION_CONFIG } from '../kdsTypes';

export default function StationSoundToggle({ soundEnabled, setSoundEnabled, stations = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const anyEnabled = Object.values(soundEnabled).some(Boolean);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
          anyEnabled
            ? 'bg-cm-muted/10 text-cm-muted/50 hover:bg-cm-muted/20 hover:text-cm-muted/70 border border-cm-border/10'
            : 'bg-cm-muted/5 text-cm-muted/30 hover:bg-cm-muted/10 border border-cm-border/5'
        }`}
      >
        {anyEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-cm-surface rounded-xl border border-cm-border shadow-cm-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-cm-border">
            <span className="text-xs font-bold text-cm-muted/60 uppercase tracking-wider">Alertas por estación</span>
          </div>
          <div className="p-2 space-y-1">
            {stations.map((station) => {
              const config = STATION_CONFIG[station];
              return (
                <button
                  key={station}
                  onClick={() => setSoundEnabled((prev) => ({ ...prev, [station]: !prev[station] }))}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors hover:bg-cm-muted/10 text-left"
                >
                  {soundEnabled[station] !== false ? (
                    <Volume2 className="w-3.5 h-3.5 text-cm-accent" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-cm-muted/30" />
                  )}
                  <span className={soundEnabled[station] !== false ? 'text-cm-text' : 'text-cm-muted/40'}>
                    {config?.label || station}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="p-3 border-t border-cm-border">
            <p className="text-[0.55rem] text-cm-muted/30 leading-relaxed">
              Cada estación tiene un tono de alerta distinto.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
