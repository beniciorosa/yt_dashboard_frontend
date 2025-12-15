// --- START OF FILE components/Dashboard.tsx ---
import React, { useState, useEffect, useMemo } from 'react';
import { Competitor } from '../types';
import { fetchCompetitors, addCompetitor, toggleCompetitorVisibility, deleteCompetitor, addSnapshot, toggleCompetitorPin, updateCompetitorAvatar } from '../services/storageService';
import { fetchYoutubeChannelData } from '../services/youtubeService';
import { CompetitorForm } from './CompetitorForm';
import { VersusPanel } from './VersusPanel';
import { Plus, Users, Video, ChevronRight, Loader2, Trash2, GripVertical, LayoutGrid, List, RefreshCw, AlertTriangle, ArrowUpDown, Pin, Clapperboard, TrendingUp, User, Eye, Swords } from 'lucide-react';

interface Props {
    onSelect: (id: string) => void;
}

type SortOption = 'custom' | 'subscribers' | 'videos' | 'views' | 'growth' | 'newVideos' | 'newViews';

export const CompetitorsList: React.FC<Props> = ({ onSelect }) => {
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [versusOpen, setVersusOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortBy, setSortBy] = useState<SortOption>('subscribers');
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [isUpdatingAll, setIsUpdatingAll] = useState(false);
    const [updateProgress, setUpdateProgress] = useState(0);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        const data = await fetchCompetitors();

        const storedOrder = localStorage.getItem('competitorOrder');
        if (storedOrder) {
            const orderIds = JSON.parse(storedOrder) as string[];
            data.sort((a, b) => {
                const indexA = orderIds.indexOf(a.id);
                const indexB = orderIds.indexOf(b.id);
                if (indexA === -1 && indexB === -1) return 0;
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });
        }

        setCompetitors(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
        const storedView = localStorage.getItem('viewMode');
        if (storedView) setViewMode(storedView as 'grid' | 'list');
    }, []);

    const displayedCompetitors = useMemo(() => {
        let list = [...competitors];

        if (sortBy === 'subscribers') {
            list.sort((a, b) => {
                const subA = a.snapshots.length > 0 ? a.snapshots[a.snapshots.length - 1].subscribers : 0;
                const subB = b.snapshots.length > 0 ? b.snapshots[b.snapshots.length - 1].subscribers : 0;
                return subB - subA;
            });
        } else if (sortBy === 'videos') {
            list.sort((a, b) => {
                const vidA = a.snapshots.length > 0 ? a.snapshots[a.snapshots.length - 1].videos : 0;
                const vidB = b.snapshots.length > 0 ? b.snapshots[b.snapshots.length - 1].videos : 0;
                return vidB - vidA;
            });
        } else if (sortBy === 'growth') {
            list.sort((a, b) => {
                const lastA = a.snapshots.length > 0 ? a.snapshots[a.snapshots.length - 1].subscribers : 0;
                const firstA = a.snapshots.length > 0 ? a.snapshots[0].subscribers : 0;
                const growthA = lastA - firstA;

                const lastB = b.snapshots.length > 0 ? b.snapshots[b.snapshots.length - 1].subscribers : 0;
                const firstB = b.snapshots.length > 0 ? b.snapshots[0].subscribers : 0;
                const growthB = lastB - firstB;
                return growthB - growthA;
            });
        } else if (sortBy === 'views') {
            list.sort((a, b) => {
                const vA = a.snapshots.length > 0 ? a.snapshots[a.snapshots.length - 1].views || 0 : 0;
                const vB = b.snapshots.length > 0 ? b.snapshots[b.snapshots.length - 1].views || 0 : 0;
                return vB - vA;
            });
        } else if (sortBy === 'newVideos') {
            list.sort((a, b) => {
                const getNewVids = (c: Competitor) => {
                    if (c.snapshots.length === 0) return 0;
                    const latest = c.snapshots[c.snapshots.length - 1];
                    const prev = c.snapshots.length > 1 ? c.snapshots[c.snapshots.length - 2] : null;
                    return prev ? latest.videos - prev.videos : 0;
                };
                return getNewVids(b) - getNewVids(a);
            });
        } else if (sortBy === 'newViews') {
            list.sort((a, b) => {
                const getNewViews = (c: Competitor) => {
                    if (c.snapshots.length === 0) return 0;
                    const latest = c.snapshots[c.snapshots.length - 1];
                    const prev = c.snapshots.length > 1 ? c.snapshots[c.snapshots.length - 2] : null;
                    return prev ? (latest.views || 0) - (prev.views || 0) : 0;
                };
                return getNewViews(b) - getNewViews(a);
            });
        }

        return list.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return 0;
        });
    }, [competitors, sortBy]);

    const handleSave = async (data: any) => {
        await addCompetitor(data.competitor, data.stats);
        setIsModalOpen(false);
        loadData();
    };

    const handleTogglePin = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await toggleCompetitorPin(id);
        loadData();
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        if (sortBy !== 'custom') return;
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (sortBy !== 'custom') return;
        if (!draggedId || draggedId === targetId) return;

        const newOrder = [...competitors];
        const draggedIndex = newOrder.findIndex(c => c.id === draggedId);
        const targetIndex = newOrder.findIndex(c => c.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const [removed] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, removed);

        setCompetitors(newOrder);
        localStorage.setItem('competitorOrder', JSON.stringify(newOrder.map(c => c.id)));
        setDraggedId(null);
    };

    const toggleViewMode = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('viewMode', mode);
    };

    const handleUpdateAll = async () => {
        if (competitors.length === 0) return;
        setIsUpdatingAll(true);
        setUpdateProgress(0);

        let processed = 0;
        for (const comp of competitors) {
            try {
                // Determine best input for lookup.
                // If the ID in DB is a UUID (generated) instead of a YouTube Channel ID (starts with UC),
                // the stored channelUrl might be invalid for API lookup.
                // In that case, use the name or influencer handle to allow the search fallback to work.
                let lookupInput = comp.channelUrl;
                if (!comp.id.startsWith('UC')) {
                    if (comp.influencerName && comp.influencerName.length > 2 && !comp.influencerName.includes(' ')) {
                        lookupInput = comp.influencerName;
                    } else {
                        lookupInput = comp.channelName;
                    }
                }

                const result = await fetchYoutubeChannelData(lookupInput);
                if (result && result.stats) {
                    await addSnapshot(comp.id, result.stats);

                    // Update avatar if we got a new one (e.g. higher res)
                    if (result.avatarUrl && result.avatarUrl !== comp.avatarUrl) {
                        await updateCompetitorAvatar(comp.id, result.avatarUrl);
                    }
                }
            } catch (e) {
                console.error(`Error updating ${comp.channelName}:`, e);
            }
            processed++;
            setUpdateProgress(Math.round((processed / competitors.length) * 100));
        }

        setIsUpdatingAll(false);
        loadData();
    };

    const handleDeleteRequest = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeleteTargetId(id);
    };

    const confirmHide = async () => {
        if (!deleteTargetId) return;
        await toggleCompetitorVisibility(deleteTargetId, true);
        setDeleteTargetId(null);
        loadData();
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        await deleteCompetitor(deleteTargetId);
        setDeleteTargetId(null);
        loadData();
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                <p className="text-gray-500 dark:text-gray-400">Carregando dados...</p>
            </div>
        );
    }

    const renderCard = (comp: any, index: number, isDraggable: boolean) => {
        const latest = comp.snapshots[comp.snapshots.length - 1] || { subscribers: 0, videos: 0 };
        const growth = latest.subscribers - (comp.snapshots[0]?.subscribers || 0);
        const previous = comp.snapshots.length > 1 ? comp.snapshots[comp.snapshots.length - 2] : null;
        const newVideosCount = previous ? (latest.videos - previous.videos) : 0;
        const totalViews = latest.views || 0;
        const newViewsCount = previous ? (totalViews - previous.views) : 0;
        const showRank = sortBy !== 'custom' && viewMode === 'list';

        const isChannelLink = comp.avatarUrl && (comp.avatarUrl.includes('youtube.com/channel') || comp.avatarUrl.includes('youtube.com/@'));
        const hasAvatar = comp.avatarUrl && comp.avatarUrl.startsWith('http') && !isChannelLink;

        // --- GRID VIEW CARD ---
        if (viewMode === 'grid') {
            return (
                <div
                    key={comp.id}
                    draggable={isDraggable}
                    onDragStart={(e) => isDraggable && handleDragStart(e, comp.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => isDraggable && handleDrop(e, comp.id)}
                    className={`rounded-lg shadow-sm transition-all duration-200 cursor-pointer group relative overflow-hidden h-full flex flex-col p-4 ${comp.isMyChannel
                        ? 'bg-blue-50 border-2 border-blue-500 hover:shadow-blue-100 dark:bg-blue-900/20 dark:border-blue-500 dark:hover:bg-blue-900/30'
                        : 'bg-white border border-gray-100 hover:shadow-md dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-750'
                        }`}
                    onClick={() => onSelect(comp.id)}
                >
                    {isDraggable && (
                        <div
                            className="absolute top-2 left-2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 p-1 dark:text-gray-600 dark:hover:text-gray-400 z-10"
                            onClick={e => e.stopPropagation()}
                        >
                            <GripVertical size={16} />
                        </div>
                    )}

                    {comp.isMyChannel && (
                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-md z-10">
                            VOCÊ
                        </div>
                    )}

                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <div
                            className={`cursor-pointer p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${comp.isPinned ? 'text-blue-600 opacity-100 dark:text-blue-400' : 'text-gray-300 hover:text-blue-600 dark:text-gray-600 dark:hover:text-blue-400'}`}
                            onClick={(e) => handleTogglePin(e, comp.id)}
                        >
                            <Pin size={16} className={comp.isPinned ? "fill-blue-600 dark:fill-blue-400" : ""} />
                        </div>
                        <div
                            className="text-gray-300 hover:text-red-500 cursor-pointer p-1 rounded-full hover:bg-red-50 dark:text-gray-600 dark:hover:text-red-400 dark:hover:bg-red-900/30"
                            onClick={(e) => handleDeleteRequest(e, comp.id)}
                        >
                            <Trash2 size={16} />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-4 pr-8">
                        <div className="shrink-0 w-12 h-12 rounded-full overflow-hidden border border-gray-100 dark:border-gray-600">
                            {hasAvatar ? (
                                <img
                                    src={comp.avatarUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                                    <User size={20} />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex flex-col">
                            <h3 className="font-bold text-base text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 transition-colors line-clamp-1 leading-tight" title={comp.channelName}>
                                {comp.channelName}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">{comp.influencerName}</p>

                            {/* Custom Category Badge in Card */}
                            {comp.customCategory && (
                                <span className="inline-flex self-start bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 text-[10px] px-1.5 py-0.5 rounded-full font-medium truncate max-w-full">
                                    {comp.customCategory}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="mt-auto">
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-gray-50/50 dark:bg-gray-700/50 p-2 rounded border border-gray-100 dark:border-gray-600">
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-0.5"><Users size={10} /> Inscritos</p>
                                <p className="font-bold text-sm text-gray-900 dark:text-white">{new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(latest.subscribers)}</p>
                            </div>

                            <div className={`p-2 rounded border transition-colors ${newVideosCount > 0
                                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                : 'bg-gray-50/50 border-gray-100 dark:bg-gray-700/50 dark:border-gray-600'
                                }`}>
                                <p className={`text-[10px] flex items-center justify-between gap-1 mb-0.5 ${newVideosCount > 0 ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                                    <span className="flex items-center gap-1"><Video size={10} /> Vídeos</span>
                                    {newVideosCount > 0 && (
                                        <span className="bg-white dark:bg-green-800 text-green-700 dark:text-green-200 px-1 rounded-sm text-[9px] font-bold shadow-sm">
                                            +{newVideosCount}
                                        </span>
                                    )}
                                </p>
                                <p className="font-bold text-sm text-gray-900 dark:text-white">{latest.videos}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                            <div>
                                <p className="text-[10px] text-gray-400">Crescimento</p>
                                <p className={`text-xs font-bold ${growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                    {growth > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(growth)}
                                </p>
                            </div>
                            <div className="text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // --- LIST VIEW CARD ---
        return (
            <div
                key={comp.id}
                draggable={isDraggable}
                onDragStart={(e) => isDraggable && handleDragStart(e, comp.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => isDraggable && handleDrop(e, comp.id)}
                className={`rounded-lg shadow-sm transition-all duration-200 cursor-pointer group relative overflow-hidden flex flex-row items-center py-2 px-4 gap-4 ${comp.isMyChannel
                    ? 'bg-blue-50 border border-blue-300 hover:shadow-blue-100 dark:bg-blue-900/20 dark:border-blue-500'
                    : 'bg-white border border-gray-100 hover:shadow-sm dark:bg-gray-800 dark:border-gray-700'
                    }`}
                onClick={() => onSelect(comp.id)}
            >
                {isDraggable && (
                    <div
                        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing p-1 dark:text-gray-600 dark:hover:text-gray-400"
                        onClick={e => e.stopPropagation()}
                    >
                        <GripVertical size={16} />
                    </div>
                )}

                {showRank && (
                    <div className="text-lg font-bold text-gray-400 dark:text-gray-600 w-8 text-center tabular-nums">
                        #{index + 1}
                    </div>
                )}

                <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div
                        className={`cursor-pointer p-1 rounded-full ${comp.isPinned ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 hover:text-blue-600 dark:text-gray-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100'}`}
                        onClick={(e) => handleTogglePin(e, comp.id)}
                    >
                        <Pin size={14} className={comp.isPinned ? "fill-blue-600 dark:fill-blue-400" : ""} />
                    </div>

                    <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden border border-gray-100 dark:border-gray-600">
                        {hasAvatar ? (
                            <img
                                src={comp.avatarUrl}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';
                                }}
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                                <User size={14} />
                            </div>
                        )}
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                {comp.channelName}
                            </h3>
                            {comp.isMyChannel && <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 rounded">VOCÊ</span>}
                            {comp.customCategory && (
                                <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 text-[10px] px-1.5 rounded-full font-medium truncate max-w-[80px]">
                                    {comp.customCategory}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{comp.influencerName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                    <div className="w-24 text-right">
                        <p className="text-[10px] text-gray-400">Inscritos</p>
                        <p className="font-bold text-gray-900 dark:text-white">{new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(latest.subscribers)}</p>
                    </div>

                    <div className="w-24 text-right relative">
                        <p className="text-[10px] text-gray-400">Vídeos</p>
                        <div className="flex items-center justify-end gap-1.5">
                            <p className="font-bold text-gray-900 dark:text-white">{latest.videos}</p>
                            {newVideosCount > 0 && (
                                <span className="text-[10px] font-bold text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300 px-1.5 rounded-full" title={`${newVideosCount} vídeos novos`}>
                                    +{newVideosCount}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="w-28 text-right relative">
                        <p className="text-[10px] text-gray-400">Visualizações</p>
                        <div className="flex items-center justify-end gap-1.5">
                            <p className="font-bold text-gray-900 dark:text-white">
                                {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(totalViews)}
                            </p>
                            {newViewsCount > 0 && (
                                <span className="text-[10px] font-bold text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300 px-1.5 rounded-full" title={`${newViewsCount} visualizações novas`}>
                                    +{new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(newViewsCount)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="w-24 text-right">
                        <p className="text-[10px] text-gray-400">Crescimento</p>
                        <p className={`font-bold ${growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                            {growth > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(growth)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 pl-4 border-l border-gray-100 dark:border-gray-700">
                    <div className="text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={18} />
                    </div>
                    <div
                        className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        onClick={(e) => handleDeleteRequest(e, comp.id)}
                    >
                        <Trash2 size={16} />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Análise de Concorrência</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Acompanhe o crescimento e estatísticas dos canais.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm min-w-[160px]">
                            <ArrowUpDown size={14} className="text-gray-400" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="bg-transparent text-sm text-gray-700 dark:text-gray-200 outline-none w-full cursor-pointer appearance-none font-medium"
                            >
                                <option value="custom" className="dark:bg-gray-800">Personalizado</option>
                                <option value="subscribers" className="dark:bg-gray-800">Inscritos</option>
                                <option value="videos" className="dark:bg-gray-800">Vídeos</option>
                                <option value="views" className="dark:bg-gray-800">Visualizações</option>
                                <option value="growth" className="dark:bg-gray-800">Crescimento</option>
                                <option value="newVideos" className="dark:bg-gray-800">Novos Vídeos</option>
                                <option value="newViews" className="dark:bg-gray-800">Novas Visualizações</option>
                            </select>
                        </div>

                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 flex items-center shadow-sm">
                            <button onClick={() => toggleViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-gray-100 text-blue-600 dark:bg-gray-700 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}>
                                <LayoutGrid size={16} />
                            </button>
                            <button onClick={() => toggleViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-100 text-blue-600 dark:bg-gray-700 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}>
                                <List size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        {isUpdatingAll ? (
                            <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm min-w-[140px] flex-1 sm:flex-none text-sm">
                                <Loader2 className="animate-spin" size={16} />
                                <span className="font-medium">Atualizando... {updateProgress}%</span>
                            </div>
                        ) : (
                            <button
                                onClick={handleUpdateAll}
                                disabled={competitors.length === 0}
                                className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all font-medium disabled:opacity-50 flex-1 sm:flex-none text-sm"
                            >
                                <RefreshCw size={16} /> <span className="hidden sm:inline">Atualizar Tudo</span>
                            </button>
                        )}

                        <button
                            onClick={() => {
                                const myChannel = competitors.find(c => c.isMyChannel);
                                if (myChannel) {
                                    setVersusOpen(true);
                                } else {
                                    alert("Defina seu canal principal primeiro!");
                                }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow-md font-medium flex-1 sm:flex-none text-sm"
                        >
                            <Swords size={16} /> <span className="whitespace-nowrap">VERSUS</span>
                        </button>

                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow-md font-medium flex-1 sm:flex-none text-sm"
                        >
                            <Plus size={16} /> <span className="whitespace-nowrap">Adicionar</span>
                        </button>
                    </div>
                </div>
            </div>

            {competitors.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="bg-gray-50 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="text-gray-400 dark:text-gray-500" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhum concorrente monitorado</h3>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 mt-2"
                    >
                        Adicionar meu primeiro concorrente
                    </button>
                </div>
            ) : (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr" : "flex flex-col gap-3"}>
                    {displayedCompetitors.map((comp, index) => (
                        <div key={comp.id} className="contents">
                            {renderCard(comp, index, sortBy === 'custom')}
                        </div>
                    ))}
                </div>
            )}

            {deleteTargetId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in">
                        <div className="flex items-center gap-3 text-amber-600 mb-4">
                            <AlertTriangle size={24} />
                            <h3 className="text-xl font-bold dark:text-white">Gerenciar Canal</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                            Você deseja remover este canal da sua lista de visualização (Ocultar) ou apagar todos os dados permanentemente?
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={confirmHide}
                                className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <Trash2 size={16} /> Ocultar da Lista (Reversível)
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="w-full py-3 px-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2 border border-red-100 dark:border-red-900 text-sm"
                            >
                                <AlertTriangle size={16} /> Excluir Permanentemente
                            </button>
                            <button
                                onClick={() => setDeleteTargetId(null)}
                                className="w-full py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mt-2 text-sm"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <CompetitorForm onClose={() => setIsModalOpen(false)} onSave={handleSave} />
            )}

            {versusOpen && (
                <VersusPanel
                    currentCompetitor={competitors.find(c => c.isMyChannel)!}
                    onClose={() => setVersusOpen(false)}
                />
            )}
        </div>
    );
};