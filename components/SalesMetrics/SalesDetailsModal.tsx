
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
    const [isHistoryOpen, setIsHistoryOpen] = useState(true);
    const [historyFilter, setHistoryFilter] = useState<'all' | 'won' | 'lost'>('all');

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

    const chartData = [
        { name: 'Ganhos', value: wonDeals.length, color: '#10b981' },
        { name: 'Perdidos', value: lostDeals.length, color: '#ef4444' },
    ];

    const revenueByProduct = deals.reduce((acc: any, deal) => {
        if (!deal.valor) return acc;
        const prod = deal.item_linha || 'Outros';
        acc[prod] = (acc[prod] || 0) + Number(deal.valor);
        return acc;
    }, {});

    const productChartData = Object.keys(revenueByProduct).map(k => ({
        name: k, value: revenueByProduct[k]
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    // --- Seller Ranking Logic ---
    const sellerStats = useMemo(() => {
        const statsMap = new Map<string, SellerStats>();

        deals.forEach(deal => {
            const name = deal.proprietario || 'Desconhecido';
            if (!statsMap.has(name)) {
                statsMap.set(name, { name, leads: 0, won: 0, lost: 0, revenue: 0 });
            }
            const stat = statsMap.get(name)!;
            stat.leads++;

            const etapa = deal.etapa?.toLowerCase() || '';
            const isWon = etapa.includes('ganho') || etapa.includes('won') || etapa.includes('fechado');

            if (isWon) {
                stat.won++;
                stat.revenue += Number(deal.valor || 0);
            } else {
                stat.lost++;
            }
        });

        return Array.from(statsMap.values()).sort((a, b) => {
            const modifier = sortDirection === 'asc' ? 1 : -1;
            return (a[sortField] - b[sortField]) * modifier;
        });
    }, [deals, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
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
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4 text-center">Taxa de Conversão</h3>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60}>
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex justify-center gap-6 text-sm mt-2 font-medium">
                                        <div className="flex items-center gap-2 text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Ganhos ({wonDeals.length})</div>
                                        <div className="flex items-center gap-2 text-red-500"><div className="w-2 h-2 rounded-full bg-red-500"></div> Perdidos ({lostDeals.length})</div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4 text-center">Top 5 Produtos (Receita)</h3>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={productChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                                <XAxis type="number" hide />
                                                <YAxis type="category" dataKey="name" width={80} style={{ fontSize: '10px' }} tick={{ fill: '#9ca3af' }} />
                                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
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
                                                    <td className="px-4 py-3 text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/10 rounded-sm">{seller.won}</td>
                                                    <td className="px-4 py-3 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-sm">{seller.lost}</td>
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
                                                        <th className="px-4 py-2">Vendedor</th>
                                                        <th className="px-4 py-2">Produto</th>
                                                        <th className="px-4 py-2 text-right">Valor</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800/50">
                                                    {filteredHistory.map((deal, idx) => {
                                                        const isWon = deal.etapa?.toLowerCase().includes('ganho') || deal.etapa?.toLowerCase().includes('won');
                                                        const dateStr = deal.data_fechamento || deal.data_criacao || '';

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
