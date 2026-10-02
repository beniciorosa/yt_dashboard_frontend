import React from 'react';
import { cn } from '../../lib/cn';

export interface TabItem<T extends string> {
    id: T;
    label: string;
    icon?: React.ReactNode;
    count?: number;
}

interface Props<T extends string> {
    items: TabItem<T>[];
    value: T;
    onChange: (id: T) => void;
    className?: string;
}

export function Tabs<T extends string>({ items, value, onChange, className }: Props<T>) {
    return (
        <div role="tablist" className={cn('flex items-center gap-1 border-b border-line', className)}>
            {items.map((item) => {
                const active = item.id === value;
                return (
                    <button
                        key={item.id}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(item.id)}
                        className={cn(
                            'relative inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-colors -mb-px border-b-2',
                            active ? 'text-fg border-accent' : 'text-fg-muted border-transparent hover:text-fg',
                        )}
                    >
                        {item.icon}
                        {item.label}
                        {item.count !== undefined && <span className="text-xs text-fg-subtle tabular">{item.count}</span>}
                    </button>
                );
            })}
        </div>
    );
}

interface SegmentedProps<T extends string> {
    items: { id: T; label: string }[];
    /** null = nenhuma opção marcada. */
    value: T | null;
    onChange: (id: T) => void;
    className?: string;
}

/** Seletor compacto de opções mutuamente exclusivas (período, escopo...). */
export function Segmented<T extends string>({ items, value, onChange, className }: SegmentedProps<T>) {
    return (
        <div className={cn('inline-flex items-center p-0.5 rounded-md bg-surface-2 border border-line', className)}>
            {items.map((item) => (
                <button
                    key={item.id}
                    onClick={() => onChange(item.id)}
                    aria-pressed={item.id === value}
                    className={cn(
                        'h-6 px-2.5 rounded text-xs font-medium whitespace-nowrap transition-colors',
                        item.id === value ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
                    )}
                >
                    {item.label}
                </button>
            ))}
        </div>
    );
}
