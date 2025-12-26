import React, { useState, useEffect } from 'react';
import { X, Heart, Loader2, PlaySquare, ExternalLink, Trash2 } from 'lucide-react';
import { fetchFavorites, toggleFavorite, FavoriteComment } from '../../services/commentsService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onRefreshNeeded?: () => void;
}

export const FavoritesPanel: React.FC<Props> = ({ isOpen, onClose, onRefreshNeeded }) => {
    const [favorites, setFavorites] = useState<FavoriteComment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const loadFavorites = async () => {
        setIsLoading(true);
        const data = await fetchFavorites();
        setFavorites(data);
        setIsLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            loadFavorites();
        }
    }, [isOpen]);

    const handleRemove = async (comment: FavoriteComment) => {
        const res = await toggleFavorite({ comment_id: comment.comment_id });
        if (!res.favorited) {
            setFavorites(prev => prev.filter(f => f.comment_id !== comment.comment_id));
            onRefreshNeeded?.();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-200 dark:border-gray-800">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <Heart size={20} className="text-red-500 fill-current" />
                    <h2 className="font-bold text-gray-900 dark:text-white">Perguntas Favoritas</h2>
                    <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {favorites.length}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
                        <Loader2 className="animate-spin" size={32} />
                        <p className="text-sm">Carregando seus favoritos...</p>
                    </div>
                ) : favorites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4 px-8 text-center">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-2">
                            <Heart size={32} className="opacity-20" />
                        </div>
                        <p className="text-sm font-medium">Nenhum favorito ainda.</p>
                        <p className="text-xs">Clique no coração de uma pergunta para salvá-la aqui.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {favorites.map((fav) => {
                            const isExpanded = expandedIds.has(fav.id);
                            return (
                                <div key={fav.id} className="group p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-red-200 dark:hover:border-red-900/30 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <img src={fav.author_profile_image} className="w-6 h-6 rounded-full" />
                                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{fav.author_name}</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemove(fav)}
                                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Remover dos favoritos"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <div
                                        className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed cursor-pointer transition-all duration-300 ${isExpanded ? '' : 'line-clamp-3'}`}
                                        dangerouslySetInnerHTML={{ __html: fav.content }}
                                        onClick={() => toggleExpand(fav.id)}
                                    />

                                    {!isExpanded && fav.content.length > 100 && (
                                        <button
                                            onClick={() => toggleExpand(fav.id)}
                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 mt-1 block"
                                        >
                                            Ver texto completo...
                                        </button>
                                    )}

                                    {isExpanded && (
                                        <button
                                            onClick={() => toggleExpand(fav.id)}
                                            className="text-[10px] font-bold text-gray-400 hover:text-gray-500 mt-2 block"
                                        >
                                            Recolher
                                        </button>
                                    )}

                                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 dark:border-gray-700">
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium truncate max-w-[150px]">
                                            {fav.video_title}
                                        </span>
                                        <a
                                            href={`https://www.youtube.com/watch?v=${fav.video_id}&lc=${fav.comment_id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-sm"
                                        >
                                            <PlaySquare size={12} />
                                            Ver no YT
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
