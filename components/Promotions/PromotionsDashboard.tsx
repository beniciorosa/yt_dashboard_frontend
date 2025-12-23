
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchPromotions, Promotion, getVideoThumbnail } from '../../services/promotionsService';
import { Loader2, TrendingUp, DollarSign, Eye, Video, User, RefreshCw, Filter, ArrowUpDown, ArrowUp, ArrowDown, Search, BarChart2, Tag, Calendar, Users, TrendingDown } from 'lucide-react';
import { PromotionDetailsPanel } from './PromotionDetailsPanel';

type DateFilterOption = '7d' | '14d' | '28d' | 'all';
type SortKey = 'titulo' | 'custo' | 'impressoes' | 'visualizacoes' | 'inscritos' | 'cpv' | 'cps' | 'data_criacao' | 'status';
type SortDirection = 'asc' | 'desc';

export const PromotionsDashboard: React.FC = () => {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'Ativa' | 'Pausada' | 'Encerrada' | 'Todas'>('Ativa');
    const [sortKey, setSortKey] = useState<SortKey>('inscritos');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchPromotions();
            setPromotions(data);
        } catch (err: any) {
            console.error(err);
            setError("Erro ao carregar dados de promoções.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, []);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection(key === 'titulo' || key === 'status' ? 'asc' : 'desc');
        }
    };

    const processedPromotions = useMemo(() => {
        let list = [...promotions];

        // Filter by Status
        if (statusFilter !== 'Todas') {
            list = list.filter(p => {
                const s = p.status?.toLowerCase() || '';
                if (statusFilter === 'Ativa') return s.includes('ativ') || s.includes('activ');
                if (statusFilter === 'Pausada') return s.includes('paus');
                if (statusFilter === 'Encerrada') return s.includes('encerr') || s.includes('complet') || s.includes('finish') || s.includes('end');
                return true;
            });
        }

        // Filter by Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            list = list.filter(v => v.titulo.toLowerCase().includes(query));
        }

        list.sort((a, b) => {
            let valA: any = a[sortKey];
            let valB: any = b[sortKey];

            // Handle strings case insensitive
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return list;
    }, [promotions, sortKey, sortDirection, searchQuery]);

    const activeCount = useMemo(() => {
        return promotions.filter(p => p.status === 'Ativa' || p.status === 'Active').length;
    }, [promotions]);

    const totals = useMemo(() => {
        const sum = processedPromotions.reduce((acc, curr) => ({
            custo: acc.custo + (curr.custo || 0),
            impressoes: acc.impressoes + (curr.impressoes || 0),
            visualizacoes: acc.visualizacoes + (curr.visualizacoes || 0),
            inscritos: acc.inscritos + (curr.inscritos || 0),
            cpvSum: acc.cpvSum + (curr.cpv || 0),
            cpsSum: acc.cpsSum + (curr.cps || 0),
            count: acc.count + 1
        }), { custo: 0, impressoes: 0, visualizacoes: 0, inscritos: 0, cpvSum: 0, cpsSum: 0, count: 0 });

        return {
            ...sum,
            avgCpv: sum.count > 0 ? sum.cpvSum / sum.count : 0,
            avgCps: sum.count > 0 ? sum.cpsSum / sum.count : 0
        };
    }, [processedPromotions]);

    const SortIcon = ({ colKey }: { colKey: SortKey }) => {
        if (sortKey !== colKey) return <ArrowUpDown size={14} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100" />;
        return sortDirection === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />;
    };

    // Use latest collection date from the FIRST item (assuming they are all synced roughly same time or we pick the max)
    const latestUpdate = useMemo(() => {
        if (promotions.length === 0) return null;
        // Find max date
        return promotions.reduce((max, p) => p.data_coleta > max ? p.data_coleta : max, promotions[0].data_coleta);
    }, [promotions]);

    if (loading && promotions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                <p className="text-gray-500 dark:text-gray-400">Carregando promoções...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6 pb-10">
            {/* Header / Instructions or Summary could go here */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Tag className="text-blue-600" />
                        Minhas Promoções
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full ml-2">
                            {activeCount} ativas
                        </span>
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Gerencie suas campanhas ativas do YouTube Promotions.
                    </p>
                    {latestUpdate && (
                        <p className="text-xs text-gray-400 mt-2">
                            Última atualização: {new Date(latestUpdate).toLocaleString('pt-BR')}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Status Filters */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mr-2">
                        {(['Ativa', 'Pausada', 'Encerrada', 'Todas'] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${statusFilter === s
                                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar campanha..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                        />
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <button
                        onClick={loadData}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Atualizar"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-400 uppercase text-xs font-semibold">
                            <tr>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => handleSort('titulo')}
                                >
                                    <div className="flex items-center gap-1">Título do Vídeo <SortIcon colKey="titulo" /></div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => handleSort('status')}
                                >
                                    <div className="flex items-center gap-1">Status <SortIcon colKey="status" /></div>
                                </th>
                                <th className="px-6 py-4">Objetivo</th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => handleSort('data_criacao')}
                                >
                                    <div className="flex items-center gap-1">Início <SortIcon colKey="data_criacao" /></div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => handleSort('custo')}
                                >
                                    <div className="flex items-center gap-1">Investimento <SortIcon colKey="custo" /></div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => handleSort('impressoes')}
                                >
                                    <div className="flex items-center gap-1">Impressões <SortIcon colKey="impressoes" /></div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => handleSort('visualizacoes')}
                                >
                                    <div className="flex items-center gap-1">Vis. <SortIcon colKey="visualizacoes" /></div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => handleSort('inscritos')}
                                >
                                    <div className="flex items-center gap-1">Inscritos <SortIcon colKey="inscritos" /></div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 group"
                                    onClick={() => handleSort('cpv')}
                                    title="Custo por Visualização"
                                >
                                    <div className="flex items-center gap-1">CPV <SortIcon colKey="cpv" /></div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 group"
                                    onClick={() => handleSort('cps')}
                                    title="Custo por Inscrito"
                                >
                                    <div className="flex items-center gap-1">CPI <SortIcon colKey="cps" /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {/* Summary Row */}
                            <tr className="bg-blue-50/50 dark:bg-blue-900/10 font-bold text-gray-900 dark:text-white border-b-2 border-blue-100 dark:border-blue-800">
                                <td className="px-6 py-4">Total / Média</td>
                                <td className="px-6 py-4">-</td>
                                <td className="px-6 py-4">-</td>
                                <td className="px-6 py-4">-</td>
                                <td className="px-6 py-4 text-green-700 dark:text-green-400">R$ {totals.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-6 py-4">{totals.impressoes.toLocaleString('pt-BR')}</td>
                                <td className="px-6 py-4">{totals.visualizacoes.toLocaleString('pt-BR')}</td>
                                <td className="px-6 py-4">{totals.inscritos.toLocaleString('pt-BR')}</td>
                                <td className="px-6 py-4">R$ {totals.avgCpv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-6 py-4">R$ {totals.avgCps.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>

                            {processedPromotions.map((promo, idx) => {
                                const thumb = promo.thumbnail || '';
                                return (
                                    <tr
                                        key={idx}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedPromotion(promo)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3 min-w-[300px]">
                                                <div className="w-20 h-12 shrink-0 rounded overflow-hidden bg-gray-200 dark:bg-gray-600 shadow-sm">
                                                    {thumb ? (
                                                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex items-center justify-center w-full h-full text-gray-400">
                                                            <Video size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white line-clamp-2 text-sm group-hover:text-blue-600 transition-colors">
                                                    {promo.titulo}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium 
                                                ${(promo.status === 'Ativa' || promo.status === 'Active') ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                    (promo.status === 'Pausada' || promo.status === 'Paused') ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                                                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}
                                            `}>
                                                {promo.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{promo.meta}</td>
                                        <td className="px-6 py-4 text-gray-900 dark:text-white whitespace-nowrap">
                                            {promo.data_criacao ? new Date(promo.data_criacao).toLocaleDateString('pt-BR') : '-'}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                                            R$ {promo.custo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                                            {promo.impressoes?.toLocaleString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                                            {promo.visualizacoes?.toLocaleString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                            {promo.inscritos?.toLocaleString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap" title="Custo por Visualização">
                                            R$ {promo.cpv?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap" title="Custo por Inscrito">
                                            R$ {promo.cps?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                );
                            })}
                            {processedPromotions.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                                        Nenhuma promoção encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <PromotionDetailsPanel
                isOpen={!!selectedPromotion}
                onClose={() => setSelectedPromotion(null)}
                promotion={selectedPromotion}
                thumbnail={selectedPromotion?.thumbnail || ''}
            />
        </div>
    );
};
