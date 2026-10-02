import React from 'react';
import { Card } from './Card';
import { Delta } from './Delta';
import { Skeleton } from './Skeleton';
import { cn } from '../../lib/cn';

interface Props {
    label: string;
    value: string;
    /** Variação vs período anterior (fração). undefined = não mostrar. */
    delta?: number | null;
    invertDelta?: boolean;
    hint?: string;
    /** Série curta para a sparkline (valores na ordem do tempo). */
    trend?: number[];
    loading?: boolean;
    className?: string;
}

const Sparkline: React.FC<{ data: number[] }> = ({ data }) => {
    if (data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const span = max - min || 1;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${27 - ((v - min) / span) * 26}`).join(' ');
    return (
        <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="w-full h-7 mt-2" aria-hidden>
            <polyline points={points} fill="none" stroke="var(--chart-1)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
    );
};

export const KpiCard: React.FC<Props> = ({ label, value, delta, invertDelta, hint, trend, loading, className }) => (
    <Card className={cn('p-4 min-w-0', className)}>
        <div className="text-xs font-medium text-fg-muted truncate">{label}</div>
        {loading ? (
            <Skeleton className="h-7 w-24 mt-2" />
        ) : (
            <div className="flex flex-wrap items-baseline gap-x-2 mt-1.5">
                <span className="text-2xl font-semibold tracking-tight text-fg tabular whitespace-nowrap">{value}</span>
                {delta !== undefined && <Delta value={delta} invert={invertDelta} />}
            </div>
        )}
        {hint && <div className="text-xs text-fg-subtle mt-1 truncate">{hint}</div>}
        {trend && !loading && <Sparkline data={trend} />}
    </Card>
);
