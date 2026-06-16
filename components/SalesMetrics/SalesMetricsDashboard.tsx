
import React, { useEffect, useState } from 'react';
import {
    fetchSalesDashboardData,
    fetchTopVideos,
    fetchTopVendedores,
    SalesRankingItem,
    SalesSummary,
    TopVideoItem,
    TopVendedorItem,
} from '../../services/salesMetricsService';
import { SalesDetailsModal } from './SalesDetailsModal';
import { DollarSign, BarChart2, TrendingUp, ShoppingBag, ArrowUpRight, Search, Calendar, Trophy, Users } from 'lucide-react';

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const rankColors = ['text-amber-500', 'text-gray-400', 'text-orange-600', 'text-gray-400', 'text-gray-400'];

export const SalesMetricsDashboard: React.FC = () => {
    const [summary, setSummary] = useState<SalesSummary | null>(null);
    const [ranking, setRanking] = useState<SalesRankingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState<SalesRankingItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [period, setPeriod] = useState('month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // Painéis "Top 5" — sempre todo o período (independem da data selecionada)
    const [topVideos, setTopVideos] = useState<TopVideoItem[]>([]);
    const [topVendedores, setTopVendedores] = useState<TopVendedorItem[]>([]);
    const [loadingTop, setLoadingTop] = useState(true);

    // Carrega os painéis "Top 5" uma única vez (all-time)
    useEffect(() => {
        const loadTop = async () => {
            setLoadingTop(true);
            const [tv, ts] = await Promise.all([fetchTopVideos(5), fetchTopVendedores(5)]);
            setTopVideos(tv);
            setTopVendedores(ts);
            setLoadingTop(false);
        };
        loadTop();
    }, []);

    // Dashboard (respeita o período selecionado / datas personalizadas)
    useEffect(() => {
        // No modo personalizado, só busca quando as duas datas estiverem preenchidas
        if (period === 'custom' && (!customStart || !customEnd)) return;

        const load = async () => {
            setLoading(true);
            const data = await fetchSalesDashboardData(period, customStart, customEnd);
            setSummary(data?.summary || { totalRevenue: 0, totalDeals: 0, totalWon: 0, conversionRate: 0 });
            setRanking(data?.ranking || []);
            setLoading(false);
        };
        load();
    }, [period, customStart, customEnd]);

    const handlePeriodChange = (val: string) => {
        if (val === 'custom' && !customStart && !customEnd) {
            const now = new Date();
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            setCustomStart(toYMD(first));
            setCustomEnd(toYMD(now));
        }
        setPeriod(val);
    };

    const filteredRanking = ranking.filter(item =>
        item.videoTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const StatCard = ({ title, value, icon: Icon, colorClass, subtext }: any) => (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
                <Icon size={64} />
            </div>
            <div className="flex items-center gap-3 mb-4 z-10">
                <div className={`p-2 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-')} ${colorClass}`}>
                    <Icon size={20} />
                </div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
            </div>
            <div className="z-10">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
                {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
            </div>
        </div>
    );

    const RankBadge = ({ index }: { index: number }) => (
        <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-sm font-bold bg-gray-100 dark:bg-gray-700/60 ${rankColors[index] || 'text-gray-400'}`}>
            {index + 1}
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <DollarSign className="w-8 h-8 text-emerald-500" />
                        Sales Metrics
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Análise de performance comercial dos seus vídeos do YouTube.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="p-2 text-gray-400">
                            <Calendar size={18} />
                        </div>
                        <select
                            value={period}
                            onChange={(e) => handlePeriodChange(e.target.value)}
                            className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none pr-8 cursor-pointer"
                        >
                            <option value="today">Hoje</option>
                            <option value="week">Semana atual</option>
                            <option value="month">Mês atual</option>
                            <option value="30days">Últimos 30 dias</option>
                            <option value="60days">Últimos 60 dias</option>
                            <option value="year">Este ano</option>
                            <option value="all">Todo o período</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>

                    {period === 'custom' && (
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <input
                                type="date"
                                value={customStart}
                                max={customEnd || undefined}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none px-2 cursor-pointer"
                            />
                            <span className="text-gray-400 text-sm">até</span>
                            <input
                                type="date"
                                value={customEnd}
                                min={customStart || undefined}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none px-2 cursor-pointer"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Receita Total"
                    value={loading ? '-' : formatBRL(summary?.totalRevenue || 0)}
                    icon={DollarSign}
                    colorClass="text-emerald-500"
                    subtext="Gerado por links rastreados"
                />
                <StatCard
                    title="Total de Leads"
                    value={loading ? '-' : summary?.totalDeals}
                    icon={BarChart2}
                    colorClass="text-blue-500"
                    subtext="Oportunidades criadas"
                />
                <StatCard
                    title="Vendas Realizadas"
                    value={loading ? '-' : summary?.totalWon}
                    icon={ShoppingBag}
                    colorClass="text-indigo-500"
                    subtext="Negócios ganhos"
                />
                <StatCard
                    title="Taxa de Conversão"
                    value={loading ? '-' : `${(summary?.conversionRate || 0).toFixed(1)}%`}
                    icon={TrendingUp}
                    colorClass="text-amber-500"
                    subtext="Leads p/ Venda"
                />
            </div>

            {/* Top 5 panels (sempre todo o período) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* TOP 5 VÍDEOS */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            Top 5 Vídeos
                        </h2>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-2 py-1 rounded-md">
                            Todo o período
                        </span>
                    </div>
                    <div className="p-3 divide-y divide-gray-100 dark:divide-gray-700/60">
                        {loadingTop ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                                    <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                    <div className="w-16 h-10 rounded bg-gray-200 dark:bg-gray-700"></div>
                                    <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                            ))
                        ) : topVideos.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-sm">Nenhum dado encontrado.</div>
                        ) : (
                            topVideos.map((v, i) => (
                                <div key={v.videoId} className="flex items-center gap-3 p-2">
                                    <RankBadge index={i} />
                                    <div className="w-16 h-10 rounded overflow-hidden bg-gray-200 shrink-0">
                                        {v.thumbnailUrl ? (
                                            <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-400">No IMG</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{v.videoTitle}</h3>
                                        <div className="text-[11px] text-gray-400">{v.wonCount} vendas</div>
                                    </div>
                                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{formatBRL(v.totalRevenue)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* TOP 5 VENDEDORES */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-500" />
                            Top 5 Vendedores
                        </h2>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-2 py-1 rounded-md">
                            Todo o período
                        </span>
                    </div>
                    <div className="p-3 divide-y divide-gray-100 dark:divide-gray-700/60">
                        {loadingTop ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                                    <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                    <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                            ))
                        ) : topVendedores.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-sm">Nenhum dado encontrado.</div>
                        ) : (
                            topVendedores.map((s, i) => (
                                <div key={s.name + i} className="flex items-center gap-3 p-2">
                                    <RankBadge index={i} />
                                    <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                                        {s.name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{s.name}</h3>
                                        <div className="text-[11px] text-gray-400">{s.wonCount} vendas · {s.dealsCount} leads</div>
                                    </div>
                                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{formatBRL(s.revenue)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Ranking Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Top Vídeos por Receita</h2>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar vídeo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                            <tr>
                                <th className="px-6 py-4 text-left">Vídeo</th>
                                <th className="px-6 py-4 text-center">Leads</th>
                                <th className="px-6 py-4 text-center">Vendas</th>
                                <th className="px-6 py-4 text-right">Receita Gerada</th>
                                <th className="px-6 py-4 text-center">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-64"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mx-auto w-10"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mx-auto w-10"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded ml-auto w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mx-auto w-20"></div></td>
                                    </tr>
                                ))
                            ) : filteredRanking.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        Nenhum dado encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredRanking.map((item) => (
                                    <tr key={item.videoId} className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-24 h-14 bg-gray-200 rounded-lg overflow-hidden shrink-0 relative">
                                                    {item.thumbnailUrl ? (
                                                        <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400 select-none">No IMG</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-gray-800 dark:text-gray-100 line-clamp-2 text-sm leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                        {item.videoTitle}
                                                    </h3>
                                                    <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-1">
                                                        {item.products.slice(0, 2).map((p, idx) => (
                                                            <span key={idx} className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">{p}</span>
                                                        ))}
                                                        {item.products.length > 2 && <span className="text-[10px]">+ {item.products.length - 2}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.dealsCount}</div>
                                            <div className="text-[10px] text-gray-400">leads</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{item.wonCount}</div>
                                                {item.wonToday > 0 && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 animate-pulse" title="Vendas realizadas hoje">
                                                        +{item.wonToday} HOJE
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-gray-400">{(item.conversionRate).toFixed(1)}% conv.</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                                                {formatBRL(item.totalRevenue)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setSelectedVideo(item)}
                                                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 p-2 rounded-lg transition-colors"
                                                title="Ver Detalhes"
                                            >
                                                <ArrowUpRight className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedVideo && (
                <SalesDetailsModal
                    videoId={selectedVideo.videoId}
                    videoTitle={selectedVideo.videoTitle}
                    period={period}
                    customStart={customStart}
                    customEnd={customEnd}
                    onClose={() => setSelectedVideo(null)}
                />
            )}
        </div>
    );
};
