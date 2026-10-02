import React from 'react';
import { cn } from '../../lib/cn';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
    <div {...rest} className={cn('bg-surface border border-line rounded-card', className)} />
);

interface SectionProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    /** Remove o padding do corpo (tabelas que encostam na borda). */
    flush?: boolean;
}

/** Card com cabeçalho: título, descrição curta e ações à direita. */
export const Section: React.FC<SectionProps> = ({ title, description, actions, children, className, flush }) => (
    <Card className={className}>
        <div className="flex items-start justify-between gap-4 px-4 py-3 border-b border-line">
            <div className="min-w-0">
                <h3 className="text-sm font-semibold text-fg">{title}</h3>
                {description && <p className="text-xs text-fg-muted mt-0.5">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
        <div className={flush ? '' : 'p-4'}>{children}</div>
    </Card>
);
