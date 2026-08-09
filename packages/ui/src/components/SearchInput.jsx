import { Search } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * Input with search icon and controlled value.
 * Uses --cm-* design tokens.
 */
export default function SearchInput({ value, onChange, placeholder = 'Buscar...', className }) {
  return (
    <div className={cn('relative max-w-xs flex-1', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--cm-text-tertiary)] pointer-events-none" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 bg-[var(--cm-surface)] border border-[var(--cm-border)] rounded-[var(--cm-radius-sm)] text-sm text-[var(--cm-text)] placeholder:text-[var(--cm-text-tertiary)] focus:outline-none focus:border-[var(--cm-accent)] transition-colors"
      />
    </div>
  )
}
