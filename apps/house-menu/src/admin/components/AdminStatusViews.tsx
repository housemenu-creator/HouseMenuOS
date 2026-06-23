import { Loader2, ShieldBan } from 'lucide-react';

export function AdminLoadingView() {
  return (
    <div className="min-h-screen bg-cm-bg p-6 flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-cm-accent animate-spin" />
    </div>
  );
}

interface AccessDeniedProps {
  branchName: string;
}

export function AdminAccessDenied({ branchName }: AccessDeniedProps) {
  return (
    <div className="min-h-screen bg-cm-bg p-6 flex items-center justify-center">
      <div className="text-center max-w-sm">
        <ShieldBan className="w-16 h-16 text-cm-error mx-auto mb-4" />
        <h2 className="text-lg font-bold text-cm-text mb-2">Acceso restringido</h2>
        <p className="text-sm text-cm-text-secondary">
          No tienes acceso a la sucursal &quot;{branchName}&quot;. Contacta al administrador para obtener permisos.
        </p>
      </div>
    </div>
  );
}

interface PendingPaymentProps {
  count: number;
  onClick: () => void;
}

export function PendingPaymentBanner({ count, onClick }: PendingPaymentProps) {
  if (count <= 0) return null;

  return (
    <div className="px-6 pt-3 shrink-0">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-cm-accent/10 border border-cm-accent/30 text-sm font-semibold text-cm-accent hover:bg-cm-accent/20 transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cm-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cm-accent" />
          </span>
          {count} pedido{count !== 1 ? 's' : ''} pendiente{count !== 1 ? 's' : ''} de verificación de pago
        </span>
        <span className="text-cm-text-tertiary text-xs">Ir a Pedidos →</span>
      </button>
    </div>
  );
}
