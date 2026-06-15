import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
  variant?: "rect" | "circle" | "rounded";
}

export default function Skeleton({ className = "", variant = "rounded" }: SkeletonProps) {
  const baseClass = "bg-cm-border/40 animate-pulse";
  const variants = {
    rect: "rounded-none",
    circle: "rounded-full",
    rounded: "rounded-2xl",
  };

  return (
    <div className={`${baseClass} ${variants[variant]} ${className}`} />
  );
}

export function HouseBriefSkeleton() {
  return (
    <div className="glass rounded-[2rem] p-8 border border-cm-border space-y-8">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="w-32 h-6" />
          <Skeleton className="w-24 h-3" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="w-20 h-3" />
            <Skeleton className="w-24 h-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass p-5 rounded-2xl border border-cm-border space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="w-24 h-5" />
        <Skeleton className="w-5 h-5 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    </div>
  );
}
