import { useNavigate } from 'react-router-dom';
import { Flame, ClipboardList, MapPin, ArrowRight } from 'lucide-react';
import { ROUTES } from '../../../lib/routes';

// ── Props ──

interface Props {
  userRole: string;
}

// ── Componente ──

export default function QuickAccess({ userRole }: Props) {
  const navigate = useNavigate();

  const links = [
    { label: 'Panel Admin', icon: <Flame className="w-3.5 h-3.5" />, path: ROUTES.ADMIN, adminOnly: true },
    { label: 'Carta Digital', icon: <ClipboardList className="w-3.5 h-3.5" />, path: ROUTES.CARTA, adminOnly: false },
    { label: 'Rastrear Pedido', icon: <MapPin className="w-3.5 h-3.5" />, path: ROUTES.RASTREO, adminOnly: false },
  ].filter(l => !l.adminOnly || userRole === 'admin');

  return (
    <div className="bg-cm-surface rounded-2xl border border-cm-border p-5 shadow-cm-sm">
      <span className="text-[10px] font-black text-cm-muted uppercase tracking-widest block mb-3">Accesos Rápidos</span>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {links.map(({ label, icon, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="p-3 rounded-xl bg-cm-bg-alt border border-cm-border flex items-center justify-between text-xs font-bold text-cm-text hover:border-cm-accent/40 hover:text-cm-accent transition-all group"
          >
            <span className="flex items-center gap-2">{icon}{label}</span>
            <ArrowRight className="w-3.5 h-3.5 text-cm-muted group-hover:text-cm-accent transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
