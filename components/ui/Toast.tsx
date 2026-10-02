import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';
interface ToastItem {
    id: number;
    tone: Tone;
    message: string;
}

const ToastContext = createContext<((message: string, tone?: Tone) => void) | null>(null);

const ICONS: Record<Tone, React.ReactNode> = {
    success: <CheckCircle2 size={16} className="text-positive" />,
    error: <AlertTriangle size={16} className="text-negative" />,
    info: <Info size={16} className="text-accent" />,
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<ToastItem[]>([]);

    const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

    const push = useCallback((message: string, tone: Tone = 'info') => {
        const id = Date.now() + Math.random();
        setItems((list) => [...list, { id, tone, message }]);
        // erros ficam mais tempo na tela
        setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 4000);
    }, [dismiss]);

    return (
        <ToastContext.Provider value={push}>
            {children}
            <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-80" role="status" aria-live="polite">
                {items.map((t) => (
                    <div key={t.id} className="flex items-start gap-2.5 p-3 rounded-card bg-surface-2 border border-line-strong shadow-xl animate-in slide-in-from-bottom">
                        <span className="mt-0.5 shrink-0">{ICONS[t.tone]}</span>
                        <p className="text-sm text-fg flex-1 break-words">{t.message}</p>
                        <button onClick={() => dismiss(t.id)} aria-label="Dispensar" className="text-fg-subtle hover:text-fg">
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast fora do ToastProvider');
    return ctx;
};
