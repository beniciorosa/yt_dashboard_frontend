import React, { useState, useEffect } from 'react';
import { Competitor, StatSnapshot } from '../types';
import { fetchCompetitors } from '../services/storageService';
import { fetchYoutubeChannelData } from '../services/youtubeService';
import { X, Search, Trophy, TrendingUp, Users, Video, Eye, ChevronDown, Swords, AlertCircle } from 'lucide-react';

interface Props {
    className?: string;
    currentCompetitor: Competitor;
    onClose: () => void;
}

export const VersusPanel: React.FC<Props> = ({ className, currentCompetitor, onClose }) => {
    const [savedCompetitors, setSavedCompetitors] = useState<Competitor[]>([]);
    const [opponent, setOpponent] = useState<Competitor | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

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
        const first = snapshots[0];

        // Calculate days diff (min 1 day to avoid Infinity)
        const timeDiff = new Date(latest.date).getTime() - new Date(first.date).getTime();
        const totalDays = Math.max(1, timeDiff / (1000 * 3600 * 24));

        const hasHistory = snapshots.length > 1;

        const getGrowth = (current: number, initial: number) => {
            if (!hasHistory) return 0;
            return (current - initial) / totalDays;
        };

        return {
            subscribers: latest.subscribers,
            views: latest.views,
            videos: latest.videos,
            dailySubs: getGrowth(latest.subscribers, first.subscribers),
            dailyViews: getGrowth(latest.views, first.views),
            // weeklySubs: getGrowth(latest.subscribers, first.subscribers) * 7,
            // weeklyViews: getGrowth(latest.views, first.views) * 7,
            hasHistory
        };
    };

    const currentStats = calculateStats(currentCompetitor);
    const opponentStats = calculateStats(opponent);

    // Helper to render comparison row
    const renderStatRow = (
        label: string,
        valueLeft: number | undefined,
        valueRight: number | undefined,
        format: 'number' | 'compact' = 'compact',
        isGrowth: boolean = false
    ) => {
        if (valueLeft === undefined || valueRight === undefined) return null;

        const leftWins = valueLeft > valueRight;
        const rightWins = valueRight > valueLeft;
        const tie = valueLeft === valueRight;

        const formatNum = (num: number) => {
            if (format === 'compact') {
                return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
            }
            return new Intl.NumberFormat('en-US').format(Math.round(num));
        };

        const displayLeft = formatNum(valueLeft);
        const displayRight = formatNum(valueRight);

        return (
            <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100 dark:border-gray-800 items-center">
                {/* Left (Opponent) */}
                <div className={`text-right font-mono ${leftWins ? 'text-green-600 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                    {leftWins && <Trophy size={12} className="inline mr-1 mb-1 text-yellow-500" />}
                    {isGrowth && !opponentStats?.hasHistory ? 'N/A' : displayLeft}
                </div>

                {/* Label */}
                <div className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {label}
                </div>

                {/* Right (Current) */}
                <div className={`text-left font-mono ${rightWins ? 'text-green-600 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                    {isGrowth && !currentStats?.hasHistory ? 'N/A' : displayRight}
                    {rightWins && <Trophy size={12} className="inline ml-1 mb-1 text-yellow-500" />}
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

                {/* FIGHTER SELECTION */}
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
                                {/* Option to search external if no saved match */}
                                <div onClick={handleSearch} className="p-3 bg-indigo-50 dark:bg-slate-800 text-indigo-600 text-sm font-medium cursor-pointer text-center hover:bg-indigo-100 dark:hover:bg-slate-700">
                                    Buscar "{searchTerm}" no YouTube...
                                </div>
                            </div>
                        )}
                    </div>
                    {searchError && <p className="text-red-500 text-sm mt-2 flex items-center gap-1"><AlertCircle size={14} /> {searchError}</p>}
                </div>

                {/* HEAD TO HEAD HEADER */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Left Box */}
                    <div className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${opponent ? 'bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-900 shadow-sm' : 'border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50'}`}>
                        {opponent ? (
                            <>
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-500 mb-3 shadow-md">
                                    <img src={opponent.avatarUrl || '/placeholder.png'} className="w-full h-full object-cover" />
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-white line-clamp-1">{opponent.channelName}</h3>
                                <p className="text-xs text-gray-500">Desafiante</p>
                            </>
                        ) : (
                            <div className="h-32 flex flex-col items-center justify-center text-gray-400">
                                <Users size={32} className="mb-2 opacity-50" />
                                <span className="text-sm">Selecione um oponente</span>
                            </div>
                        )}
                    </div>

                    {/* Right Box (Current) */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex flex-col items-center text-center shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Trophy size={64} />
                        </div>
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/50 mb-3 shadow-md z-10">
                            <img src={currentCompetitor.avatarUrl || '/placeholder.png'} className="w-full h-full object-cover" />
                        </div>
                        <h3 className="font-bold text-white line-clamp-1 z-10">{currentCompetitor.channelName}</h3>
                        <p className="text-xs text-indigo-100 z-10">Campeão Atual</p>
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
                            {renderStatRow("Inscritos", opponentStats.subscribers, currentStats.subscribers)}
                            {renderStatRow("Visualizações", opponentStats.views, currentStats.views)}
                            {renderStatRow("Uploads", opponentStats.videos, currentStats.videos, 'number')}
                        </div>

                        {/* Section: GROWTH */}
                        <div>
                            <h4 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                <TrendingUp size={14} /> Crescimento Médio (Diário)
                            </h4>
                            {renderStatRow("Novos Inscritos / Dia", opponentStats.dailySubs, currentStats.dailySubs, 'number', true)}
                            {renderStatRow("Views / Dia", opponentStats.dailyViews, currentStats.dailyViews, 'compact', true)}
                        </div>

                        {!opponentStats.hasHistory && (
                            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs rounded-lg flex items-start gap-2">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <p>O canal desafiante foi adicionado agora, então não temos histórico para calcular o crescimento diário exato. Os dados de crescimento aparecerão conforme novos snapshots forem salvos.</p>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};
