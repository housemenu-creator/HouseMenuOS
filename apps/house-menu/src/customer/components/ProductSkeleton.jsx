import React from 'react';

export default function ProductSkeleton() {
  const skeletonItems = Array.from({ length: 3 });

  return (
    <div className="space-y-4 animate-pulse">
      {skeletonItems.map((_, index) => (
        <div 
          key={index}
          className="bg-cm-surface rounded-xl border border-cm-border p-6 flex justify-between items-center border-l-4 border-cm-border relative select-none"
        >
          {/* Left Info Area */}
          <div className="flex-1 flex gap-4 items-center min-w-0 pr-4">
            {/* Image Placeholder */}
            <div className="w-20 h-20 bg-cm-muted/10 rounded-xl shrink-0" />
            
            {/* Text details */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Category tag skeleton */}
              <div className="h-3 bg-cm-muted/10 w-24 rounded-full" />
              {/* Title skeleton */}
              <div className="h-5 bg-cm-muted/20 w-3/4 rounded-full" />
              {/* Description skeleton */}
              <div className="h-3 bg-cm-muted/10 w-5/6 rounded-full" />
            </div>
          </div>

          {/* Right Price/Action Area */}
          <div className="flex flex-col items-end gap-2 shrink-0 space-y-2">
            {/* Price badge skeleton */}
            <div className="h-5 bg-cm-muted/20 w-16 rounded-full" />
            {/* Action button skeleton */}
            <div className="w-8 h-8 bg-cm-muted/10 rounded-full mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
