import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/cn';

interface Props {
    /** Variação em fração (0.12 = +12%). null = sem base de comparação. */
    value: number | null;
    /** Para métricas em que cair é bom (custo, tempo até fechar). */
    invert?: boolean;
    className?: string;
}

export const Delta: React.FC<Props> = ({ value, invert, className }) => {
    if (value === null || !Number.isFinite(value)) return <span className={cn('text-xs text-fg-subtle', className)}>—</span>;
    const up = value >= 0;
    const good = invert ? !up : up;
    const Icon = up ? ArrowUpRight : ArrowDownRight;
    return (
        <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium tabular', good ? 'text-fg' : 'text-fg-subtle', className)}>
            <Icon size={12} />
            {Math.abs(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
        </span>
    );
};
