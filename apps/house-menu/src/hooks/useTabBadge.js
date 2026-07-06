/**
 * useTabBadge — updates the browser tab title and favicon with unread notification count.
 *
 * Usage:
 *   useTabBadge(unreadCount);
 *
 * When unreadCount > 0, the tab title becomes "(N) House Menu".
 * When 0, it reverts to the original title.
 *
 * Also adds a small red badge to the favicon when there are unread notifications.
 */
import { useEffect, useRef } from 'react';

const BASE_TITLE = document.title.replace(/^\(\d+\)\s*/, '');
let originalFavicon = null;

function getOriginalFavicon() {
  if (originalFavicon) return originalFavicon;
  const link = document.querySelector('link[rel*="icon"]');
  originalFavicon = link ? link.href : '/favicon.svg';
  return originalFavicon;
}

function buildBadgeFavicon(count) {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');

  const img = new Image();
  img.crossOrigin = 'anonymous';

  return new Promise((resolve) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 32, 32);

      if (count > 0) {
        const badgeSize = 14;
        const cx = 32 - badgeSize / 2 - 1;
        const cy = badgeSize / 2 + 1;

        ctx.beginPath();
        ctx.arc(cx, cy, badgeSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (count > 1) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(count > 9 ? '9+' : String(count), cx, cy + 0.5);
        }
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = getOriginalFavicon();
  });
}

/**
 * React hook — call in any component that has access to unread count.
 * @param {number} unreadCount
 */
export default function useTabBadge(unreadCount = 0) {
  const prevRef = useRef(0);
  const effective = unreadCount || 0;

  useEffect(() => {
    if (effective === prevRef.current) return;
    prevRef.current = effective;

    // Update document title
    document.title = effective > 0
      ? `(${effective > 9 ? '9+' : effective}) ${BASE_TITLE}`
      : BASE_TITLE;

    // Update favicon
    if (effective > 0) {
      buildBadgeFavicon(effective).then((dataUrl) => {
        if (!dataUrl) return;
        const link = document.querySelector('link[rel*="icon"]');
        if (link) link.href = dataUrl;
      });
    } else {
      const link = document.querySelector('link[rel*="icon"]');
      if (link) link.href = getOriginalFavicon();
    }

    // Cleanup: restore title on unmount (leave favicon)
    return () => {
      document.title = BASE_TITLE;
    };
  }, [effective]);
}
