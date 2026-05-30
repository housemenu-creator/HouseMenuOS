import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in HouseHub:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cm-bg p-6">
          <div className="glass p-10 rounded-[2.5rem] border border-cm-error/20 shadow-2xl max-w-md w-full text-center">
            <div className="inline-flex p-4 rounded-3xl bg-cm-error/10 text-cm-error mb-6">
              <AlertOctagon size={48} />
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-2">Algo salió mal</h1>
            <p className="text-sm text-cm-text-secondary font-medium mb-8">
              Hubo un error inesperado al renderizar la interfaz. Hemos registrado el problema.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-cm-accent text-white font-bold rounded-2xl shadow-lg shadow-cm-accent/20 flex items-center justify-center gap-2 hover:bg-cm-accent-hover transition-all active:scale-[0.98]"
            >
              <RefreshCw size={18} />
              Reiniciar Aplicación
            </button>
            <details className="mt-8 text-left opacity-30 hover:opacity-100 transition-opacity">
              <summary className="text-[10px] font-bold uppercase tracking-widest cursor-pointer mb-2">Detalles técnicos</summary>
              <pre className="text-[10px] font-mono bg-black/5 p-3 rounded-lg overflow-x-auto">
                {this.state.error?.toString()}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
