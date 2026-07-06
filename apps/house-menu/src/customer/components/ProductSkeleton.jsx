import React from 'react';

export default function ProductSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Category header skeleton */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-cm-border to-transparent" />
        <div className="h-5 bg-cm-accent/10 w-28 rounded-full" />
        <div className="h-px flex-1 bg-gradient-to-l from-cm-border to-transparent" />
      </div>

      {/* Horizontal card skeletons */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="relative flex items-center gap-4 px-4 py-3.5">
          {i > 0 && (
            <div className="absolute top-0 left-[88px] right-4 h-px bg-cm-border/20" />
          )}
          {/* Image */}
          <div className="w-20 h-20 rounded-[14px] bg-cm-border/20 shrink-0" />
          {/* Info */}
          <div className="flex-1 space-y-2.5">
            <div className="h-4 bg-cm-border/25 w-2/3 rounded-full" />
            <div className="h-3 bg-cm-border/15 w-5/6 rounded-full" />
            <div className="flex gap-1.5 pt-0.5">
              <div className="h-3 bg-cm-border/10 w-12 rounded-full" />
              <div className="h-3 bg-cm-border/10 w-14 rounded-full" />
            </div>
            <div className="h-5 bg-cm-border/20 w-20 rounded-full" />
          </div>
          {/* + button skeleton */}
          <div className="w-9 h-9 rounded-full bg-cm-border/10 shrink-0" />
        </div>
      ))}
    </div>
  );
}
