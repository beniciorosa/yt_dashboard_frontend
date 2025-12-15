import React, { useState, useEffect } from 'react';
import { Competitor, StatSnapshot } from '../types';
import { fetchCompetitors } from '../services/storageService';
import { fetchYoutubeChannelData } from '../services/youtubeService';
import { X, Search, Trophy, TrendingUp, Users, Video, Eye, ChevronRight, Swords, AlertCircle, Calendar, FlaskConical, Trash2, Crosshair } from 'lucide-react';

interface Props {
    className?: string;
    currentCompetitor: Competitor;
    onClose: () => void;
}

type TimeRange = '7' | '14' | '28' | 'all';

interface Battle {
    opponentId: string;
    opponentName: string;
    opponentAvatar: string;
    daysToOvertake: number | null; // null if impossible or already ahead
    isAhead: boolean;
    lastUpdated: string;
}

export const VersusPanel: React.FC<Props> = ({ className, currentCompetitor, onClose }) => {
    const [savedCompetitors, setSavedCompetitors] = useState<Competitor[]>([]);
    const [opponent, setOpponent] = useState<Competitor | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [timeRange, setTimeRange] = useState<TimeRange>('7');

    // Battles State
    const [battles, setBattles] = useState<Battle[]>([]);
    const [showBattles, setShowBattles] = useState(false);

    // Load saved competitors on mount
    useEffect(() => {
        const loadSaved = async () => {
            const data = await fetchCompetitors();
            // Filter out current competitor from the list
            setSavedCompetitors(data.filter(c => c.id !== currentCompetitor.id));
        };
        loadSaved();

        // Load battles
        const savedBattles = localStorage.getItem('myBattles');
        if (savedBattles) {
            try {
                setBattles(JSON.parse(savedBattles));
            } catch (e) { console.error("Error parsing battles", e); }
        }
    }, [currentCompetitor.id]);

    // Save battles logic wrapped in function to ensure we save state
    const saveBattles = (newBattles: Battle[]) => {
        setBattles(newBattles);
        localStorage.setItem('myBattles', JSON.stringify(newBattles));
    };

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

            // Find best matching snapshot
            const bestMatch = snapshots.reduce((prev, curr) => {
                const prevDiff = Math.abs(new Date(prev.date).getTime() - targetTime);
                const currDiff = Math.abs(new Date(curr.date).getTime() - targetTime);
                return currDiff < prevDiff ? curr : prev;
            });

            startSnapshot = bestMatch;
            if (startSnapshot.date === latest.date && snapshots.length > 1) {
                startSnapshot = snapshots[snapshots.length - 2];
            }
        }

        const growth = {
            subs: latest.subscribers - startSnapshot.subscribers,
            views: latest.views - startSnapshot.views,
            videos: latest.videos - startSnapshot.videos,
        };

        // Calculate Average Daily Growth (All Time)
        const first = snapshots[0];
        const dayDiff = Math.max(1, (new Date(latest.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24));
        const dailySubsGrowth = (latest.subscribers - first.subscribers) / dayDiff;

        return {
            subscribers: latest.subscribers,
            views: latest.views,
            videos: latest.videos,
            growth,
            dailySubsGrowth,
            totalSnapshots: snapshots.length
        };
    };

    const currentStats = calculateStats(currentCompetitor);
    const opponentStats = calculateStats(opponent);

    // BATLLE LOGIC
    const calculateBattleProjection = () => {
        if (!currentStats || !opponentStats || !opponent) return null;

        const mySubs = currentStats.subscribers;
        const oppSubs = opponentStats.subscribers;

        const myRate = currentStats.dailySubsGrowth;
        const oppRate = opponentStats.dailySubsGrowth;

        const gap = oppSubs - mySubs;
        const netRate = myRate - oppRate;

        // Logic:
        // 1. If I am ahead (gap < 0), I am winning.
        // 2. If I am behind (gap > 0):
        //    a. If my rate > opp rate (netRate > 0), I will catch up. Days = gap / netRate.
        //    b. If my rate <= opp rate, I will never catch up (infinity).

        let days = null;
        let isAhead = false;

        if (gap <= 0) {
            isAhead = true;
            days = 0;
        } else {
            if (netRate > 0) {
                days = Math.ceil(gap / netRate);
            } else {
                days = null; // Never catches up
            }
        }

        return { days, isAhead };
    };

    const handleBattle = () => {
        if (!opponent || !currentStats || !opponentStats) return;

        const projection = calculateBattleProjection();
        if (!projection) return; // Should not happen if stats exist

        const newBattle: Battle = {
            opponentId: opponent.id,
            opponentName: opponent.channelName,
            opponentAvatar: opponent.avatarUrl || '',
            daysToOvertake: projection.days,
            isAhead: projection.isAhead,
            lastUpdated: new Date().toISOString()
        };

        // Add or Update
        const existingIdx = battles.findIndex(b => b.opponentId === opponent.id);
        let updatedList = [...battles];
        if (existingIdx >= 0) {
            updatedList[existingIdx] = newBattle;
        } else {
            updatedList.push(newBattle);
        }

        saveBattles(updatedList);
        setShowBattles(true); // Open the list
    };

    const removeBattle = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        saveBattles(battles.filter(b => b.opponentId !== id));
    };

    // Determine Winner for UI
    let winner: 'current' | 'opponent' | 'tie' = 'current';
    if (opponent && currentStats && opponentStats) {
        let scoreCurrent = 0;
        let scoreOpponent = 0;
        const compare = (valA: number, valB: number) => {
            if (valA > valB) scoreCurrent++; else if (valB > valA) scoreOpponent++;
        };
        compare(currentStats.subscribers, opponentStats.subscribers);
        compare(currentStats.views, opponentStats.views);
        compare(currentStats.videos, opponentStats.videos);
        compare(currentStats.growth.subs, opponentStats.growth.subs);
        compare(currentStats.growth.views, opponentStats.growth.views);
        compare(currentStats.growth.videos, opponentStats.growth.videos);
        if (scoreOpponent > scoreCurrent) winner = 'opponent';
        else if (scoreOpponent === scoreCurrent) winner = 'tie';
    }

    const renderStatRow = (label: string, valueChampion: number | undefined, valueOpponent: number | undefined, format: 'number' | 'compact' = 'compact', showZeroAsDash: boolean = false) => {
        if (valueChampion === undefined || valueOpponent === undefined) return null;
        const championWins = valueChampion > valueOpponent;
        const opponentWins = valueOpponent > valueChampion;
        const formatNum = (num: number) => {
            if (num === 0 && showZeroAsDash) return '-';
            if (format === 'compact') return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
            return new Intl.NumberFormat('en-US').format(Math.round(num));
        };
        return (
            <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100 dark:border-gray-800 items-center">
                <div className={`text-right font-mono ${championWins ? 'text-green-600 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                    {championWins && <Trophy size={12} className="inline mr-1 mb-1 text-yellow-500" />} {formatNum(valueChampion)}
                </div>
                <div className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</div>
                <div className={`text-left font-mono ${opponentWins ? 'text-green-600 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                    {formatNum(valueOpponent)} {opponentWins && <Trophy size={12} className="inline ml-1 mb-1 text-yellow-500" />}
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
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowBattles(!showBattles)}
                        className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-semibold ${showBattles ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-slate-800 dark:border-gray-700 dark:text-gray-300'}`}
                    >
                        <Crosshair size={16} />
                        Minhas Batalhas
                        {battles.length > 0 && <span className="bg-indigo-600 text-white text-[10px] px-1.5 rounded-full">{battles.length}</span>}
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white dark:bg-slate-900">

                {/* BATTLES LIST SECTION (Toggleable) */}
                {showBattles && (
                    <div className="mb-8 animate-in slide-in-from-top-4 duration-300 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/30">
                        <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-3 flex items-center gap-2">
                            <Crosshair size={16} /> LISTA DE ALVOS (Batalhas Ativas)
                        </h3>

                        {battles.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">Nenhuma batalha ativa. Selecione um oponente e clique em "Batalhar".</p>
                        ) : (
                            <div className="space-y-3">
                                {battles.map(battle => (
                                    <div key={battle.opponentId} className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <img src={battle.opponentAvatar || '/placeholder.png'} className="w-10 h-10 rounded-full border border-gray-100 dark:border-gray-600" />
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{battle.opponentName}</p>
                                                <div className="flex items-center gap-2 text-xs">
                                                    {battle.isAhead ? (
                                                        <span className="text-green-600 font-bold flex items-center gap-1"><Trophy size={10} /> Você está na frente!</span>
                                                    ) : (
                                                        <span className={`${battle.daysToOvertake ? 'text-orange-500' : 'text-gray-400'} font-medium`}>
                                                            {battle.daysToOvertake ? `${battle.daysToOvertake} dias para ultrapassar` : 'Crescimento insuficiente para ultrapassar'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* ProgressBar */}
                                                {!battle.isAhead && battle.daysToOvertake && (
                                                    <div className="w-32 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mt-1.5 overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-orange-400 to-red-500"
                                                            style={{ width: '15%' }} // Just visual placeholder for "in progress", logic for % is hard without start date
                                                        ></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    // Load this battle logic
                                                    setSearchTerm(battle.opponentName);
                                                    handleSearch(); // Trigger search
                                                }}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Ver Detalhes"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => removeBattle(battle.opponentId, e)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Remover Batalha"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* SEARCH INPUT */}
                <div className="mb-8 relative z-20">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Selecione seu Oponente</label>
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

                {/* HEAD TO HEAD COMPARISON */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Left Box (My Channel) */}
                    <div className={`p-4 rounded-xl flex flex-col items-center text-center shadow-lg relative overflow-hidden order-1 transition-all ${winner === 'current' || winner === 'tie'
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                        : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700'
                        }`}>
                        {(winner === 'current' || winner === 'tie') && (
                            <div className="absolute top-0 right-0 p-2 opacity-10"><Trophy size={64} /></div>
                        )}
                        <div className={`w-16 h-16 rounded-full overflow-hidden mb-3 shadow-md z-10 ${winner === 'current' || winner === 'tie' ? 'border-2 border-white/50' : 'border-2 border-indigo-100 dark:border-gray-600'}`}>
                            <img src={currentCompetitor.avatarUrl || '/placeholder.png'} className="w-full h-full object-cover" />
                        </div>
                        <h3 className={`font-bold line-clamp-1 z-10 ${winner === 'current' || winner === 'tie' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{currentCompetitor.channelName}</h3>
                        <p className={`text-xs z-10 ${winner === 'current' || winner === 'tie' ? 'text-indigo-100' : 'text-gray-500'}`}>Seu Canal (Base)</p>
                    </div>

                    {/* Right Box (Opponent) */}
                    <div className={`p-4 rounded-xl flex flex-col items-center text-center transition-all order-2 relative overflow-hidden shadow-lg ${!opponent
                        ? 'border-dashed border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50 shadow-none'
                        : winner === 'opponent'
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                            : 'bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 shadow-sm'
                        }`}>
                        {winner === 'opponent' && <div className="absolute top-0 right-0 p-2 opacity-10"><Trophy size={64} /></div>}

                        {opponent ? (
                            <>
                                <div className={`w-16 h-16 rounded-full overflow-hidden mb-3 shadow-md z-10 ${winner === 'opponent' ? 'border-2 border-white/50' : 'border-2 border-indigo-500'}`}>
                                    <img src={opponent.avatarUrl || '/placeholder.png'} className="w-full h-full object-cover" />
                                </div>
                                <h3 className={`font-bold line-clamp-1 z-10 ${winner === 'opponent' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{opponent.channelName}</h3>
                                <p className={`text-xs z-10 ${winner === 'opponent' ? 'text-indigo-100' : 'text-gray-500'}`}>Oponente</p>
                            </>
                        ) : (
                            <div className="h-32 flex flex-col items-center justify-center text-gray-400">
                                <Users size={32} className="mb-2 opacity-50" />
                                <span className="text-sm">Selecione um oponente</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* BATALHAR BUTTON */}
                {opponent && (
                    <div className="mb-6 flex justify-center">
                        <button
                            onClick={handleBattle}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold text-lg px-8 py-3 rounded-full shadow-lg hover:shadow-red-500/30 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95 animate-in zoom-in duration-300"
                        >
                            <Swords size={24} />
                            BATALHAR
                        </button>
                    </div>
                )}

                {/* METRICS COMPARISON */}
                {opponent && currentStats && opponentStats && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
                        {/* Section: TOTALS */}
                        <div>
                            <h4 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                <Trophy size={14} /> Comparativo Direto
                            </h4>
                            {renderStatRow("Inscritos", currentStats.subscribers, opponentStats.subscribers)}
                            {renderStatRow("Visualizações", currentStats.views, opponentStats.views)}
                            {renderStatRow("Uploads", currentStats.videos, opponentStats.videos, 'number')}
                        </div>

                        {/* Section: GROWTH */}
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-gray-100 pb-2">
                                <h4 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <TrendingUp size={14} /> Ritmo de Crescimento
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
                            {renderStatRow("Novos Inscritos", currentStats.growth.subs, opponentStats.growth.subs, 'number', true)}
                            {renderStatRow("Novas Views", currentStats.growth.views, opponentStats.growth.views, 'compact', true)}
                        </div>

                        {/* INFO BOX */}
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex gap-3 text-xs text-gray-500 border border-gray-100 dark:border-gray-700">
                            <FlaskConical className="shrink-0 text-indigo-500" size={18} />
                            <div>
                                <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">Como calculamos a projeção?</p>
                                <p>
                                    A projeção "dias para ultrapassar" utiliza a média de crescimento diário de todo o histórico rastreado no banco de dados.
                                    Ela estima em quanto tempo a diferença será zerada, assumindo que ambos os canais mantenham o ritmo atual.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
