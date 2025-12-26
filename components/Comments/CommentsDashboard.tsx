import React, { useState, useEffect, useCallback } from 'react';
import { CommentThread, fetchComments } from '../../services/commentsService';
import { fetchVideoDetailsByIds, VideoData } from '../../services/youtubeService';
import { CommentItem } from './CommentItem';
import { MessageSquare, Filter, RefreshCw, Search, Loader2, PlaySquare, Trophy, Heart } from 'lucide-react';
import { fetchTopCommenters, TopCommenter, fetchFavorites } from '../../services/commentsService';
import { CommentHistoryPanel } from './CommentHistoryPanel';
import { FavoritesPanel } from './FavoritesPanel';

export const CommentsDashboard: React.FC = () => {
    const [comments, setComments] = useState<CommentThread[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);

    // Filters
    const [filterOrder, setFilterOrder] = useState<'time' | 'relevance'>('time');
    const [showPendingOnly, setShowPendingOnly] = useState(true);
    const [searchTerms, setSearchTerms] = useState('');

    // Cache
    const [videoCache, setVideoCache] = useState<Record<string, VideoData>>({});

    // Ranking & History
    const [topCommenters, setTopCommenters] = useState<TopCommenter[]>([]);
    const [historyUsername, setHistoryUsername] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Favorites State
    const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

    const loadComments = useCallback(async (reset = false, token?: string) => {
        if (reset) setIsLoading(true);
        else setIsLoadingMore(true);

        let currentToken = token;
        let isResetting = reset;
        let attempts = 0;
        const MAX_ATTEMPTS = 5;
        let shouldContinue = true;

        try {
            while (shouldContinue && attempts < MAX_ATTEMPTS) {
                attempts++;

                const data: any = await fetchComments({
                    part: 'snippet,replies',
                    order: filterOrder,
                    searchTerms: searchTerms || undefined,
                    pageToken: currentToken,
                    maxResults: 20
                });

                if (!data || !data.items || data.items.length === 0) {
                    shouldContinue = false;
                    break;
                }

                const validItems = data.items;

                // Fetch associated videos
                const videoIds = Array.from(new Set<string>(validItems.map((i: any) => i.snippet.videoId)));
                const missingVideoIds = videoIds.filter(id => !videoCache[id]);

                if (missingVideoIds.length > 0) {
                    try {
                        const videos = await fetchVideoDetailsByIds(missingVideoIds);
                        setVideoCache(prev => {
                            const newCache = { ...prev };
                            videos.forEach(v => { newCache[v.id] = v; });
                            return newCache;
                        });
                    } catch (e) {
                        console.warn("Error fetching video details", e);
                    }
                }

                const resetForThisUpdate = isResetting;
                setComments(prev => {
                    if (resetForThisUpdate) return validItems;
                    const existingIds = new Set(prev.map(c => c.id));
                    const uniqueNewItems = validItems.filter((i: any) => !existingIds.has(i.id));
                    return [...prev, ...uniqueNewItems];
                });

                setNextPageToken(data.nextPageToken);
                currentToken = data.nextPageToken;
                isResetting = false;

                if (showPendingOnly) {
                    const hasUnreplied = validItems.some((i: any) => i.snippet.totalReplyCount === 0);
                    if (hasUnreplied) {
                        shouldContinue = false;
                    } else {
                        if (!currentToken) shouldContinue = false;
                    }
                } else {
                    shouldContinue = false;
                }
            }
        } catch (error) {
            console.error("Failed to load comments", error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [filterOrder, searchTerms, showPendingOnly, videoCache]);

    const loadRanking = async () => {
        try {
            const data = await fetchTopCommenters();
            setTopCommenters(data);
        } catch (e) {
            console.warn("Failed to load ranking", e);
        }
    };

    const loadFavoritesList = async () => {
        try {
            const data = await fetchFavorites();
            setFavoriteIds(new Set(data.map(f => f.comment_id)));
        } catch (e) {
            console.warn("Failed to load favorites", e);
        }
    };

    // Initial Load
    useEffect(() => {
        loadComments(true);
        loadRanking();
        loadFavoritesList();
    }, [filterOrder, searchTerms]);

    const handleOpenHistory = (username: string) => {
        setHistoryUsername(username);
        setIsHistoryOpen(true);
    };

    const isUnreplied = (thread: CommentThread) => thread.snippet.totalReplyCount === 0;

    const displayedComments = showPendingOnly
        ? comments.filter(c => isUnreplied(c))
        : comments;

    const handleReplySuccess = (threadId: string) => {
        if (showPendingOnly) {
            setComments(prev => prev.filter(c => c.id !== threadId));
        } else {
            setComments(prev => prev.map(c => {
                if (c.id === threadId) {
                    return {
                        ...c,
                        snippet: {
                            ...c.snippet,
                            totalReplyCount: c.snippet.totalReplyCount + 1
                        }
                    };
                }
                return c;
            }));
        }
    };

    const handleDeleteSuccess = (threadId: string) => {
        setComments(prev => prev.filter(c => c.id !== threadId));
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            {/* Header */}
            <div className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 px-6 flex items-center justify-between shrink-0 z-10 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-lg">
                        <MessageSquare size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Comentários</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {displayedComments.length} comentários exibidos
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsFavoritesOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-800 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all shadow-sm"
                    >
                        <Heart size={14} className="fill-current" />
                        Favoritos
                        {favoriteIds.size > 0 && (
                            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1 min-w-[18px] text-center">
                                {favoriteIds.size}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700 shadow-sm sm:shadow-none"
                        title="Recarregar"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 flex flex-wrap gap-4 items-center justify-between backdrop-blur-md">
                {/* Search */}
                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Filtrar por palavras-chave..."
                        value={searchTerms}
                        onChange={(e) => setSearchTerms(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-pink-500 outline-none transition-all shadow-sm"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1 shadow-sm">
                        <button
                            onClick={() => setShowPendingOnly(true)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${showPendingOnly ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            Sem Resposta
                        </button>
                        <button
                            onClick={() => setShowPendingOnly(false)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${!showPendingOnly ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            Todos
                        </button>
                    </div>

                    <div className="relative flex items-center">
                        <Filter size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
                        <select
                            value={filterOrder}
                            onChange={(e) => setFilterOrder(e.target.value as any)}
                            className="pl-9 pr-6 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-pink-500 outline-none appearance-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all shadow-sm"
                        >
                            <option value="time">Mais Recentes</option>
                            <option value="relevance">Mais Relevantes</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Top Commenters Ranking */}
            {topCommenters.length > 0 && (
                <div className="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 overflow-x-auto shadow-sm">
                    <div className="max-w-5xl mx-auto flex items-center gap-6">
                        <div className="flex items-center gap-2 shrink-0">
                            <Trophy size={18} className="text-amber-500" />
                            <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Top 5 Espectadores:</span>
                        </div>
                        <div className="flex items-center gap-4 flex-1">
                            {topCommenters.map((user, idx) => (
                                <button
                                    key={user.username}
                                    onClick={() => handleOpenHistory(user.username)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full border border-gray-100 dark:border-gray-700 transition-all group shrink-0"
                                >
                                    <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${idx === 0 ? 'bg-amber-100 text-amber-600' :
                                        idx === 1 ? 'bg-slate-200 text-slate-600' :
                                            idx === 2 ? 'bg-orange-100 text-orange-600' :
                                                'bg-gray-100 text-gray-500'
                                        }`}>
                                        {idx + 1}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
                                        {user.username}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        ({user.count})
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Content List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 text-gray-400">
                        <Loader2 size={32} className="animate-spin text-pink-500" />
                        <p className="text-sm">Carregando comentários...</p>
                    </div>
                ) : (
                    <div className="max-w-5xl mx-auto pb-20 p-4">
                        {displayedComments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-gray-400">
                                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                                    <MessageSquare size={32} />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-gray-900 dark:text-white font-medium">
                                        {nextPageToken ? "Nenhum comentário nesta página" : "Nenhum comentário encontrado"}
                                    </h3>
                                    <p className="text-sm mt-1 max-w-xs mx-auto">
                                        {showPendingOnly
                                            ? "Todos os comentários visíveis foram respondidos."
                                            : "Tente ajustar seus filtros de busca."}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            displayedComments.map(thread => (
                                <CommentItem
                                    key={thread.id}
                                    thread={thread}
                                    video={videoCache[thread.snippet.videoId]}
                                    onReplySuccess={() => {
                                        handleReplySuccess(thread.id);
                                        loadRanking();
                                        loadFavoritesList();
                                    }}
                                    onDeleteSuccess={handleDeleteSuccess}
                                    ranking={topCommenters}
                                    onUsernameClick={handleOpenHistory}
                                    isFavorited={favoriteIds.has(thread.id)}
                                    onFavoriteToggle={loadFavoritesList}
                                />
                            ))
                        )}

                        {nextPageToken && (
                            <div className="p-6 flex justify-center">
                                <button
                                    onClick={() => loadComments(false, nextPageToken)}
                                    disabled={isLoadingMore}
                                    className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2 shadow-sm"
                                >
                                    {isLoadingMore && <Loader2 size={14} className="animate-spin" />}
                                    Carregar Mais Antigos
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <CommentHistoryPanel
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                username={historyUsername}
            />

            <FavoritesPanel
                isOpen={isFavoritesOpen}
                onClose={() => setIsFavoritesOpen(false)}
                onRefreshNeeded={loadFavoritesList}
            />
        </div>
    );
};
