import { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Store, Grid, ChevronDown, Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useTheme } from '../../context/ThemeContext';
import { useAccessibleBranches } from '../../hooks/useAccessibleBranches';
import NotificationBell from '../../components/NotificationBell';

// ── Types ──

interface TabDef {
  label: string;
  icon: React.ComponentType<any>;
  perm?: string;
}

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  availableTabs: string[];
  inlineTabs: string[];
  tabDefs: Record<string, TabDef>;
  now: Date;
  megaMenuOpen: boolean;
  onMegaMenuToggle: () => void;
  activeBranchName: string;
}

// ── Componente ──

export default function AdminTopBar({
  activeTab, onTabChange, availableTabs, inlineTabs,
  tabDefs, now, megaMenuOpen, onMegaMenuToggle, activeBranchName,
}: Props) {
  const { user, logout } = useAuth();
  const { activeBranchId, setActiveBranchId } = useBranch();
  const { theme, toggleTheme } = useTheme();
  const accessibleBranches = useAccessibleBranches();

  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);

  // Cerrar branch dropdown con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBranchDropdownOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="h-16 shrink-0 border-b border-cm-border bg-cm-surface px-4 lg:px-6 flex items-center justify-between z-30 shadow-cm-sm gap-2">
      {/* ── Left: Brand + Inline Tabs ── */}
      <div className="flex items-center gap-0 min-w-0">
        {/* Brand */}
        <div className="flex items-center gap-2 mr-3 shrink-0">
          <div className="w-8 h-8 bg-cm-accent rounded-lg flex items-center justify-center font-black text-white text-sm shrink-0">
            H
          </div>
          <span className="text-sm font-black text-cm-text hidden sm:inline">Admin Hub</span>
        </div>

        {inlineTabs.length > 0 && (
          <div className="w-px h-5 bg-cm-border/60 mx-1 hidden md:block" />
        )}

        {/* Desktop: inline tabs + Más... */}
        <LayoutGroup id="admin-tabs">
          <nav className="hidden md:flex items-center gap-0.5">
            {inlineTabs.map((tabKey) => {
              const tabDef = tabDefs[tabKey];
              if (!tabDef) return null;
              const Icon = tabDef.icon;
              const isActive = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  onClick={() => onTabChange(tabKey)}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute inset-0 rounded-lg bg-cm-accent/10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-1.5 transition-colors ${
                    isActive ? 'text-cm-accent' : 'text-cm-text-secondary'
                  }`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tabDef.label}</span>
                  </span>
                </button>
              );
            })}

            {availableTabs.length > inlineTabs.length && (
              <>
                <div className="w-px h-4 bg-cm-border/40 mx-1" />
                <button
                  onClick={onMegaMenuToggle}
                  className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-cm-text-secondary hover:text-cm-text hover:bg-cm-bg-alt transition-all"
                >
                  <span>Más</span>
                  <span className="text-[10px] text-cm-muted font-semibold px-1 py-0.5 rounded-full bg-cm-bg-alt border border-cm-border leading-none">
                    +{availableTabs.length - inlineTabs.length}
                  </span>
                </button>
              </>
            )}
          </nav>
        </LayoutGroup>

        {/* Mobile: hamburger + branch indicator */}
        <div className="md:hidden flex items-center gap-1.5">
          <button
            onClick={onMegaMenuToggle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cm-border hover:border-cm-accent/40 bg-cm-bg-alt hover:bg-cm-accent/5 text-cm-text font-bold text-xs transition-all active:scale-95"
          >
            <Grid className="w-3.5 h-3.5 text-cm-muted" />
            <span className="hidden sm:inline">Navegar</span>
            <ChevronDown className="w-3 h-3 text-cm-muted" />
          </button>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-cm-muted px-2 py-1 rounded-md bg-cm-bg-alt border border-cm-border truncate max-w-[120px] sm:hidden">
            <Store className="w-3 h-3 text-cm-accent shrink-0" />
            <span className="truncate">{activeBranchName}</span>
          </span>
        </div>
      </div>

      {/* ── Right: Branch Selector + Actions ── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Branch Selector (desktop) */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-cm-text border border-cm-border hover:border-cm-accent/40 bg-cm-bg-alt hover:bg-cm-accent/5 transition-all group"
          >
            <Store className="w-3.5 h-3.5 text-cm-accent shrink-0" />
            <span className="max-w-[120px] truncate">{activeBranchName}</span>
            <ChevronDown className={`w-3 h-3 text-cm-muted transition-transform duration-200 ${branchDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {branchDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setBranchDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-cm-border bg-cm-surface shadow-cm-lg z-50 overflow-hidden py-1 origin-top-right"
                >
                  {accessibleBranches.length > 0 ? (
                    accessibleBranches.map((b: any) => (
                      <button
                        key={b.id}
                        onClick={() => { setActiveBranchId(b.id); setBranchDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-left transition-colors ${
                          b.id === activeBranchId
                            ? 'bg-cm-accent/10 text-cm-accent'
                            : 'text-cm-text hover:bg-cm-bg-alt'
                        }`}
                      >
                        <Store className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{b.name?.trim() || b.id}</span>
                        {b.id === activeBranchId && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cm-accent shrink-0" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-3.5 py-2.5 text-xs text-cm-muted">Sin sucursales</div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Time */}
        <span className="text-xs font-semibold text-cm-muted hidden lg:inline tabular-nums">
          {now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
        </span>

        <div className="w-px h-4 bg-cm-border/60 hidden md:block" />

        {/* Notifications */}
        <NotificationBell
          branchId={activeBranchId}
          userId={user?.email}
          onNavigate={() => {}}
        />

        {/* User (desktop) */}
        <span className="text-xs text-cm-muted font-medium hidden lg:inline max-w-[140px] truncate">
          {user?.name || user?.email}
        </span>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-cm-accent/8 text-cm-muted hover:text-cm-text transition-colors"
          title="Cambiar tema"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={logout}
          className="flex items-center gap-1 text-xs font-semibold text-cm-muted hover:text-cm-error hover:bg-cm-error/10 p-2 rounded-lg transition-all"
          title="Cerrar sesión"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
