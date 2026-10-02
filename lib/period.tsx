import React, { createContext, useContext, useMemo, useState } from 'react';

export type PeriodPreset = '7d' | '28d' | '90d' | '365d' | 'all' | 'custom';

export interface Period {
    preset: PeriodPreset;
    /** yyyy-mm-dd; undefined em "all". */
    start?: string;
    end?: string;
}

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
    '7d': '7 dias',
    '28d': '28 dias',
    '90d': '90 dias',
    '365d': '12 meses',
    all: 'Tudo',
    custom: 'Personalizado',
};

const DAYS: Partial<Record<PeriodPreset, number>> = { '7d': 7, '28d': 28, '90d': 90, '365d': 365 };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export const resolvePeriod = (preset: PeriodPreset, custom?: { start: string; end: string }): Period => {
    if (preset === 'all') return { preset };
    if (preset === 'custom') return { preset, ...custom };
    const end = new Date();
    const start = new Date(end.getTime() - (DAYS[preset]! - 1) * 86_400_000);
    return { preset, start: iso(start), end: iso(end) };
};

/** Período imediatamente anterior, de mesma duração — base dos deltas. */
export const previousPeriod = (p: Period): Period | null => {
    if (!p.start || !p.end) return null;
    const start = new Date(p.start);
    const end = new Date(p.end);
    const span = end.getTime() - start.getTime() + 86_400_000;
    return { preset: 'custom', start: iso(new Date(start.getTime() - span)), end: iso(new Date(start.getTime() - 86_400_000)) };
};

const PeriodContext = createContext<{ period: Period; setPeriod: (p: Period) => void } | null>(null);

export const PeriodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [period, setPeriod] = useState<Period>(() => resolvePeriod('28d'));
    const value = useMemo(() => ({ period, setPeriod }), [period]);
    return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
};

export const usePeriod = () => {
    const ctx = useContext(PeriodContext);
    if (!ctx) throw new Error('usePeriod fora do PeriodProvider');
    return ctx;
};
