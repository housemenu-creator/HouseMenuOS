import { cn } from '../../lib/utils'

/**
 * Empty state with icon, title, description, and optional action.
 * Uses --cm-* design tokens.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-24 text-center', className)}>
      <div className="w-16 h-16 rounded-full bg-[var(--cm-accent-light)] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[var(--cm-accent)]" />
      </div>
      <h2 className="text-lg font-semibold text-[var(--cm-text)]">{title}</h2>
      {description && (
        <p className="text-sm text-[var(--cm-text-secondary)] mt-1 max-w-sm">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-5 py-2.5 bg-[var(--cm-accent)] text-white rounded-[var(--cm-radius-sm)] text-sm font-medium hover:bg-[var(--cm-accent-hover)] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
