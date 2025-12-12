// --- START OF FILE components/CompetitorDetail.tsx ---
import React, { useState, useEffect, useCallback } from 'react';
import { Competitor, StatSnapshot } from '../types';
import { UpdateForm } from './UpdateForm';
import { StatsChart } from './Charts';
import { fetchCompetitorById, addSnapshot, deleteSnapshot, fetchMyChannel, updateCompetitorCategory, updateCompetitorAvatar } from '../services/storageService';
import { analyzeCompetitorGrowth } from '../services/geminiService';
import { fetchYoutubeChannelData, fetchCompetitorContent, VideoData } from '../services/youtubeService';
import { VersusPanel } from './VersusPanel';
import { ArrowLeft, ExternalLink, Calendar, MapPin, Video, Eye, Users, BrainCircuit, Loader2, Trash2, ArrowRightLeft, RefreshCw, AlertTriangle, Flame, Clock, Edit2, Check, X, ThumbsUp, MessageCircle, Swords } from 'lucide-react';

interface Props {
  competitorId: string;
  onBack: () => void;
}

export const CompetitorDetail: React.FC<Props> = ({ competitorId, onBack }) => {
  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [myChannel, setMyChannel] = useState<Competitor | null>(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Videos & Category State
  const [topVideos, setTopVideos] = useState<VideoData[]>([]);
  const [recentVideos, setRecentVideos] = useState<VideoData[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [videosLoaded, setVideosLoaded] = useState(false);
  const [snapshotToDelete, setSnapshotToDelete] = useState<string | null>(null);

  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  const [showVersusPanel, setShowVersusPanel] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await fetchCompetitorById(competitorId);
    setCompetitor(data);
    if (data) setCategoryInput(data.customCategory || '');

    const myData = await fetchMyChannel();
    setMyChannel(myData);
    setLoading(false);
  }, [competitorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !competitor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
        <p className="text-gray-500 dark:text-gray-400">Carregando detalhes...</p>
      </div>
    );
  }

  const handleSaveCategory = async () => {
    try {
      await updateCompetitorCategory(competitor.id, categoryInput);
      setIsEditingCategory(false);
      // Update local state without full reload
      setCompetitor(prev => prev ? ({ ...prev, customCategory: categoryInput }) : null);
    } catch (e) {
      alert("Erro ao salvar categoria");
    }
  };

  const snapshots = competitor.snapshots;
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : { subscribers: 0, views: 0, videos: 0, date: new Date().toISOString() } as StatSnapshot;
  const first = snapshots.length > 0 ? snapshots[0] : latest;

  const totalDays = Math.max(1, (new Date(latest.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24));
  const deltaSubs = latest.subscribers - first.subscribers;
  const deltaViews = latest.views - first.views;
  const deltaVideos = latest.videos - first.videos;
  const dailySubs = deltaSubs / totalDays;
  const dailyViews = deltaViews / totalDays;

  const getPeriodStats = (factor: number) => ({
    subs: Math.round(dailySubs * factor),
    views: Math.round(dailyViews * factor),
    videos: (deltaVideos / totalDays) * factor
  });

  const stats = {
    daily: getPeriodStats(1),
    weekly: getPeriodStats(7),
    monthly: getPeriodStats(30),
    yearly: getPeriodStats(365),
  };

  const handleAddUpdate = async (snapshotData: any) => {
    await addSnapshot(competitor.id, snapshotData);
    setShowUpdateForm(false);
    loadData();
  };

  const handleSyncApi = async () => {
    setIsSyncing(true);
    try {
      const { stats, avatarUrl } = await fetchYoutubeChannelData(competitor.channelUrl);
      await addSnapshot(competitor.id, stats);
      // Also update avatar if we found a better one
      if (avatarUrl && avatarUrl !== competitor.avatarUrl) {
        await updateCompetitorAvatar(competitor.id, avatarUrl);
      }
      loadData();
    } catch (error: any) {
      alert("Erro ao sincronizar: " + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadVideos = async () => {
    setIsLoadingVideos(true);
    try {
      const channelId = competitor.id.startsWith('UC') ? competitor.id : undefined;
      const { topVideos, recentVideos } = await fetchCompetitorContent(competitor.channelUrl, channelId, competitor.channelName);
      setTopVideos(topVideos);
      setRecentVideos(recentVideos);
      setVideosLoaded(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const requestDeleteSnapshot = (e: React.MouseEvent, snapshotId: string) => {
    e.stopPropagation();
    setSnapshotToDelete(snapshotId);
  };

  const confirmDeleteSnapshot = async () => {
    if (snapshotToDelete) {
      await deleteSnapshot(snapshotToDelete);
      setSnapshotToDelete(null);
      loadData();
    }
  };

  const handleAiAnalysis = async () => {
    setIsLoadingAi(true);
    const result = await analyzeCompetitorGrowth(competitor);
    setAiAnalysis(result);
    setIsLoadingAi(false);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const formatTime = (isoString?: string, timeReg?: string) => {
    if (timeReg) {
      return timeReg.substring(0, 5);
    }
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const showComparison = myChannel && myChannel.id !== competitor.id;
  const myLatest = myChannel?.snapshots[myChannel.snapshots.length - 1];

  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button onClick={onBack} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1 text-sm font-medium mb-2">
            <ArrowLeft size={16} /> Voltar ao Painel
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{competitor.channelName}</h1>
            {competitor.isMyChannel && <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded">VOCÊ</span>}
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2 items-center">
            <span className="flex items-center gap-1"><Users size={14} /> {competitor.influencerName}</span>
            <span className="flex items-center gap-1"><MapPin size={14} /> {competitor.country}</span>
            <span className="flex items-center gap-1"><Calendar size={14} /> Entrou no YT: {formatDisplayDate(competitor.youtubeJoinDate.split('T')[0])}</span>

            {/* Category Section */}
            <div className="flex items-center gap-2">
              {isEditingCategory ? (
                <div className="flex items-center gap-1 animate-fade-in">
                  <input
                    type="text"
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none dark:text-white"
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    placeholder="Categoria..."
                    autoFocus
                  />
                  <button onClick={handleSaveCategory} className="text-green-600 hover:text-green-700"><Check size={14} /></button>
                  <button onClick={() => setIsEditingCategory(false)} className="text-red-600 hover:text-red-700"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1 group">
                  {competitor.customCategory ? (
                    <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 text-xs px-2 py-0.5 rounded-full font-medium">
                      {competitor.customCategory}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Sem categoria</span>
                  )}
                  <button
                    onClick={() => setIsEditingCategory(true)}
                    className="text-gray-300 hover:text-blue-600 dark:text-gray-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Editar Categoria"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              )}
            </div>

            <a href={competitor.channelUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline border-l pl-4 border-gray-300 dark:border-gray-600">
              <ExternalLink size={14} /> Link do Canal
            </a>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap md:flex-nowrap">
          <button
            onClick={() => setShowVersusPanel(true)}
            className="px-4 py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium transition-colors flex items-center gap-2 border border-indigo-200 dark:border-indigo-800"
          >
            <Swords size={18} />
            VERSUS
          </button>
          <button
            onClick={handleSyncApi}
            disabled={isSyncing}
            className="px-4 py-2 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium transition-colors flex items-center gap-2 border border-blue-200 dark:border-blue-800"
            title="Buscar dados atuais do YouTube"
          >
            {isSyncing ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
            Sincronizar (API)
          </button>
          <button
            onClick={handleAiAnalysis}
            disabled={isLoadingAi}
            className="px-4 py-2 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 font-medium transition-colors flex items-center gap-2 border border-purple-200 dark:border-purple-800"
          >
            {isLoadingAi ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
            Análise IA
          </button>
          <button
            onClick={() => setShowUpdateForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm shadow-green-200 transition-all hover:shadow-green-300"
          >
            + Manual
          </button>
        </div>
      </div>

      {showComparison && myLatest && (
        <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 p-6 rounded-xl border border-blue-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4 text-blue-800 dark:text-blue-300">
            <ArrowRightLeft size={20} />
            <h3 className="font-bold text-lg">Comparativo Direto: {competitor.channelName} vs {myChannel.channelName}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Inscritos', val: latest.subscribers, myVal: myLatest.subscribers },
              { label: 'Visualizações', val: latest.views, myVal: myLatest.views },
              { label: 'Vídeos', val: latest.videos, myVal: myLatest.videos },
            ].map((metric, i) => {
              const diff = metric.myVal - metric.val;
              return (
                <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase mb-2">{metric.label}</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(metric.val)}</p>
                      <p className="text-xs text-gray-400">Eles</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {diff > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(diff)}
                      </p>
                      <p className="text-xs text-gray-400">Diferença</p>
                    </div>
                    <div className="text-right opacity-60">
                      <p className="text-sm font-medium dark:text-gray-300">{new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(metric.myVal)}</p>
                      <p className="text-xs text-gray-400">Você</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {aiAnalysis && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-purple-100 dark:border-purple-800 animate-fade-in">
          <h3 className="text-purple-900 dark:text-purple-300 font-semibold mb-2 flex items-center gap-2">
            <BrainCircuit size={20} /> Insights do Gemini
          </h3>
          <div className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-line">
            {aiAnalysis}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Crescimento Diário', data: stats.daily },
          { label: 'Crescimento Semanal', data: stats.weekly },
          { label: 'Crescimento Mensal', data: stats.monthly },
          { label: 'Crescimento Anual', data: stats.yearly },
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{item.label} (Médio)</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2"><Users size={14} /> Inscritos</span>
                <span className={`font-semibold ${item.data.subs >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {item.data.subs > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR').format(item.data.subs)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2"><Eye size={14} /> Views</span>
                <span className={`font-semibold ${item.data.views >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                  {item.data.views > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR').format(item.data.views)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2"><Video size={14} /> Vídeos</span>
                <span className={`font-semibold ${item.data.videos >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                  {item.data.videos > 0 ? '+' : ''}{item.data.videos.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <StatsChart snapshots={snapshots} theme={isDark ? 'dark' : 'light'} />

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mt-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
            <Video size={20} className="text-red-600" /> Análise de Conteúdo
          </h3>
          {!videosLoaded && (
            <button
              onClick={handleLoadVideos}
              disabled={isLoadingVideos}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium flex items-center gap-2"
            >
              {isLoadingVideos ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              Carregar Vídeos (API)
            </button>
          )}
        </div>

        {videosLoaded ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <Flame size={18} className="text-orange-500" /> Top 10 Populares (Views)
              </h4>
              <div className="space-y-3">
                {topVideos.map((video, i) => (
                  <a
                    key={video.id}
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                  >
                    <div className="relative shrink-0 w-24 h-14 bg-gray-200 dark:bg-gray-600 rounded overflow-hidden">
                      <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 bg-black/70 text-white text-[10px] px-1 font-bold">
                        #{i + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug">
                        {video.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><Eye size={12} /> {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(video.viewCount)}</span>
                        <span className="flex items-center gap-1"><ThumbsUp size={12} /> {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(video.likeCount)}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={12} /> {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(video.commentCount)}</span>
                        <span className="ml-auto">{new Date(video.publishedAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </a>
                ))}
                {topVideos.length === 0 && <p className="text-sm text-gray-400">Nenhum vídeo encontrado.</p>}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <Clock size={18} className="text-blue-500" /> Últimos 10 Envios
              </h4>
              <div className="space-y-3">
                {recentVideos.map((video) => (
                  <a
                    key={video.id}
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                  >
                    <div className="relative shrink-0 w-24 h-14 bg-gray-200 dark:bg-gray-600 rounded overflow-hidden">
                      <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug">
                        {video.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><Eye size={12} /> {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(video.viewCount)}</span>
                        <span className="flex items-center gap-1"><ThumbsUp size={12} /> {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(video.likeCount)}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={12} /> {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(video.commentCount)}</span>
                        <span className="text-green-600 dark:text-green-400 font-medium ml-auto">{new Date(video.publishedAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </a>
                ))}
                {recentVideos.length === 0 && <p className="text-sm text-gray-400">Nenhum vídeo recente encontrado.</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-750 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <Video size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">Carregue os vídeos para ver quais conteúdos estão performando melhor.</p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 dark:bg-gray-750 border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800 dark:text-white">Histórico de Registros</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full">{snapshots.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-750 border-b dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-gray-900 dark:text-white">Data</th>
                <th className="px-6 py-3 text-gray-900 dark:text-white">Hora</th>
                <th className="px-6 py-3 text-gray-900 dark:text-white">Inscritos</th>
                <th className="px-6 py-3 text-gray-900 dark:text-white">Views Totais</th>
                <th className="px-6 py-3 text-gray-900 dark:text-white">Vídeos</th>
                <th className="px-6 py-3 text-right text-gray-900 dark:text-white">Ganho (Inscritos)</th>
                <th className="px-6 py-3 text-right text-gray-900 dark:text-white">Ganho (Vídeos)</th>
                <th className="px-6 py-3 text-right text-gray-900 dark:text-white">Ganho (Views)</th>
                <th className="px-6 py-3 text-right text-gray-900 dark:text-white">Ações</th>
              </tr>
            </thead>
            <tbody>
              {[...snapshots].reverse().map((snap, i, arr) => {
                const prev = arr[i + 1];
                const gain = prev ? snap.subscribers - prev.subscribers : 0;
                const videoGain = prev ? snap.videos - prev.videos : 0;
                const viewsGain = prev ? snap.views - prev.views : 0;

                return (
                  <tr key={snap.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {formatDisplayDate(snap.date)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {formatTime(snap.createdAt, snap.timeRegistered)}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{snap.subscribers > 0 ? new Intl.NumberFormat('pt-BR').format(snap.subscribers) : '0'}</td>
                    <td className="px-6 py-4 text-blue-600 dark:text-blue-400">{snap.views > 0 ? new Intl.NumberFormat('pt-BR').format(snap.views) : '0'}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{snap.videos > 0 ? new Intl.NumberFormat('pt-BR').format(snap.videos) : '0'}</td>

                    <td className="px-6 py-4 text-right">
                      {prev && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${gain >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                          {gain > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR').format(gain)}
                        </span>
                      )}
                      {!prev && <span className="text-gray-400">-</span>}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {prev && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${videoGain >= 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                          {videoGain > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR').format(videoGain)}
                        </span>
                      )}
                      {!prev && <span className="text-gray-400">-</span>}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {prev && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${viewsGain >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                          {viewsGain > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR').format(viewsGain)}
                        </span>
                      )}
                      {!prev && <span className="text-gray-400">-</span>}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => requestDeleteSnapshot(e, snap.id)}
                        className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="Excluir registro"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {snapshots.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showUpdateForm && (
        <UpdateForm
          onClose={() => setShowUpdateForm(false)}
          onSave={handleAddUpdate}
          competitorName={competitor.channelName}
        />
      )}

      {showVersusPanel && (
        <VersusPanel
          currentCompetitor={competitor}
          onClose={() => setShowVersusPanel(false)}
        />
      )}

      {snapshotToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 animate-fade-in">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold dark:text-white">Excluir Registro</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
              Você tem certeza que deseja apagar este registro do histórico? Esta ação irá remover os dados do banco de dados permanentemente.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmDeleteSnapshot}
                className="w-full py-2.5 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} /> Sim, Excluir Registro
              </button>
              <button
                onClick={() => setSnapshotToDelete(null)}
                className="w-full py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};