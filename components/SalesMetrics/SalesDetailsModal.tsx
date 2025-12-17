
import React, { useEffect, useState } from 'react';
import { X, Calendar, User, ShoppingBag, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { fetchDealsByVideo } from '../../services/salesMetricsService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface Props {
    videoId: string;
    videoTitle: string;
    onClose: () => void;
}

export const SalesDetailsModal: React.FC<Props> = ({ videoId, videoTitle, onClose }) => {
    const [deals, setDeals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await fetchDealsByVideo(videoId);
            setDeals(data);
            setLoading(false);
        };
        load();
    }, [videoId]);

    // Metrics for Chart
    const wonDeals = deals.filter(d => d.dealstage?.toLowerCase().includes('ganho') || d.dealstage?.toLowerCase().includes('won'));
    const lostDeals = deals.filter(d => d.dealstage?.toLowerCase().includes('perdido') || d.dealstage?.toLowerCase().includes('lost'));

    const chartData = [
        { name: 'Ganhos', value: wonDeals.length, color: '#10b981' },
        { name: 'Perdidos', value: lostDeals.length, color: '#ef4444' },
    ];

    const revenueByProduct = deals.reduce((acc: any, deal) => {
        if (!deal.amount) return acc;
        const prod = deal.products || 'Outros';
        acc[prod] = (acc[prod] || 0) + Number(deal.amount);
        return acc;
    }, {});

    const productChartData = Object.keys(revenueByProduct).map(k => ({
        name: k, value: revenueByProduct[k]
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Detalhes de Vendas</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{videoTitle}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>
                    ) : deals.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">Nenhum negócio encontrado para este vídeo.</div>
                    ) : (
                        <div className="space-y-8">

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-gray-750 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4 text-center">Conversão (Ganhos vs Perdidos)</h3>
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
                                    <div className="flex justify-center gap-4 text-xs mt-2">
                                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Ganhos ({wonDeals.length})</div>
                                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Perdidos ({lostDeals.length})</div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-750 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4 text-center">Receita por Produto (Top 5)</h3>
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

                            {/* List */}
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-blue-500" /> Histórico de Negócios
                                </h3>
                                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">Data</th>
                                                <th className="px-4 py-3">Etapa</th>
                                                <th className="px-4 py-3">Vendedor</th>
                                                <th className="px-4 py-3">Produto</th>
                                                <th className="px-4 py-3 text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800/50">
                                            {deals.map((deal, idx) => {
                                                const isWon = deal.dealstage?.toLowerCase().includes('ganho') || deal.dealstage?.toLowerCase().includes('won');
                                                return (
                                                    <tr key={deal.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                            {new Date(deal.closedate).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${isWon
                                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                                }`}>
                                                                {isWon ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                                {deal.dealstage || 'Desconhecido'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                            <div className="flex items-center gap-2">
                                                                <User size={14} className="text-gray-400" />
                                                                {deal.owner_name || '-'}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                            <div className="flex items-center gap-2">
                                                                <ShoppingBag size={14} className="text-gray-400" />
                                                                {deal.products || '-'}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.amount || 0)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
