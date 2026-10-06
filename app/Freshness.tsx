import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { fmtRelative } from '../lib/format';
import { cn } from '../lib/cn';

interface SyncJob {
    job: string;
    last: { status: 'running' | 'success' | 'partial' | 'error'; started_at: string; finished_at: string | null; error: string | null };
    lastSuccess: string | null;
}

const JOB_LABELS: Record<string, string> = {
    'my-videos': 'Canal',
    competitors: 'Concorrência',
    hubspot: 'HubSpot',
    promotions: 'Promoções',
    hotmart: 'Hotmart',
};

const STALE_MS = 26 * 60 * 60 * 1000;

/** Selo de frescor dos dados: última sincronização de cada fonte e o erro, quando falha. */
export const Freshness: React.FC = () => {
    const { data } = useQuery({
        queryKey: ['sync-status'],
        queryFn: () => api<SyncJob[]>('/sync-status'),
        refetchInterval: 5 * 60_000,
        retry: false,
    });

    if (!data || data.length === 0) return null;

    return (
        <div className="hidden xl:flex items-center gap-3 whitespace-nowrap">
            {data.map((j) => {
                const failed = j.last.status === 'error';
                const stale = !j.lastSuccess || Date.now() - new Date(j.lastSuccess).getTime() > STALE_MS;
                const tone = failed ? 'bg-negative' : stale ? 'bg-warning' : 'bg-positive';
                const title = failed
                    ? `Última tentativa falhou: ${j.last.error || 'erro desconhecido'}`
                    : `Última sincronização ${fmtRelative(j.lastSuccess)}`;
                return (
                    <span key={j.job} title={title} className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                        <span className={cn('h-1.5 w-1.5 rounded-full', tone)} />
                        {JOB_LABELS[j.job] || j.job}
                        <span className={cn('tabular', failed ? 'text-negative' : 'text-fg-subtle')}>{failed ? 'falhou' : fmtRelative(j.lastSuccess)}</span>
                    </span>
                );
            })}
        </div>
    );
};
