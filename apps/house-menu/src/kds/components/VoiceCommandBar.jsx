import React, { useMemo } from 'react';
import { Mic, MicOff, Radio, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function VoiceCommandBar({ isListening, onToggle, transcript, className = '' }) {
  const isSupported = useMemo(() => {
    return typeof window !== 'undefined'
      && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';

  if (!isSupported) return null;

  if (!isSecure) {
    return (
      <div className={cn('flex items-center gap-2 text-cm-warning/60', className)} title="SpeechRecognition requires HTTPS">
        <ShieldAlert className="w-3.5 h-3.5" />
        <span className="text-[0.55rem] font-bold">Voz solo en HTTPS</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
          isListening
            ? 'bg-cm-error text-white shadow-cm-md animate-pulse'
            : 'bg-cm-muted/10 text-cm-muted/50 hover:bg-cm-muted/20 hover:text-cm-muted/70 border border-cm-border/10'
        }`}
        title={isListening ? 'Desactivar comandos de voz' : 'Activar comandos de voz'}
      >
        {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        Voz
      </button>
      {isListening && (
        <span className="flex items-center gap-1 text-[0.6rem] text-cm-muted/40 animate-pulse">
          <Radio className="w-3 h-3" />
          Escuchando...
        </span>
      )}
      {transcript && isListening && (
        <span className="text-[0.6rem] text-cm-muted/30 italic max-w-[200px] truncate">
          &ldquo;{transcript}&rdquo;
        </span>
      )}
    </div>
  );
}
