
import React, { useEffect, useState } from 'react';
import { X, Calendar, BarChart2, DollarSign, Eye, UserPlus, TrendingUp, Video, History, ChevronDown, ChevronUp } from 'lucide-react';
import { Promotion, fetchPromotionHistory } from '../../services/promotionsService';
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

interface PromotionDetailsPanelProps {
    promotion: Promotion | null;
    thumbnail: string;
    isOpen: boolean;
    onClose: () => void;
}

type PeriodOption = '7d' | '14d' | '28d' | 'all';

export const PromotionDetailsPanel: React.FC<PromotionDetailsPanelProps> = ({ promotion, thumbnail, isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<Promotion[]>([]);
    const [period, setPeriod] = useState<PeriodOption>('28d');
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [visibleMetrics, setVisibleMetrics] = useState({
        custo: true,
        impressoes: false,
        visualizacoes: true,
        inscritos: false,
        cpv: false,
        cps: false
    });

    useEffect(() => {
        if (isOpen && promotion) {
            loadHistory();
        }
    }, [isOpen, promotion, period]);

    const loadHistory = async () => {
        if (!promotion) return;
        setLoading(true);
        try {
            const days = period === 'all' ? undefined : parseInt(period.replace('d', ''));
            const data = await fetchPromotionHistory(promotion.titulo, days);
            setHistory(data);
        } catch (error) {
            console.error("Error loading history", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !promotion) return null;

    // Chart Data
    const chartLabels = history.map(p => new Date(p.data_coleta).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));

    const datasets = [
        {
            label: 'Investimento (R$)',
            data: history.map(p => p.custo),
            borderColor: 'rgb(34, 197, 94)', // Green
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            hidden: !visibleMetrics.custo,
            yAxisID: 'y'
        },
        {
            label: 'Visualizações',
            data: history.map(p => p.visualizacoes),
            borderColor: 'rgb(59, 130, 246)', // Blue
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            hidden: !visibleMetrics.visualizacoes,
            yAxisID: 'y1'
        },
        {
            label: 'Impressões',
            data: history.map(p => p.impressoes),
            borderColor: 'rgb(168, 85, 247)', // Purple
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            hidden: !visibleMetrics.impressoes,
            yAxisID: 'y1'
        },
        {
            label: 'Inscritos',
            data: history.map(p => p.inscritos),
            borderColor: 'rgb(249, 115, 22)', // Orange
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            hidden: !visibleMetrics.inscritos,
            yAxisID: 'y1'
        },
        {
            label: 'CPV (R$)',
            data: history.map(p => p.cpv),
            borderColor: 'rgb(236, 72, 153)', // Pink
            backgroundColor: 'rgba(236, 72, 153, 0.1)',
            hidden: !visibleMetrics.cpv,
            yAxisID: 'y'
        },
        {
            label: 'CPI (R$)',
            data: history.map(p => p.cps),
            borderColor: 'rgb(234, 179, 8)', // Yellow
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            hidden: !visibleMetrics.cps,
            yAxisID: 'y'
        }
    ].filter(ds => !ds.hidden); // Filter out hidden datasets or keep them but use 'hidden' prop in ChartJS

    // Actually, ChartJS `hidden` prop is for initial state in legend, but we want to completely remove if not selected or just hide.
    // Let's passed all but use the state to control the `hidden` property.

    const chartData = {
        labels: chartLabels,
        datasets: datasets.map(d => ({ ...d, hidden: false, tension: 0.4, fill: true }))
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
                title: { display: true, text: 'Valores Financeiros (R$)' },
                grid: { display: false }
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                title: { display: true, text: 'Métricas (Qtd)' },
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

    const toggleMetric = (key: keyof typeof visibleMetrics) => {
        setVisibleMetrics(prev => ({ ...prev, [key]: !prev[key] }));
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
                            <div className="w-24 h-16 rounded overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-700 shadow-sm relative">
                                {thumbnail ? (
                                    <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400"><Video size={20} /></div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                                    {promotion.titulo}
                                </h2>
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    <Calendar size={12} />
                                    Início em {new Date(promotion.data_criacao).toLocaleDateString('pt-BR')}
                                    <span className="mx-1">•</span>
                                    <span className={`${promotion.status === 'Ativa' || promotion.status === 'Active' ? 'text-green-600' : 'text-gray-500'}`}>
                                        {promotion.status}
                                    </span>
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

                    {/* Filters */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                            {(['7d', '14d', '28d', 'all'] as PeriodOption[]).map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setPeriod(opt)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === opt
                                        ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    {opt === 'all' ? 'Desde o início' : `Últimos ${opt.replace('d', ' dias')}`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 flex-grow bg-slate-50 dark:bg-slate-900/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                            <p>Carregando histórico...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">

                            {/* Metric Toggles */}
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => toggleMetric('visualizacoes')} className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${visibleMetrics.visualizacoes ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                                    <Eye size={12} /> Visualizações
                                </button>
                                <button onClick={() => toggleMetric('custo')} className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${visibleMetrics.custo ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                                    <DollarSign size={12} /> Investimento
                                </button>
                                <button onClick={() => toggleMetric('inscritos')} className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${visibleMetrics.inscritos ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                                    <UserPlus size={12} /> Inscritos
                                </button>
                                <button onClick={() => toggleMetric('impressoes')} className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${visibleMetrics.impressoes ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                                    <TrendingUp size={12} /> Impressões
                                </button>
                                <button onClick={() => toggleMetric('cpv')} className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${visibleMetrics.cpv ? 'bg-pink-50 border-pink-200 text-pink-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                                    <TrendingUp size={12} /> CPV
                                </button>
                                <button onClick={() => toggleMetric('cps')} className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${visibleMetrics.cps ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                                    <TrendingUp size={12} /> CPI
                                </button>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm h-80">
                                {history.length > 0 ? (
                                    <Line data={chartData} options={chartOptions} />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400">
                                        Sem dados para o período selecionado.
                                    </div>
                                )}
                            </div>

                            {/* Summary Cards for the Period */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <p className="text-[10px] text-slate-500 mb-1">Total Investido</p>
                                    <p className="text-base font-bold text-green-600">
                                        R$ {history.length > 0 ? history[history.length - 1].custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                                    </p>
                                    <p className="text-[9px] text-slate-400">Total acumulado</p>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <p className="text-[10px] text-slate-500 mb-1">Visualizações</p>
                                    <p className="text-base font-bold text-blue-600">
                                        {history.length > 0 ? history[history.length - 1].visualizacoes.toLocaleString('pt-BR') : '0'}
                                    </p>
                                    <p className="text-[9px] text-slate-400">Total acumulado</p>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <p className="text-[10px] text-slate-500 mb-1">Inscritos</p>
                                    <p className="text-base font-bold text-orange-600">
                                        {history.length > 0 ? history[history.length - 1].inscritos.toLocaleString('pt-BR') : '0'}
                                    </p>
                                    <p className="text-[9px] text-slate-400">Total acumulado</p>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <p className="text-[10px] text-slate-500 mb-1">CPV Médio</p>
                                    <p className="text-base font-bold text-pink-600">
                                        R$ {history.length > 0 ? (history.reduce((a, b) => a + b.cpv, 0) / history.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                                    </p>
                                    <p className="text-[9px] text-slate-400">Média do período</p>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <p className="text-[10px] text-slate-500 mb-1">CPI Médio</p>
                                    <p className="text-base font-bold text-yellow-600">
                                        R$ {history.length > 0 ? (history.reduce((a, b) => a + b.cps, 0) / history.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                                    </p>
                                    <p className="text-[9px] text-slate-400">Média do período</p>
                                </div>
                            </div>

                            {/* Collapsible History Table */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <button
                                    onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    <span className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                                        <History size={16} />
                                        Histórico de Dados
                                    </span>
                                    {isHistoryExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                </button>

                                {isHistoryExpanded && (
                                    <div className="border-t border-slate-100 dark:border-slate-700 max-h-80 overflow-y-auto">
                                        <table className="w-full text-xs text-left relative">
                                            <thead className="bg-gray-50 dark:bg-slate-700/50 text-[10px] uppercase text-slate-500 font-medium sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2">Data</th>
                                                    <th className="px-3 py-2">Investimento</th>
                                                    <th className="px-3 py-2">Visualizações</th>
                                                    <th className="px-3 py-2">Impressões</th>
                                                    <th className="px-3 py-2">Inscritos</th>
                                                    <th className="px-3 py-2">CPV</th>
                                                    <th className="px-3 py-2">CPI</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                                {[...history].reverse().map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 text-gray-700 dark:text-gray-300">
                                                        <td className="px-3 py-2 whitespace-nowrap text-[10px] text-gray-500">{new Date(item.data_coleta).toLocaleString('pt-BR')}</td>
                                                        <td className="px-3 py-2 font-medium text-green-600">R$ {item.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                        <td className="px-3 py-2">{item.visualizacoes.toLocaleString('pt-BR')}</td>
                                                        <td className="px-3 py-2">{item.impressoes.toLocaleString('pt-BR')}</td>
                                                        <td className="px-3 py-2">{item.inscritos.toLocaleString('pt-BR')}</td>
                                                        <td className="px-3 py-2">R$ {item.cpv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                        <td className="px-3 py-2">R$ {item.cps.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
