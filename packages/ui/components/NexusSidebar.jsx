import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Users, 
  Trophy,
  Gamepad2,
  Swords,
  Sparkles,
  Shirt,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';

const DEFAULT_APPS = [
  { id: 'nexus', name: 'Ayni Hub', icon: LayoutDashboard, url: 'http://localhost:5173/' },
  { id: 'menu', name: 'House Menu', icon: UtensilsCrossed, url: 'http://localhost:5176/' },
  { id: 'laundry', name: 'Lavandería', icon: Shirt, url: 'http://localhost:5177/' },
  { id: 'cleaning', name: 'Limpieza', icon: Sparkles, url: 'http://localhost:5178/' },
  { id: 'worker', name: 'Equipo', icon: Users, url: 'http://localhost:5179/' },
  { id: 'sorteos', name: 'Sorteos', icon: Trophy, url: 'http://localhost:5180/' },
  { id: '26play', name: '26play', icon: Gamepad2, url: 'http://localhost:5181/' },
  { id: 'piramid', name: 'Eternal Nexus', icon: Swords, url: 'http://localhost:5182/' },
];

export default function NexusSidebar({ activeApp = 'menu', apps = DEFAULT_APPS }) {
  return (
    <motion.aside 
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed left-0 top-0 h-full w-20 lg:w-64 bg-[var(--cm-surface)] backdrop-blur-2xl border-r border-[var(--cm-border)] z-50 flex flex-col p-4 lg:p-6 shadow-[var(--cm-shadow-sm)]"
    >
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="w-8 h-8 bg-[var(--cm-accent)] flex items-center justify-center font-bold text-[0.65rem] text-white rounded-[var(--cm-radius-sm)]">
          H
        </div>
        <span className="hidden lg:block font-bold text-[0.7rem] text-[var(--cm-text-secondary)] tracking-wider uppercase">HOUSE PORTAL</span>
      </div>

      <nav className="flex-1 space-y-1">
        {apps.map((app) => {
          const Icon = app.icon;
          const isActive = activeApp === app.id;

          return (
            <a
              key={app.id}
              href={app.url}
              className={cn(
                "flex items-center gap-4 p-3 rounded-[var(--cm-radius-md)] transition-all group",
                isActive 
                  ? "bg-[var(--cm-accent-surface)] text-[var(--cm-accent)]" 
                  : "text-[var(--cm-text-secondary)] hover:text-[var(--cm-text)] hover:bg-[var(--cm-surface-hover)]"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block text-sm font-semibold">{app.name}</span>
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="w-1 h-5 bg-[var(--cm-accent)] rounded-full ml-auto"
                />
              )}
            </a>
          );
        })}
      </nav>

      <div className="pt-6 border-t border-[var(--cm-border)]">
        <button className="flex items-center gap-4 p-3 w-full text-[var(--cm-text-secondary)] hover:text-[var(--cm-error)] transition-colors rounded-[var(--cm-radius-md)]">
          <LogOut className="w-5 h-5" />
          <span className="hidden lg:block text-sm font-semibold">Cerrar Sesión</span>
        </button>
      </div>
    </motion.aside>
  );
}
