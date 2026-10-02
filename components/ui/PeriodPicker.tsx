import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { PERIOD_LABELS, PeriodPreset, resolvePeriod, usePeriod } from '../../lib/period';
import { cn } from '../../lib/cn';
import { Segmented } from './Tabs';

const PRESETS: PeriodPreset[] = ['7d', '28d', '90d', '365d', 'all'];

/** Seletor único de período do app — todas as telas leem o mesmo valor (usePeriod). */
export const PeriodPicker: React.FC = () => {
    const { period, setPeriod } = usePeriod();
    const [open, setOpen] = useState(period.preset === 'custom');
    const [start, setStart] = useState(period.start || '');
    const [end, setEnd] = useState(period.end || '');

    const applyCustom = (s: string, e: string) => {
        setStart(s);
        setEnd(e);
        if (s && e && s <= e) setPeriod(resolvePeriod('custom', { start: s, end: e }));
    };

    const inputCls = 'h-7 px-2 rounded-md bg-surface-2 border border-line text-xs text-fg tabular';

    return (
        <div className="flex items-center gap-2">
            {open && (
                <div className="flex items-center gap-1.5">
                    <input type="date" aria-label="Início" value={start} max={end || undefined} onChange={(e) => applyCustom(e.target.value, end)} className={inputCls} />
                    <span className="text-fg-subtle text-xs">até</span>
                    <input type="date" aria-label="Fim" value={end} min={start || undefined} onChange={(e) => applyCustom(start, e.target.value)} className={inputCls} />
                </div>
            )}
            <Segmented
                items={PRESETS.map((id) => ({ id, label: PERIOD_LABELS[id] }))}
                value={period.preset === 'custom' ? null : period.preset}
                onChange={(id) => {
                    setOpen(false);
                    setPeriod(resolvePeriod(id));
                }}
            />
            <button
                onClick={() => setOpen((o) => !o)}
                aria-pressed={open}
                title="Período personalizado"
                className={cn(
                    'h-7 w-7 inline-flex items-center justify-center rounded-md border border-line',
                    period.preset === 'custom' ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-fg-muted hover:text-fg',
                )}
            >
                <Calendar size={14} />
            </button>
        </div>
    );
};
