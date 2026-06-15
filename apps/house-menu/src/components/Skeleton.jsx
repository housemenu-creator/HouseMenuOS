import React from 'react';

function SkeletonBar({ className = '' }) {
  return (
    <div className={`animate-pulse rounded bg-cm-border ${className}`} aria-hidden="true" />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border bg-white p-4 space-y-3">
      <SkeletonBar className="h-4 w-3/4" />
      <SkeletonBar className="h-3 w-1/2" />
      <SkeletonBar className="h-3 w-2/3" />
      <div className="flex gap-2 pt-2">
        <SkeletonBar className="h-8 w-16 rounded-md" />
        <SkeletonBar className="h-8 w-16 rounded-md" />
      </div>
    </div>
  );
}

export function KDSSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto p-4">
      {[1, 2, 3].map((col) => (
        <div key={col} className="flex-1 min-w-[280px] space-y-3">
          <SkeletonBar className="h-6 w-24 mb-4" />
          {[1, 2].map((card) => (
            <div key={card} className="bg-white/5 rounded-xl p-4 space-y-2 border border-white/10">
              <SkeletonBar className="h-4 w-3/4" />
              <SkeletonBar className="h-3 w-1/2" />
              <SkeletonBar className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <SkeletonBar className="h-4 w-16" />
          <SkeletonBar className="h-4 flex-1" />
          <SkeletonBar className="h-4 w-20" />
          <SkeletonBar className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}
