import React, { useEffect, useState } from 'react';
import { X, TrendingUp, Users, Globe, Clock, DollarSign, Eye, ThumbsUp, MessageCircle, UserPlus, Calendar, BarChart2 } from 'lucide-react';
import { VideoData, fetchVideoDemographics, fetchVideoTrafficSources, fetchVideoDailyMetrics } from '../services/youtubeService';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface VideoDetailsPanelProps {
    video: VideoData | null;
    isOpen: boolean;
    onClose: () => void;
    dateRange: { start: Date, end: Date };
}

export const VideoDetailsPanel: React.FC<VideoDetailsPanelProps> = ({ video, isOpen, onClose, dateRange }) => {
    const [loading, setLoading] = useState(false);
    const [demographics, setDemographics] = useState<{ age: any[], gender: any[] } | null>(null);
    const [trafficSources, setTrafficSources] = useState<any[]>([]);
    const [dailyMetrics, setDailyMetrics] = useState<{ rows: any[], hasRevenue: boolean }>({ rows: [], hasRevenue: false });
    const [activeTab, setActiveTab] = useState<'overview' | 'audience' | 'traffic'>('overview');

    useEffect(() => {
        if (isOpen && video) {
            loadDetails();
        }
    }, [isOpen, video]);

    const loadDetails = async () => {
        if (!video) return;
        setLoading(true);

        const startStr = dateRange.start.toISOString();
        const endStr = dateRange.end.toISOString();

        try {
            const [demoData, trafficData, dailyData] = await Promise.all([
                fetchVideoDemographics(video.id, startStr, endStr),
                fetchVideoTrafficSources(video.id, startStr, endStr),
                fetchVideoDailyMetrics(video.id, startStr, endStr)
            ]);

            setDemographics(demoData);
            setTrafficSources(trafficData);
            setDailyMetrics(dailyData || { rows: [], hasRevenue: false });
        } catch (error) {
            console.error("Error loading video details:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !video) return null;

    // Chart Data Preparation
    const chartLabels = dailyMetrics.rows.map((row: any) => {
        const date = new Date(row[0]);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });

    const viewsData = dailyMetrics.rows.map((row: any) => row[1]);
    const revenueData = dailyMetrics.hasRevenue ? dailyMetrics.rows.map((row: any) => row[3]) : [];

    const chartData = {
        labels: chartLabels,
        datasets: [
            {
                label: 'Visualizações',
                data: viewsData,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true,
                yAxisID: 'y',
            },
            ...(dailyMetrics.hasRevenue ? [{
                label: 'Receita (R$)',
                data: revenueData,
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.4,
                fill: true,
                yAxisID: 'y1',
            }] : [])
        ],
    };

    const chartOptions = {
        responsive: true,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        scales: {
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                grid: { display: false }
            },
            y1: {
                type: 'linear' as const,
                display: dailyMetrics.hasRevenue,
                position: 'right' as const,
                grid: { display: false },
            },
            x: {
                grid: { display: false }
            }
        },
        plugins: {
            legend: {
                position: 'top' as const,
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
            <div
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm pointer-events-auto transition-opacity"
                onClick={onClose}
            ></div>

            <div className="w-full max-w-2xl h-full bg-white dark:bg-slate-800 shadow-2xl pointer-events-auto overflow-y-auto transform transition-transform animate-in slide-in-from-right duration-300 flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                            <div className="w-24 h-16 rounded overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-700">
                                <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                                    {video.title}
                                </h2>
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    <Calendar size={12} />
                                    Publicado em {new Date(video.publishedAt).toLocaleDateString('pt-BR')}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-6 mt-6 border-b border-slate-100 dark:border-slate-700">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'overview' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Visão Geral
                            {activeTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('audience')}
                            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'audience' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Público (Demografia)
                            {activeTab === 'audience' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('traffic')}
                            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'traffic' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Fontes de Tráfego
                            {activeTab === 'traffic' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
                        </button>
                    </div>
                </div>

                <div className="p-6 flex-grow bg-slate-50 dark:bg-slate-900/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                            <p>Carregando métricas...</p>
                        </div>
                    ) : (
                        <>
                            {/* OVERVIEW TAB */}
                            {activeTab === 'overview' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    {/* Key Metrics Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                                                <Eye size={14} /> Views
                                            </div>
                                            <div className="text-xl font-bold text-slate-900 dark:text-white">
                                                {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(video.viewCount)}
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                                                <Clock size={14} /> Tempo Exib.
                                            </div>
                                            <div className="text-xl font-bold text-slate-900 dark:text-white">
                                                {video.estimatedMinutesWatched ? Math.round(video.estimatedMinutesWatched / 60) + 'h' : '-'}
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                                                <UserPlus size={14} /> Inscritos
                                            </div>
                                            <div className="text-xl font-bold text-slate-900 dark:text-white">
                                                {video.subscribersGained !== undefined ? video.subscribersGained : '-'}
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                                                <DollarSign size={14} /> Receita
                                            </div>
                                            <div className="text-xl font-bold text-green-600 dark:text-green-400">
                                                R$ {video.estimatedRevenue !== undefined ? video.estimatedRevenue.toFixed(2) : '-'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Engagement */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Taxa de Likes</p>
                                                <p className="text-lg font-bold text-slate-900 dark:text-white">
                                                    {((video.likeCount / video.viewCount) * 100).toFixed(1)}%
                                                </p>
                                            </div>
                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                                <ThumbsUp size={18} />
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Engajamento</p>
                                                <p className="text-lg font-bold text-slate-900 dark:text-white">
                                                    {(((video.likeCount + video.commentCount) / video.viewCount) * 100).toFixed(1)}%
                                                </p>
                                            </div>
                                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                                                <MessageCircle size={18} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Daily Chart */}
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                            <BarChart2 size={16} className="text-blue-500" />
                                            Desempenho Diário
                                        </h3>
                                        <div className="h-64 w-full">
                                            {dailyMetrics.rows.length > 0 ? (
                                                <Line data={chartData} options={chartOptions} />
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                                    Sem dados diários disponíveis para este período.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AUDIENCE TAB */}
                            {activeTab === 'audience' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                            <Users size={16} className="text-purple-500" />
                                            Faixa Etária
                                        </h3>
                                        {demographics?.age && demographics.age.length > 0 ? (
                                            <div className="space-y-3">
                                                {demographics.age.map((row: any, idx: number) => (
                                                    <div key={idx} className="space-y-1">
                                                        <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                                                            <span>{row[0].replace('age', '')} anos</span>
                                                            <span>{parseFloat(row[1]).toFixed(1)}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${row[1]}%` }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 italic">Dados demográficos insuficientes.</p>
                                        )}
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                            <Users size={16} className="text-pink-500" />
                                            Gênero
                                        </h3>
                                        {demographics?.gender && demographics.gender.length > 0 ? (
                                            <div className="space-y-3">
                                                {demographics.gender.map((row: any, idx: number) => (
                                                    <div key={idx} className="space-y-1">
                                                        <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                                                            <span>{row[0] === 'male' ? 'Masculino' : row[0] === 'female' ? 'Feminino' : 'Outro'}</span>
                                                            <span>{parseFloat(row[1]).toFixed(1)}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                                            <div className={`h-2 rounded-full ${row[0] === 'male' ? 'bg-blue-500' : 'bg-pink-500'}`} style={{ width: `${row[1]}%` }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 italic">Dados de gênero insuficientes.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TRAFFIC TAB */}
                            {activeTab === 'traffic' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                            <Globe size={16} className="text-green-500" />
                                            Origem das Visualizações
                                        </h3>
                                        {trafficSources.length > 0 ? (
                                            <div className="space-y-4">
                                                {trafficSources.map((row: any, idx: number) => {
                                                    const sourceName = row[0]
                                                        .replace('SUGGESTED_VIDEO', 'Vídeos Sugeridos')
                                                        .replace('BROWSE_FEATURES', 'Recursos de Navegação')
                                                        .replace('YT_SEARCH', 'Pesquisa do YouTube')
                                                        .replace('EXTERNAL_URL', 'Externo')
                                                        .replace('PLAYLIST', 'Playlists')
                                                        .replace('VIDEO_CARD', 'Cards e Anotações')
                                                        .replace('END_SCREEN', 'Tela Final')
                                                        .replace('NOTIFICATION', 'Notificações')
                                                        .replace('CHANNEL_PAGE', 'Página do Canal');

                                                    const totalViews = trafficSources.reduce((acc, curr) => acc + curr[1], 0);
                                                    const percentage = ((row[1] / totalViews) * 100).toFixed(1);

                                                    return (
                                                        <div key={idx} className="space-y-1">
                                                            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                                                                <span>{sourceName}</span>
                                                                <span className="text-slate-400">{percentage}% ({new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(row[1])})</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                                                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 italic">Sem dados de tráfego disponíveis.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};
