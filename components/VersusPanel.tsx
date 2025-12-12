import React, { useState, useEffect } from 'react';
import { Competitor, StatSnapshot } from '../types';
import { fetchCompetitors } from '../services/storageService';
import { fetchYoutubeChannelData } from '../services/youtubeService';
import { X, Search, Trophy, TrendingUp, Users, Video, Eye, ChevronDown, Swords, AlertCircle, Calendar } from 'lucide-react';

interface Props {
    className?: string;
    currentCompetitor: Competitor;
    onClose: () => void;
}

type TimeRange = '7' | '14' | '28' | 'all';

export const VersusPanel: React.FC<Props> = ({ className, currentCompetitor, onClose }) => {
    const [savedCompetitors, setSavedCompetitors] = useState<Competitor[]>([]);
    const [opponent, setOpponent] = useState<Competitor | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [timeRange, setTimeRange] = useState<TimeRange>('7');

    // Load saved competitors on mount
    useEffect(() => {
        const loadSaved = async () => {
            const data = await fetchCompetitors();
            // Filter out current competitor from the list
            setSavedCompetitors(data.filter(c => c.id !== currentCompetitor.id));
        };
        loadSaved();
    }, [currentCompetitor.id]);

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;
        setIsSearching(true);
        setSearchError(null);
        setShowDropdown(false);

        try {
            // Check if it matches a saved competitor first
            const savedMatch = savedCompetitors.find(c =>
                c.channelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.influencerName?.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (savedMatch) {
                setOpponent(savedMatch);
            } else {
                // Fetch from YouTube
                const result = await fetchYoutubeChannelData(searchTerm);
                if (result) {
                    // Construct a temporary competitor object for display
                    const tempOpponent: Competitor = {
                        ...result.competitor as Competitor,
                        snapshots: [result.stats as StatSnapshot] // Only one snapshot
                    };
                    if (result.avatarUrl) tempOpponent.avatarUrl = result.avatarUrl;
                    setOpponent(tempOpponent);
                }
            }
        } catch (err) {
            setSearchError('Canal não encontrado. Tente o link ou ID.');
        } finally {
            setIsSearching(false);
        }
    };

    const selectSaved = (comp: Competitor) => {
        setOpponent(comp);
        setSearchTerm(comp.channelName);
        setShowDropdown(false);
    };

    // --- STATS CALCULATION HELPER ---
    const calculateStats = (comp: Competitor | null) => {
        if (!comp) return null;
        const snapshots = comp.snapshots || [];
        if (snapshots.length === 0) return null;

        const latest = snapshots[snapshots.length - 1];

        // Calculate Growth based on Time Range
        let startSnapshot = snapshots[0];

        if (timeRange !== 'all' && snapshots.length > 1) {
            const days = parseInt(timeRange);
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - days);
            const targetTime = targetDate.getTime();

            // Find the snapshot closest to target date, but strictly BEFORE current snapshot
            // We iterate backwards to find the first one that is <= targetTime
            // If we don't find one old enough, we take the oldest available (index 0)
            let found = snapshots[0];

            // Simple approach: find first snapshot that is likely "days" ago
            // Since snapshots are chronological
            for (let i = 0; i < snapshots.length; i++) {
                const sDate = new Date(snapshots[i].date).getTime();
                if (sDate >= targetTime) {
                    // This snapshot is within the range. The one *before* it would be outside.
                    // Actually, we want the snapshot that represents the state "days ago".
                    // If I want growth over 7 days, I need value(Now) - value(Now - 7d).
                    // So I need to find a snapshot close to (Now - 7d).
                    // If today is 12th, and I want 7 days ago (5th).
                    // I look for snapshot with date <= 5th.
                    // The loop going forward: if date > 5th, then the previous one was <= 5th.
                    if (i > 0) found = snapshots[i - 1];
                    else found = snapshots[0];
                    // Wait, this logic is tricky if gaps exist. 
                    // Let's stick to user request: "14 e 28 dias vai mostrar o que há dentro dele".
                    // This implies using the oldest available if strictly matching range isn't possible.
                    break;
                }
                // If we reach the end and all are older than target (unlikely if latest is today), 
                // then effectively we use the latest-1? No.
            }

            // Better logic: 
            // 1. Target Timestamp = Now - Days.
            // 2. Find snapshot with timestamp closest to Target Timestamp.
            //    Ideally a bit OLDER than target to capture the full period, or exact match.
            //    If the oldest snapshot is still NEWER than target (e.g. oldest is 2 days ago, target is 7 days ago),
            //    then we use that oldest snapshot. This satisfies "shows what is inside it".

            const bestMatch = snapshots.reduce((prev, curr) => {
                const prevDiff = Math.abs(new Date(prev.date).getTime() - targetTime);
                const currDiff = Math.abs(new Date(curr.date).getTime() - targetTime);
                return currDiff < prevDiff ? curr : prev;
            });

            // If the best match is actually the latest snapshot (e.g. only 1 snapshot today), growth is 0.
            // But we usually want at least somewhat different snapshots.
            startSnapshot = bestMatch;

            // Fallback: If best match is same as latest, try to go one back if possible
            if (startSnapshot.date === latest.date && snapshots.length > 1) {
                startSnapshot = snapshots[snapshots.length - 2];
            }
        }

        const growth = {
            subs: latest.subscribers - startSnapshot.subscribers,
            views: latest.views - startSnapshot.views,
            videos: latest.videos - startSnapshot.videos,
        };

        return {
            subscribers: latest.subscribers,
            views: latest.views,
            videos: latest.videos,
            growth,
            totalSnapshots: snapshots.length
        };
    };

    const currentStats = calculateStats(currentCompetitor);
    const opponentStats = calculateStats(opponent);

    // Determine Winner
    // Points system: 1 point for each metric won (Total: Subs, Views, Vids | Growth: Subs, Views, Vids)
    let winner: 'current' | 'opponent' | 'tie' = 'current';

    if (opponent && currentStats && opponentStats) {
        let scoreCurrent = 0;
        let scoreOpponent = 0;

        const compare = (valA: number, valB: number) => {
            if (valA > valB) scoreCurrent++;
            else if (valB > valA) scoreOpponent++;
        };

        // Total Stats
        compare(currentStats.subscribers, opponentStats.subscribers);
        compare(currentStats.views, opponentStats.views);
        compare(currentStats.videos, opponentStats.videos);

        // Growth Stats
        compare(currentStats.growth.subs, opponentStats.growth.subs);
        compare(currentStats.growth.views, opponentStats.growth.views);
        compare(currentStats.growth.videos, opponentStats.growth.videos);

        if (scoreOpponent > scoreCurrent) winner = 'opponent';
        else if (scoreOpponent === scoreCurrent) winner = 'tie';
    }

    // Helper to render comparison row
    // NOTE: Swapped order: Left = Current (Champion), Right = Opponent
    const renderStatRow = (
        label: string,
        valueChampion: number | undefined,
        valueOpponent: number | undefined,
        format: 'number' | 'compact' = 'compact',
        showZeroAsDash: boolean = false
    ) => {
        if (valueChampion === undefined || valueOpponent === undefined) return null;

        const championWins = valueChampion > valueOpponent;
        const opponentWins = valueOpponent > valueChampion;

        const formatNum = (num: number) => {
            if (num === 0 && showZeroAsDash) return '-';
            if (format === 'compact') {
                return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
            }
            return new Intl.NumberFormat('en-US').format(Math.round(num));
        };

        return (
            <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100 dark:border-gray-800 items-center">
                {/* Left (Champion) */}
                <div className={`text-right font-mono ${championWins ? 'text-green-600 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                    {championWins && <Trophy size={12} className="inline mr-1 mb-1 text-yellow-500" />}
                    {formatNum(valueChampion)}
                </div>

                {/* Label */}
                <div className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {label}
                </div>

                {/* Right (Opponent) */}
                <div className={`text-left font-mono ${opponentWins ? 'text-green-600 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                    {formatNum(valueOpponent)}
                    {opponentWins && <Trophy size={12} className="inline ml-1 mb-1 text-yellow-500" />}
                </div>
            </div>
        );
    };

    return (
        <div className={`fixed inset-y-0 right-0 w-full md:w-[600px] bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-gray-800 flex flex-col ${className}`}>

            {/* HEADER */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Swords size={20} />
                    <h2 className="font-bold text-lg">MODO VERSUS</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* CONTENT SCROLL */}
            <div className="flex-1 overflow-y-auto p-6">

                {/* FIGHTER SELECTION (Title remains roughly same, but positions swap in grid below) */}
                <div className="mb-8 relative z-20">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Desafiante (Opponent)</label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar canal ou colar URL..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowDropdown(true);
                                if (!e.target.value) setOpponent(null);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        {savedCompetitors.length > 0 && showDropdown && searchTerm && !opponent && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto">
                                {savedCompetitors
                                    .filter(c => c.channelName.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map(c => (
                                        <div key={c.id} onClick={() => selectSaved(c)} className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer flex items-center gap-3 transition-colors">
                                            <img src={c.avatarUrl || '/placeholder.png'} className="w-8 h-8 rounded-full" />
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{c.channelName}</span>
                                        </div>
                                    ))}
                                <div onClick={handleSearch} className="p-3 bg-indigo-50 dark:bg-slate-800 text-indigo-600 text-sm font-medium cursor-pointer text-center hover:bg-indigo-100 dark:hover:bg-slate-700">
                                    Buscar "{searchTerm}" no YouTube...
                                </div>
                            </div>
                        )}
                    </div>
                    {searchError && <p className="text-red-500 text-sm mt-2 flex items-center gap-1"><AlertCircle size={14} /> {searchError}</p>}
                </div>

                {/* HEAD TO HEAD COMPARISON - SWAPPED ORDER */}
                <div className="grid grid-cols-2 gap-4 mb-6">

                    {/* Left Box (Current) */}
                    <div className={`p-4 rounded-xl flex flex-col items-center text-center shadow-lg relative overflow-hidden order-1 transition-all ${winner === 'current' || winner === 'tie' // Default to current on tie or win
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                        : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700'
                        }`}>
                        {(winner === 'current' || winner === 'tie') && (
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <Trophy size={64} />
                            </div>
                        )}

                        <div className={`w-16 h-16 rounded-full overflow-hidden mb-3 shadow-md z-10 ${winner === 'current' || winner === 'tie' ? 'border-2 border-white/50' : 'border-2 border-indigo-100 dark:border-gray-600'
                            }`}>
                            <img src={currentCompetitor.avatarUrl || '/placeholder.png'} className="w-full h-full object-cover" />
                        </div>
                        <h3 className={`font-bold line-clamp-1 z-10 ${winner === 'current' || winner === 'tie' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                            {currentCompetitor.channelName}
                        </h3>
                        <p className={`text-xs z-10 ${winner === 'current' || winner === 'tie' ? 'text-indigo-100' : 'text-gray-500'}`}>
                            {winner === 'current' || winner === 'tie' ? 'Campeão Atual' : 'Desafiante'}
                        </p>
                    </div>

                    {/* Right Box (Opponent / Challenger) */}
                    {/* Right Box (Opponent) */}
                    <div className={`p-4 rounded-xl flex flex-col items-center text-center transition-all order-2 relative overflow-hidden shadow-lg ${!opponent
                        ? 'border-dashed border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50 shadow-none'
                        : winner === 'opponent'
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                            : 'bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 shadow-sm'
                        }`}>
                        {winner === 'opponent' && (
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <Trophy size={64} />
                            </div>
                        )}

                        {opponent ? (
                            <>
                                <div className={`w-16 h-16 rounded-full overflow-hidden mb-3 shadow-md z-10 ${winner === 'opponent' ? 'border-2 border-white/50' : 'border-2 border-indigo-500'
                                    }`}>
                                    <img src={opponent.avatarUrl || '/placeholder.png'} className="w-full h-full object-cover" />
                                </div>
                                <h3 className={`font-bold line-clamp-1 z-10 ${winner === 'opponent' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                                    {opponent.channelName}
                                </h3>
                                <p className={`text-xs z-10 ${winner === 'opponent' ? 'text-indigo-100' : 'text-gray-500'}`}>
                                    {winner === 'opponent' ? 'Campeão Atual' : 'Desafiante'}
                                </p>
                            </>
                        ) : (
                            <div className="h-32 flex flex-col items-center justify-center text-gray-400">
                                <Users size={32} className="mb-2 opacity-50" />
                                <span className="text-sm">Selecione um oponente</span>
                            </div>
                        )}
                    </div>

                </div>

                {/* METRICS COMPARISON */}
                {opponent && currentStats && opponentStats && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">

                        {/* Section: TOTALS */}
                        <div>
                            <h4 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                <Trophy size={14} /> Totais Acumulados
                            </h4>
                            {/* Pass Champion First (Left), then Opponent (Right) */}
                            {renderStatRow("Inscritos", currentStats.subscribers, opponentStats.subscribers)}
                            {renderStatRow("Visualizações", currentStats.views, opponentStats.views)}
                            {renderStatRow("Uploads", currentStats.videos, opponentStats.videos, 'number')}
                        </div>

                        {/* Section: GROWTH */}
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-gray-100 pb-2">
                                <h4 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <TrendingUp size={14} /> Métricas de Crescimento
                                </h4>

                                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
                                    {(['7', '14', '28', 'all'] as const).map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setTimeRange(r)}
                                            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${timeRange === r
                                                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                }`}
                                        >
                                            {r === 'all' ? 'Início' : `${r}d`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {renderStatRow("Inscritos ganhos", currentStats.growth.subs, opponentStats.growth.subs, 'number', true)}
                            {renderStatRow("Visualizações ganhas", currentStats.growth.views, opponentStats.growth.views, 'compact', true)}
                            {renderStatRow("Novos Vídeos", currentStats.growth.videos, opponentStats.growth.videos, 'number', true)}
                        </div>


                        {/* INFO BOX */}
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-lg flex items-start gap-2">
                            <Calendar size={16} className="shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold mb-1">Período de Análise: {timeRange === 'all' ? 'Desde o início do rastreamento' : `Últimos ${timeRange} dias`}</p>
                                <p className="opacity-80">
                                    Os dados de crescimento são calculados com base no histórico salvo no banco de dados.
                                    {currentStats.totalSnapshots < 2 && " O seu canal possui poucos registros para análise precisa."}
                                    {(!opponentStats.totalSnapshots || opponentStats.totalSnapshots < 2) && " O desafiante possui poucos registros."}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
