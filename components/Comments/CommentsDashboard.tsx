import React, { useState, useEffect, useCallback } from 'react';
import { CommentThread, fetchComments } from '../../services/commentsService';
import { fetchVideoDetailsByIds, VideoData } from '../../services/youtubeService';
import { CommentItem } from './CommentItem';
import { MessageSquare, Filter, RefreshCw, Search, Loader2, PlaySquare } from 'lucide-react';

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

    const loadComments = useCallback(async (reset = false, token?: string) => {
        if (reset) setIsLoading(true);
        else setIsLoadingMore(true);

        try {
            const data = await fetchComments({
                part: 'snippet,replies',
                order: filterOrder,
                searchTerms: searchTerms || undefined,
                pageToken: token,
                maxResults: 20
            });

            if (data && data.items) {
                // Filter locally for "Pending" status if API doesn't support it directly in 'list'
                // NOTE: The API doesn't have a direct "status=unreplied" filter for 'commentThreads'.
                // We have to filter client-side or use 'moderationStatus' (if we were owner/moderator context only).
                // Actually, strict "Pending" (Unreplied) logic:
                // Check if 'totalReplyCount' == 0 OR if none of the replies are from the channel owner.
                // For simplicity, we'll implement a client-side filter for now, 
                // but this means pagination might look weird if we hide many items.
                // Ideally we fetch a larger batch if filtering locally.

                let validItems = data.items;

                // Fetch associated videos
                const videoIds = Array.from(new Set(validItems.map(i => i.snippet.videoId)));
                const missingVideoIds = videoIds.filter(id => !videoCache[id]);

                if (missingVideoIds.length > 0) {
                    const videos = await fetchVideoDetailsByIds(missingVideoIds);
                    setVideoCache(prev => {
                        const newCache = { ...prev };
                        videos.forEach(v => { newCache[v.id] = v; });
                        return newCache;
                    });
                }

                if (reset) {
                    setComments(validItems);
                } else {
                    setComments(prev => [...prev, ...validItems]);
                }
                setNextPageToken(data.nextPageToken);
            }
        } catch (error) {
            console.error("Failed to load comments", error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [filterOrder, searchTerms, videoCache]); // Added videoCache to dep array to satisfy linter if needed, but logic doesn't strictly depend on it for fetch. 

    // Initial Load & Filter Change
    useEffect(() => {
        loadComments(true);
    }, [filterOrder, searchTerms]);

    // Helper to check if unreplied
    const isUnreplied = (thread: CommentThread) => {
        // Simple check: no replies
        if (thread.snippet.totalReplyCount === 0) return true;
        // Advanced: Check if any reply is from me? 
        // We don't easily know "my" channel ID here without auth context, 
        // but typically unreplied means 0 replies for this dashboard context.
        return false;
    };

    const displayedComments = showPendingOnly
        ? comments.filter(c => isUnreplied(c))
        : comments;

    const handleReplySuccess = (threadId: string) => {
        // If we are in "Pending Only" mode, remove it.
        // If "All", just update data (increment reply count mock)
        if (showPendingOnly) {
            setComments(prev => prev.filter(c => c.id !== threadId));
        } else {
            // Update local state to reflect it's replied (increment count)
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
            <div className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 px-6 flex items-center justify-between shrink-0 z-10">
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
                        onClick={() => loadComments(true)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        title="Atualizar"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 flex flex-wrap gap-4 items-center justify-between">

                {/* Search */}
                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Filtrar por palavras-chave..."
                        value={searchTerms}
                        onChange={(e) => setSearchTerms(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-pink-500 outline-none"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                        <button
                            onClick={() => setShowPendingOnly(true)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${showPendingOnly ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            Sem Resposta
                        </button>
                        <button
                            onClick={() => setShowPendingOnly(false)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${!showPendingOnly ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            Todos
                        </button>
                    </div>

                    <div className="relative flex items-center">
                        <Filter size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
                        <select
                            value={filterOrder}
                            onChange={(e) => setFilterOrder(e.target.value as any)}
                            className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-pink-500 outline-none appearance-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                            <option value="time">Mais Recentes</option>
                            <option value="relevance">Mais Relevantes</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 text-gray-400">
                        <Loader2 size={32} className="animate-spin text-pink-500" />
                        <p className="text-sm">Carregando comentários...</p>
                    </div>
                ) : displayedComments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 text-gray-400">
                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                            <MessageSquare size={32} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-gray-900 dark:text-white font-medium">Nenhum comentário encontrado</h3>
                            <p className="text-sm mt-1 max-w-xs mx-auto">
                                {showPendingOnly ? "Você respondeu a todos os comentários recentes!" : "Tente ajustar seus filtros de busca."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-5xl mx-auto">
                        {displayedComments.map(thread => (
                            <CommentItem
                                key={thread.id}
                                thread={thread}
                                video={videoCache[thread.snippet.videoId]}
                                onReplySuccess={handleReplySuccess}
                                onDeleteSuccess={handleDeleteSuccess}
                            />
                        ))}

                        {/* Load More */}
                        {nextPageToken && (
                            <div className="p-6 flex justify-center">
                                <button
                                    onClick={() => loadComments(false, nextPageToken)}
                                    disabled={isLoadingMore}
                                    className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                                >
                                    {isLoadingMore && <Loader2 size={14} className="animate-spin" />}
                                    Carregar Mais
                                </button>
                            </div>
                        )}

                        {/* Bottom Spacer */}
                        <div className="h-20"></div>
                    </div>
                )}
            </div>
        </div>
    );
};
