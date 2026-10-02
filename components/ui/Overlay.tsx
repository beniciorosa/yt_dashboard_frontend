import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

const useEscape = (onClose: () => void) => {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
};

interface BaseProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    /** Classe de largura máxima (ex.: max-w-3xl). */
    width?: string;
}

const Header: React.FC<Pick<BaseProps, 'title' | 'subtitle' | 'onClose'>> = ({ title, subtitle, onClose }) => (
    <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-line">
        <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg truncate">{title}</h2>
            {subtitle && <div className="text-xs text-fg-muted mt-0.5">{subtitle}</div>}
        </div>
        <button onClick={onClose} aria-label="Fechar" className="p-1 rounded text-fg-muted hover:text-fg hover:bg-surface-hover">
            <X size={16} />
        </button>
    </div>
);

/** Painel lateral para detalhe de um item (vídeo, closer, negócio). */
export const Drawer: React.FC<BaseProps> = ({ title, subtitle, onClose, children, footer, width = 'max-w-3xl' }) => {
    useEscape(onClose);
    return (
        <div className="fixed inset-0 z-40 flex justify-end">
            <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
            <aside role="dialog" aria-modal className={cn('relative w-full h-full bg-surface border-l border-line flex flex-col animate-in slide-in-from-right', width)}>
                <Header title={title} subtitle={subtitle} onClose={onClose} />
                <div className="flex-1 overflow-y-auto p-5">{children}</div>
                {footer && <div className="px-5 py-3 border-t border-line flex justify-end gap-2">{footer}</div>}
            </aside>
        </div>
    );
};

export const Modal: React.FC<BaseProps> = ({ title, subtitle, onClose, children, footer, width = 'max-w-lg' }) => {
    useEscape(onClose);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
            <div role="dialog" aria-modal className={cn('relative w-full bg-surface border border-line rounded-card shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95', width)}>
                <Header title={title} subtitle={subtitle} onClose={onClose} />
                <div className="flex-1 overflow-y-auto p-5">{children}</div>
                {footer && <div className="px-5 py-3 border-t border-line flex justify-end gap-2">{footer}</div>}
            </div>
        </div>
    );
};
