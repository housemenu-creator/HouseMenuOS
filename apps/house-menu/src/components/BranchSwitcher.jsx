import { useState } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { useBranch } from '../context/BranchContext';

const variants = {
  select: {
    wrapper: '',
    trigger: 'w-full bg-cm-bg border-2 border-cm-border rounded-lg p-2 text-sm font-bold text-cm-text focus:outline-none focus:border-cm-accent transition-colors cursor-pointer',
    option: '',
  },
  minimal: {
    wrapper: 'flex items-center gap-1 text-xs text-cm-muted',
    trigger: 'bg-transparent border-none text-xs font-bold text-cm-text focus:outline-none cursor-pointer p-0',
    option: '',
  },
  dropdown: {
    wrapper: 'relative',
    trigger: 'flex items-center gap-1 px-2 py-1 bg-cm-bg-alt border border-cm-border rounded-md text-[0.6rem] font-bold text-cm-text-secondary hover:text-cm-text transition-colors',
    option: 'w-full text-left px-3 py-1.5 text-xs font-semibold transition-colors',
    menu: 'absolute top-full left-0 mt-1 z-20 bg-cm-surface border border-cm-border rounded-lg shadow-cm-lg py-1 min-w-[140px]',
  },
};

/**
 * @param {object} props
 * @param {string} [props.variant]
 * @param {any[]} [props.branches]
 * @param {boolean} [props.showLabel]
 * @param {string} [props.label]
 * @param {string} [props.align]
 * @param {string} [props.className]
 * @param {(id: string) => void} [props.onSwitch]
 */
export default function BranchSwitcher({
  variant = 'select',
  branches: propBranches,
  showLabel = false,
  label = 'Sucursal Activa',
  align = 'left',
  className = '',
  onSwitch,
}) {
  const { branches: ctxBranches, activeBranchId, setActiveBranchId, isLoading } = useBranch();
  const branches = propBranches || ctxBranches;
  const [open, setOpen] = useState(false);

  if (isLoading || branches.length <= 1) return null;

  const styles = variants[variant];
  const current = branches.find((b) => b.id === activeBranchId);

  const handleSwitch = (id) => {
    setActiveBranchId(id);
    setOpen(false);
    onSwitch?.(id);
  };

  if (variant === 'dropdown') {
    return (
      <div className={`${styles.wrapper} ${className}`}>
        <button onClick={() => setOpen(!open)}
          className={styles.trigger}>
          <Building2 className="w-3 h-3" />
          {current?.name || activeBranchId}
          <ChevronDown className="w-3 h-3" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className={styles.menu}
              style={{ [align]: 0 }}>
              {branches.map((b) => (
                <button key={b.id} onClick={() => handleSwitch(b.id)}
                  className={`${styles.option} ${b.id === activeBranchId ? 'bg-cm-accent/10 text-cm-accent' : 'text-cm-text-secondary hover:bg-cm-bg-alt'}`}>
                  {b.name || b.id}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {showLabel && (
        <label className="text-[0.6rem] font-bold text-cm-muted uppercase tracking-widest mb-1 block">
          {label}
        </label>
      )}
      {variant === 'minimal' && <Building2 className="w-3.5 h-3.5" />}
      <select
        value={activeBranchId}
        onChange={(e) => handleSwitch(e.target.value)}
        className={styles.trigger}>
        {branches.map((b) => (
          <option key={b.id} value={b.id} className={styles.option}>
            {b.name || b.id}
          </option>
        ))}
      </select>
    </div>
  );
}
