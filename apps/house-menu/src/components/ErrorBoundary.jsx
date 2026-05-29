import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cm-bg flex items-center justify-center p-8">
          <div className="bg-cm-surface backdrop-blur-xl rounded-2xl border border-cm-border p-8 max-w-md w-full text-center space-y-4 shadow-cm-lg">
            <div className="w-16 h-16 rounded-2xl bg-cm-error/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-cm-error" />
            </div>
            <h2 className="text-xl font-bold text-cm-text">Algo salió mal</h2>
            <p className="text-sm text-cm-text-secondary">
              {this.props.message || 'Ocurrió un error inesperado.'}
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-cm-accent text-white hover:bg-cm-accent-hover transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
