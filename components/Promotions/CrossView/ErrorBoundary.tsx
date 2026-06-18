import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  label?: string;
}
interface State {
  hasError: boolean;
  message?: string;
}

// Evita que um erro de renderização (ex.: campo inesperado vindo da IA) derrube a página inteira.
export class ErrorBoundary extends React.Component<Props, State> {
  // declarações explícitas p/ tipagem estável (os @types/react do projeto são divergentes p/ class components)
  declare props: Props;
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error: any, info: any) {
    console.error('CrossView render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-5 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Não foi possível exibir {this.props.label || 'esta seção'}.</p>
            <p className="text-xs mt-1 text-amber-600 dark:text-amber-500">{this.state.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
