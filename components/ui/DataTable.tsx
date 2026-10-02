import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Skeleton } from './Skeleton';

export interface Column<T> {
    id: string;
    header: string;
    cell: (row: T) => React.ReactNode;
    /** Valor usado na ordenação; sem ele a coluna não ordena. */
    sortValue?: (row: T) => number | string | null | undefined;
    align?: 'left' | 'right';
    /** Dica exibida no cabeçalho (definição da métrica). */
    hint?: string;
    className?: string;
}

interface Props<T> {
    columns: Column<T>[];
    rows: T[];
    rowKey: (row: T) => string;
    onRowClick?: (row: T) => void;
    initialSort?: { id: string; dir: 'asc' | 'desc' };
    loading?: boolean;
    empty?: React.ReactNode;
    /** Limita a altura e fixa o cabeçalho. */
    maxHeight?: string;
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, initialSort, loading, empty, maxHeight }: Props<T>) {
    const [sort, setSort] = useState(initialSort);

    const sorted = useMemo(() => {
        const col = columns.find((c) => c.id === sort?.id);
        if (!col?.sortValue || !sort) return rows;
        const dir = sort.dir === 'asc' ? 1 : -1;
        return [...rows].sort((a, b) => {
            const va = col.sortValue!(a);
            const vb = col.sortValue!(b);
            // sem dado vai sempre para o fim, em qualquer direção
            if (va == null && vb == null) return 0;
            if (va == null) return 1;
            if (vb == null) return -1;
            const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt-BR');
            return cmp * dir;
        });
    }, [rows, columns, sort]);

    const toggle = (col: Column<T>) => {
        if (!col.sortValue) return;
        setSort((s) => (s?.id === col.id ? { id: col.id, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { id: col.id, dir: 'desc' }));
    };

    return (
        <div className="overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
            <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-surface">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.id}
                                title={col.hint}
                                onClick={() => toggle(col)}
                                aria-sort={sort?.id === col.id ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                                className={cn(
                                    'h-9 px-3 text-[11px] font-medium uppercase tracking-wide text-fg-subtle border-b border-line whitespace-nowrap select-none',
                                    col.align === 'right' ? 'text-right' : 'text-left',
                                    col.sortValue && 'cursor-pointer hover:text-fg',
                                )}
                            >
                                <span className={cn('inline-flex items-center gap-1', col.align === 'right' && 'flex-row-reverse')}>
                                    {col.header}
                                    {sort?.id === col.id && (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {loading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <tr key={i}>
                                {columns.map((col) => (
                                    <td key={col.id} className="h-11 px-3 border-b border-line">
                                        <Skeleton className="h-4 w-full max-w-[120px]" />
                                    </td>
                                ))}
                            </tr>
                        ))
                        : sorted.map((row) => (
                            <tr
                                key={rowKey(row)}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={cn('border-b border-line last:border-b-0', onRowClick && 'cursor-pointer hover:bg-surface-hover')}
                            >
                                {columns.map((col) => (
                                    <td key={col.id} className={cn('h-11 px-3 text-fg', col.align === 'right' && 'text-right tabular whitespace-nowrap', col.className)}>
                                        {col.cell(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                </tbody>
            </table>
            {!loading && sorted.length === 0 && empty}
        </div>
    );
}
