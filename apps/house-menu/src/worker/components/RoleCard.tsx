import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RoleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  kpi?: string;
  color?: string;
}

export default function RoleCard({ title, description, icon, route, kpi, color = 'from-cm-accent' }: RoleCardProps) {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate(route)}
      className="group relative bg-cm-surface rounded-xl border border-cm-border p-5 text-left hover:border-cm-accent/30 hover:shadow-cm-md transition-all duration-200 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} to-cm-accent/20 flex items-center justify-center`}>
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-cm-text text-base">{title}</h3>
            <p className="text-xs text-cm-muted mt-0.5">{description}</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-cm-muted/30 group-hover:text-cm-accent group-hover:translate-x-0.5 transition-all" />
      </div>
      {kpi && (
        <p className="mt-3 text-xs font-semibold text-cm-text-secondary border-t border-cm-border pt-3">{kpi}</p>
      )}
    </button>
  );
}
