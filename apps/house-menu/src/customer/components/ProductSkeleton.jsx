import React from 'react';

export default function ProductSkeleton() {
  const skeletonItems = Array.from({ length: 4 });

  return (
    <div className="space-y-6">
      {/* Simulate category header skeleton */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-cm-border to-transparent" />
        <div className="h-6 bg-cm-accent/10 w-28 rounded-full animate-pulse" />
        <div className="h-px flex-1 bg-gradient-to-l from-cm-border to-transparent" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {skeletonItems.map((_, index) => {
          const isFeatured = index === 0;
          return (
            <div
              key={index}
              className={`bg-cm-surface/65 backdrop-blur-md rounded-2xl border border-cm-border/75 p-5 animate-pulse select-none border-l-4 border-l-cm-accent/20 ${
                isFeatured
                  ? 'sm:col-span-2 flex flex-col sm:flex-row gap-5 items-start sm:items-center'
                  : 'flex justify-between items-center gap-4'
              }`}
            >
              {/* Left: Image + Text */}
              <div className={`flex gap-4 min-w-0 ${isFeatured ? 'w-full flex-col sm:flex-row' : 'flex-1 items-center pr-2'}`}>
                {/* Image Placeholder */}
                <div className={`bg-cm-border/20 rounded-xl shrink-0 ${isFeatured ? 'w-full sm:w-36 h-48 sm:h-32' : 'w-20 h-20'}`} />

                {/* Text details */}
                <div className="flex-1 min-w-0 space-y-2.5">
                  {/* Category tag */}
                  <div className="h-3 bg-cm-border/15 w-24 rounded-full" />
                  {/* Title */}
                  <div className={`bg-cm-border/25 rounded-full ${isFeatured ? 'h-6 w-3/4' : 'h-5 w-3/4'}`} />
                  {/* Description */}
                  <div className="h-3 bg-cm-border/15 w-5/6 rounded-full" />
                  {/* Badges row */}
                  <div className="flex gap-1.5 pt-1">
                    <div className="h-4 bg-cm-border/10 w-14 rounded-full" />
                    <div className="h-4 bg-cm-border/10 w-16 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Right: Price + CTA */}
              <div className={`flex items-end gap-3 shrink-0 ${isFeatured ? 'flex-row sm:flex-col w-full sm:w-auto justify-between sm:justify-end mt-3 sm:mt-0 border-t sm:border-t-0 border-cm-border/30 pt-3 sm:pt-0' : 'flex-col justify-between h-full py-1'}`}>
                <div className="h-5 bg-cm-border/25 w-16 rounded-full" />
                <div className="h-7 bg-cm-accent/10 w-16 rounded-full mt-1" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
