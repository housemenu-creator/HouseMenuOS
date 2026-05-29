import { cn } from '../../lib/utils'

const variantStyles = {
  default:
    'bg-[var(--cm-surface)] shadow-[var(--cm-shadow-sm)] border border-transparent hover:shadow-[var(--cm-shadow-md)] hover:border-[var(--cm-border)]',
  glass:
    'bg-[var(--cm-glass-bg)] backdrop-filter backdrop-blur-[20px] saturate-180 border border-[var(--cm-glass-border)] shadow-[var(--cm-glass-shadow)]',
  flat:
    'bg-[var(--cm-accent-surface)] border border-[var(--cm-border)]',
}

const paddings = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

function Card({ variant = 'default', padding = 'md', className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-[var(--cm-radius-xl)] transition-all duration-300',
        variantStyles[variant],
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function CardHeader({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'text-xs font-semibold text-[var(--cm-text-tertiary)] uppercase tracking-[0.06em] mb-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function CardBody({ className, children, ...props }) {
  return (
    <div className={cn('text-[var(--cm-text)]', className)} {...props}>
      {children}
    </div>
  )
}

Card.Header = CardHeader
Card.Body = CardBody

export default Card
