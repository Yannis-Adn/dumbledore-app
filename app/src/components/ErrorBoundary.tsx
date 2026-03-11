import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-dim dark:bg-surface-dark p-4">
          <div className="max-w-md w-full bg-surface dark:bg-surface-dark-dim rounded-2xl border border-border dark:border-border-dark shadow-lg p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-danger/10 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-danger" />
            </div>
            <h1 className="text-xl font-bold text-text dark:text-text-dark mb-2">
              Quelque chose s'est mal passé
            </h1>
            <p className="text-sm text-text-muted dark:text-text-dark-muted mb-6">
              Une erreur inattendue est survenue. Essayez de recharger la page.
            </p>
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-xs text-text-muted dark:text-text-dark-muted cursor-pointer hover:text-text dark:hover:text-text-dark">
                  Détails techniques
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-surface-dim dark:bg-surface-dark text-xs text-danger overflow-x-auto whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-xl border border-border dark:border-border-dark text-sm font-medium text-text dark:text-text-dark hover:bg-surface-dim dark:hover:bg-surface-dark transition-colors"
              >
                Réessayer
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2.5 rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Recharger
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
