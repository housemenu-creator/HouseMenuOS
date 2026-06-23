import { Timer } from 'lucide-react';

interface Props {
  currentTime: Date;
  user: any;
  activeBranchName: string;
}

export default function WelcomeHeader({ currentTime, user, activeBranchName }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs text-cm-muted font-semibold uppercase tracking-widest">
          {currentTime.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="text-xl font-black text-cm-text mt-0.5">
          Hola, {user?.name?.split(' ')[0] || 'Compañero'} 👋
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-black bg-cm-accent/10 text-cm-accent px-2.5 py-0.5 rounded-full border border-cm-accent/20 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cm-accent animate-pulse" />
            {activeBranchName}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-3xl font-black text-cm-text font-mono tabular-nums tracking-tight">
          {currentTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-xs text-cm-muted font-mono">
          {currentTime.toLocaleTimeString('es-PE', { second: '2-digit' })}s
        </p>
      </div>
    </div>
  );
}
