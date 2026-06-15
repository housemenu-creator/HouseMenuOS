/**
 * Design System Renderer — generates inline CSS + HTML for server-rendered pages.
 *
 * These pages have no bundler (no Vite, no React), so we inline the design tokens
 * and utility classes directly. Theme support: loading from Firebase `system/theme`
 * is handled separately by each page's JS — this provides the base CM tokens.
 */

// ── Google Fonts ─────────────────────────────────────
export function renderFontPreload(): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Playfair+Display:ital,wght@0,600;0,700;1,500&display=swap" rel="stylesheet">`;
}

// ── Lucide Icons (inline SVGs, no JS dependency) ─────
type IconName = "utensils" | "shopping-cart" | "plus" | "minus" | "send" | "check" | "loader" | "user" | "message-square" | "x" | "arrow-left" | "bell" | "chevron-right" | "store" | "package" | "clock" | "receipt";

export function icon(name: IconName, size: number = 20, className: string = ""): string {
  const svg = ICON_SVGS[name];
  if (!svg) return "";
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svg}</svg>`;
}

const ICON_SVGS: Record<IconName, string> = {
  utensils: `<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>`,
  "shopping-cart": `<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>`,
  plus: `<path d="M12 5v14"/><path d="M5 12h14"/>`,
  minus: `<path d="M5 12h14"/>`,
  send: `<path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/>`,
  check: `<path d="M20 6 9 17l-5-5"/>`,
  loader: `<path d="M21 12a9 9 0 1 1-6.219-8.56"/><style>@keyframes lspin{to{transform:rotate(360deg)}}svg{animation:lspin 1s linear infinite}</style>`,
  user: `<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
  "message-square": `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`,
  x: `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`,
  "arrow-left": `<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>`,
  bell: `<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>`,
  "chevron-right": `<path d="m9 18 6-6-6-6"/>`,
  store: `<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M6 7v3"/><path d="M18 7v3"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2"/><path d="M6 12a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"/>`,
  package: `<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5.27 8.7-5.27"/><path d="M12 22V12"/>`,
  clock: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
  receipt: `<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h6"/><path d="M8 15h4"/>`,
};

// ── Design System CSS (inline block) ──────────────────
export function renderDSStyles(): string {
  return `<style>
/* ══════════════════════════════════════════════
   Clean Minimalist Design System — CSS Variables
   ══════════════════════════════════════════════ */
:root {
  --cm-bg: #0a0a0f;
  --cm-bg-alt: #111113;
  --cm-surface: #1C1C1E;
  --cm-surface-hover: #262628;
  --cm-text: #F5F5F7;
  --cm-text-secondary: #98989D;
  --cm-text-tertiary: #636366;
  --cm-accent: #E06B30;
  --cm-accent-hover: #F07940;
  --cm-accent-light: rgba(224, 107, 48, 0.15);
  --cm-accent-surface: rgba(224, 107, 48, 0.08);
  --cm-border: rgba(255, 255, 255, 0.08);
  --cm-border-hover: rgba(255, 255, 255, 0.15);

  --cm-success: #059669;
  --cm-success-soft: rgba(5, 150, 105, 0.15);
  --cm-warning: #D97706;
  --cm-warning-soft: rgba(217, 119, 6, 0.15);
  --cm-error: #DC2626;
  --cm-error-soft: rgba(220, 38, 38, 0.15);
  --cm-info: #3B82F6;
  --cm-info-soft: rgba(59, 130, 246, 0.15);

  --cm-glass-bg: rgba(28, 28, 30, 0.72);
  --cm-glass-border: rgba(255, 255, 255, 0.08);
  --cm-glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  --cm-glass-blur: 20px;

  --cm-space-xs: 0.5rem;
  --cm-space-sm: 1rem;
  --cm-space-md: 2rem;
  --cm-space-lg: 4rem;

  --cm-radius-sm: 0.625rem;
  --cm-radius-md: 0.875rem;
  --cm-radius-lg: 1.25rem;
  --cm-radius-xl: 1.75rem;
  --cm-radius-full: 9999px;

  --cm-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.2);
  --cm-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.25);
  --cm-shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.3);

  --cm-font: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --cm-font-display: 'Playfair Display', Georgia, serif;
  --cm-font-mono: 'SF Mono', ui-monospace, monospace;
  --cm-font-size-base: 17px;
  --cm-font-size-xs: 0.7rem;
  --cm-font-size-sm: 0.85rem;
  --cm-font-size-lg: 1.15rem;
  --cm-font-size-xl: 1.4rem;
  --cm-font-size-2xl: 2.25rem;

  --cm-transition-fast: 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
  --cm-transition-base: 300ms cubic-bezier(0.25, 0.1, 0.25, 1);
  --cm-transition-slow: 500ms cubic-bezier(0.25, 0.1, 0.25, 1);
}

/* ══════════════════════════════════════════════
   Reset & Base
   ══════════════════════════════════════════════ */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  font-family: var(--cm-font);
  font-size: var(--cm-font-size-base);
  line-height: 1.5;
  color: var(--cm-text);
  background: var(--cm-bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
}
a { color: inherit; text-decoration: none; }
button { font-family: inherit; cursor: pointer; }
input, select, textarea { font-family: inherit; font-size: inherit; }

/* ══════════════════════════════════════════════
   Surface & Containers
   ══════════════════════════════════════════════ */
.cm-surface {
  background: var(--cm-surface);
  border-radius: var(--cm-radius-lg);
  border: 1px solid var(--cm-border);
  transition: all var(--cm-transition-base);
}
.cm-surface:hover {
  border-color: var(--cm-border-hover);
  box-shadow: var(--cm-shadow-md);
}
.cm-container {
  max-width: 700px;
  margin: 0 auto;
  padding: 0 var(--cm-space-sm);
}

/* ══════════════════════════════════════════════
   Glass
   ══════════════════════════════════════════════ */
.cm-glass {
  background: var(--cm-glass-bg);
  backdrop-filter: blur(var(--cm-glass-blur)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--cm-glass-blur)) saturate(180%);
  border: 1px solid var(--cm-glass-border);
  box-shadow: var(--cm-glass-shadow);
}

/* ══════════════════════════════════════════════
   Typography
   ══════════════════════════════════════════════ */
.cm-heading-1 {
  font-size: var(--cm-font-size-2xl);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.1;
}
.cm-heading-2 { font-size: var(--cm-font-size-xl); font-weight: 700; letter-spacing: -0.02em; }
.cm-heading-3 { font-size: var(--cm-font-size-lg); font-weight: 600; letter-spacing: -0.01em; }
.cm-body { color: var(--cm-text-secondary); }
.cm-body-sm { font-size: var(--cm-font-size-sm); color: var(--cm-text-tertiary); }
.cm-label {
  font-size: 0.65rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--cm-text-tertiary);
}
.cm-mono { font-family: var(--cm-font-mono); }

/* ══════════════════════════════════════════════
   Buttons & Pills
   ══════════════════════════════════════════════ */
.cm-pill {
  display: inline-flex; align-items: center; gap: 0.35rem;
  background: var(--cm-accent); color: var(--cm-primary);
  font-size: 0.75rem; font-weight: 600;
  padding: 0.4rem 0.9rem; border-radius: var(--cm-radius-full);
  border: none; letter-spacing: 0.02em;
}
.cm-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.65rem 1.5rem; border-radius: var(--cm-radius-sm);
  font-weight: 700; font-size: 0.95rem;
  border: none; cursor: pointer;
  transition: all var(--cm-transition-fast);
}
.cm-btn:active { transform: scale(0.97); }
.cm-btn-primary { background: var(--cm-accent); color: white; }
.cm-btn-primary:hover { background: var(--cm-accent-hover); }
.cm-btn-primary:disabled { opacity: 0.5; }
.cm-btn-ghost {
  background: transparent; color: var(--cm-text-secondary);
  border: 1px solid var(--cm-border);
}
.cm-btn-ghost:hover { border-color: var(--cm-border-hover); color: var(--cm-text); }
.cm-btn-icon {
  width: 2.5rem; height: 2.5rem; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; cursor: pointer; flex-shrink: 0;
  transition: all var(--cm-transition-fast);
}

/* ══════════════════════════════════════════════
   Badges
   ══════════════════════════════════════════════ */
.cm-badge {
  display: inline-flex; align-items: center; gap: 0.25rem;
  font-size: 0.7rem; font-weight: 700;
  padding: 0.15rem 0.5rem; border-radius: var(--cm-radius-full);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.cm-badge-accent { background: var(--cm-accent-light); color: var(--cm-accent); }
.cm-badge-info { background: var(--cm-info-soft); color: var(--cm-info); }
.cm-badge-warning { background: var(--cm-warning-soft); color: var(--cm-warning); }
.cm-badge-success { background: var(--cm-success-soft); color: var(--cm-success); }

/* ══════════════════════════════════════════════
   Form Elements
   ══════════════════════════════════════════════ */
.cm-input {
  width: 100%; padding: 0.65rem 0.85rem; border-radius: var(--cm-radius-sm);
  border: 1px solid var(--cm-border); background: var(--cm-surface);
  color: var(--cm-text); font-size: 0.95rem;
  transition: border-color var(--cm-transition-fast);
}
.cm-input:focus { outline: none; border-color: var(--cm-accent); }
.cm-input::placeholder { color: var(--cm-text-tertiary); }
.cm-select {
  width: 100%; padding: 0.65rem 0.85rem; border-radius: var(--cm-radius-sm);
  border: 1px solid var(--cm-border); background: var(--cm-surface);
  color: var(--cm-text); font-size: 0.95rem;
  appearance: none; cursor: pointer;
}

/* ══════════════════════════════════════════════
   Layout Helpers
   ══════════════════════════════════════════════ */
.cm-flex-center { display: flex; align-items: center; justify-content: center; }
.cm-flex-between { display: flex; align-items: center; justify-content: space-between; }
.cm-flex-center { display: flex; align-items: center; justify-content: center; }
.cm-gap-xs { gap: var(--cm-space-xs); }
.cm-gap-sm { gap: var(--cm-space-sm); }
.cm-gap-md { gap: var(--cm-space-md); }
.cm-mt-sm { margin-top: var(--cm-space-sm); }
.cm-mt-md { margin-top: var(--cm-space-md); }
.cm-mb-sm { margin-bottom: var(--cm-space-sm); }
.cm-mb-md { margin-bottom: var(--cm-space-md); }
.cm-text-center { text-align: center; }

/* ══════════════════════════════════════════════
   Animations
   ══════════════════════════════════════════════ */
@keyframes cm-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes cm-scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes cm-slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes cm-pulse-glow {
  0% { box-shadow: 0 0 0 0 rgba(224, 107, 48, 0.4); }
  70% { box-shadow: 0 0 0 12px rgba(224, 107, 48, 0); }
  100% { box-shadow: 0 0 0 0 rgba(224, 107, 48, 0); }
}
@keyframes cm-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.cm-anim-fade-in { animation: cm-fade-in 400ms ease-out both; }
.cm-anim-scale-in { animation: cm-scale-in 300ms ease-out both; }
.cm-anim-slide-up { animation: cm-slide-up 500ms ease-out both; }
.cm-anim-pulse { animation: cm-pulse-glow 2s ease-out; }

/* Skeleton loading */
.cm-skeleton {
  background: linear-gradient(90deg, var(--cm-surface) 0%, var(--cm-surface-hover) 50%, var(--cm-surface) 100%);
  background-size: 200% 100%;
  animation: cm-shimmer 1.5s ease-in-out infinite;
  border-radius: var(--cm-radius-sm);
}
.cm-skeleton-text { height: 1rem; width: 60%; margin-bottom: 0.5rem; }
.cm-skeleton-title { height: 1.5rem; width: 40%; margin-bottom: 1rem; }
.cm-skeleton-card { height: 5rem; margin-bottom: 0.75rem; }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--cm-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--cm-border-hover); }

/* Transitions */
[style*="transition"] { will-change: transform, opacity; }

/* Loading spinner */
.cm-spinner {
  display: inline-block;
  width: 1.5rem; height: 1.5rem;
  border: 2px solid var(--cm-border);
  border-top-color: var(--cm-accent);
  border-radius: 50%;
  animation: cm-spin 0.6s linear infinite;
}
@keyframes cm-spin { to { transform: rotate(360deg); } }
</style>`;
}
