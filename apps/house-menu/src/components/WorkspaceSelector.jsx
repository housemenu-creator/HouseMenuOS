import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, ChevronRight, LogOut, Loader2, ArrowRight } from 'lucide-react';

export default function WorkspaceSelector() {
  const { pendingWorkspaces, selectWorkspace, cancelWorkspaceSelection } = useAuth();
  const [selectingId, setSelectingId] = useState(null);
  const [error, setError] = useState(null);

  const handleSelect = async (tenantId) => {
    setSelectingId(tenantId);
    setError(null);
    try {
      const result = await selectWorkspace(tenantId);
      if (!result.success) {
        setError(result.error || 'Error al conectar con el restaurante');
      }
    } catch (err) {
      setError('Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      setSelectingId(null);
    }
  };

  if (!pendingWorkspaces || pendingWorkspaces.length === 0) return null;

  // Curated gradient list for workspace initials
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-pink-500 to-rose-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-blue-500 to-cyan-600',
  ];

  return (
    <div className="min-h-screen bg-cm-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic background accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cm-accent/5 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-cm-accent/10 flex items-center justify-center border border-cm-accent/20 shadow-cm-sm">
            <Store className="w-8 h-8 text-cm-accent" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-cm-text">
              Selecciona tu espacio
            </h1>
            <p className="text-sm text-cm-text-secondary max-w-xs mx-auto">
              Tu cuenta está vinculada a múltiples restaurantes en House Portal OS.
            </p>
          </div>
        </div>

        {/* Workspace Cards List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {pendingWorkspaces.map((ws, index) => {
            const initial = (ws.name || ws.id).charAt(0).toUpperCase();
            const gradient = gradients[index % gradients.length];
            const isSelecting = selectingId === ws.id;

            return (
              <button
                key={ws.id}
                onClick={() => handleSelect(ws.id)}
                disabled={selectingId !== null}
                className={`w-full text-left flex items-center justify-between p-4 bg-cm-surface border border-cm-border rounded-xl transition-all duration-300 group hover:border-cm-accent hover:shadow-cm-md active:scale-[0.99] disabled:opacity-60 ${
                  isSelecting ? 'ring-2 ring-cm-accent border-transparent' : ''
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Initials badge with vibrant gradient */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0`}>
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-cm-text text-sm group-hover:text-cm-accent transition-colors truncate">
                        {ws.name}
                      </span>
                      {ws.role && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-cm-accent/10 text-cm-accent shrink-0">
                          {ws.role === 'admin' || ws.role === 'superadmin' ? 'Admin' : ws.role}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-cm-text-tertiary truncate mt-0.5">
                      {ws.description || 'Restaurante asociado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cm-bg border border-cm-border group-hover:bg-cm-accent group-hover:border-transparent transition-all shrink-0">
                  {isSelecting ? (
                    <Loader2 className="w-4 h-4 text-cm-accent animate-spin group-hover:text-white" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-cm-text-secondary group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-cm-error/10 border border-cm-error/20 text-xs text-cm-error font-medium text-center">
            {error}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-cm-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={cancelWorkspaceSelection}
            disabled={selectingId !== null}
            className="flex items-center gap-2 text-xs font-semibold text-cm-text-secondary hover:text-cm-text transition-colors py-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>

          <span className="text-xs text-cm-text-tertiary hidden sm:inline">
            ¿No ves tu local? Contacta soporte
          </span>
        </div>
      </div>
    </div>
  );
}
