import { cn } from '../../lib/utils'

const variants = {
  success: 'bg-[var(--cm-success-soft)] text-[var(--cm-success)] border-transparent',
  warning: 'bg-[var(--cm-warning-soft)] text-[var(--cm-warning)] border-transparent',
  error: 'bg-[var(--cm-error-soft)] text-[var(--cm-error)] border-transparent',
  info: 'bg-[var(--cm-info-soft)] text-[var(--cm-info)] border-transparent',
  neutral: 'bg-[rgba(0,0,0,0.05)] text-[var(--cm-text-secondary)] border-transparent dark:bg-[rgba(255,255,255,0.06)]',
}

const sizes = {
  sm: 'px-2 py-0.5 text-[0.6rem]',
  md: 'px-3 py-1 text-xs',
  lg: 'px-4 py-1.5 text-sm',
}

function Badge({
  variant = 'neutral',
  size = 'md',
  icon: Icon,
  className,
  children,
  ...props
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {children}
    </span>
  )
}

export default Badge
