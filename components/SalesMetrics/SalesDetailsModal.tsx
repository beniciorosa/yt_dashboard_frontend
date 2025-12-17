
import React, { useEffect, useState, useMemo } from 'react';
import { X, Calendar, User, ShoppingBag, DollarSign, CheckCircle, XCircle, ChevronDown, ChevronUp, ChevronRight, Award, Trophy, Filter } from 'lucide-react';
import { fetchDealsByVideo } from '../../services/salesMetricsService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface Props {
    videoId: string;
    videoTitle: string;
    onClose: () => void;
}

type SellerStats = {
    name: string;
    leads: number;
    won: number;
    lost: number;
    revenue: number;
    avgTime: number;
};

type SortField = 'leads' | 'won' | 'lost' | 'revenue';
type SortDirection = 'asc' | 'desc';

export const SalesDetailsModal: React.FC<Props> = ({ videoId, videoTitle, onClose }) => {
    const [deals, setDeals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Seller Ranking State
    const [sortField, setSortField] = useState<SortField>('revenue');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // History State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyFilter, setHistoryFilter] = useState<'all' | 'won' | 'lost'>('won');

    useEffect(() => {
        const load = async () => {
            const data = await fetchDealsByVideo(videoId);
            setDeals(data);
            setLoading(false);
        };
        load();
    }, [videoId]);

    // --- Metrics for Chart ---
    // MAPPING: dealstage -> etapa, amount -> valor, products -> item_linha
    const wonDeals = deals.filter(d => d.etapa?.toLowerCase().includes('ganho') || d.etapa?.toLowerCase().includes('won') || d.etapa?.toLowerCase().includes('fechado'));
    const lostDeals = deals.filter(d => d.etapa?.toLowerCase().includes('perdido') || d.etapa?.toLowerCase().includes('lost'));

    const conversionRate = deals.length > 0 ? (wonDeals.length / deals.length) * 100 : 0;

    const chartData = [
        { name: 'Ganhos', value: wonDeals.length, color: '#10b981' }, // Emerald-500
        { name: 'Perdidos', value: lostDeals.length, color: '#ef4444' }, // Red-500
    ];

    // --- Helper for Duration ---
    const calculateDuration = (start: string | null, end: string | null) => {
        if (!start || !end) return null;
        const startDate = new Date(start);
        const endDate = new Date(end);

        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 1) return 'Menos de 1 dia';
        return `${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    };

    const getDurationInDays = (start: string | null, end: string | null) => {
        if (!start || !end) return 0;
        const diffTime = new Date(end).getTime() - new Date(start).getTime();
        return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    };

    const revenueByProduct = wonDeals.reduce((acc: any, deal) => {
        if (!deal.valor) return acc;
        const prod = deal.item_linha || 'Outros';
        acc[prod] = (acc[prod] || 0) + Number(deal.valor);
        return acc;
    }, {});

    const PRODUCT_COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'];

    const productChartData = Object.keys(revenueByProduct).map(k => ({
        name: k.length > 25 ? k.substring(0, 25) + '...' : k,
        fullName: k,
        value: revenueByProduct[k]
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    // --- Seller Ranking Logic ---
    const sellerStats = useMemo(() => {
        const statsMap = new Map<string, SellerStats & { totalDays: number }>();

        deals.forEach(deal => {
            const name = deal.proprietario || 'Desconhecido';
            if (!statsMap.has(name)) {
                statsMap.set(name, { name, leads: 0, won: 0, lost: 0, revenue: 0, totalDays: 0, avgTime: 0 });
            }
            const stat = statsMap.get(name)!;
            stat.leads++;

            const etapa = deal.etapa?.toLowerCase() || '';
            const isWon = etapa.includes('ganho') || etapa.includes('won') || etapa.includes('fechado');

            if (isWon) {
                stat.won++;
                stat.revenue += Number(deal.valor || 0);
                // Calculate duration for this won deal
                if (deal.data_criacao && deal.data_fechamento) {
                    stat.totalDays += getDurationInDays(deal.data_criacao, deal.data_fechamento);
                }
            } else {
                stat.lost++;
            }
        });

        return Array.from(statsMap.values()).map(stat => ({
            ...stat,
            avgTime: stat.won > 0 ? Math.round(stat.totalDays / stat.won) : 0
        })).sort((a, b) => {
            const modifier = sortDirection === 'asc' ? 1 : -1;
            // Handle custom sort for new column if needed
            const valA = (a as any)[sortField];
            const valB = (b as any)[sortField];
            return (valA - valB) * modifier;
        });
    }, [deals, sortField, sortDirection]);

    const handleSort = (field: SortField | 'avgTime') => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field as SortField);
            setSortDirection('desc');
        }
    };

    const SortIcon = ({ field }: { field: SortField | 'avgTime' }) => {
        if (sortField !== field) return <ChevronDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-50" />;
        return sortDirection === 'asc'
            ? <ChevronUp size={14} className="text-blue-500" />
            : <ChevronDown size={14} className="text-blue-500" />;
    };

    // --- Filtered History ---
    const filteredHistory = useMemo(() => {
        if (historyFilter === 'all') return deals;
        return deals.filter(d => {
            const etapa = d.etapa?.toLowerCase() || '';
            const isWon = etapa.includes('ganho') || etapa.includes('won') || etapa.includes('fechado');
            return historyFilter === 'won' ? isWon : !isWon;
        });
    }, [deals, historyFilter]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <DollarSign className="text-emerald-500" /> Detalhes de Vendas
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{videoTitle}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/50 dark:bg-gray-900/30">
                    {loading ? (
                        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>
                    ) : deals.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">Nenhum negócio encontrado para este vídeo.</div>
                    ) : (
                        <>
                            {/* Charts Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Conversion - Stylish Donut */}
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center relative">
                                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2 absolute top-6 left-6">Taxa de Conversão</h3>

                                    <div className="h-48 w-full flex items-center justify-center mt-6">
                                        <ResponsiveContainer width={200} height={200}>
                                            <PieChart>
                                                <Pie
                                                    data={chartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    stroke="none"
                                                    startAngle={90}
                                                    endAngle={-270}
                                                >
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                                                    itemStyle={{ color: '#374151', fontSize: '12px', fontWeight: 600 }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>

                                        {/* Center Text */}
                                        <div className="absolute flex flex-col items-center justify-center pointer-events-none mt-6">
                                            <span className="text-3xl font-bold text-gray-800 dark:text-gray-100">{conversionRate.toFixed(1)}%</span>
                                            <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Conversão</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-6 mt-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-900/30"></div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-400 font-medium uppercase">Ganhos</span>
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{wonDeals.length}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-100 dark:ring-red-900/30"></div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-400 font-medium uppercase">Perdidos</span>
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{lostDeals.length}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Revenue Product - Colored Bars */}
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col relative">
                                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-6">Top Produtos (Receita)</h3>
                                    <div className="flex-1 min-h-[160px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={productChartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }} barSize={16}>
                                                <XAxis type="number" hide />
                                                <YAxis
                                                    type="category"
                                                    dataKey="name"
                                                    width={140}
                                                    tick={{ fill: '#4b5563', fontSize: 13, fontWeight: 600 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: 'transparent' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                                                    labelStyle={{ color: '#111827', fontWeight: 'bold', marginBottom: '4px' }}
                                                    formatter={(value: any) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), 'Receita']}
                                                />
                                                <Bar dataKey="value" radius={[0, 6, 6, 0]} background={{ fill: '#f3f4f6' }}>
                                                    {productChartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PRODUCT_COLORS[index % PRODUCT_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Seller Ranking */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 bg-gray-50/80 dark:bg-gray-800">
                                    <Trophy className="w-5 h-5 text-amber-500" />
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100">Ranking de Vendedores</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                            <tr>
                                                <th className="px-4 py-3">Vendedor</th>
                                                <th className="px-4 py-3 cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('leads')}>
                                                    <div className="flex items-center gap-1">Leads <SortIcon field="leads" /></div>
                                                </th>
                                                <th className="px-4 py-3 cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('won')}>
                                                    <div className="flex items-center gap-1">Vendas <SortIcon field="won" /></div>
                                                </th>
                                                <th className="px-4 py-3 cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('lost')}>
                                                    <div className="flex items-center gap-1">Perdas <SortIcon field="lost" /></div>
                                                </th>
                                                <th className="px-4 py-3 cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('avgTime')}>
                                                    <div className="flex items-center gap-1 whitespace-nowrap">Tempo Médio <SortIcon field="avgTime" /></div>
                                                </th>
                                                <th className="px-4 py-3 text-right cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('revenue')}>
                                                    <div className="flex items-center justify-end gap-1">Faturamento <SortIcon field="revenue" /></div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {sellerStats.map((seller, idx) => (
                                                <tr key={seller.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                        {idx === 0 && <Award size={16} className="text-amber-500" />}
                                                        {seller.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{seller.leads}</td>
                                                    <td className="px-4 py-3 text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/10 rounded-sm w-fit px-2">{seller.won}</td>
                                                    <td className="px-4 py-3 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-sm w-fit px-2">{seller.lost}</td>
                                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs text-center">
                                                        {seller.avgTime > 0 ? (seller.avgTime < 1 ? 'Menos de 1 dia' : `${seller.avgTime} dias`) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(seller.revenue)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* History */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                                <div
                                    className="p-4 bg-gray-50/80 dark:bg-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-blue-500" />
                                        <h3 className="font-bold text-gray-800 dark:text-gray-100">Histórico de Negócios</h3>
                                        <span className="text-xs font-normal text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{filteredHistory.length}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isHistoryOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                    </div>
                                </div>

                                {isHistoryOpen && (
                                    <>
                                        {/* Filters */}
                                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex gap-2">
                                            <button
                                                onClick={() => setHistoryFilter('all')}
                                                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors border ${historyFilter === 'all'
                                                    ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                                    }`}
                                            >
                                                Todos
                                            </button>
                                            <button
                                                onClick={() => setHistoryFilter('won')}
                                                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors border ${historyFilter === 'won'
                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                                    }`}
                                            >
                                                Ganhos
                                            </button>
                                            <button
                                                onClick={() => setHistoryFilter('lost')}
                                                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors border ${historyFilter === 'lost'
                                                    ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                                    }`}
                                            >
                                                Perdidos
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
                                                    <tr>
                                                        <th className="px-4 py-2">Data</th>
                                                        <th className="px-4 py-2">Etapa</th>
                                                        <th className="px-4 py-2">Tempo</th>
                                                        <th className="px-4 py-2">Vendedor</th>
                                                        <th className="px-4 py-2">Produto</th>
                                                        <th className="px-4 py-2 text-right">Valor</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800/50">
                                                    {filteredHistory.map((deal, idx) => {
                                                        const isWon = deal.etapa?.toLowerCase().includes('ganho') || deal.etapa?.toLowerCase().includes('won');
                                                        const dateStr = deal.data_fechamento || deal.data_criacao || '';
                                                        const duration = calculateDuration(deal.data_criacao, deal.data_fechamento);

                                                        return (
                                                            <tr key={deal.negocio_id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                                <td className="px-4 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                                    {dateStr ? new Date(dateStr).toLocaleDateString() : '-'}
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${isWon
                                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                                        }`}>
                                                                        {isWon ? <CheckCircle size={8} /> : <XCircle size={8} />}
                                                                        {deal.etapa || 'Desconhecido'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                                    {duration || '-'}
                                                                </td>
                                                                <td className="px-4 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                                    {deal.proprietario || '-'}
                                                                </td>
                                                                <td className="px-4 py-2 text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
                                                                    {deal.item_linha || '-'}
                                                                </td>
                                                                <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.valor || 0)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
