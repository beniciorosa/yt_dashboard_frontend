
import React, { useEffect, useState, useMemo } from 'react';
import {
    DollarSign, BarChart2, TrendingUp, ShoppingBag, Calendar, User,
    Trophy, Package, Link, Map, Clock, ArrowUpRight, Search,
    ChevronDown, ChevronUp, Award, Filter, X, CheckSquare, Square
} from 'lucide-react';
import { fetchCRMDashboardData, CRMDashboardData, API_BASE_URL } from '../../services/salesMetricsService';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar, Cell } from 'recharts';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCe3b4O2pH9iCbLErlbglEH0lPFqxlNWic';

setOptions({
    key: GOOGLE_MAPS_API_KEY
});

const UF_COORDS: Record<string, { lat: number, lng: number }> = {
    'AC': { lat: -9.02, lng: -70.81 }, 'AL': { lat: -9.57, lng: -36.78 }, 'AP': { lat: 1.41, lng: -51.77 },
    'AM': { lat: -3.47, lng: -62.21 }, 'BA': { lat: -12.96, lng: -41.68 }, 'CE': { lat: -5.20, lng: -39.53 },
    'DF': { lat: -15.78, lng: -47.86 }, 'ES': { lat: -19.19, lng: -40.34 }, 'GO': { lat: -15.83, lng: -49.06 },
    'MA': { lat: -4.96, lng: -45.27 }, 'MT': { lat: -12.64, lng: -55.42 }, 'MS': { lat: -20.51, lng: -54.54 },
    'MG': { lat: -18.51, lng: -44.51 }, 'PA': { lat: -3.79, lng: -52.48 }, 'PB': { lat: -7.28, lng: -36.72 },
    'PR': { lat: -24.89, lng: -51.55 }, 'PE': { lat: -8.28, lng: -37.94 }, 'PI': { lat: -7.71, lng: -42.71 },
    'RJ': { lat: -22.84, lng: -43.15 }, 'RN': { lat: -5.79, lng: -36.51 }, 'RS': { lat: -30.01, lng: -53.45 },
    'RO': { lat: -11.50, lng: -63.14 }, 'RR': { lat: 2.73, lng: -61.30 }, 'SC': { lat: -27.24, lng: -50.21 },
    'SP': { lat: -23.55, lng: -46.63 }, 'SE': { lat: -10.90, lng: -37.07 }, 'TO': { lat: -10.17, lng: -48.33 },
};

const normalizeUF = (val: string): string => {
    if (!val) return '';

    // Extract (UF) if present
    const match = val.match(/\(([A-Z]{2})\)/);
    if (match) return match[1];

    const cleaned = val.trim().toUpperCase();
    if (cleaned.length === 2) return cleaned;
    const map: Record<string, string> = {
        'SAO PAULO': 'SP', 'MINAS GERAIS': 'MG', 'RIO DE JANEIRO': 'RJ', 'BAHIA': 'BA',
        'PARANA': 'PR', 'RIO GRANDE DO SUL': 'RS', 'PERNAMBUCO': 'PE', 'CEARA': 'CE',
        'PARA': 'PA', 'SANTA CATARINA': 'SC', 'MARANHAO': 'MA', 'GOIAS': 'GO',
        'AMAZONAS': 'AM', 'ESPIRITO SANTO': 'ES', 'PARAIBA': 'PB', 'RIO GRANDE DO NORTE': 'RN',
        'MATO GROSSO': 'MT', 'ALAGOAS': 'AL', 'PIAUI': 'PI', 'DISTRITO FEDERAL': 'DF',
        'MATO GROSSO DO SUL': 'MS', 'SERGIPE': 'SE', 'RONDONIA': 'RO', 'TOCANTINS': 'TO',
        'ACRE': 'AC', 'AMAPA': 'AP', 'RORAIMA': 'RR'
    };
    return map[cleaned] || cleaned;
};

export const SalesDashboard: React.FC = () => {
    const [period, setPeriod] = useState('month');
    const [data, setData] = useState<CRMDashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    const [isOriginsOpen, setIsOriginsOpen] = useState(true);
    const [selectedUF, setSelectedUF] = useState<string | null>(null);
    const mapRef = React.useRef<HTMLDivElement>(null);
    const [googleMap, setGoogleMap] = useState<any>(null);
    const markersRef = React.useRef<any[]>([]);

    // Seller State
    const [sellerSortField, setSellerSortField] = useState<'seller' | 'dealsTotal' | 'activeLeads' | 'dealsWon' | 'losses' | 'conversionRate' | 'avgCycle' | 'revenue'>('revenue');
    const [sellerSortDirection, setSellerSortDirection] = useState<'asc' | 'desc'>('desc');
    const [hiddenSellers, setHiddenSellers] = useState<Set<string>>(new Set());
    const [isSellerFilterOpen, setIsSellerFilterOpen] = useState(false);

    // Product Colors (Gradients)
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const GRADIENTS = [
        { id: 'colorBlue', start: '#3b82f6', end: '#93c5fd' },
        { id: 'colorGreen', start: '#10b981', end: '#6ee7b7' },
        { id: 'colorAmber', start: '#f59e0b', end: '#fcd34d' },
        { id: 'colorRed', start: '#ef4444', end: '#fca5a5' },
        { id: 'colorPurple', start: '#8b5cf6', end: '#c4b5fd' },
    ];

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const result = await fetchCRMDashboardData(period);
            setData(result);
            setLoading(false);
        };
        load();
    }, [period]);

    // Google Maps Logic
    useEffect(() => {
        if (!mapRef.current || googleMap || !isOriginsOpen) return;

        const initMap = async () => {
            try {
                const { Map } = await importLibrary('maps');
                const map = new Map(mapRef.current!, {
                    center: { lat: -14.235, lng: -51.9253 },
                    zoom: 4,
                    disableDefaultUI: true,
                    zoomControl: true,
                });
                setGoogleMap(map);
            } catch (err) {
                console.error("Error initializing Google Maps:", err);
            }
        };
        initMap();
    }, [isOriginsOpen]);

    useEffect(() => {
        if (!googleMap || !data?.origins || !isOriginsOpen) return;

        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        const updateMarkers = async () => {
            try {
                await importLibrary('marker');
                const g = (window as any).google;
                if (!g) return;

                data?.origins?.forEach((origin) => {
                    const ufCode = normalizeUF(origin.uf);
                    const coords = UF_COORDS[ufCode];
                    if (!coords) return;

                    // Create jittered pins for a more "populated" experience
                    const pinCount = Math.min(origin.count, 5);
                    for (let i = 0; i < pinCount; i++) {
                        const jitterLat = (Math.random() - 0.5) * 0.8;
                        const jitterLng = (Math.random() - 0.5) * 0.8;

                        const marker = new g.maps.Marker({
                            position: { lat: coords.lat + jitterLat, lng: coords.lng + jitterLng },
                            map: googleMap,
                            title: `${origin.uf} - ${origin.count} vendas`,
                            animation: g.maps.Animation.DROP
                        });
                        markersRef.current.push(marker);
                    }
                });
            } catch (err) {
                console.error("Error updating markers:", err);
            }
        };
        updateMarkers();
    }, [googleMap, data, isOriginsOpen]);

    const handleSellerSort = (field: any) => {
        if (sellerSortField === field) {
            setSellerSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSellerSortField(field);
            setSellerSortDirection('desc');
        }
    };

    const toggleSellerVisibility = (sellerName: string) => {
        const newSet = new Set(hiddenSellers);
        if (newSet.has(sellerName)) newSet.delete(sellerName);
        else newSet.add(sellerName);
        setHiddenSellers(newSet);
    };

    const sortedSellers = useMemo(() => {
        if (!data?.sellers) return [];
        return data.sellers
            .filter(s => !hiddenSellers.has(s.seller))
            .sort((a, b) => {
                const modifier = sellerSortDirection === 'asc' ? 1 : -1;
                const valA = (a as any)[sellerSortField];
                const valB = (b as any)[sellerSortField];
                return (valA - valB) * modifier;
            });
    }, [data?.sellers, sellerSortField, sellerSortDirection, hiddenSellers]);

    const StatCard = ({ title, value, icon: Icon, colorClass, subtext }: any) => (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
                <Icon size={48} />
            </div>
            <div className="flex items-center gap-2 mb-3 z-10">
                <div className={`p-1.5 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-')} ${colorClass}`}>
                    <Icon size={16} />
                </div>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</h3>
            </div>
            <div className="z-10">
                <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
                {subtext && <div className="text-[10px] text-gray-400 mt-1">{subtext}</div>}
            </div>
        </div>
    );

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const panToUF = (uf: string) => {
        const code = normalizeUF(uf);
        const coords = UF_COORDS[code];
        if (coords && googleMap) {
            googleMap.panTo(coords);
            googleMap.setZoom(6);
            setSelectedUF(code);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <TrendingUp className="w-8 h-8 text-blue-500" />
                        Sales Dashboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Visão geral do CRM e performance comercial da empresa.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="p-2 text-gray-400">
                        <Calendar size={18} />
                    </div>
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none pr-8 cursor-pointer"
                    >
                        <option value="today">Hoje</option>
                        <option value="week">Semana atual</option>
                        <option value="month">Mês atual</option>
                        <option value="30days">Últimos 30 dias</option>
                        <option value="60days">Últimos 60 dias</option>
                        <option value="year">Este ano</option>
                        <option value="all">Todo o período</option>
                    </select>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Receita Total"
                    value={loading || !data ? '-' : formatCurrency(data?.stats?.totalRevenue || 0)}
                    icon={DollarSign}
                    colorClass="text-emerald-500"
                    subtext="Vendas confirmadas"
                />
                <StatCard
                    title="Total de Leads"
                    value={loading || !data ? '-' : data?.stats?.totalLeads}
                    icon={Link}
                    colorClass="text-gray-500"
                    subtext="Total de entradas"
                />
                <StatCard
                    title="LD Ativos"
                    value={loading || !data ? '-' : data?.stats?.totalActive}
                    icon={BarChart2}
                    colorClass="text-blue-500"
                    subtext="Leads em andamento"
                />
                <StatCard
                    title="Vendas"
                    value={loading || !data ? '-' : data?.stats?.totalWon}
                    icon={ShoppingBag}
                    colorClass="text-emerald-600"
                    subtext="Negócios ganhos"
                />
                <StatCard
                    title="Perdas"
                    value={loading || !data ? '-' : data?.stats?.totalLosses}
                    icon={Filter}
                    colorClass="text-rose-500"
                    subtext="Negócios perdidos"
                />
                <StatCard
                    title="Conversão"
                    value={loading || !data ? '-' : `${(data?.stats?.conversionRate || 0).toFixed(1)}%`}
                    icon={TrendingUp}
                    colorClass="text-indigo-500"
                    subtext="Taxa de sucesso"
                />
                <StatCard
                    title="Ticket Médio"
                    value={loading || !data ? '-' : formatCurrency(data?.stats?.avgTicket || 0)}
                    icon={Award}
                    colorClass="text-purple-500"
                    subtext="Valor por venda"
                />
                <StatCard
                    title="Ciclo Médio"
                    value={loading || !data ? '-' : `${data?.stats?.avgCycle || 0} dias`}
                    icon={Clock}
                    colorClass="text-amber-500"
                    subtext="Tempo de fechamento"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Ranking de Vendedores */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-visible flex flex-col relative z-20">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Trophy className="text-amber-500 w-4 h-4" /> Ranking de Vendedores
                        </h2>

                        {/* Seller Filter Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsSellerFilterOpen(!isSellerFilterOpen)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500"
                                title="Filtrar vendedores"
                            >
                                <Filter size={16} />
                            </button>

                            {isSellerFilterOpen && (
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-3 z-50 animate-in fade-in zoom-in-50 duration-200">
                                    <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Visualizar Vendedores</h4>
                                    <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                                        {data?.sellers?.map(s => (
                                            <div
                                                key={s.seller}
                                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer text-xs"
                                                onClick={() => toggleSellerVisibility(s.seller)}
                                            >
                                                {hiddenSellers.has(s.seller) ?
                                                    <Square size={14} className="text-gray-300" /> :
                                                    <CheckSquare size={14} className="text-blue-500" />
                                                }
                                                <span className={`truncate ${hiddenSellers.has(s.seller) ? 'text-gray-400 decoration-line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                                                    {s.seller}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between">
                                        <button
                                            className="text-[10px] text-blue-500 font-medium hover:underline"
                                            onClick={() => setHiddenSellers(new Set())}
                                        >
                                            Mostrar Todos
                                        </button>
                                        <button
                                            className="text-[10px] text-gray-400 hover:text-gray-500"
                                            onClick={() => setIsSellerFilterOpen(false)}
                                        >
                                            Fechar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSellerSort('seller')}>Vendedor</th>
                                    <th className="px-4 py-2 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSellerSort('dealsTotal')}>Leads</th>
                                    <th className="px-4 py-2 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSellerSort('activeLeads')}>LD Ativos</th>
                                    <th className="px-4 py-2 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSellerSort('dealsWon')}>Vendas</th>
                                    <th className="px-4 py-2 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSellerSort('losses')}>Perdas</th>
                                    <th className="px-4 py-2 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSellerSort('conversionRate')}>Tx. Conversão</th>
                                    <th className="px-4 py-2 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSellerSort('avgCycle')}>Tempo Médio</th>
                                    <th className="px-4 py-2 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSellerSort('revenue')}>Receita</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-4 py-2"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div></td>
                                            <td className="px-4 py-2" colSpan={8}></td>
                                        </tr>
                                    ))
                                ) : sortedSellers.map((s, idx) => (
                                    <tr key={s.seller} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                            {idx === 0 && <Award className="w-3 h-3 text-amber-500" />}
                                            {s.seller}
                                        </td>
                                        <td className="px-4 py-2 text-center text-gray-500 dark:text-gray-400">{s.dealsTotal}</td>
                                        <td className="px-4 py-2 text-center text-blue-500 font-bold">{s.activeLeads}</td>
                                        <td className="px-4 py-2 text-center text-emerald-600 dark:text-emerald-400 font-bold">{s.dealsWon}</td>
                                        <td className="px-4 py-2 text-center text-rose-500 font-bold">{s.losses}</td>
                                        <td className="px-4 py-2 text-center font-bold text-indigo-600 dark:text-indigo-400">
                                            {s.conversionRate.toFixed(1)}%
                                        </td>
                                        <td className="px-4 py-2 text-center text-gray-500 dark:text-gray-400">
                                            {s.avgCycle ? `${s.avgCycle} dias` : '-'}
                                        </td>
                                        <td className="px-4 py-2 text-right font-bold">{formatCurrency(s.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Ranking de Produtos */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Package className="text-blue-500 w-4 h-4" /> Ranking de Produtos
                        </h2>
                    </div>

                    {/* Product Chart (Area) */}
                    {!loading && data?.productsHistory && data.productsHistory.length > 0 && (
                        <div className="p-4 h-64 border-b border-gray-100 dark:border-gray-700">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.productsHistory}>
                                    <defs>
                                        {GRADIENTS.map((g, i) => (
                                            <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={g.start} stopOpacity={0.8} />
                                                <stop offset="95%" stopColor={g.end} stopOpacity={0} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                        axisLine={false}
                                        tickLine={false}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={30}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                        labelStyle={{ color: '#6B7280', marginBottom: '8px' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                    {/* Dynamically create Areas for Top 5 Products */}
                                    {data.products.slice(0, 5).map((p, i) => (
                                        <Area
                                            key={p.product}
                                            type="monotone"
                                            dataKey={p.product}
                                            stackId="1" // Stacked area chart? Or overlapping? User said "modern", often easiest to read is overlapping with opacity or stacked. Let's try stacked for composition or just standard. Let's go STANDARD (no stackId) for comparison or STACKID for volume. Time series of sales usually implies "trend". Let's use overlapping with transparency.
                                            stroke={GRADIENTS[i % GRADIENTS.length].start}
                                            fill={`url(#${GRADIENTS[i % GRADIENTS.length].id})`}
                                            strokeWidth={2}
                                            fillOpacity={0.6}
                                        />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-4 py-2 text-left">Produto</th>
                                    <th className="px-4 py-2 text-center">Quant.</th>
                                    <th className="px-4 py-2 text-right">Faturamento</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-4 py-2"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div></td>
                                            <td className="px-4 py-2"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-10 mx-auto"></div></td>
                                            <td className="px-4 py-2"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : data?.products?.map((p) => (
                                    <tr key={p.product} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white line-clamp-1 truncate max-w-[200px]" title={p.product}>
                                            {p.product}
                                        </td>
                                        <td className="px-4 py-2 text-center text-blue-600 dark:text-blue-400 font-bold">{p.quantity}</td>
                                        <td className="px-4 py-2 text-right font-bold">{formatCurrency(p.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Ranking de UTM Content */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Link className="text-emerald-500 w-4 h-4" /> Ranking de utm_content
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-4 py-2 text-left">UTM Content</th>
                                    <th className="px-4 py-2 text-center">Leads</th>
                                    <th className="px-4 py-2 text-right">Faturamento</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-4 py-2"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div></td>
                                            <td className="px-4 py-2"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-10 mx-auto"></div></td>
                                            <td className="px-4 py-2"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : data?.utms?.map((u) => (
                                    <tr key={u.utm} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white truncate max-w-[200px]" title={u.utm}>
                                            {u.utm}
                                        </td>
                                        <td className="px-4 py-2 text-center text-emerald-600 dark:text-emerald-400 font-bold">{u.deals}</td>
                                        <td className="px-4 py-2 text-right font-bold">{formatCurrency(u.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Tempo Médio de Fechamento por Vendedor */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Clock className="text-rose-500 w-5 h-5" /> Tempo de Fechamento (Ciclo)
                        </h2>
                    </div>
                    <div className="p-6 flex-1">
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.sellers || []} layout="vertical" margin={{ left: 40, right: 40 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="seller" type="category" width={100} tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                        formatter={(val) => [`${val} dias`, 'Tempo Médio']}
                                    />
                                    <Bar dataKey="avgCycle" fill="#f43f5e" radius={[0, 4, 4, 0]}>
                                        {data?.sellers?.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#e11d48' : '#fb7185'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-4 text-center italic">
                            * Tempo médio calculado entre a criação e o fechamento (negócios ganhos).
                        </p>
                    </div>
                </div>
            </div>

            {/* Origem das Vendas */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div
                    className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors"
                    onClick={() => setIsOriginsOpen(!isOriginsOpen)}
                >
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Map className="text-purple-500 w-5 h-5" /> Origem das Vendas (Brasil)
                    </h2>
                    {isOriginsOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </div>
                {isOriginsOpen && (
                    <div className="p-6 flex flex-col xl:flex-row gap-8 min-h-[450px]">
                        <div className="flex-[1.5] space-y-4">
                            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Top Estados</h4>
                            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-[10px] text-gray-500 font-semibold uppercase tracking-tighter">
                                        <tr>
                                            <th className="px-4 py-2">Estado</th>
                                            <th className="px-4 py-2 text-center">Vendas</th>
                                            <th className="px-4 py-2 text-right">Faturamento</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {data?.origins?.map((o) => (
                                            <tr
                                                key={o.uf}
                                                className={`hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer ${selectedUF === normalizeUF(o.uf) ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                                                onClick={() => panToUF(o.uf)}
                                            >
                                                <td className="px-4 py-2 text-gray-900 dark:text-white flex items-center gap-3">
                                                    <img
                                                        src={`${API_BASE_URL}/api/sales/icons/${normalizeUF(o.uf)}`}
                                                        alt={o.uf}
                                                        className="w-5 h-4 object-contain shadow-xs border border-gray-100 dark:border-gray-700 bg-gray-50"
                                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                                    />
                                                    {o.uf}
                                                </td>
                                                <td className="px-4 py-2 text-center font-bold text-gray-600 dark:text-emerald-400">{o.count}</td>
                                                <td className="px-4 py-2 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(o.revenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-2xl relative overflow-hidden border border-gray-100 dark:border-gray-700 border-dashed">
                            <div ref={mapRef} className="w-full h-full min-h-[300px]"></div>
                            <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 text-[10px]">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <span className="font-bold text-gray-800 dark:text-gray-200">Distribuição Geográfica</span>
                                </div>
                                <div className="text-gray-400 uppercase tracking-tighter text-[8px] font-bold">Vendas por Estado</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
