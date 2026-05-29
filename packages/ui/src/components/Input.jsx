import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Input = forwardRef(function Input(
  { label, error, icon: Icon, className, ...props },
  ref
) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-[var(--cm-text)] mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cm-text-tertiary)]">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-[var(--cm-radius-md)] border px-4 py-3 text-sm font-medium text-[var(--cm-text)] placeholder:text-[var(--cm-text-tertiary)] placeholder:opacity-70 bg-[rgba(0,0,0,0.03)] dark:bg-[rgba(255,255,255,0.05)] transition-all',
            'focus:outline-none focus:border-[var(--cm-accent)] focus:bg-[var(--cm-surface)] focus:shadow-[0_0_0_4px_var(--cm-accent-light)]',
            error ? 'border-[var(--cm-error)]' : 'border-[var(--cm-border)]',
            Icon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-[0.7rem] font-semibold text-[var(--cm-error)]">{error}</p>
      )}
    </div>
  )
})

export default Input
