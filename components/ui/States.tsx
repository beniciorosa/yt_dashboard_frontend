import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface EmptyProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyProps> = ({ icon, title, description, action }) => (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
        {icon && <div className="text-fg-subtle mb-3">{icon}</div>}
        <div className="text-sm font-medium text-fg">{title}</div>
        {description && <p className="text-xs text-fg-muted mt-1 max-w-sm">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);

/** Erro de carregamento com a mensagem real e botão de tentar de novo. */
export const ErrorState: React.FC<{ error: unknown; onRetry?: () => void }> = ({ error, onRetry }) => (
    <EmptyState
        icon={<AlertTriangle size={24} className="text-negative" />}
        title="Não foi possível carregar"
        description={error instanceof Error ? error.message : String(error)}
        action={onRetry && <Button size="sm" onClick={onRetry}>Tentar de novo</Button>}
    />
);
