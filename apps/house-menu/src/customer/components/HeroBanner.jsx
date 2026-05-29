import { motion } from 'framer-motion';

export default function HeroBanner({ branchName }) {
  return (
    <div className="bg-cm-accent text-white rounded-xl p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="relative z-10">
        <p className="text-[0.6rem] font-bold tracking-[0.3em] uppercase mb-1 text-white/60">Bienvenido a</p>
        <h1 className="text-4xl font-semibold leading-tight text-white">HOUSE</h1>
        <p className="text-sm font-bold mt-2 text-white/80">Gastronomía peruana · Hecho al momento</p>
        <div className="mt-4 inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-white border border-white/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
          <span>{branchName || 'Sede Principal'}</span>
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20">
          <span className="flex items-center gap-1.5 text-xs font-bold text-white/70">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            Cocina Activa
          </span>
          <span className="text-white/50 text-xs font-bold">·</span>
          <span className="text-xs font-bold text-white/70">
            {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
      </div>
    </div>
  );
}

