import React, { useEffect, useState, useMemo } from 'react';
import { X, Calendar, User, ShoppingBag, DollarSign, CheckCircle, XCircle, ChevronDown, ChevronUp, ChevronRight, Award, Trophy, Filter } from 'lucide-react';
import { fetchDealsByVideo, API_BASE_URL } from '../../services/salesMetricsService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

interface Props {
    videoId: string;
    videoTitle: string;
    period: string;
    onClose: () => void;
}

type SellerStats = {
    name: string;
    leads: number;
    activeLeads: number;
    won: number;
    lost: number;
    revenue: number;
    avgTime: number;
    conversionRate: number;
};

type SortField = 'leads' | 'activeLeads' | 'won' | 'lost' | 'revenue' | 'conversionRate';
type SortDirection = 'asc' | 'desc';

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
    const match = val.match(/\(([A-Z]{2})\)/);
    if (match) return match[1];

    const cleaned = val.trim().toUpperCase();
    if (cleaned.length === 2) return cleaned;

    // Fallback/Mapping
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

const formatStateName = (val: string): string => {
    if (!val) return '';
    if (val.toUpperCase() === 'OUTROS') return 'Outros';

    const toTitleCase = (str: string) =>
        str.toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

    const match = val.match(/^(.*)\s\(([A-Z]{2})\)$/);
    if (match) {
        return `${toTitleCase(match[1])} (${match[2]})`;
    }

    const uf = normalizeUF(val);
    if (uf && uf !== val) {
        // Handle case where val might be just the name without (UF)
        const namePart = val.split(' (')[0];
        return `${toTitleCase(namePart)} (${uf})`;
    }

    return toTitleCase(val);
};

export const SalesDetailsModal: React.FC<Props> = ({ videoId, videoTitle, period, onClose }) => {
    const [deals, setDeals] = useState<any[]>([]);
    const [videoData, setVideoData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Seller Ranking State
    const [sortField, setSortField] = useState<SortField>('revenue');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Section Visibility State
    const [isRankingOpen, setIsRankingOpen] = useState(true);
    const [isOriginOpen, setIsOriginOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyFilter, setHistoryFilter] = useState<'all' | 'won' | 'lost' | 'active'>('won');
    const [selectedUF, setSelectedUF] = useState<string | null>(null);

    const mapRef = React.useRef<HTMLDivElement>(null);
    const [googleMap, setGoogleMap] = useState<any>(null);
    const markersRef = React.useRef<any[]>([]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { video, deals: dealsData } = await fetchDealsByVideo(videoId, period);
            setDeals(dealsData);
            setVideoData(video);
            setLoading(false);
        };
        if (videoId) load();
    }, [videoId, period]);

    // --- Metrics for Chart ---
    // MAPPING: dealstage -> etapa, amount -> valor, products -> item_linha
    const wonDeals = deals.filter(d => d.etapa?.toLowerCase().includes('ganho') || d.etapa?.toLowerCase().includes('won') || d.etapa?.toLowerCase().includes('fechado'));
    const lostDeals = deals.filter(d => d.etapa?.toLowerCase().includes('perdido') || d.etapa?.toLowerCase().includes('lost'));
    const activeDeals = deals.filter(d => {
        const stage = d.etapa?.toLowerCase() || '';
        const isWon = stage.includes('ganho') || stage.includes('won') || stage.includes('fechado');
        const isLost = stage.includes('perdido') || stage.includes('lost');
        return !isWon && !isLost;
    });

    const conversionRate = deals.length > 0 ? (wonDeals.length / deals.length) * 100 : 0;

    const chartData = [
        { name: 'Ganhos', value: wonDeals.length, color: '#10b981' }, // Emerald-500
        { name: 'Perdidos', value: lostDeals.length, color: '#ef4444' }, // Red-500
        { name: 'Ativos', value: activeDeals.length, color: '#6366f1' }, // Indigo-500
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

    // --- Product Analysis Logic ---
    const revenueByProduct = wonDeals.reduce((acc: any, deal) => {
        if (!deal.valor) return acc;
        const rawProds = (deal.item_linha || 'Outros').split(';');

        // Find "Mentoria" product if exists, otherwise take first
        const mainProd = rawProds.find((p: string) => p.toLowerCase().includes('mentoria')) || rawProds[0];
        const extras = rawProds.filter((p: string) => p !== mainProd);

        if (!acc[mainProd]) {
            acc[mainProd] = { total: 0, extras: new Set<string>() };
        }

        acc[mainProd].total += Number(deal.valor);
        extras.forEach((e: string) => acc[mainProd].extras.add(e));

        return acc;
    }, {});

    const PRODUCT_COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'];

    const productChartData = Object.keys(revenueByProduct).map(k => ({
        name: k,
        displayName: k.length > 25 ? k.substring(0, 25) + '...' : k,
        value: revenueByProduct[k].total,
        extras: Array.from(revenueByProduct[k].extras)
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    const maxProductRevenue = Math.max(...productChartData.map(d => d.value), 1);

    // --- Seller Ranking Logic ---
    const sellerStats = useMemo(() => {
        const statsMap = new Map<string, SellerStats & { totalDays: number }>();

        deals.forEach(deal => {
            const name = deal.proprietario || 'Desconhecido';
            if (!statsMap.has(name)) {
                statsMap.set(name, { name, leads: 0, activeLeads: 0, won: 0, lost: 0, revenue: 0, totalDays: 0, avgTime: 0, conversionRate: 0 });
            }
            const stat = statsMap.get(name)!;
            stat.leads++;

            const etapa = deal.etapa?.toLowerCase() || '';
            const isWon = etapa.includes('ganho') || etapa.includes('won') || etapa.includes('fechado');
            const isLost = etapa.includes('perdido') || etapa.includes('lost');

            if (isWon) {
                stat.won++;
                stat.revenue += Number(deal.valor || 0);
                // Calculate duration for this won deal
                if (deal.data_criacao && deal.data_fechamento) {
                    stat.totalDays += getDurationInDays(deal.data_criacao, deal.data_fechamento);
                }
            } else if (isLost) {
                stat.lost++;
            } else {
                stat.activeLeads++;
            }
        });

        return Array.from(statsMap.values()).map(stat => ({
            ...stat,
            avgTime: stat.won > 0 ? Math.round(stat.totalDays / stat.won) : 0,
            conversionRate: stat.leads > 0 ? (stat.won / stat.leads) * 100 : 0
        })).sort((a, b) => {
            const modifier = sortDirection === 'asc' ? 1 : -1;
            // Handle custom sort for new column if needed
            const valA = (a as any)[sortField];
            const valB = (b as any)[sortField];
            return (valA - valB) * modifier;
        });
    }, [deals, sortField, sortDirection]);

    // --- Origin Metrics ---
    const originStats = useMemo(() => {
        const statsMap = new Map<string, { uf: string, count: number, revenue: number }>();

        deals.forEach(deal => {
            const etapa = deal.etapa?.toLowerCase() || '';
            const isWon = etapa.includes('ganho') || etapa.includes('won') || etapa.includes('fechado');
            if (!isWon) return;

            const uf = deal.uf_padrao || 'OUTROS';
            if (!statsMap.has(uf)) {
                statsMap.set(uf, { uf, count: 0, revenue: 0 });
            }
            const stat = statsMap.get(uf)!;
            stat.count++;
            stat.revenue += Number(deal.valor || 0);
        });

        return Array.from(statsMap.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
    }, [deals]);

    const salesWithUF = useMemo(() => {
        return deals.filter(d => {
            const etapa = d.etapa?.toLowerCase() || '';
            const isWon = etapa.includes('ganho') || etapa.includes('won') || etapa.includes('fechado');
            return isWon && d.uf_padrao;
        });
    }, [deals]);

    // --- Google Maps Logic ---
    // Initialize Map
    useEffect(() => {
        // Clear googleMap state if the section is closed, so it can re-init when opened
        if (!isOriginOpen) {
            setGoogleMap(null);
            return;
        }

        if (!mapRef.current || googleMap) return;

        const initMap = async () => {
            try {
                const { Map } = await importLibrary('maps');
                const map = new Map(mapRef.current!, {
                    center: { lat: -14.235, lng: -51.9253 }, // Center of Brazil
                    zoom: 4,
                    styles: [
                        {
                            "featureType": "all",
                            "elementType": "labels.text.fill",
                            "stylers": [{ "color": "#7c93a3" }, { "lightness": "-10" }]
                        }
                    ],
                    disableDefaultUI: true,
                    zoomControl: true,
                });
                setGoogleMap(map);
            } catch (err) {
                console.error("Error initializing Google Maps:", err);
            }
        };

        initMap();
    }, [isOriginOpen]);

    // Update Markers
    useEffect(() => {
        if (!googleMap || !isOriginOpen) return;

        // Clear existing markers
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        const updateMarkers = async () => {
            try {
                await importLibrary('marker'); // Ensure library is loaded
                const g = (window as any).google;
                if (!g || !g.maps || !g.maps.Marker) return;

                const bounds = new g.maps.LatLngBounds();
                let hasCoords = false;

                salesWithUF.forEach((sale) => {
                    const ufCode = normalizeUF(sale.uf_padrao);
                    const coords = UF_COORDS[ufCode];
                    if (!coords) return;

                    hasCoords = true;
                    bounds.extend(coords);

                    const jitterLat = (Math.random() - 0.5) * 0.4;
                    const jitterLng = (Math.random() - 0.5) * 0.4;

                    const marker = new g.maps.Marker({
                        position: { lat: coords.lat + jitterLat, lng: coords.lng + jitterLng },
                        map: googleMap,
                        title: `${sale.proprietario || 'Venda'} - ${sale.uf_padrao}`,
                        icon: {
                            path: 'M 0,0 m -5,0 a 5,5 0 1,0 10,0 a 5,5 0 1,0 -10,0',
                            fillColor: '#ef4444',
                            fillOpacity: 1,
                            strokeWeight: 1,
                            strokeColor: '#ffffff',
                            scale: 1.5
                        }
                    });
                    markersRef.current.push(marker);
                });

                if (hasCoords) {
                    googleMap.fitBounds(bounds);
                    // Prevent too much zoom if only one state
                    const listener = googleMap.addListener('idle', () => {
                        if (googleMap.getZoom() > 6) googleMap.setZoom(6);
                        g.maps.event.removeListener(listener);
                    });
                }
            } catch (err) {
                console.error("Error updating markers:", err);
            }
        };

        updateMarkers();

        return () => {
            markersRef.current.forEach(m => m.setMap(null));
            markersRef.current = [];
        };
    }, [isOriginOpen, salesWithUF, googleMap]);

    const handleUFClick = (uf: string) => {
        setSelectedUF(uf);
        const ufCode = normalizeUF(uf);
        const coords = UF_COORDS[ufCode];
        if (coords && googleMap) {
            googleMap.setCenter(coords);
            googleMap.setZoom(6);
        }
    };

    // --- Header Metrics ---
    const totalWonRevenue = useMemo(() => wonDeals.reduce((sum, d) => sum + Number(d.valor || 0), 0), [wonDeals]);
    const averageTicket = useMemo(() => wonDeals.length > 0 ? totalWonRevenue / wonDeals.length : 0, [totalWonRevenue, wonDeals]);
    const averageTimeForAllSellers = useMemo(() => {
        const sellersWithAvgTime = sellerStats.filter(s => s.avgTime > 0);
        if (sellersWithAvgTime.length === 0) return 0;
        const sum = sellersWithAvgTime.reduce((acc, s) => acc + s.avgTime, 0);
        return Math.round(sum / sellersWithAvgTime.length);
    }, [sellerStats]);

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
            const isLost = etapa.includes('perdido') || etapa.includes('lost');
            const isActive = !isWon && !isLost;

            if (historyFilter === 'won') return isWon;
            if (historyFilter === 'lost') return isLost;
            if (historyFilter === 'active') return isActive;
            return true;
        });
    }, [deals, historyFilter]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-4">
                        {videoData?.thumbnail_url && (
                            <img
                                src={videoData.thumbnail_url}
                                alt={videoData.title}
                                className="w-20 h-12 object-cover rounded-md shadow-sm border border-gray-200 dark:border-gray-700"
                            />
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <DollarSign className="text-emerald-500" /> Detalhes de Vendas
                            </h2>
                            <div className="flex flex-col mt-1">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 line-clamp-1">{videoData?.title || videoTitle}</p>
                                <a
                                    href={`https://youtube.com/watch?v=${videoId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1 w-fit transition-colors"
                                >
                                    Ver no YouTube <ChevronRight size={12} />
                                </a>
                            </div>
                        </div>
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
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-shadow hover:shadow-md">
                                    <div className="flex items-center gap-3 text-emerald-500 mb-2">
                                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                            <DollarSign size={20} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Receita Total</span>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalWonRevenue)}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-shadow hover:shadow-md">
                                    <div className="flex items-center gap-3 text-blue-500 mb-2">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                            <Calendar size={20} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Tempo Médio Venda</span>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {averageTimeForAllSellers > 0 ? `${averageTimeForAllSellers} dias` : '-'}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-shadow hover:shadow-md">
                                    <div className="flex items-center gap-3 text-amber-500 mb-2">
                                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                            <ShoppingBag size={20} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Ticket Médio</span>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(averageTicket)}
                                    </div>
                                </div>
                            </div>
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
                                            <span className="text-xs text-gray-400 font-medium">Conversão</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-6 mt-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-900/30"></div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-400 font-medium">Ganhos</span>
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{wonDeals.length}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-[#6366f1] ring-2 ring-indigo-100 dark:ring-indigo-900/30"></div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-400 font-medium">Ativos</span>
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{activeDeals.length}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-100 dark:ring-red-900/30"></div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-400 font-medium">Perdidos</span>
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{lostDeals.length}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Revenue Product - Custom Premium Bar List */}
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col relative">
                                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-6">Top Produtos (Receita)</h3>
                                    <div className="flex-1 space-y-5">
                                        {productChartData.map((prod, index) => (
                                            <div key={prod.name} className="space-y-1.5 group/item">
                                                <div className="flex justify-between items-center text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-700 dark:text-gray-200 truncate max-w-[180px]" title={prod.name}>
                                                            {prod.displayName}
                                                        </span>
                                                        {prod.extras.length > 0 && (
                                                            <div className="relative group/badge">
                                                                <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-black cursor-help border border-blue-100 dark:border-blue-800 transition-all hover:scale-110">
                                                                    +{prod.extras.length}
                                                                </span>
                                                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover/badge:block z-[60] animate-in slide-in-from-bottom-1 duration-200">
                                                                    <div className="bg-gray-900/95 backdrop-blur-md text-white p-3 rounded-lg shadow-xl border border-gray-700 min-w-[200px] text-[10px] whitespace-normal leading-relaxed">
                                                                        <div className="text-gray-400 mb-1.5 font-bold">Extras inclusos:</div>
                                                                        <ul className="space-y-1">
                                                                            {prod.extras.map((extra: any, i) => (
                                                                                <li key={i} className="flex items-start gap-2">
                                                                                    <span className="text-blue-400 mt-0.5">•</span>
                                                                                    <span>{extra}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                    <div className="w-2 h-2 bg-gray-900 border-r border-b border-gray-700 rotate-45 ml-4 -mt-1"></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-gray-900 dark:text-white">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.value)}
                                                    </span>
                                                </div>
                                                <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                                                        style={{
                                                            width: `${(prod.value / maxProductRevenue) * 100}%`,
                                                            backgroundColor: PRODUCT_COLORS[index % PRODUCT_COLORS.length],
                                                            filter: 'brightness(1.1)'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Seller Ranking */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                <div
                                    className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/80 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                                    onClick={() => setIsRankingOpen(!isRankingOpen)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-amber-500" />
                                        <h3 className="font-bold text-gray-800 dark:text-gray-100">Ranking de Vendedores</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isRankingOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                    </div>
                                </div>
                                <div className={`overflow-x-auto transition-all duration-300 ${isRankingOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Vendedor</th>
                                                <th className="px-4 py-3 text-center cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('leads')}>
                                                    <div className="flex items-center justify-center gap-1">Leads <SortIcon field="leads" /></div>
                                                </th>
                                                <th className="px-4 py-3 text-center cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('activeLeads')}>
                                                    <div className="flex items-center justify-center gap-1 whitespace-nowrap">LD Ativos <SortIcon field="activeLeads" /></div>
                                                </th>
                                                <th className="px-4 py-3 text-center cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('won')}>
                                                    <div className="flex items-center justify-center gap-1">Vendas <SortIcon field="won" /></div>
                                                </th>
                                                <th className="px-4 py-3 text-center cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('lost')}>
                                                    <div className="flex items-center justify-center gap-1">Perdas <SortIcon field="lost" /></div>
                                                </th>
                                                <th className="px-4 py-3 text-center cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('conversionRate')}>
                                                    <div className="flex items-center justify-center gap-1 whitespace-nowrap">Tx. Conversão <SortIcon field="conversionRate" /></div>
                                                </th>
                                                <th className="px-4 py-3 text-center cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('avgTime')}>
                                                    <div className="flex items-center justify-center gap-1 whitespace-nowrap">Tempo Médio <SortIcon field="avgTime" /></div>
                                                </th>
                                                <th className="px-4 py-3 text-right cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('revenue')}>
                                                    <div className="flex items-center justify-end gap-1">Receita <SortIcon field="revenue" /></div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {sellerStats.map((seller, idx) => (
                                                <tr key={seller.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="px-4 py-2 text-xs font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                        {idx === 0 && <Award size={14} className="text-amber-500" />}
                                                        {seller.name}
                                                    </td>
                                                    <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300 text-center">{seller.leads}</td>
                                                    <td className="px-4 py-2 text-xs text-center">
                                                        <span className="text-blue-600 font-medium bg-blue-50 dark:bg-blue-900/10 rounded-sm px-2 py-0.5">
                                                            {seller.activeLeads}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-xs text-center">
                                                        <span className="text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/10 rounded-sm px-2 py-0.5">
                                                            {seller.won}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-xs text-center">
                                                        <span className="text-red-500 bg-red-50 dark:bg-red-900/10 rounded-sm px-2 py-0.5">
                                                            {seller.lost}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-center text-xs font-semibold text-blue-600 dark:text-blue-400">
                                                        {seller.conversionRate.toFixed(1)}%
                                                    </td>
                                                    <td className="px-4 py-2 text-center text-gray-500 dark:text-gray-400 text-xs">
                                                        {seller.avgTime > 0 ? (seller.avgTime < 1 ? 'Menos de 1 dia' : `${seller.avgTime} dias`) : '-'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right font-bold text-gray-900 dark:text-white text-xs">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(seller.revenue)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Origem da Venda */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                                <div
                                    className="p-4 bg-gray-50/80 dark:bg-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                                    onClick={() => setIsOriginOpen(!isOriginOpen)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-5 h-5 text-purple-500" />
                                        <h3 className="font-bold text-gray-800 dark:text-gray-100">Origem da Venda</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isOriginOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                    </div>
                                </div>

                                {isOriginOpen && (
                                    <div className="p-6 flex flex-col md:flex-row gap-8 min-h-[400px]">
                                        {/* Ranking de Regiões */}
                                        <div className="flex-1 space-y-4">
                                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">Top 10 Regiões</h4>
                                            <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-semibold">
                                                        <tr>
                                                            <th className="px-4 py-2">Estado</th>
                                                            <th className="px-4 py-2 text-center">Vendas</th>
                                                            <th className="px-4 py-2 text-right">Faturamento</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                        {originStats.map((stat) => (
                                                            <tr
                                                                key={stat.uf}
                                                                className={`hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors ${selectedUF === stat.uf ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                                                                onClick={() => handleUFClick(stat.uf)}
                                                            >
                                                                <td className="px-4 py-3 text-gray-900 dark:text-white flex items-center gap-3">
                                                                    {(() => {
                                                                        const uf = normalizeUF(stat.uf);
                                                                        if (!uf || uf === 'OUTROS') return null;
                                                                        return (
                                                                            <img
                                                                                src={`${API_BASE_URL}/api/sales/icons/${uf}`}
                                                                                alt={uf}
                                                                                className="w-5 h-3.5 object-cover rounded shadow-sm border border-gray-100 dark:border-gray-700"
                                                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                                                            />
                                                                        );
                                                                    })()}
                                                                    {formatStateName(stat.uf)}
                                                                </td>
                                                                <td className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">{stat.count}</td>
                                                                <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-200">
                                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.revenue)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {originStats.length === 0 && (
                                                            <tr>
                                                                <td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">Nenhum dado de região disponível</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Mapa do Brasil */}
                                        <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-xl relative overflow-hidden border border-gray-100 dark:border-gray-700 group">
                                            <div className="absolute top-4 right-4 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-lg p-2 shadow-sm border border-gray-200 dark:border-gray-700 text-[10px] space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                                    <span className="font-bold dark:text-gray-300">Total: {salesWithUF.length} vendas</span>
                                                </div>
                                            </div>

                                            {/* Google Maps Container */}
                                            <div ref={mapRef} className="w-full h-full min-h-[350px] relative">
                                                {/* Map renderizado aqui */}
                                            </div>

                                            <div className="absolute bottom-4 left-4 text-[10px] text-gray-400 font-medium bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                                                Use o zoom para detalhar • Clique nos estados no ranking
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                                            <button
                                                onClick={() => setHistoryFilter('active')}
                                                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors border ${historyFilter === 'active'
                                                    ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                                    }`}
                                            >
                                                Em Atendimento
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
                                                                        : deal.etapa?.toLowerCase().includes('perdido') || deal.etapa?.toLowerCase().includes('lost')
                                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
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
        </div >
    );
};
