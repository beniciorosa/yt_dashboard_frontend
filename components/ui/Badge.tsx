import React from 'react';
import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'accent' | 'positive' | 'negative' | 'warning';

const TONES: Record<Tone, string> = {
    neutral: 'bg-surface-2 text-fg-muted border-line',
    accent: 'bg-accent-soft text-accent border-transparent',
    positive: 'bg-positive-soft text-positive border-transparent',
    negative: 'bg-negative-soft text-negative border-transparent',
    warning: 'bg-warning-soft text-warning border-transparent',
};

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode; className?: string; title?: string }> = ({ tone = 'neutral', children, className, title }) => (
    <span title={title} className={cn('inline-flex items-center gap-1 h-5 px-1.5 rounded border text-[11px] font-medium whitespace-nowrap', TONES[tone], className)}>
        {children}
    </span>
);
