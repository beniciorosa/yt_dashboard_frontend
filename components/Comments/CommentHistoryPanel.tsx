import React, { useState, useEffect } from 'react';
import { X, MessageSquare, CornerDownRight, Loader2, Calendar, User } from 'lucide-react';
import { fetchUserHistory, CommentHistoryEntry } from '../../services/commentsService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    username: string | null;
}

export const CommentHistoryPanel: React.FC<Props> = ({ isOpen, onClose, username }) => {
    const [history, setHistory] = useState<CommentHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && username) {
            loadHistory();
        } else {
            setHistory([]);
        }
    }, [isOpen, username]);

    const loadHistory = async () => {
        if (!username) return;
        setIsLoading(true);
        try {
            const data = await fetchUserHistory(username);
            setHistory(data);
        } catch (error) {
            console.error("Failed to load history", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl z-[70] animate-in slide-in-from-right duration-300 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                            <User size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Histórico de {username}</h2>
                            <p className="text-xs text-gray-500">{history.length} interações registradas</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                            <p className="text-sm text-gray-500">Carregando histórico...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full">
                                <MessageSquare size={32} className="text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-500">Nenhum histórico encontrado para este usuário.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {history.map((item, index) => (
                                <div key={item.id} className="relative pl-6 border-l-2 border-gray-100 dark:border-gray-800">
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-gray-900 border-2 border-blue-500" />

                                    <div className="flex items-center gap-2 mb-3 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                        <Calendar size={12} />
                                        {formatDate(item.created_at)}
                                    </div>

                                    <div className="space-y-4">
                                        {/* Question */}
                                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
                                            <p className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2 uppercase tracking-tight">
                                                <MessageSquare size={12} /> Comentário
                                            </p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                                "{item.comment_text}"
                                            </p>
                                        </div>

                                        {/* Answer */}
                                        <div className="bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                                            <p className="text-xs font-bold text-blue-500/70 mb-2 flex items-center gap-2 uppercase tracking-tight">
                                                <CornerDownRight size={12} /> Minha Resposta
                                            </p>
                                            <p className="text-sm text-gray-800 dark:text-gray-200">
                                                {item.reply_text}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
