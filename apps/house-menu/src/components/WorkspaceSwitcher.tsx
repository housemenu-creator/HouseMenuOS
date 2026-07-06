import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTenantId } from '../lib/tenantService';
import { Building, ChevronDown, Check, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBranch } from '../context/BranchContext';

export default function WorkspaceSwitcher() {
  const { workspaces = [], switchWorkspace, session } = useAuth();
  const { branches, activeBranchId } = useBranch();
  const [isOpen, setIsOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTenantId = getTenantId();
  const currentWorkspace = workspaces.find(w => w.id === currentTenantId);
  const activeBranch = branches.find(b => b.id === activeBranchId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (workspaces.length <= 1) {
    // Sin workspaces (usuario anónimo en carta pública) → mostrar sucursal activa
    // Con 1 workspace → mostrar el nombre del workspace
    const displayName = currentWorkspace?.name
      || activeBranch?.name
      || activeBranchId
      || 'Mi Local';
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cm-border bg-cm-bg text-xs font-bold text-cm-text shrink-0">
        <Building className="w-3.5 h-3.5 text-cm-accent shrink-0" />
        <span className="max-w-[100px] truncate">{displayName}</span>
      </div>
    );
  }

  const handleSwitch = async (tenantId: string) => {
    if (tenantId === currentTenantId) {
      setIsOpen(false);
      return;
    }
    setSwitchingId(tenantId);
    try {
      await switchWorkspace(tenantId);
    } catch (err) {
      console.error(err);
    } finally {
      setSwitchingId(null);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switchingId !== null}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cm-border bg-cm-surface hover:bg-cm-bg hover:border-cm-accent/30 text-xs font-bold text-cm-text transition-all active:scale-[0.98]"
      >
        <Building className="w-3.5 h-3.5 text-cm-accent shrink-0" />
        <span className="max-w-[90px] truncate">{currentWorkspace?.name || 'Cambiar Local'}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-cm-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Dropdown with Glassmorphism */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-1 w-56 rounded-xl border border-cm-border bg-cm-surface shadow-cm-lg overflow-hidden z-[100] backdrop-blur-md bg-opacity-95"
          >
            <div className="p-1.5 max-h-64 overflow-y-auto">
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-cm-text-tertiary uppercase tracking-wider">
                Tus Restaurantes
              </div>
              
              {workspaces.map((ws) => {
                const isActive = ws.id === currentTenantId;
                const isSwitching = switchingId === ws.id;

                return (
                  <button
                    key={ws.id}
                    onClick={() => handleSwitch(ws.id)}
                    disabled={switchingId !== null}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-cm-accent/10 text-cm-accent'
                        : 'text-cm-text hover:bg-cm-bg hover:text-cm-accent'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate">{ws.name}</p>
                      <p className="text-[10px] text-cm-text-tertiary font-medium truncate mt-0.5 capitalize">
                        {ws.role}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center justify-center w-4 h-4">
                      {isSwitching ? (
                        <Loader2 className="w-3 h-3 text-cm-accent animate-spin" />
                      ) : isActive ? (
                        <Check className="w-3.5 h-3.5 text-cm-accent" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* Optional: Wizard Link for professional feel */}
            <div className="border-t border-cm-border p-1.5 bg-cm-bg">
              <button
                onClick={() => window.location.href = '/onboarding'}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-bold text-cm-text-secondary hover:text-cm-accent transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-cm-accent" />
                Crear nuevo restaurante
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
