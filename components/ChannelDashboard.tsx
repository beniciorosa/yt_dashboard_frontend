// --- START OF FILE components/ChannelDashboard.tsx ---
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchMyChannel } from '../services/storageService';
import { fetchYoutubeChannelData, fetchTopVideosFromAnalytics, VideoData } from '../services/youtubeService';
import { Competitor } from '../types';
import { logout } from '../services/authService';
import { Loader2, TrendingUp, DollarSign, Eye, Video, User, RefreshCw, Filter, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, Lock, LogOut, Search, BarChart2 } from 'lucide-react';
import { VideoDetailsPanel } from './VideoDetailsPanel';


type DateFilterOption = '7d' | '14d' | '28d' | '60d' | '90d' | '365d' | 'all' | 'custom';
type SortKey = 'viewCount' | 'publishedAt' | 'likeCount' | 'commentCount' | 'estimatedRevenue' | 'estimatedMinutesWatched' | 'subscribersGained';
type SortDirection = 'asc' | 'desc';

interface Props {
    isLoggedIn: boolean;
}

export const ChannelDashboard: React.FC<Props> = ({ isLoggedIn }) => {
    const [myChannel, setMyChannel] = useState<Competitor | null>(null);
    const [channelAvatar, setChannelAvatar] = useState<string>('');
    const [channelStats, setChannelStats] = useState<{ subs: string, views: string, videoCount: string } | null>(null);
    const [videos, setVideos] = useState<VideoData[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [dateFilter, setDateFilter] = useState<DateFilterOption>('28d');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('viewCount');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Search State
    const [searchQuery, setSearchQuery] = useState('');

    // Video Details Panel State
    const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);


    const getDatesFromFilter = useCallback(() => {
        const end = new Date();
        end.setDate(end.getDate() - 3);
        const start = new Date();
        start.setDate(start.getDate() - 3);

        if (dateFilter === 'custom' && customStartDate && customEndDate) {
            return { start: new Date(customStartDate), end: new Date(customEndDate) };
        }

        if (dateFilter !== 'all' && dateFilter !== 'custom') {
            const days = parseInt(dateFilter.replace('d', ''));
            start.setDate(end.getDate() - days);
        } else if (dateFilter === 'all') {
            start.setFullYear(2005);
        }
        return { start, end };
    }, [dateFilter, customStartDate, customEndDate]);

    const loadData = useCallback(async () => {
        if (!isLoggedIn) return;

        setLoading(true);
        setError(null);
        try {
            const channel = await fetchMyChannel();
            setMyChannel(channel);

            if (channel && channel.channelUrl) {
                const url = channel.channelUrl;
                let identifier = "";
                if (url.includes("channel/")) identifier = url.split("channel/")[1];
                else if (url.includes("@")) identifier = url.split("youtube.com/")[1];
                else if (url.includes("youtube.com/c/")) identifier = url.split("c/")[1];
                else identifier = url.replace("https://youtube.com/", "").replace("https://www.youtube.com/", "");

                if (identifier) {
                    const channelData = await fetchYoutubeChannelData(identifier);

                    if (channelData) {
                        setChannelAvatar(channelData.avatarUrl || '');
                        setChannelStats({
                            subs: new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(channelData.stats.subscribers),
                            views: new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(channelData.stats.views),
                            videoCount: new Intl.NumberFormat('pt-BR').format(channelData.stats.videos)
                        });
                    }

                    const { start, end } = getDatesFromFilter();
                    const formatDate = (d: Date) => d.toISOString().split('T')[0];
                    const analyticsVideos = await fetchTopVideosFromAnalytics(formatDate(start), formatDate(end));
                    setVideos(analyticsVideos);
                }
            }
        } catch (err: any) {
            console.error(err);
            setError("Erro ao carregar dados. Verifique a conexão.");
        } finally {
            setLoading(false);
        }
    }, [getDatesFromFilter, isLoggedIn]);

    useEffect(() => {
        if (isLoggedIn) {
            loadData();
        }
    }, [loadData, isLoggedIn, dateFilter, customStartDate, customEndDate]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('desc');
        }
    };

    const processedVideos = useMemo(() => {
        let list = [...videos];

        // Filter by Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            list = list.filter(v => v.title.toLowerCase().includes(query));
        }

        // Filter by Privacy Status (Only Public)
        list = list.filter(v => v.privacyStatus === 'public');

        list.sort((a, b) => {
            let valA: number | string = 0;
            let valB: number | string = 0;

            switch (sortKey) {
                case 'publishedAt':
                    valA = new Date(a.publishedAt).getTime();
                    valB = new Date(b.publishedAt).getTime();
                    break;
                default:
                    // @ts-ignore
                    valA = a[sortKey] || 0;
                    // @ts-ignore
                    valB = b[sortKey] || 0;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return list;
    }, [videos, sortKey, sortDirection, searchQuery]);

    const totals = useMemo(() => {
        return processedVideos.reduce((acc, curr) => ({
            views: acc.views + curr.viewCount,
            watchTime: acc.watchTime + (curr.estimatedMinutesWatched || 0),
            subs: acc.subs + (curr.subscribersGained || 0),
            revenue: acc.revenue + (curr.estimatedRevenue || 0),
            likes: acc.likes + curr.likeCount,
            comments: acc.comments + curr.commentCount
        }), { views: 0, watchTime: 0, subs: 0, revenue: 0, likes: 0, comments: 0 });
    }, [processedVideos]);

    const SortIcon = ({ colKey }: { colKey: SortKey }) => {
        if (sortKey !== colKey) return <ArrowUpDown size={14} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100" />;
        return sortDirection === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />;
    };

    if (!isLoggedIn) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-full mb-6">
                    <Lock size={48} />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Acesso Restrito ao Analytics</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-lg mb-8 text-lg">
                    Para visualizar o ranking real dos vídeos, receita estimada e dados de retenção, é necessário autorizar o acesso à sua conta do YouTube.
                </p>
                <div className="text-sm text-gray-400">
                    Clique em <strong>Configurações</strong> no menu lateral e autorize.
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                <p className="text-gray-500 dark:text-gray-400">Carregando dados do Analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-xl text-center flex flex-col items-center justify-center">
                <AlertCircle size={32} className="mx-auto mb-2" />
                <p className="mb-4">{error}</p>
                <div className="flex gap-4">
                    <button onClick={loadData} className="text-sm underline">Tentar novamente</button>
                    <button onClick={() => logout()} className="text-sm underline flex items-center gap-1">
                        <LogOut size={12} /> Desconectar Conta
                    </button>
                </div>
            </div>
        );
    }

    if (!myChannel) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 p-4 rounded-full mb-4">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Canal Principal não configurado</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
                    Vá até a ferramenta "Concorrência", adicione seu canal e marque a opção <strong>"Este é o meu canal"</strong>.
                </p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-8 pb-10">

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-6">
                <div className="flex flex-col md:flex-row items-center gap-6 relative">
                    <div className="absolute top-0 right-0 flex items-center gap-2">
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors disabled:opacity-50"
                            title="Recarregar API"
                        >
                            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>

                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-100 dark:border-gray-600 shadow-sm shrink-0">
                        {channelAvatar ? (
                            <img src={channelAvatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-500 dark:text-blue-300">
                                <User size={28} />
                            </div>
                        )}
                    </div>

                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{myChannel?.channelName}</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{myChannel?.influencerName}</p>
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded font-medium">
                            Conectado ao YouTube Analytics
                        </span>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-gray-50 dark:border-gray-700 items-center justify-between">
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <Filter size={18} className="text-gray-400 shrink-0" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Período:</span>
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value as DateFilterOption)}
                            className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer"
                        >
                            <option value="7d">Últimos 7 dias</option>
                            <option value="14d">Últimos 14 dias</option>
                            <option value="28d">Últimos 28 dias</option>
                            <option value="60d">Últimos 60 dias</option>
                            <option value="90d">Últimos 90 dias</option>
                            <option value="365d">Último ano (365d)</option>
                            <option value="all">Todo o período</option>
                            <option value="custom">Personalizado</option>
                        </select>

                        {dateFilter === 'custom' && (
                            <div className="flex items-center gap-2 animate-fade-in">
                                <input
                                    type="date"
                                    className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg p-2 outline-none"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="date"
                                    className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg p-2 outline-none"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                />
                            </div>
                        )}

                        <button
                            onClick={loadData}
                            className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                        >
                            Carregar Dados
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Visualizações (Período)</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(totals.views)}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Eye size={20} /></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Receita Estimada</p>
                            <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">R$ {new Intl.NumberFormat('pt-BR').format(totals.revenue)}</h3>
                        </div>
                        <div className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg"><DollarSign size={20} /></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Vídeos Listados</p>
                            <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{processedVideos.length}</h3>
                        </div>
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg"><Video size={20} /></div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-600 dark:text-blue-400" /> Conteúdo do Canal (Top 50)
                    </h3>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Buscar vídeo..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-400 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-3 text-left w-12">#</th>
                                <th className="px-6 py-3 text-left">Vídeo</th>
                                <th
                                    className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => handleSort('publishedAt')}
                                >
                                    <div className="flex items-center gap-1">Publicado em <SortIcon colKey="publishedAt" /></div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => handleSort('viewCount')}
                                >
                                    <div className="flex items-center gap-1">Views <SortIcon colKey="viewCount" /></div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => handleSort('estimatedMinutesWatched')}
                                >
                                    <div className="flex items-center gap-1">Tempo Exib. (h) <SortIcon colKey="estimatedMinutesWatched" /></div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => handleSort('likeCount')}
                                >
                                    <div className="flex items-center gap-1">Likes <SortIcon colKey="likeCount" /></div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => handleSort('commentCount')}
                                >
                                    <div className="flex items-center gap-1">Comentários <SortIcon colKey="commentCount" /></div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => handleSort('subscribersGained')}
                                >
                                    <div className="flex items-center gap-1">Inscritos <SortIcon colKey="subscribersGained" /></div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => handleSort('estimatedRevenue')}
                                >
                                    <div className="flex items-center gap-1">Receita Est. <SortIcon colKey="estimatedRevenue" /></div>
                                </th>
                                <th className="px-6 py-3 text-center w-16">
                                    <div className="flex items-center justify-center gap-1">Ações</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            <tr className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-t-2 border-gray-200 dark:border-gray-600">
                                <td className="px-6 py-4 text-left font-bold">-</td>
                                <td className="px-6 py-4 text-left font-bold text-lg">Total ({processedVideos.length} Vídeos)</td>
                                <td className="px-6 py-4 text-left font-bold">-</td>
                                <td className="px-6 py-4 text-left font-bold">{new Intl.NumberFormat('pt-BR').format(totals.views)}</td>
                                <td className="px-6 py-4 text-left font-bold">{new Intl.NumberFormat('pt-BR').format(Math.round(totals.watchTime / 60))}</td>
                                <td className="px-6 py-4 text-left font-bold">{new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(totals.likes)}</td>
                                <td className="px-6 py-4 text-left font-bold">{new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(totals.comments)}</td>
                                <td className="px-6 py-4 text-left font-bold">{new Intl.NumberFormat('pt-BR').format(Math.floor(totals.subs))}</td>
                                <td className="px-6 py-4 text-left text-green-700 dark:text-green-400 font-bold">R$ {new Intl.NumberFormat('pt-BR').format(totals.revenue)}</td>
                                <td className="px-6 py-4 text-center font-bold">-</td>
                            </tr>

                            {processedVideos.map((video, idx) => {
                                const watchTimeHours = video.estimatedMinutesWatched ? (video.estimatedMinutesWatched / 60).toFixed(1) : '-';
                                const revenue = video.estimatedRevenue !== undefined ? video.estimatedRevenue : (video.viewCount / 1000 * 5.00);

                                return (
                                    <tr
                                        key={video.id}
                                        onClick={() => setSelectedVideo(video)}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 text-left font-bold text-gray-400 dark:text-gray-500">
                                            {idx + 1}
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4 min-w-[300px]">
                                                <div className="w-24 h-14 shrink-0 rounded overflow-hidden shadow-sm relative group-hover:scale-105 transition-transform bg-gray-200 dark:bg-gray-600">
                                                    <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={video.title}>
                                                    {video.title}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-left">
                                            <div className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                {new Date(video.publishedAt).toLocaleDateString('pt-BR')}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-left">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {new Intl.NumberFormat('pt-BR').format(video.viewCount)}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-left text-gray-700 dark:text-gray-300">
                                            <div>
                                                {watchTimeHours !== '-' ? new Intl.NumberFormat('pt-BR').format(Number(watchTimeHours)) : '-'}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-left text-gray-600 dark:text-gray-400">
                                            <div>
                                                {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(video.likeCount)}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-left text-gray-600 dark:text-gray-400">
                                            <div>
                                                {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(video.commentCount)}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-left text-gray-700 dark:text-gray-300">
                                            <div>
                                                {video.subscribersGained !== undefined ? new Intl.NumberFormat('pt-BR').format(Math.floor(video.subscribersGained)) : '-'}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-left">
                                            <div className="text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                                                R$ {new Intl.NumberFormat('pt-BR').format(revenue)}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedVideo(video);
                                                    }}
                                                    className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                                    title="Ver Estatísticas Detalhadas"
                                                >
                                                    <BarChart2 size={20} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {processedVideos.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Video size={32} className="text-gray-300 dark:text-gray-600" />
                                            <p>Nenhum vídeo encontrado.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <VideoDetailsPanel
                video={selectedVideo}
                isOpen={!!selectedVideo}
                onClose={() => setSelectedVideo(null)}
                dateRange={getDatesFromFilter()}
            />


        </div>
    );
};