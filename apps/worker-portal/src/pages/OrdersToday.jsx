import { Clock } from 'lucide-react';

export default function OrdersToday() {
  return (
    <div className="p-8 max-w-6xl mx-auto animate-[fadeIn_0.5s_ease]">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Pedidos <span className="text-cm-accent">del Día</span>
        </h1>
        <p className="text-cm-text-secondary mt-2">Sincronizado con House Menu</p>
      </header>

      <div className="rounded-xl bg-cm-surface border border-cm-border shadow-cm-sm transition-all hover:border-cm-accent hover:shadow-cm-md p-12 text-center">
        <Clock className="w-16 h-16 text-cm-text-secondary mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-cm-text mb-2">Conectando a Firebase...</h2>
        <p className="text-cm-text-secondary max-w-md mx-auto">
          Esta sección mostrará en tiempo real los pedidos que ingresan por el portal de House Menu.
        </p>
      </div>
    </div>
  );
}
