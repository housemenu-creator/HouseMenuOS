import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const variants = {
  primary:
    'bg-[var(--cm-accent)] text-white hover:bg-[var(--cm-accent-hover)] active:scale-[0.94]',
  secondary:
    'bg-[rgba(0,0,0,0.05)] text-[var(--cm-text)] hover:bg-[rgba(0,0,0,0.08)] active:scale-[0.94] dark:bg-[rgba(255,255,255,0.08)] dark:hover:bg-[rgba(255,255,255,0.12)]',
  ghost:
    'bg-transparent text-[var(--cm-text-secondary)] hover:bg-[var(--cm-accent-light)] hover:text-[var(--cm-accent)] active:scale-[0.94]',
  danger:
    'bg-[var(--cm-error)] text-white hover:opacity-90 active:scale-[0.94]',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-7 py-3.5 text-base gap-2.5',
}

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', icon: Icon, children, className, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {children}
    </button>
  )
})

export default Button
