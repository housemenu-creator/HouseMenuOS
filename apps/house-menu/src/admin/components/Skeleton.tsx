export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-cm-border/50 rounded-lg ${className || ''}`} />;
}
