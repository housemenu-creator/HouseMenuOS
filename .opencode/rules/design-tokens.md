# Design Tokens — House-Portal-OS

## Paleta
- Fondo oscuro: `#070912`
- Primary: `#fbbf24` (amber-400)
- Secondary: `#a855f7` (purple-500)
- Success: `#10b981` (emerald-500)
- Danger: `#ef4444` (red-500)
- Texto: `#f1f5f9` (gray-100)
- Texto muted: `#94a3b8` (gray-400)

## Glassmorphism
```css
/* Contenedores principales */
bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl

/* Cards */
bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl shadow-xl

/* Inputs */
bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-gray-100 
focus:ring-2 focus:ring-amber-500 focus:border-transparent

/* Botones */
rounded-xl px-4 py-2 font-medium transition-colors duration-200 cursor-pointer

/* Botón primary */
bg-amber-500 hover:bg-amber-400 text-black

/* Botón secondary */
bg-white/10 hover:bg-white/20 text-gray-100 border border-white/10
```

## Layout
- Header fijo: `h-16` con glass effect
- Sidebar: `w-64` en desktop, `w-full` en mobile
- Contenedor principal: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Padding estándar: `p-4 sm:p-6`

## Breakpoints
- Mobile: `sm:` (640px)
- Tablet: `md:` (768px)
- Desktop: `lg:` (1024px)
- Wide: `xl:` (1280px)
