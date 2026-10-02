import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { ALL_NAV_ITEMS } from './nav';
import { useSession } from './session';
import { cn } from '../lib/cn';

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Ctrl/⌘+K: pula para qualquer tela digitando parte do nome. */
export const CommandPalette: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const navigate = useNavigate();
    const { role } = useSession();
    const [query, setQuery] = useState('');
    const [index, setIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const results = useMemo(() => {
        const q = normalize(query.trim());
        return ALL_NAV_ITEMS
            .filter((i) => !i.adminOnly || role === 'admin')
            .filter((i) => !q || normalize(`${i.label} ${i.title}`).includes(q));
    }, [query, role]);

    useEffect(() => {
        if (open) {
            setQuery('');
            setIndex(0);
            inputRef.current?.focus();
        }
    }, [open]);

    useEffect(() => setIndex(0), [query]);

    if (!open) return null;

    const go = (path: string) => {
        navigate(path);
        onClose();
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter' && results[index]) go(results[index].path);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] px-4">
            <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
            <div role="dialog" aria-modal aria-label="Ir para" className="relative w-full max-w-md bg-surface border border-line-strong rounded-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-2 px-3 border-b border-line">
                    <Search size={15} className="text-fg-subtle" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Ir para…"
                        className="flex-1 h-11 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none"
                    />
                </div>
                <ul className="max-h-72 overflow-y-auto p-1.5">
                    {results.map((item, i) => (
                        <li key={item.path}>
                            <button
                                onMouseEnter={() => setIndex(i)}
                                onClick={() => go(item.path)}
                                className={cn('w-full flex items-center gap-2.5 h-9 px-2.5 rounded-md text-sm text-left', i === index ? 'bg-surface-hover text-fg' : 'text-fg-muted')}
                            >
                                <item.icon size={15} />
                                {item.title}
                            </button>
                        </li>
                    ))}
                    {results.length === 0 && <li className="px-3 py-6 text-center text-xs text-fg-muted">Nenhuma tela encontrada</li>}
                </ul>
            </div>
        </div>
    );
};
